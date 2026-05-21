import sqlite3
import os
import json

DB_FILE = os.path.join(os.path.dirname(__file__), 'scans.db')

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
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
    ''')
    conn.commit()
    conn.close()

def save_scan(image_name, critical, high, medium, low, unknown, raw_data):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO scan_history (image_name, critical, high, medium, low, unknown, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (image_name, critical, high, medium, low, unknown, json.dumps(raw_data)))
    conn.commit()
    conn.close()

def get_history(image_name=None):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    if image_name:
        c.execute('SELECT id, image_name, timestamp, critical, high, medium, low, unknown FROM scan_history WHERE image_name = ? ORDER BY timestamp ASC', (image_name,))
    else:
        c.execute('SELECT id, image_name, timestamp, critical, high, medium, low, unknown FROM scan_history ORDER BY timestamp ASC')
    rows = c.fetchall()
    conn.close()
    return [dict(ix) for ix in rows]

init_db()
