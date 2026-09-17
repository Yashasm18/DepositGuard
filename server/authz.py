"""Authorization with Cedar (https://www.cedarpolicy.com), AWS's open-source policy language."""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

import cedarpy

POLICIES = cedarpy.PolicySet.from_str((Path(__file__).parent / "policies.cedar").read_text())


@dataclass(frozen=True)
class Principal:
    kind: str  # "User" or "ShareLink"
    id: str
    property_id: str | None = None  # share links only
    expires_at: int = 0
    revoked: bool = False


@dataclass(frozen=True)
class Resource:
    kind: str  # "Property", "Room", "Photo"
    id: str
    tenant_id: str
    property_id: str


def _ref(kind: str, id_: str) -> dict:
    return {"__entity": {"type": kind, "id": id_}}


def is_allowed(principal: Principal, action: str, resource: Resource) -> bool:
    entities: list[dict] = [
        {
            "uid": {"type": resource.kind, "id": resource.id},
            "attrs": {
                "tenant": _ref("User", resource.tenant_id),
                "property": _ref("Property", resource.property_id),
            },
            "parents": [],
        }
    ]
    if principal.kind == "ShareLink":
        entities.append(
            {
                "uid": {"type": "ShareLink", "id": principal.id},
                "attrs": {
                    "property": _ref("Property", principal.property_id or ""),
                    "expiresAt": principal.expires_at,
                    "revoked": principal.revoked,
                },
                "parents": [],
            }
        )
    else:
        entities.append({"uid": {"type": "User", "id": principal.id}, "attrs": {}, "parents": []})

    result = cedarpy.is_authorized(
        {
            "principal": {"type": principal.kind, "id": principal.id},
            "action": {"type": "Action", "id": action},
            "resource": {"type": resource.kind, "id": resource.id},
            "context": {"now": int(time.time())},
        },
        POLICIES,
        entities,
    )
    return result.decision == cedarpy.Decision.Allow
