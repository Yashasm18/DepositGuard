"""Local comparison service for DepositGuard.

Runs the same before/after photo review as the cloud function, but on this
machine: a Strands Agents agent backed by a local vision model in Ollama.
Used when Amazon Bedrock isn't available to the account.

Run:  .venv/bin/python server.py      (listens on http://localhost:8787)
"""

from __future__ import annotations

import hashlib
import io
import json
import logging
import os
import urllib.request
from urllib.parse import urlparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Literal

from PIL import Image
from pydantic import BaseModel, Field, ValidationError
from strands import Agent
from strands.models.ollama import OllamaModel

MODEL_ID = os.environ.get("LOCAL_MODEL", "qwen2.5vl:3b")
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
PORT = int(os.environ.get("PORT", "8787"))
ALLOWED_ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173"}
MAX_EDGE = 768  # small images keep a 3B model fast on a laptop
MAX_PHOTOS_PER_PHASE = 4
MAX_PHOTOS_IN_REQUEST = 50
MAX_BODY_BYTES = 256 * 1024
MAX_PHOTO_BYTES = 15 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 40_000_000  # refuse decompression bombs

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("depositguard-local")

SYSTEM_PROMPT = """You are an impartial evidence reviewer for rental security-deposit disputes in India.
You get photos of one room taken at move-in and photos of the same room taken at move-out.
Compare them and list visible differences in walls, paint, floor, doors, windows, fittings and furniture.

Classify each finding as:
- NEW_DAMAGE: visible at move-out and clearly absent at move-in in the same area.
- PRE_EXISTING: already visible at move-in.
- WEAR_AND_TEAR: normal ageing from ordinary use.
- NO_CHANGE: an area that looks the same in both.
- UNCLEAR: the photos don't show the same area clearly enough to decide.

Be fair to tenant and owner. If the photos show different areas or angles, say UNCLEAR.
Refer to photos by number. Answer only with JSON matching the given schema."""


class Finding(BaseModel):
    item: str
    location: str = ""
    status: Literal["NEW_DAMAGE", "PRE_EXISTING", "WEAR_AND_TEAR", "NO_CHANGE", "UNCLEAR"]
    severity: Literal["none", "low", "medium", "high"] = "none"
    description: str = ""
    moveInPhotos: list[int] = Field(default_factory=list)
    moveOutPhotos: list[int] = Field(default_factory=list)
    confidence: float = Field(default=0.5, ge=0, le=1)


class Report(BaseModel):
    overall: Literal["NO_NEW_DAMAGE", "WEAR_AND_TEAR_ONLY", "NEW_DAMAGE_FOUND", "INSUFFICIENT_EVIDENCE"]
    summary: str
    findings: list[Finding] = Field(default_factory=list)
    photoQualityNotes: list[str] = Field(default_factory=list)


class PhotoIn(BaseModel):
    photoId: str
    phase: Literal["MOVE_IN", "MOVE_OUT"]
    url: str
    sha256: str
    capturedAt: str


class CompareRequest(BaseModel):
    roomName: str
    photos: list[PhotoIn]


def is_s3_url(url: str) -> bool:
    parsed = urlparse(url)
    host = parsed.hostname or ""
    return parsed.scheme == "https" and (host == "s3.amazonaws.com" or (
        host.endswith(".amazonaws.com") and (".s3." in f".{host}" or host.startswith("s3."))
    ))


def fetch(url: str) -> bytes:
    # Only presigned S3 URLs from the app are allowed, never arbitrary hosts.
    if not is_s3_url(url):
        raise ValueError("Photo URLs must be Amazon S3 URLs.")
    with urllib.request.urlopen(url, timeout=30) as resp:  # noqa: S310 - validated S3 URL
        data = resp.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise ValueError("Photo is too large.")
    return data


def shrink(data: bytes) -> bytes:
    image = Image.open(io.BytesIO(data)).convert("RGB")
    image.thumbnail((MAX_EDGE, MAX_EDGE))
    out = io.BytesIO()
    image.save(out, format="JPEG", quality=85)
    return out.getvalue()


def compare(req: CompareRequest) -> dict:
    content: list[dict] = [{"text": f"Room: {req.roomName}"}]
    evidence = []
    for phase, title in (("MOVE_IN", "Move-in"), ("MOVE_OUT", "Move-out")):
        photos = sorted((p for p in req.photos if p.phase == phase), key=lambda p: p.capturedAt)
        photos = photos[-MAX_PHOTOS_PER_PHASE:]
        if not photos:
            raise ValueError("Add at least one move-in photo and one move-out photo before comparing.")
        for i, photo in enumerate(photos, start=1):
            data = fetch(photo.url)
            label = f"{title} {i}"
            evidence.append(
                {
                    "photoId": photo.photoId,
                    "phase": phase,
                    "label": label,
                    "capturedAt": photo.capturedAt,
                    "sha256": photo.sha256,
                    "verified": hashlib.sha256(data).hexdigest() == photo.sha256,
                }
            )
            content.append({"text": f"{label} (taken {photo.capturedAt}):"})
            content.append({"image": {"format": "jpeg", "source": {"bytes": shrink(data)}}})
    content.append({"text": "Compare the move-in and move-out photos of this room and return the JSON report."})

    model = OllamaModel(
        host=OLLAMA_HOST,
        model_id=MODEL_ID,
        temperature=0,
        max_tokens=1500,
        additional_args={"format": Report.model_json_schema()},
    )
    agent = Agent(model=model, system_prompt=SYSTEM_PROMPT, callback_handler=None)
    result = agent(content)
    text = str(result).strip()
    try:
        report = Report.model_validate_json(text)
    except ValidationError as err:
        log.warning("Model returned invalid JSON: %s\n%s", err, text[:500])
        raise ValueError("The local AI returned an incomplete report. Please try again.") from err

    return {**report.model_dump(), "evidence": evidence, "model": f"local:{MODEL_ID}"}


class Handler(BaseHTTPRequestHandler):
    def _cors(self) -> None:
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status: int, body: dict) -> None:
        payload = json.dumps(body).encode()
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._json(200, {"ok": True, "model": MODEL_ID})
        else:
            self._json(404, {"error": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/compare":
            self._json(404, {"error": "Not found"})
            return
        # Only the DepositGuard app may use this service; blocks other web pages
        # from making the browser call it.
        if self.headers.get("Origin") not in ALLOWED_ORIGINS:
            self._json(403, {"error": "Forbidden origin"})
            return
        if (self.headers.get("Content-Type") or "").split(";")[0].strip() != "application/json":
            self._json(415, {"error": "Content-Type must be application/json"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY_BYTES:
                self._json(413, {"error": "Request too large"})
                return
            req = CompareRequest.model_validate_json(self.rfile.read(length))
            if len(req.photos) > MAX_PHOTOS_IN_REQUEST:
                raise ValueError("Too many photos in one request.")
            log.info("Comparing %s (%d photos)", req.roomName, len(req.photos))
            self._json(200, compare(req))
        except (ValidationError, ValueError, Image.DecompressionBombError) as err:
            self._json(400, {"error": str(err)})
        except Exception:
            log.exception("Comparison failed")
            self._json(500, {"error": "The local AI failed. Is Ollama running with the vision model pulled?"})


if __name__ == "__main__":
    log.info("DepositGuard local AI on http://localhost:%d using %s", PORT, MODEL_ID)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
