"""
profile.py — the persistent fact store.

This is what makes the second form faster than the first: facts learned from any
source document accumulate here and are reused on every later fill.

Storage is a JSON file per profile under data/profiles/<id>/profile.json —
consistent with AGENTS.md rule 4 (no database; metadata is JSON files).

Shape:
{
  "profile_id": "default",
  "facts": {
    "person.first_name": {
      "value": "Aswathi",
      "source": "resume.pdf",
      "updated_at": "2026-09-02T18:04:11Z"
    }
  }
}

Provenance is kept per fact so a future UI can say "from resume.pdf" and so a
user correction can outrank a document-derived guess.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import settings
from app.facts import group_of
from app.storage import read_json, write_json


def profile_dir(profile_id: str) -> Path:
    path = Path(settings.DATA_DIR) / "profiles" / profile_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _profile_path(profile_id: str) -> Path:
    return profile_dir(profile_id) / "profile.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_profile(profile_id: str | None = None) -> dict:
    """Return the raw profile document. Never raises — missing means empty."""
    pid = profile_id or settings.PROFILE_ID
    path = _profile_path(pid)
    if not path.exists():
        return {"profile_id": pid, "facts": {}}
    try:
        data = read_json(path)
    except Exception:
        return {"profile_id": pid, "facts": {}}
    data.setdefault("profile_id", pid)
    data.setdefault("facts", {})
    return data


def get_values(profile_id: str | None = None) -> dict[str, str]:
    """Flatten to {fact_key: value} — what match.py and fill_local.py want."""
    doc = load_profile(profile_id)
    return {
        key: entry.get("value", "")
        for key, entry in doc.get("facts", {}).items()
        if entry.get("value")
    }


def merge_facts(
    new_facts: dict[str, str],
    source: str = "unknown",
    profile_id: str | None = None,
    user_edited: bool = False,
) -> dict:
    """
    Merge newly extracted facts into the profile and persist.

    New values overwrite old ones, EXCEPT that a document-derived fact never
    overwrites one the user corrected by hand — a manual correction is the
    strongest signal we have and re-uploading a stale resume shouldn't undo it.
    """
    pid = profile_id or settings.PROFILE_ID
    doc = load_profile(pid)
    facts = doc.setdefault("facts", {})

    changed = 0
    for key, value in new_facts.items():
        value = (value or "").strip()
        if not value:
            continue
        existing = facts.get(key)
        if existing and existing.get("user_edited") and not user_edited:
            continue
        if existing and existing.get("value") == value:
            continue
        facts[key] = {
            "value": value,
            "source": source,
            "updated_at": _now(),
            "user_edited": user_edited,
        }
        changed += 1

    doc["updated_at"] = _now()
    write_json(_profile_path(pid), doc)
    return {"changed": changed, "total": len(facts)}


def set_fact(
    key: str, value: str, profile_id: str | None = None
) -> dict:
    """User-driven single-fact edit. Marks the fact as user_edited."""
    return merge_facts(
        {key: value}, source="user", profile_id=profile_id, user_edited=True
    )


def delete_fact(key: str, profile_id: str | None = None) -> bool:
    pid = profile_id or settings.PROFILE_ID
    doc = load_profile(pid)
    if key in doc.get("facts", {}):
        del doc["facts"][key]
        doc["updated_at"] = _now()
        write_json(_profile_path(pid), doc)
        return True
    return False


def clear_profile(profile_id: str | None = None) -> None:
    pid = profile_id or settings.PROFILE_ID
    write_json(
        _profile_path(pid),
        {"profile_id": pid, "facts": {}, "updated_at": _now()},
    )


def as_items(profile_id: str | None = None) -> list[dict]:
    """Profile facts as a UI-friendly sorted list with grouping."""
    doc = load_profile(profile_id)
    items = [
        {
            "key": key,
            "value": entry.get("value", ""),
            "group": group_of(key),
            "source": entry.get("source", "unknown"),
            "updated_at": entry.get("updated_at", ""),
            "user_edited": bool(entry.get("user_edited")),
        }
        for key, entry in doc.get("facts", {}).items()
    ]
    items.sort(key=lambda i: (i["group"], i["key"]))
    return items
