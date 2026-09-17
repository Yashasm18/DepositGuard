"""Labels changed regions with a local vision model, using Strands Agents (AWS open source)."""

from __future__ import annotations

import logging
import os
from typing import Literal

from pydantic import BaseModel, Field, ValidationError
from strands import Agent
from strands.models.ollama import OllamaModel

log = logging.getLogger("depositguard.agent")

MODEL_ID = os.environ.get("LOCAL_MODEL", "qwen2.5vl:3b")
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

SYSTEM_PROMPT = """You review evidence for rental security-deposit disputes in India.
Each image you get has two halves of the same spot in a rented room:
LEFT = BEFORE (photographed when the tenant moved in)
RIGHT = AFTER (photographed when the tenant moved out)

Say what is different on the RIGHT compared with the LEFT, and classify it:
- NEW_DAMAGE: damage (stain, crack, hole, broken or missing fitting, burn, peeling paint) that is on the RIGHT but not on the LEFT.
- PRE_EXISTING: the same damage is already on the LEFT.
- WEAR_AND_TEAR: small signs of normal use, like light scuffs or slight fading.
- NOT_DAMAGE: the difference is not damage, e.g. an object moved, added or removed, clutter, a shadow or lighting.
- UNCLEAR: the two halves don't show the same thing clearly enough to decide.

Be fair to both tenant and owner. Answer only with JSON matching the schema."""


class RegionLabel(BaseModel):
    status: Literal["NEW_DAMAGE", "PRE_EXISTING", "WEAR_AND_TEAR", "NOT_DAMAGE", "UNCLEAR"]
    item: str = Field(description="What changed, in a few words, e.g. 'wall paint' or 'chair'.")
    description: str = Field(description="One or two plain sentences a tenant and owner can both understand.")
    severity: Literal["none", "low", "medium", "high"] = "none"
    confidence: float = Field(default=0.5, ge=0, le=1)


def label_region(image_jpeg: bytes, room_name: str) -> RegionLabel:
    model = OllamaModel(
        host=OLLAMA_HOST,
        model_id=MODEL_ID,
        temperature=0,
        max_tokens=400,
        keep_alive="10m",
        additional_args={"format": RegionLabel.model_json_schema()},
    )
    agent = Agent(model=model, system_prompt=SYSTEM_PROMPT, callback_handler=None)
    result = agent(
        [
            {"text": f"Room: {room_name}. Compare LEFT (before) with RIGHT (after)."},
            {"image": {"format": "jpeg", "source": {"bytes": image_jpeg}}},
        ]
    )
    text = str(result).strip()
    try:
        return RegionLabel.model_validate_json(text)
    except ValidationError:
        log.warning("Model returned invalid JSON: %s", text[:300])
        return RegionLabel(
            status="UNCLEAR",
            item="Change",
            description="A difference was detected here, but the AI could not describe it. Please check the photos.",
            confidence=0.0,
        )
