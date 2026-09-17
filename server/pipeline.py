"""Builds a room's before/after report."""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone

import agent
import db
import vision

log = logging.getLogger("depositguard.pipeline")

MAX_PHOTOS_PER_PHASE = 8
MIN_PAIR_SIMILARITY = 0.55  # below this the photos probably show different spots


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def describe_location(region: vision.Region) -> str:
    cx, cy = region.x + region.w / 2, region.y + region.h / 2
    vertical = "top" if cy < 0.34 else "bottom" if cy > 0.66 else "middle"
    horizontal = "left" if cx < 0.34 else "right" if cx > 0.66 else "centre"
    return "centre of the photo" if (vertical, horizontal) == ("middle", "centre") else f"{vertical} {horizontal} of the photo"


def run(room_id: str) -> None:
    try:
        report = _build(room_id)
        with db.connect() as conn:
            conn.execute(
                "UPDATE rooms SET status = 'DONE', report = ?, error = NULL, compared_at = ? WHERE id = ?",
                (json.dumps(report), now_iso(), room_id),
            )
            # Findings changed, so earlier owner responses no longer apply.
            conn.execute("DELETE FROM responses WHERE room_id = ?", (room_id,))
    except Exception as err:  # noqa: BLE001 - report any failure to the user
        log.exception("Comparison failed for room %s", room_id)
        message = str(err) if isinstance(err, ValueError) else (
            "The local AI failed. Make sure Ollama is running and the model is downloaded."
        )
        with db.connect() as conn:
            conn.execute("UPDATE rooms SET status = 'FAILED', error = ? WHERE id = ?", (message, room_id))


