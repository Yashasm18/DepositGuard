"""Labels changed regions with a local vision model, using Strands Agents (AWS open source)."""

from __future__ import annotations

import logging
import os
from typing import Literal

from pydantic import BaseModel, Field, ValidationError
from strands import Agent
from strands.models.ollama import OllamaModel
from strands.types.exceptions import MaxTokensReachedException

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
- NOT_DAMAGE: the difference is an object, not a mark on the room: a box, bag, furniture, bucket, clothes or
  other movable item that was added, moved or removed, or a shadow or lighting change.
- UNCLEAR: the two halves don't show the same thing clearly enough to decide.

First decide: is the new thing a mark or break IN a wall, floor, door or fitting (damage),
or is it an object sitting in front of them (not damage)? A solid shape with straight edges standing on
the floor is usually an object. Stains and holes are irregular and part of the surface.
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
        max_tokens=800,
        keep_alive="10m",
        additional_args={"format": RegionLabel.model_json_schema()},
    )
    agent = Agent(model=model, system_prompt=SYSTEM_PROMPT, callback_handler=None)
    try:
        result = agent(
            [
                {"text": f"Room: {room_name}. Compare LEFT (before) with RIGHT (after)."},
                {"image": {"format": "jpeg", "source": {"bytes": image_jpeg}}},
            ]
        )
        return RegionLabel.model_validate_json(str(result).strip())
    except (ValidationError, MaxTokensReachedException) as err:
        log.warning("Model %s gave no usable answer: %s", MODEL_ID, err)
        return RegionLabel(
            status="UNCLEAR",
            item="Change",
            description="A difference was detected here, but the AI could not describe it. Please check the photos.",
            confidence=0.0,
        )
