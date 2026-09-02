"""
CLI debug tool — run with:
    python -m app.debug <file.pdf>
"""
from __future__ import annotations

import sys
from pathlib import Path

import pdfplumber

from app.pdf_read import NoAcroFormError, parse_form
from app.labels import label_for


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python -m app.debug <file.pdf>")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(f"File not found: {pdf_path}")
        sys.exit(1)

    print(f"\nParsing: {pdf_path.name}")
    print("=" * 80)

    try:
        schema = parse_form(pdf_path)
    except NoAcroFormError as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    # Build label map using pdfplumber words
    with pdfplumber.open(str(pdf_path)) as plumber_pdf:
        plumber_pages = plumber_pdf.pages

        # Re-label fields using geometric word proximity
        for field in schema.fields:
            page_idx = field.page - 1
            if page_idx < len(plumber_pages):
                raw_words = plumber_pages[page_idx].extract_words()
                # Normalise word coords to 0-1
                pg = plumber_pages[page_idx]
                pw, ph = pg.width, pg.height
                norm_words = []
                for w in raw_words:
                    norm_words.append({
                        "x0": w["x0"] / pw,
                        "x1": w["x1"] / pw,
                        "top": w["top"] / ph,
                        "bottom": w["bottom"] / ph,
                        "text": w["text"],
                    })
                computed = label_for(field, norm_words)
                if computed != field.label:
                    field.label = computed

    # Print table
    header = f"{'Page':>4}  {'Type':<15}  {'Label':<40}  {'raw_name':<35}  {'bbox'}"
    print(header)
    print("-" * len(header))

    counts: dict[str, int] = {}
    for f in schema.fields:
        counts[f.type] = counts.get(f.type, 0) + 1
        bbox_str = "[{:.3f},{:.3f},{:.3f},{:.3f}]".format(*f.bbox)
        label_display = (f.label[:38] + "..") if len(f.label) > 40 else f.label
        raw_display = (f.raw_name[:33] + "..") if len(f.raw_name) > 35 else f.raw_name
        on = f"  on={f.on_state}" if f.on_state else ""
        print(f"{f.page:>4}  {f.type:<15}  {label_display:<40}  {raw_display:<35}  {bbox_str}{on}")

    print("\n" + "=" * 80)
    print(f"Total fields: {len(schema.fields)}  |  Pages: {schema.page_count}")
    print("Breakdown:")
    for ftype, cnt in sorted(counts.items()):
        print(f"  {ftype:<20} {cnt}")

    # Validation summary
    bad_bbox = [f for f in schema.fields if not all(0 <= v <= 1 for v in f.bbox)]
    bad_cb   = [f for f in schema.fields if f.type == "checkbox" and not f.on_state]
    print(f"\nValidation:")
    print(f"  bbox out of range : {len(bad_bbox)}")
    print(f"  checkboxes no on_state: {len(bad_cb)}")
    if bad_bbox:
        print("  BAD BBOX fields:", [f.raw_name for f in bad_bbox[:5]])
    if bad_cb:
        print("  BAD CHECKBOX fields:", [f.raw_name for f in bad_cb[:5]])


if __name__ == "__main__":
    main()
