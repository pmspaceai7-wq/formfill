"""
validate_fill.py — measure local-fill quality against a real form.

Not a test; a measuring tape. Run it after changing thresholds or the fact
vocabulary to see what actually happens on a real government form:

    python validate_fill.py ../samples/i129_sample_form.pdf ../samples/my_info.txt

Prints every match with its score and method so wrong matches are visible,
not just counted.
"""
from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from app.extract import extract_facts
from app.match import match_field, model_available
from app.pdf_read import parse_form
from app.postprocess import clean_value


def _apply_geometric_labels(pdf_path: str, schema) -> None:
    """Mirror what main.py does on upload, so validation sees real labels."""
    import pdfplumber
    from app.labels import label_for

    with pdfplumber.open(pdf_path) as pdf:
        page_cache: dict[int, list[dict]] = {}
        for field in schema.fields:
            idx = field.page - 1
            if idx >= len(pdf.pages):
                continue
            if idx not in page_cache:
                pg = pdf.pages[idx]
                pw, ph = pg.width, pg.height
                page_cache[idx] = [
                    {
                        "x0": w["x0"] / pw, "x1": w["x1"] / pw,
                        "top": w["top"] / ph, "bottom": w["bottom"] / ph,
                        "text": w["text"],
                    }
                    for w in pg.extract_words()
                ]
            field.label = label_for(field, page_cache[idx])


def main(pdf_path: str, source_path: str, show: str = "matched") -> None:
    schema = parse_form(Path(pdf_path))
    _apply_geometric_labels(pdf_path, schema)
    facts = extract_facts(Path(source_path).read_text(encoding="utf-8"))
    available = set(facts)

    print(f"Form:   {Path(pdf_path).name}")
    print(f"Fields: {len(schema.fields)}")
    print(f"Facts:  {len(facts)}  {sorted(facts)}")
    print(f"Embeddings available: {model_available()}")
    print("=" * 100)

    fillable = [
        f for f in schema.fields if not f.read_only and f.type != "signature"
    ]

    matched = []
    unmatched = []
    methods: Counter[str] = Counter()

    for field in fillable:
        hit = match_field(field, available)
        if hit is None:
            unmatched.append(field)
            continue
        value = clean_value(facts[hit.fact_key], field)
        if value is None:
            unmatched.append(field)
            continue
        matched.append((field, hit, value))
        methods[hit.method] += 1

    if show in ("matched", "all"):
        print(f"\nMATCHED ({len(matched)}):\n")
        for field, hit, value in sorted(matched, key=lambda m: m[1].score, reverse=True):
            label = (field.tooltip or field.label or "")[:58]
            print(
                f"  p{field.page:<3} {field.type:<14} {hit.score:.2f} {hit.method:<10} "
                f"{hit.fact_key:<24} = {value[:28]:<28} | {label}"
            )

    if show in ("unmatched", "all"):
        print(f"\nUNMATCHED ({len(unmatched)}) — first 40:\n")
        for field in unmatched[:40]:
            label = (field.tooltip or field.label or "")[:70]
            print(f"  p{field.page:<3} {field.type:<14} | {label}")

    print("\n" + "=" * 100)
    print(f"Fillable fields : {len(fillable)}")
    print(f"Matched         : {len(matched)}  ({len(matched)/max(len(fillable),1):.1%})")
    print(f"By method       : {dict(methods)}")
    distinct = len({m[1].fact_key for m in matched})
    print(f"Distinct facts used: {distinct} of {len(facts)} known")


if __name__ == "__main__":
    pdf = sys.argv[1] if len(sys.argv) > 1 else "../samples/i129_sample_form.pdf"
    src = sys.argv[2] if len(sys.argv) > 2 else "../samples/my_info.txt"
    mode = sys.argv[3] if len(sys.argv) > 3 else "matched"
    main(pdf, src, mode)
