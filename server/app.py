"""DepositGuard local API.

Runs entirely on this machine: SQLite for data, a local folder for photos,
Cedar for authorization and Strands Agents + Ollama for the AI review.

Run:  .venv/bin/uvicorn app:app --port 8787
"""

from __future__ import annotations

import hashlib
import hmac
import io
import json
import logging
import secrets
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel, Field

import db
import pipeline
from authz import Principal, Resource, is_allowed

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

SESSION_COOKIE = "dg_session"
SESSION_SECONDS = 7 * 24 * 3600
SHARE_SECONDS = 14 * 24 * 3600
MAX_UPLOAD_BYTES = 12 * 1024 * 1024
IMAGE_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
MEDIA_TYPES = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}

@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init()
    yield


app = FastAPI(title="DepositGuard", docs_url=None, redoc_url=None, lifespan=lifespan)
# One comparison at a time keeps the local model within a laptop's memory.
jobs = ThreadPoolExecutor(max_workers=1)


@app.middleware("http")
async def csrf_guard(request: Request, call_next):
    # Browsers can't add this header to cross-site requests without a CORS
    # preflight, which this server never approves.
    if request.method not in ("GET", "HEAD", "OPTIONS") and request.url.path.startswith("/api/"):
        if request.headers.get("x-depositguard") != "1":
            return Response('{"detail":"Missing request header"}', status_code=403, media_type="application/json")
    return await call_next(request)


# ---------- helpers ----------


def new_id() -> str:
    return uuid.uuid4().hex


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}${digest.hex()}"


def check_password(password: str, stored: str) -> bool:
    salt_hex, digest_hex = stored.split("$")
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1)
    return hmac.compare_digest(digest.hex(), digest_hex)


def current_user(request: Request) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        with db.connect() as conn:
            row = conn.execute(
                "SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id "
                "WHERE s.token_hash = ? AND s.expires_at > ?",
                (token_hash(token), int(time.time())),
            ).fetchone()
        if row:
            return dict(row)
    raise HTTPException(401, "Please sign in.")


User = Annotated[dict, Depends(current_user)]


def share_principal(token: str) -> Principal:
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM share_links WHERE token_hash = ?", (token_hash(token),)).fetchone()
    if not row:
        raise HTTPException(404, "This link is not valid.")
    return Principal("ShareLink", row["id"], row["property_id"], row["expires_at"], bool(row["revoked"]))


