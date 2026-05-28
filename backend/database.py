import json
import os
import sqlite3
from typing import Any, Dict, List, Optional

DB_FILE = os.path.join(os.path.dirname(__file__), "scans.db")


def init_db() -> None:
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_name TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            critical INTEGER DEFAULT 0,
            high INTEGER DEFAULT 0,
            medium INTEGER DEFAULT 0,
            low INTEGER DEFAULT 0,
            unknown INTEGER DEFAULT 0,
            raw_data TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS scheduler_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            is_active BOOLEAN DEFAULT 0,
            interval_minutes INTEGER DEFAULT 60
        )
    """)
    # Insert default settings if not exists
    c.execute("SELECT COUNT(*) FROM scheduler_settings")
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO scheduler_settings (is_active, interval_minutes) VALUES (0, 60)")
    conn.commit()
    conn.close()


def save_scan(
    image_name: str, critical: int, high: int, medium: int, low: int, unknown: int, raw_data: Dict[str, Any]
) -> None:
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        """
        INSERT INTO scan_history (image_name, critical, high, medium, low, unknown, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
        (image_name, critical, high, medium, low, unknown, json.dumps(raw_data)),
    )
    conn.commit()
    conn.close()


def get_history(image_name: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    if image_name:
        c.execute(
            "SELECT id, image_name, timestamp, critical, high, medium, low, unknown FROM scan_history WHERE image_name = ? ORDER BY timestamp ASC",
            (image_name,),
        )
    else:
        c.execute(
            "SELECT id, image_name, timestamp, critical, high, medium, low, unknown FROM scan_history ORDER BY timestamp ASC"
        )
    rows = c.fetchall()
    conn.close()
    return [dict(ix) for ix in rows]


def get_schedule_settings() -> Dict[str, Any]:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT is_active, interval_minutes FROM scheduler_settings LIMIT 1")
    row = c.fetchone()
    conn.close()
    return dict(row) if row else {"is_active": False, "interval_minutes": 60}


def update_schedule_settings(is_active: bool, interval_minutes: int) -> None:
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "UPDATE scheduler_settings SET is_active = ?, interval_minutes = ?",
        (int(is_active), interval_minutes),
    )
    conn.commit()
    conn.close()


init_db()
