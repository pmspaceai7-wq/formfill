"""
postprocess.py — deterministic validation of a proposed field value.

Shared by both fill paths (local matching and AI). Previously duplicated in
fill.py and fill_local.py with slightly different behaviour, which meant the
two modes could disagree about the same value. One implementation now.

Nothing here ever asks a model to self-correct — it either cleans the value
deterministically or drops it.
"""
from __future__ import annotations

import logging
import re
from typing import Optional

from rapidfuzz import fuzz, process

from app.models import FormField

logger = logging.getLogger(__name__)

MAX_VALUE_LEN = 500          # injection / runaway guard
OPTION_ACCEPT = 75           # rapidfuzz score to snap a value onto an option

_TRUTHY = {"yes", "y", "true", "1", "x", "on", "checked", "✓"}
_FALSY = {"no", "n", "false", "0", "off", "unchecked", ""}


def closest_option(value: str, options: list[str]) -> Optional[str]:
    """Snap a value onto the nearest valid option, or None if nothing is close."""
    if not options:
        return None
    v = value.strip()
    if not v:
        return None
    # Exact, case-insensitive.
    for opt in options:
        if opt.strip().lower() == v.lower():
            return opt
    hit = process.extractOne(
        v, options, scorer=fuzz.WRatio, score_cutoff=OPTION_ACCEPT
    )
    return hit[0] if hit else None


def clean_value(value: str, field: FormField) -> Optional[str]:
    """
    Validate and normalise `value` for `field`.
    Returns the cleaned value, or None if it should not be written.
    """
    if value is None:
        return None
    if not isinstance(value, str):
        return None

    val = value.strip()
    if not val:
        return None

    if len(val) > MAX_VALUE_LEN:
        logger.warning(
            "Dropping value for %s — %d chars exceeds guard", field.field_id, len(val)
        )
        return None

    # Never write into fields the user cannot edit.
    if field.read_only or field.type == "signature":
        return None

    # --- Choice fields: must land on a real option -----------------------
    if field.type in ("dropdown", "listbox"):
        if field.options:
            return closest_option(val, field.options)
        return val

    if field.type == "radio":
        if field.options:
            return closest_option(val, field.options)
        return None

    if field.type == "checkbox":
        low = val.lower()
        on = field.on_state or "Yes"
        if low in _TRUTHY or low == on.lower().strip():
            return on
        if low in _FALSY:
            return None
        # A non-boolean value on a checkbox is meaningless — drop it.
        return None

    # --- Text fields ------------------------------------------------------
    if field.type == "text":
        val = re.sub(r"[\r\n]+", " ", val).strip()
        # Comb fields (digit-per-box) hold no separators.
        if field.is_comb:
            val = re.sub(r"[^\w]", "", val)

    if field.max_len and len(val) > field.max_len:
        # Truncating an atomic value corrupts it: "aswathisajik1@gmail.com" cut
        # to 10 chars is "aswathisaj", a wrong address that looks filled-in and
        # will be missed on review. An empty box the user can complete is safer
        # than a plausible-looking wrong one. Prose can still be cut.
        if _is_atomic(val):
            logger.debug(
                "Dropping %s — %d chars will not fit max_len=%d without corrupting it",
                field.field_id, len(val), field.max_len,
            )
            return None
        val = val[: field.max_len].strip()

    return val or None


def _is_atomic(value: str) -> bool:
    """
    True for values that are meaningless when cut short — emails, phone
    numbers, IDs, dates, single words. Multi-word prose survives truncation
    with its meaning mostly intact; these do not.
    """
    v = value.strip()
    if "@" in v:
        return True
    if re.fullmatch(r"[\d\s()+./-]+", v):     # phone, date, zip, SSN, A-number
        return True
    if len(v.split()) == 1:                    # a single token
        return True
    return False


def clean_batch(
    values: dict[str, str], fields_by_id: dict[str, FormField]
) -> dict[str, str]:
    """Clean a whole {field_id: value} mapping, dropping anything invalid."""
    out: dict[str, str] = {}
    for fid, raw in values.items():
        field = fields_by_id.get(fid)
        if field is None:
            continue
        cleaned = clean_value(raw, field)
        if cleaned:
            out[fid] = cleaned
    return out
