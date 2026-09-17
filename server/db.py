"""SQLite storage. Everything lives in ./data on this machine."""

from __future__ import annotations

import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

DATA_DIR = Path(__file__).parent / "data"
PHOTO_DIR = DATA_DIR / "photos"
DB_PATH = DATA_DIR / "depositguard.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  owner_name TEXT,
  move_in_date TEXT,
  deposit_amount INTEGER,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  report TEXT,
  error TEXT,
  compared_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('MOVE_IN', 'MOVE_OUT')),
  file_name TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  captured_at TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  note TEXT
);
CREATE TABLE IF NOT EXISTS share_links (
  token_hash TEXT PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS responses (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  finding_id TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('AGREE', 'DISPUTE')),
  comment TEXT,
  responded_at TEXT NOT NULL,
  PRIMARY KEY (room_id, finding_id)
);
CREATE INDEX IF NOT EXISTS idx_properties_tenant ON properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_property ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_photos_room ON photos(room_id);
"""

_lock = threading.Lock()


def init() -> None:
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)
        # A server restart interrupts any running comparison.
        conn.execute(
            "UPDATE rooms SET status = 'FAILED', error = 'The comparison was interrupted. Please try again.' "
            "WHERE status = 'PROCESSING'"
        )


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    with _lock:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()
