import json
import uuid
from pathlib import Path

from app.config import settings


def _base() -> Path:
    return Path(settings.DATA_DIR)


def form_dir(form_id: str) -> Path:
    path = _base() / "forms" / form_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def source_dir(source_id: str) -> Path:
    path = _base() / "sources" / source_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def job_dir(job_id: str) -> Path:
    path = _base() / "jobs" / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def new_id(prefix: str) -> str:
    short = uuid.uuid4().hex[:6]
    return f"{prefix}_{short}"


import os
import time

def read_json(path: Path) -> dict:
    for attempt in range(5):
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    return json.loads(content)
        except Exception:
            if attempt == 4:
                raise
            time.sleep(0.05)
    return {}


def write_json(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(5):
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(obj, f, indent=2)
            return
        except Exception:
            if attempt == 4:
                raise
            time.sleep(0.05)


