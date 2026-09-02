from __future__ import annotations

from pathlib import Path
from typing import Optional

import pypdf

from app.models import FormField, FormSchema, PageInfo


class NoAcroFormError(Exception):
    pass


def _ff(annot_obj: dict) -> int:
    """Return /Ff integer or 0."""
    ff = annot_obj.get("/Ff")
    if ff is None:
        return 0
    return int(ff)


def _resolve(obj):
    """Resolve an indirect object if needed."""
    if isinstance(obj, pypdf.generic.IndirectObject):
        return obj.get_object()
    return obj


def _fully_qualified_name(widget_obj: dict) -> str:
    """Walk /Parent chain collecting /T values, join with '.'."""
    parts: list[str] = []
    t = widget_obj.get("/T")
    if t:
        parts.append(str(t))
    parent = widget_obj.get("/Parent")
    while parent is not None:
        parent = _resolve(parent)
        if not isinstance(parent, dict):
            break
        t = parent.get("/T")
        if t:
            parts.append(str(t))
        parent = parent.get("/Parent")
    parts.reverse()
    return ".".join(parts)


def _on_state(widget_obj: dict) -> Optional[str]:
    """Read /AP /N and return the key that is not /Off."""
    ap = _resolve(widget_obj.get("/AP"))
    if not ap or not isinstance(ap, dict):
        return None
    n = _resolve(ap.get("/N"))
    if not n or not isinstance(n, dict):
        return None
    for key in n:
        if str(key) != "/Off":
            return str(key).lstrip("/")
    return None


def _options(widget_obj: dict) -> Optional[list[str]]:
    """Parse /Opt — each entry is a string or [export, display] pair."""
    opt = widget_obj.get("/Opt")
    if opt is None:
        return None
    result = []
    for entry in opt:
        entry = _resolve(entry)
        if isinstance(entry, (list, tuple)):
            result.append(str(_resolve(entry[0])))
        else:
            result.append(str(entry))
    return result or None


def _bbox_normalised(rect, page_width: float, page_height: float) -> Optional[list[float]]:
    """Convert PDF /Rect [x0,y0,x1,y1] (bottom-left) to normalised top-left."""
    if rect is None or len(rect) < 4:
        return None
    x0, y0, x1, y1 = [float(v) for v in rect]
    if abs(x1 - x0) < 0.001 or abs(y1 - y0) < 0.001:
        return None  # zero-area, skip
    if page_width == 0 or page_height == 0:
        return None
    nx0 = max(0.0, min(1.0, x0 / page_width))
    nx1 = max(0.0, min(1.0, x1 / page_width))
    # Flip y: PDF y is from bottom, we need from top
    ny0 = max(0.0, min(1.0, 1.0 - y1 / page_height))
    ny1 = max(0.0, min(1.0, 1.0 - y0 / page_height))
    return [nx0, ny0, nx1, ny1]


