from __future__ import annotations

import re

from app.models import FormField

# Words that end a label when scanning leftwards — they belong to the previous
# field's caption, not this one.
_STOP_TOKENS = {"|", "▶", "►"}

# A trailing item number like "3.a." is part of the caption's numbering, not
# the label text, but it does mark where the caption begins.
_RE_ITEM_NUM = re.compile(r"^\d+\.?[a-z]?\.?$")


def _join(words: list[dict]) -> str:
    text = " ".join(str(w.get("text", "")).strip() for w in words)
    text = re.sub(r"\s+", " ", text).strip()
    return text.strip(" .:-")


def _phrase_left(field: FormField, page_words: list[dict]) -> str:
    """
    Collect the run of words immediately left of the field on the same line.

    Real forms caption fields as "3.a. Family Name (Last Name)" — taking only
    the nearest word gives "Name" or worse "(Last", which is a much weaker
    matching signal than the whole phrase.

    The walk stops at the first sign of a different caption: a wide gap, an
    item number, or a closing parenthesis (captions end "...(Last Name)", so a
    ')' scanning leftwards means we have reached the end of an EARLIER
    caption belonging to another field).
    """
    x0, y0, x1, y1 = field.bbox
    field_h = y1 - y0
    field_cy = (y0 + y1) / 2
    tol = max(field_h * 0.6, 0.008)

    same_line = [
        w for w in page_words
        if w.get("x1", 0) <= x0 + 0.002
        and abs(((w.get("top", 0) + w.get("bottom", 0)) / 2) - field_cy) <= tol
    ]
    if not same_line:
        return ""
    same_line.sort(key=lambda w: w.get("x0", 0))

    picked: list[dict] = []
    prev_x0 = x0
    for w in reversed(same_line):
        gap = prev_x0 - w.get("x1", 0)
        if gap > 0.035 and picked:
            break
        text = str(w.get("text", "")).strip()
        if text in _STOP_TOKENS:
            break
        # A caption that already ended belongs to a previous field.
        if picked and text.endswith(")"):
            break
        picked.append(w)
        prev_x0 = w.get("x0", 0)
        if _RE_ITEM_NUM.match(text):
            break
        if len(picked) >= 8:
            break

    picked.reverse()
    while picked and _RE_ITEM_NUM.match(str(picked[0].get("text", "")).strip()):
        picked.pop(0)
    return _join(picked)


def _phrase_above(field: FormField, page_words: list[dict]) -> str:
    """
    Collect the caption line sitting directly above the field.

    Only words horizontally overlapping THIS field are considered — a caption
    row above a group of side-by-side boxes ("Family Name  Given Name  Middle
    Name") must not bleed its neighbours' captions into this field's label.
    """
    x0, y0, x1, y1 = field.bbox
    field_h = y1 - y0

    candidates = [
        w for w in page_words
        if w.get("bottom", 0) <= y0 + 0.002
        and (y0 - w.get("bottom", 0)) <= field_h * 1.6
        and w.get("x0", 0) < x1 and w.get("x1", 0) > x0
    ]
    if not candidates:
        return ""

    # Keep only the nearest text line above.
    nearest_bottom = max(w.get("bottom", 0) for w in candidates)
    line = [
        w for w in candidates
        if abs(w.get("bottom", 0) - nearest_bottom) <= field_h * 0.6
    ]
    line.sort(key=lambda w: w.get("x0", 0))

    while line and _RE_ITEM_NUM.match(str(line[0].get("text", "")).strip()):
        line.pop(0)
    return _join(line[:10])


def label_for(field: FormField, page_words: list[dict]) -> str:
    """
    Determine a human-readable label for a field.

    Priority:
    1. The caption phrase to the LEFT on the same line — on real forms this is
       the field's own caption and is far more specific than the tooltip, which
       is usually shared by every field in the section.
    2. The caption line directly ABOVE.
    3. The /TU tooltip.
    4. raw_name as a last resort.

    Note the deliberate ordering: earlier versions preferred the tooltip, but on
    USCIS-style forms dozens of fields share one section-wide tooltip, which
    makes them indistinguishable to any matcher. The geometric caption is what
    actually identifies the field.
    """
    left = _phrase_left(field, page_words)
    if len(left) >= 3:
        return left

    above = _phrase_above(field, page_words)
    if len(above) >= 3:
        return above

    if left:
        return left
    if above:
        return above

    if field.tooltip and len(field.tooltip.strip()) > 3:
        return field.tooltip.strip()

    return field.raw_name or f"field_{field.field_id}"
