from __future__ import annotations

from pathlib import Path

import pypdfium2 as pdfium

MAX_PAGES = 60
DPI = 150
SCALE = DPI / 72.0  # PDF points are 72 DPI


def render_pages(pdf_path: Path, out_dir: Path) -> list[dict]:
    """
    Render each page of pdf_path as a PNG at 150 DPI.
    Writes page-{n}.png into out_dir.
    Returns list of {"number": n, "width": pts, "height": pts}.
    Cap at MAX_PAGES pages.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(str(pdf_path))
    result = []

    count = min(len(pdf), MAX_PAGES)
    for i in range(count):
        page = pdf[i]
        width_pts = page.get_width()
        height_pts = page.get_height()

        bitmap = page.render(scale=SCALE)
        pil_image = bitmap.to_pil()
        out_path = out_dir / f"page-{i + 1}.png"
        pil_image.save(str(out_path), format="PNG")

        result.append({
            "number": i + 1,
            "width": width_pts,
            "height": height_pts,
        })

    return result