def property_resource(property_id: str) -> Resource:
    with db.connect() as conn:
        row = conn.execute("SELECT id, tenant_id FROM properties WHERE id = ?", (property_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found.")
    return Resource("Property", row["id"], row["tenant_id"], row["id"])


def room_resource(room_id: str) -> Resource:
    with db.connect() as conn:
        row = conn.execute(
            "SELECT r.id, p.id AS property_id, p.tenant_id FROM rooms r JOIN properties p ON p.id = r.property_id "
            "WHERE r.id = ?",
            (room_id,),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Not found.")
    return Resource("Room", row["id"], row["tenant_id"], row["property_id"])


def photo_resource(photo_id: str) -> tuple[Resource, dict]:
    with db.connect() as conn:
        row = conn.execute(
            "SELECT ph.*, p.id AS property_id, p.tenant_id FROM photos ph "
            "JOIN rooms r ON r.id = ph.room_id JOIN properties p ON p.id = r.property_id WHERE ph.id = ?",
            (photo_id,),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Not found.")
    return Resource("Photo", row["id"], row["tenant_id"], row["property_id"]), dict(row)


def authorize(principal: Principal, action: str, resource: Resource) -> None:
    if not is_allowed(principal, action, resource):
        # 404 rather than 403 so other people's ids aren't confirmed to exist.
        raise HTTPException(404, "Not found.")


def as_user(user: dict) -> Principal:
    return Principal("User", user["id"])


def photo_json(row) -> dict:
    return {
        "id": row["id"],
        "phase": row["phase"],
        "sha256": row["sha256"],
        "width": row["width"],
        "height": row["height"],
        "capturedAt": row["captured_at"],
        "uploadedAt": row["uploaded_at"],
        "note": row["note"],
    }


def property_json(conn, prop) -> dict:
    rooms = []
    for room in conn.execute("SELECT * FROM rooms WHERE property_id = ? ORDER BY created_at", (prop["id"],)):
        photos = conn.execute(
            "SELECT * FROM photos WHERE room_id = ? ORDER BY captured_at, uploaded_at", (room["id"],)
        ).fetchall()
        responses = {
            r["finding_id"]: {"verdict": r["verdict"], "comment": r["comment"], "respondedAt": r["responded_at"]}
            for r in conn.execute("SELECT * FROM responses WHERE room_id = ?", (room["id"],))
        }
        rooms.append(
            {
                "id": room["id"],
                "name": room["name"],
                "status": room["status"],
                "error": room["error"],
                "comparedAt": room["compared_at"],
                "report": json.loads(room["report"]) if room["report"] else None,
                "photos": [photo_json(p) for p in photos],
                "responses": responses,
            }
        )
    return {
        "id": prop["id"],
        "name": prop["name"],
        "address": prop["address"],
        "ownerName": prop["owner_name"],
        "moveInDate": prop["move_in_date"],
        "depositAmount": prop["deposit_amount"],
        "createdAt": prop["created_at"],
        "rooms": rooms,
    }


# ---------- auth ----------


EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class SignUp(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN, max_length=200)
    name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=8, max_length=200)


class SignIn(BaseModel):
    email: str = Field(max_length=200)
    password: str = Field(max_length=200)


def start_session(response: Response, user_id: str) -> None:
    token = secrets.token_urlsafe(32)
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (token_hash(token), user_id, int(time.time()) + SESSION_SECONDS),
        )
    response.set_cookie(
        SESSION_COOKIE, token, max_age=SESSION_SECONDS, httponly=True, samesite="strict", path="/"
    )


@app.post("/api/auth/signup")
def signup(body: SignUp, response: Response) -> dict:
    user_id = new_id()
    try:
        with db.connect() as conn:
            conn.execute(
                "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, body.email.lower(), body.name.strip(), hash_password(body.password), pipeline.now_iso()),
            )
    except db.sqlite3.IntegrityError:
        raise HTTPException(409, "An account with this email already exists.") from None
    start_session(response, user_id)
    return {"id": user_id, "email": body.email.lower(), "name": body.name.strip()}


@app.post("/api/auth/signin")
def signin(body: SignIn, response: Response) -> dict:
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (body.email.lower(),)).fetchone()
    if not row or not check_password(body.password, row["password_hash"]):
        raise HTTPException(401, "Wrong email or password.")
    start_session(response, row["id"])
    return {"id": row["id"], "email": row["email"], "name": row["name"]}


@app.post("/api/auth/signout")
def signout(request: Request, response: Response) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        with db.connect() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash(token),))
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@app.get("/api/me")
def me(user: User) -> dict:
    return user


# ---------- properties and rooms ----------


class PropertyIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    address: str | None = Field(default=None, max_length=300)
    ownerName: str | None = Field(default=None, max_length=120)
    moveInDate: str | None = Field(default=None, max_length=10)
    depositAmount: int | None = Field(default=None, ge=0, le=100_000_000)


@app.get("/api/properties")
def list_properties(user: User) -> list[dict]:
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT p.*, (SELECT COUNT(*) FROM rooms r WHERE r.property_id = p.id) AS room_count "
            "FROM properties p WHERE p.tenant_id = ? ORDER BY p.created_at DESC",
            (user["id"],),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "address": r["address"],
            "ownerName": r["owner_name"],
            "moveInDate": r["move_in_date"],
            "depositAmount": r["deposit_amount"],
            "roomCount": r["room_count"],
        }
        for r in rows
    ]


@app.post("/api/properties")
def create_property(body: PropertyIn, user: User) -> dict:
    prop_id = new_id()
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO properties (id, tenant_id, name, address, owner_name, move_in_date, deposit_amount, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                prop_id,
                user["id"],
                body.name.strip(),
                body.address,
                body.ownerName,
                body.moveInDate,
                body.depositAmount,
                pipeline.now_iso(),
            ),
        )
    return {"id": prop_id}