def parse_form(pdf_path: Path) -> FormSchema:
    """Parse a fillable PDF and return FormSchema."""
    reader = pypdf.PdfReader(str(pdf_path))

    acro = reader.trailer.get("/Root", {})
    acro = _resolve(acro)
    if isinstance(acro, dict):
        acro = _resolve(acro.get("/AcroForm"))

    raw_fields = reader.get_fields()
    if not raw_fields:
        raise NoAcroFormError("No AcroForm found")

    form_id = pdf_path.parent.name
    filename = pdf_path.name
    page_count = len(reader.pages)

    pages_info: list[PageInfo] = []
    for i, page in enumerate(reader.pages):
        mb = page.mediabox
        pages_info.append(PageInfo(
            number=i + 1,
            width=float(mb.width),
            height=float(mb.height),
            image=f"page-{i + 1}.png",
        ))

    # Build page dimensions lookup (0-indexed)
    page_dims: list[tuple[float, float]] = [
        (p.width, p.height) for p in pages_info
    ]

    fields: list[FormField] = []
    field_counter = 0

    # Track radio groups: raw_name -> FormField index
    radio_groups: dict[str, int] = {}

    for page_idx, page in enumerate(reader.pages):
        pw, ph = page_dims[page_idx]
        annots = page.get("/Annots")
        if not annots:
            continue

        for annot_ref in annots:
            annot = _resolve(annot_ref)
            if not isinstance(annot, dict):
                continue
            if str(annot.get("/Subtype")) != "/Widget":
                continue

            ft = str(annot.get("/FT") or "")
            # Inherit /FT from parent if missing
            if not ft:
                parent = _resolve(annot.get("/Parent"))
                if isinstance(parent, dict):
                    ft = str(parent.get("/FT") or "")

            ff_val = _ff(annot)

            # --- Determine type ---
            # Comb flag: bit 25 (1-indexed) = 0x1000000 = 16777216
            is_comb = bool(ff_val & 16777216)
            if ft == "/Tx":
                field_type = "multiline_text" if (ff_val & 4096) else "text"
            elif ft == "/Btn":
                if ff_val & 65536:       # pushbutton — skip
                    continue
                elif ff_val & 32768:     # radio
                    field_type = "radio"
                else:
                    field_type = "checkbox"
            elif ft == "/Ch":
                field_type = "dropdown" if (ff_val & 131072) else "listbox"
            elif ft == "/Sig":
                field_type = "signature"
            else:
                continue  # unknown type

            raw_name = _fully_qualified_name(annot)
            if not raw_name:
                parent = _resolve(annot.get("/Parent"))
                if isinstance(parent, dict):
                    raw_name = _fully_qualified_name(parent)
            if not raw_name:
                raw_name = f"field_{field_counter}"

            tooltip_raw = annot.get("/TU")
            if tooltip_raw is None:
                parent = _resolve(annot.get("/Parent"))
                if isinstance(parent, dict):
                    tooltip_raw = parent.get("/TU")
            tooltip = str(tooltip_raw).strip() if tooltip_raw else None

            rect_raw = annot.get("/Rect")
            bbox = _bbox_normalised(rect_raw, pw, ph)
            if bbox is None:
                continue

            required = bool(ff_val & 2)
            read_only = bool(ff_val & 1)

            max_len_raw = annot.get("/MaxLen")
            max_len = int(max_len_raw) if max_len_raw is not None else None

            # --- Radio group handling ---
            if field_type == "radio":
                group_key = raw_name
                if group_key in radio_groups:
                    # Add this button's on_state to existing group options
                    existing = fields[radio_groups[group_key]]
                    state = _on_state(annot)
                    if state and existing.options is not None and state not in existing.options:
                        existing.options.append(state)
                    continue
                else:
                    state = _on_state(annot)
                    options = [state] if state else []
                    field_counter += 1
                    fld = FormField(
                        field_id=f"fld_{field_counter:04d}",
                        raw_name=raw_name,
                        label=tooltip or raw_name,
                        tooltip=tooltip,
                        type="radio",
                        page=page_idx + 1,
                        bbox=bbox,
                        options=options,
                        on_state=None,
                        required=required,
                        read_only=read_only,
                    )
                    radio_groups[group_key] = len(fields)
                    fields.append(fld)
                    continue

            # --- Checkbox on_state ---
            on_state = None
            if field_type == "checkbox":
                on_state = _on_state(annot)
                if on_state is None:
                    on_state = "Yes"  # reasonable fallback

            options = _options(annot) if field_type in ("dropdown", "listbox") else None

            field_counter += 1
            fields.append(FormField(
                field_id=f"fld_{field_counter:04d}",
                raw_name=raw_name,
                label=tooltip or raw_name,
                tooltip=tooltip,
                type=field_type,
                page=page_idx + 1,
                bbox=bbox,
                options=options,
                on_state=on_state,
                max_len=max_len,
                is_comb=is_comb if field_type == "text" else False,
                required=required,
                read_only=read_only,
            ))

    return FormSchema(
        form_id=form_id,
        filename=filename,
        page_count=page_count,
        pages=pages_info,
        fields=fields,
    )