def _build(room_id: str) -> dict:
    with db.connect() as conn:
        room = conn.execute("SELECT * FROM rooms WHERE id = ?", (room_id,)).fetchone()
        photos = conn.execute(
            "SELECT * FROM photos WHERE room_id = ? ORDER BY captured_at, uploaded_at", (room_id,)
        ).fetchall()

    move_in = [p for p in photos if p["phase"] == "MOVE_IN"][-MAX_PHOTOS_PER_PHASE:]
    move_out = [p for p in photos if p["phase"] == "MOVE_OUT"][-MAX_PHOTOS_PER_PHASE:]
    if not move_in or not move_out:
        raise ValueError("Add at least one move-in photo and one move-out photo before comparing.")

    images: dict[str, vision.Image.Image] = {}
    evidence = []
    for phase, items in (("MOVE_IN", move_in), ("MOVE_OUT", move_out)):
        title = "Move-in" if phase == "MOVE_IN" else "Move-out"
        for i, photo in enumerate(items, start=1):
            data = (db.PHOTO_DIR / photo["file_name"]).read_bytes()
            evidence.append(
                {
                    "photoId": photo["id"],
                    "phase": phase,
                    "label": f"{title} {i}",
                    "capturedAt": photo["captured_at"],
                    "uploadedAt": photo["uploaded_at"],
                    "sha256": photo["sha256"],
                    "verified": hashlib.sha256(data).hexdigest() == photo["sha256"],
                }
            )
            images[photo["id"]] = vision.load(data)

    findings: list[dict] = []
    pairs: list[dict] = []
    notes: list[str] = []
    labels = {e["photoId"]: e["label"] for e in evidence}
    used_move_in: set[str] = set()

    for out_photo in move_out:
        after = images[out_photo["id"]]
        best = max(move_in, key=lambda p: vision.similarity(images[p["id"]], after))
        before = images[best["id"]]
        analysis = vision.analyse_pair(best["id"], before, out_photo["id"], after)
        pairs.append(
            {
                "moveInPhotoId": best["id"],
                "moveOutPhotoId": out_photo["id"],
                "similarity": round(analysis.similarity, 3),
                "misaligned": analysis.misaligned,
            }
        )
        base = {"moveInPhotoId": best["id"], "moveOutPhotoId": out_photo["id"]}

        if analysis.misaligned or analysis.similarity < MIN_PAIR_SIMILARITY:
            findings.append(
                {
                    **base,
                    "id": uuid.uuid4().hex[:12],
                    "item": "Whole view",
                    "location": "entire photo",
                    "status": "UNCLEAR",
                    "severity": "none",
                    "description": (
                        f"{labels[out_photo['id']]} doesn't seem to show the same spot as any move-in photo, "
                        "so it can't be compared fairly."
                    ),
                    "confidence": 0.9,
                    "box": None,
                    "source": "change-detection",
                }
            )
            notes.append(
                f"Retake {labels[out_photo['id']]} from the same place and angle as the matching move-in photo."
            )
            continue

        used_move_in.add(best["id"])
        if not analysis.regions:
            findings.append(
                {
                    **base,
                    "id": uuid.uuid4().hex[:12],
                    "item": "Whole view",
                    "location": "entire photo",
                    "status": "NO_CHANGE",
                    "severity": "none",
                    "description": f"No visible change between {labels[best['id']]} and {labels[out_photo['id']]}.",
                    "confidence": round(min(0.99, analysis.similarity), 2),
                    "box": None,
                    "source": "change-detection",
                }
            )
            continue

        for region in analysis.regions:
            label = agent.label_region(vision.side_by_side(before, after, region), room["name"])
            findings.append(
                {
                    **base,
                    "id": uuid.uuid4().hex[:12],
                    "item": label.item,
                    "location": describe_location(region),
                    "status": label.status,
                    "severity": label.severity if label.status in ("NEW_DAMAGE", "WEAR_AND_TEAR") else "none",
                    "description": label.description,
                    "confidence": round(label.confidence, 2),
                    "box": {"x": region.x, "y": region.y, "w": region.w, "h": region.h},
                    "source": "ai",
                }
            )

    for photo in move_in:
        if photo["id"] not in used_move_in:
            notes.append(f"{labels[photo['id']]} has no matching move-out photo yet.")

    statuses = {f["status"] for f in findings}
    if "NEW_DAMAGE" in statuses:
        overall = "NEW_DAMAGE_FOUND"
    elif statuses <= {"UNCLEAR"}:
        overall = "INSUFFICIENT_EVIDENCE"
    elif "WEAR_AND_TEAR" in statuses:
        overall = "WEAR_AND_TEAR_ONLY"
    else:
        overall = "NO_NEW_DAMAGE"

    return {
        "overall": overall,
        "summary": _summary(findings, evidence),
        "findings": findings,
        "pairs": pairs,
        "photoQualityNotes": notes,
        "evidence": evidence,
        "model": f"{agent.MODEL_ID} via Strands Agents + Ollama",
        "analysedAt": now_iso(),
    }


def _summary(findings: list[dict], evidence: list[dict]) -> str:
    count = lambda s: sum(1 for f in findings if f["status"] == s)  # noqa: E731
    parts = []
    if count("NEW_DAMAGE"):
        parts.append(f"{count('NEW_DAMAGE')} possible new damage item(s) to review")
    if count("PRE_EXISTING"):
        parts.append(f"{count('PRE_EXISTING')} issue(s) that were already there at move-in")
    if count("WEAR_AND_TEAR"):
        parts.append(f"{count('WEAR_AND_TEAR')} sign(s) of normal wear and tear")
    if count("NOT_DAMAGE"):
        parts.append(f"{count('NOT_DAMAGE')} change(s) that are not damage")
    if count("UNCLEAR"):
        parts.append(f"{count('UNCLEAR')} spot(s) that need clearer photos")
    if not parts:
        parts.append("no visible changes between move-in and move-out")
    verified = sum(1 for e in evidence if e["verified"])
    return (
        "Found " + ", ".join(parts) + ". "
        f"{verified} of {len(evidence)} photos match the fingerprint recorded when they were uploaded."
    )