@app.get("/api/properties/{property_id}")
def get_property(property_id: str, user: User) -> dict:
    authorize(as_user(user), "view", property_resource(property_id))
    with db.connect() as conn:
        prop = conn.execute("SELECT * FROM properties WHERE id = ?", (property_id,)).fetchone()
        return property_json(conn, prop)


@app.patch("/api/properties/{property_id}")
def update_property(property_id: str, body: PropertyIn, user: User) -> dict:
    authorize(as_user(user), "edit", property_resource(property_id))
    with db.connect() as conn:
        conn.execute(
            "UPDATE properties SET name = ?, address = ?, owner_name = ?, move_in_date = ?, deposit_amount = ? "
            "WHERE id = ?",
            (body.name.strip(), body.address, body.ownerName, body.moveInDate, body.depositAmount, property_id),
        )
    return {"ok": True}


class RoomIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)


@app.post("/api/properties/{property_id}/rooms")
def create_room(property_id: str, body: RoomIn, user: User) -> dict:
    authorize(as_user(user), "edit", property_resource(property_id))
    room_id = new_id()
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO rooms (id, property_id, name, created_at) VALUES (?, ?, ?, ?)",
            (room_id, property_id, body.name.strip(), pipeline.now_iso()),
        )
    return {"id": room_id}


@app.delete("/api/rooms/{room_id}")
def delete_room(room_id: str, user: User) -> dict:
    authorize(as_user(user), "edit", room_resource(room_id))
    with db.connect() as conn:
        files = [r["file_name"] for r in conn.execute("SELECT file_name FROM photos WHERE room_id = ?", (room_id,))]
        conn.execute("DELETE FROM rooms WHERE id = ?", (room_id,))
    for name in files:
        (db.PHOTO_DIR / name).unlink(missing_ok=True)
    return {"ok": True}


# ---------- photos ----------


@app.post("/api/rooms/{room_id}/photos")
async def upload_photo(
    room_id: str,
    user: User,
    file: Annotated[UploadFile, File()],
    phase: Annotated[Literal["MOVE_IN", "MOVE_OUT"], Form()],
    capturedAt: Annotated[str, Form(max_length=40)],
    note: Annotated[str | None, Form(max_length=300)] = None,
) -> dict:
    authorize(as_user(user), "edit", room_resource(room_id))
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Photo is too large (max 12 MB).")
    try:
        with Image.open(io.BytesIO(data)) as img:
            ext = IMAGE_FORMATS.get(img.format or "")
            width, height = img.size
            img.verify()
    except Exception:
        raise HTTPException(400, "That file isn't a supported photo (JPEG, PNG or WebP).") from None
    if not ext:
        raise HTTPException(400, "That file isn't a supported photo (JPEG, PNG or WebP).")

    photo_id = new_id()
    file_name = f"{photo_id}.{ext}"
    # The fingerprint is taken by the server from the exact bytes it stores.
    (db.PHOTO_DIR / file_name).write_bytes(data)
    sha256 = hashlib.sha256(data).hexdigest()
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO photos (id, room_id, phase, file_name, sha256, width, height, captured_at, uploaded_at, note)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (photo_id, room_id, phase, file_name, sha256, width, height, capturedAt, pipeline.now_iso(), note),
        )
        row = conn.execute("SELECT * FROM photos WHERE id = ?", (photo_id,)).fetchone()
    return photo_json(row)


@app.delete("/api/photos/{photo_id}")
def delete_photo(photo_id: str, user: User) -> dict:
    resource, row = photo_resource(photo_id)
    authorize(as_user(user), "edit", resource)
    with db.connect() as conn:
        conn.execute("DELETE FROM photos WHERE id = ?", (photo_id,))
    (db.PHOTO_DIR / row["file_name"]).unlink(missing_ok=True)
    return {"ok": True}


def send_photo(row: dict) -> FileResponse:
    ext = Path(row["file_name"]).suffix.lstrip(".")
    return FileResponse(
        db.PHOTO_DIR / row["file_name"],
        media_type=MEDIA_TYPES[ext],
        headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"},
    )


