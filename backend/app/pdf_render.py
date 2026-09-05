from __future__ import annotations

from pathlib import Path
import pypdfium2 as pdfium

MAX_PAGES = 60
DPI = 150
SCALE = DPI / 72.0  # PDF points are 72 DPI


def render_single_page(pdf_path: Path, page_num: int, out_dir: Path) -> Path | None:
    """
    Render a single page on demand (1-indexed) as a PNG at 150 DPI.
    Saves to out_dir / f"page-{page_num}.png".
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"page-{page_num}.png"
    if out_path.exists():
        return out_path

    try:
        pdf = pdfium.PdfDocument(str(pdf_path))
        idx = page_num - 1
        if 0 <= idx < len(pdf):
            page = pdf[idx]
            bitmap = page.render(scale=SCALE)
            pil_image = bitmap.to_pil()
            pil_image.save(str(out_path), format="PNG")
            return out_path
    except Exception:
        pass
    return None


def render_pages(pdf_path: Path, out_dir: Path, max_initial: int = 3) -> list[dict]:
    """
    Fast initial page render. Renders the first few pages synchronously for instant view,
    and returns page dimensions. Remaining pages are rendered on demand in ~30ms.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(str(pdf_path))
    result = []

    count = min(len(pdf), MAX_PAGES)
    for i in range(count):
        page = pdf[i]
        width_pts = page.get_width()
        height_pts = page.get_height()

        # Render first max_initial pages immediately for instant first-screen display
        if i < max_initial:
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
