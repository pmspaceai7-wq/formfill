"""
pdf_export.py — Write filled field values back into the original PDF.

Uses the same pypdf technique as pdf_autofiller/pdf_writer.py:
  - clone document root to preserve formatting
  - resolve button (/Btn) fields to their correct on/off state names
  - batch-update all pages, fallback to per-field on error
"""
from __future__ import annotations

import logging
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import BooleanObject, NameObject

from app.models import FormField, FormSchema
from app.storage import form_dir, read_json

logger = logging.getLogger(__name__)

# Values the pdf_autofiller treats as checkbox "on"
_BUTTON_TRUTHY = {"true", "yes", "on", "1", "checked", "x", "y"}
_BUTTON_FALSY  = {"false", "no", "off", "0", "unchecked", "n", ""}


def _button_states(reader: PdfReader, raw_name: str) -> list[str]:
    """Return the valid state names for a button field (e.g. ['/Yes', '/Off'])."""
    fields = reader.get_fields() or {}
    field_obj = fields.get(raw_name)
    if not field_obj:
        return []
    try:
        states = field_obj.get("/_States_")
        if states:
            return [str(s) for s in states]
    except Exception:
        pass
    try:
        ap = field_obj.get("/AP")
        normal = ap.get("/N") if hasattr(ap, "get") else None
        if normal and hasattr(normal, "keys"):
            return [str(k) for k in normal.keys()]
    except Exception:
        pass
    return []


def _resolve_button(reader: PdfReader, raw_name: str, value: str) -> str | None:
    """Map a user value to a valid PDF button state name, or None if not mappable."""
    states = _button_states(reader, raw_name)
    state_lookup: dict[str, str] = {}
    for s in states:
        clean = s.lstrip("/")
        formatted = "/" + clean
        state_lookup[clean.lower()] = formatted
        state_lookup[clean.strip().lower()] = formatted

    on_states = [v for k, v in state_lookup.items() if not k.strip().lower() in ("off", "")]
    norm = value.strip().lstrip("/").lower()
    raw_norm = value.lstrip("/").lower()

    if raw_norm in state_lookup:
        return state_lookup[raw_norm]
    if norm in state_lookup:
        return state_lookup[norm]
    if norm in _BUTTON_TRUTHY:
        return on_states[0] if on_states else "/Yes"
    if norm in _BUTTON_FALSY:
        return "/Off"
    return None


def export_filled_pdf(
    form_id: str,
    values: dict[str, str],  # {field_id: value}
    output_path: Path,
) -> int:
    """
    Write `values` into the original PDF for `form_id`.
    Returns the number of fields written.
    Raises FileNotFoundError if the original PDF is missing.
    """
    fdir = form_dir(form_id)
    schema_data = read_json(fdir / "schema.json")
    schema = FormSchema(**schema_data)

    # Build field_id → FormField lookup
    by_id: dict[str, FormField] = {f.field_id: f for f in schema.fields}

    # Find original PDF path
    pdf_path = fdir / "original.pdf"
    if not pdf_path.exists():
        # Some setups save it differently — search for any .pdf in fdir
        pdfs = list(fdir.glob("*.pdf"))
        if not pdfs:
            raise FileNotFoundError(f"Original PDF not found in {fdir}")
        pdf_path = pdfs[0]

    reader = PdfReader(str(pdf_path))
    writer = PdfWriter()
    writer.clone_reader_document_root(reader)

    # Sanitize AcroForm: strip XFA to avoid blank XFA overrides in viewers (Chrome/Edge/Acrobat)
    # and signal viewers that form appearances must be respected.
    cat = writer._root_object
    if NameObject("/AcroForm") in cat:
        try:
            af = cat[NameObject("/AcroForm")].get_object()
            if NameObject("/XFA") in af:
                del af[NameObject("/XFA")]
            af[NameObject("/NeedAppearances")] = BooleanObject(True)
        except Exception:
            logger.debug("Could not modify AcroForm catalog flags", exc_info=True)

    # Translate field_id values → raw_name values (what pypdf expects)
    raw_values: dict[str, str] = {}
    written = 0

    for field_id, user_val in values.items():
        field = by_id.get(field_id)
        if not field or not user_val:
            continue

        raw = field.raw_name
        val = user_val

        # Button fields (checkbox/radio) need exact state name
        if field.type in ("checkbox", "radio"):
            resolved = _resolve_button(reader, raw, val)
            if resolved is None:
                logger.debug("Could not resolve button value %r for %s", val, raw)
                continue
            val = resolved

        raw_values[raw] = val
        written += 1

    # Write to all pages. Do not flatten to avoid double-rendering / ghost text blur;
    # removing XFA and setting NeedAppearances ensures crisp native AcroForm appearance.
    if raw_values:  # skip entirely if nothing to write (avoids pypdf NoneType crash)
        from pypdf.generic import NameObject as _NO, ArrayObject as _AO
        for page in writer.pages:
            # Skip pages that have no /Annots (no form widgets) to avoid pypdf crash
            # when it tries to call .items() on a None annotation list
            try:
                page_obj = page.get_object() if hasattr(page, "get_object") else page
                if _NO("/Annots") not in page_obj:
                    continue
            except Exception:
                pass
            try:
                writer.update_page_form_field_values(page, raw_values)
            except Exception:
                logger.debug("Batch update failed on page, trying per-field", exc_info=True)
                for rname, rval in raw_values.items():
                    try:
                        writer.update_page_form_field_values(page, {rname: rval})
                    except Exception:
                        logger.debug("Failed to write field %s", rname, exc_info=True)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as f:
        writer.write(f)

    logger.info("Exported %d fields → %s", written, output_path)
    return written