@app.get("/api/photos/{photo_id}/file")
def photo_file(photo_id: str, user: User) -> FileResponse:
    resource, row = photo_resource(photo_id)
    authorize(as_user(user), "view", resource)
    return send_photo(row)


# ---------- comparison ----------


@app.post("/api/rooms/{room_id}/compare")
def compare(room_id: str, user: User) -> dict:
    authorize(as_user(user), "edit", room_resource(room_id))
    with db.connect() as conn:
        updated = conn.execute(
            "UPDATE rooms SET status = 'PROCESSING', error = NULL WHERE id = ? AND status != 'PROCESSING'",
            (room_id,),
        ).rowcount
    if updated:
        jobs.submit(pipeline.run, room_id)
    return {"status": "PROCESSING"}


# ---------- share links (for the owner / landlord) ----------


@app.post("/api/properties/{property_id}/shares")
def create_share(property_id: str, user: User) -> dict:
    authorize(as_user(user), "edit", property_resource(property_id))
    token = secrets.token_urlsafe(24)
    share_id = new_id()
    expires_at = int(time.time()) + SHARE_SECONDS
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO share_links (token_hash, id, property_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
            (token_hash(token), share_id, property_id, expires_at, pipeline.now_iso()),
        )
    return {"id": share_id, "token": token, "expiresAt": expires_at}


@app.get("/api/properties/{property_id}/shares")
def list_shares(property_id: str, user: User) -> list[dict]:
    authorize(as_user(user), "edit", property_resource(property_id))
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT id, expires_at, revoked, created_at FROM share_links WHERE property_id = ? ORDER BY created_at DESC",
            (property_id,),
        ).fetchall()
    return [
        {"id": r["id"], "expiresAt": r["expires_at"], "revoked": bool(r["revoked"]), "createdAt": r["created_at"]}
        for r in rows
    ]


@app.post("/api/shares/{share_id}/revoke")
def revoke_share(share_id: str, user: User) -> dict:
    with db.connect() as conn:
        row = conn.execute("SELECT property_id FROM share_links WHERE id = ?", (share_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found.")
    authorize(as_user(user), "edit", property_resource(row["property_id"]))
    with db.connect() as conn:
        conn.execute("UPDATE share_links SET revoked = 1 WHERE id = ?", (share_id,))
    return {"ok": True}


@app.get("/api/share/{token}")
def shared_property(token: str) -> dict:
    principal = share_principal(token)
    resource = property_resource(principal.property_id or "")
    authorize(principal, "view", resource)
    with db.connect() as conn:
        prop = conn.execute("SELECT * FROM properties WHERE id = ?", (resource.id,)).fetchone()
        data = property_json(conn, prop)
    data["expiresAt"] = principal.expires_at
    return data


@app.get("/api/share/{token}/photos/{photo_id}")
def shared_photo(token: str, photo_id: str) -> FileResponse:
    principal = share_principal(token)
    resource, row = photo_resource(photo_id)
    authorize(principal, "view", resource)
    return send_photo(row)


class ResponseIn(BaseModel):
    verdict: Literal["AGREE", "DISPUTE"]
    comment: str | None = Field(default=None, max_length=500)


@app.put("/api/share/{token}/rooms/{room_id}/findings/{finding_id}")
def respond(token: str, room_id: str, finding_id: str, body: ResponseIn) -> dict:
    principal = share_principal(token)
    authorize(principal, "respond", room_resource(room_id))
    with db.connect() as conn:
        report = conn.execute("SELECT report FROM rooms WHERE id = ?", (room_id,)).fetchone()["report"]
        if not report or finding_id not in {f["id"] for f in json.loads(report)["findings"]}:
            raise HTTPException(404, "Not found.")
        conn.execute(
            "INSERT INTO responses (room_id, finding_id, verdict, comment, responded_at) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT (room_id, finding_id) DO UPDATE SET verdict = excluded.verdict, "
            "comment = excluded.comment, responded_at = excluded.responded_at",
            (room_id, finding_id, body.verdict, body.comment, pipeline.now_iso()),
        )
    return {"ok": True}


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


# Serve the built website (npm run build) from the same server when present.
_dist = Path(__file__).parent.parent / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=_dist, html=True), name="web")
