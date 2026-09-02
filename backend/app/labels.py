from __future__ import annotations

from app.models import FormField


def label_for(field: FormField, page_words: list[dict]) -> str:
    """
    Determine a human-readable label for a field.

    Priority:
    1. /TU tooltip if longer than 3 chars (already stored in field.tooltip)
    2. Nearest word to the LEFT on the same horizontal band
    3. Nearest word DIRECTLY ABOVE within 1.5x field height
    4. raw_name as fallback
    """
    if field.tooltip and len(field.tooltip.strip()) > 3:
        return field.tooltip.strip()

    x0, y0, x1, y1 = field.bbox
    field_h = y1 - y0
    field_cx = (x0 + x1) / 2
    field_cy = (y0 + y1) / 2

    # Vertical band: words whose vertical centre overlaps the field box
    # (with a small tolerance of 0.5 * field_h)
    tolerance = max(field_h * 0.5, 0.01)

    best_left: tuple[float, str] | None = None   # (distance, text)
    best_above: tuple[float, str] | None = None  # (distance, text)

    for word in page_words:
        wx0 = word.get("x0", 0)
        wy0 = word.get("top", 0)
        wx1 = word.get("x1", 0)
        wy1 = word.get("bottom", 0)
        text = str(word.get("text", "")).strip().rstrip(":")
        if not text:
            continue

        wcx = (wx0 + wx1) / 2
        wcy = (wy0 + wy1) / 2

        # LEFT: word ends to the left of the field, vertical centres overlap
        if wx1 <= x0 and abs(wcy - field_cy) <= tolerance:
            dist = x0 - wx1
            if best_left is None or dist < best_left[0]:
                best_left = (dist, text)

        # ABOVE: word is above the field, within 1.5x field height, horizontally overlapping
        elif wy1 <= y0 and (y0 - wy1) <= field_h * 1.5:
            horiz_overlap = not (wx1 < x0 or wx0 > x1)
            if horiz_overlap:
                dist = y0 - wy1
                if best_above is None or dist < best_above[0]:
                    best_above = (dist, text)

    if best_left:
        return best_left[1]
    if best_above:
        return best_above[1]

    return field.raw_name or f"field_{field.field_id}"
