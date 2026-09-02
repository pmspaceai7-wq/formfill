# Phase 1 — Read the form's fields

**You get.** Upload a PDF, get back a complete `FormSchema` plus a PNG per page. This is the foundation — everything else reads what this phase produces.

**Files.** `backend/app/pdf_read.py`, `backend/app/labels.py`, `backend/app/pdf_render.py`, `backend/app/models.py`, `backend/app/debug.py`, `backend/app/main.py` (three routes), `docs/SCHEMA.md`.

> ### PROMPT — Phase 1
>
> Implement form parsing. Read `docs/SCHEMA.md` first — produce exactly that `FormSchema` shape.
>
> **Use `pypdf`, `pdfplumber` and `pypdfium2` only. PyMuPDF/fitz is AGPL and forbidden.**
>
> 1. `app/models.py` — Pydantic models: `FormField`, `PageInfo`, `FormSchema`, matching `docs/SCHEMA.md` exactly.
> 2. `app/pdf_read.py` — `parse_form(pdf_path) -> FormSchema`:
>
>     - If `PdfReader.get_fields()` is empty or missing, raise `NoAcroFormError`. Do **not** build a fallback detector.
>     - Walk each page's `/Annots`, keeping entries whose `/Subtype` is `/Widget`. Resolve indirect objects.
>     - `raw_name` = the fully-qualified name: walk `/Parent`, collect each `/T`, join with `.`.
>     - Type from `/FT` plus the `/Ff` bitfield: `/Tx` → `text`, or `multiline_text` if bit 4096 is set. `/Btn` → `checkbox`, unless bit 65536 (pushbutton — **skip these entirely**) or bit 32768 (radio). `/Ch` → `dropdown` if bit 131072 else `listbox`. `/Sig` → `signature`, always `read_only`.
>     - `required` = `/Ff` bit 2. `read_only` = `/Ff` bit 1.
>     - `max_len` from `/MaxLen`. `options` from `/Opt` — entries may be a plain string **or** a `[export_value, display_value]` pair; handle both and store the export value.
>     - **`on_state` for checkboxes and radios**: read the widget's `/AP` → `/N` dictionary and take the key that is not `/Off`. It is often `/Yes` but frequently something else. Store it verbatim. Writing `"Yes"` to a checkbox whose on-state is `/1` silently does nothing — this is the single most common bug in PDF form filling.
>     - `tooltip` from `/TU`.
>     - `bbox`: read `/Rect` (PDF points, **bottom-left origin**), then convert to normalised **top-left** origin against that page's MediaBox: `x0/W`, `1-(y1/H)`, `x1/W`, `1-(y0/H)`. Clamp to 0–1. Skip zero-area rectangles.
>     - Radio groups: emit **one** field for the group, with each child button's on-state as an entry in `options`.
> 3. `app/labels.py` — `label_for(field, page_words) -> str`:
>
>     - If `/TU` exists and is longer than 3 characters, use it as the label. USCIS-style forms put the real question there and it beats anything geometric.
>     - Otherwise take page words from `pdfplumber` and pick the nearest text: first look left on the same horizontal band (vertical overlap with the field box), then directly above within 1.5× the field height. Nearest edge-to-edge distance wins. Strip a trailing `:`.
>     - If nothing is found, fall back to `raw_name`. Never return an empty label.
> 4. `app/pdf_render.py` — `render_pages(pdf_path, out_dir)` using `pypdfium2` at 150 DPI, writing `page-{n}.png`, returning per-page width/height in PDF points. Cap at 60 pages for v0.
> 5. Routes in `main.py`:
>
>     - `POST /api/forms` — multipart upload of one PDF. Reject non-PDF by magic bytes (`%PDF`) and anything over `MAX_UPLOAD_MB`. Save to `data/forms/{form_id}/original.pdf`, parse, render pages, write `schema.json`, return the `FormSchema`. On `NoAcroFormError` return **400** with `{"error":"This PDF has no fillable fields. v0 supports fillable PDF forms."}`.
>     - `GET /api/forms/{form_id}` — the stored `FormSchema`.
>     - `GET /api/forms/{form_id}/pages/{n}` — the PNG as a `FileResponse`.
> 6. `app/debug.py` — a CLI: `python -m app.debug <file.pdf>` printing a table of page, type, raw_name, label, tooltip, bbox for every field, and a summary count by type. **You will use this constantly.**
>
> Do not modify files outside the list above.

**Check.** Run the debug CLI on all three sample forms. Every field must have a sensible label, every checkbox a non-null `on_state`, and every bbox four numbers between 0 and 1. Eyeball twenty labels against the actual PDF — this is the accuracy ceiling for the whole product, so it is worth ten minutes.

**Watch out.** Pushbuttons (Print, Reset, Add Item) are not input fields — skipping them removes a lot of noise from USCIS forms. And if `bbox` values come out looking upside down, the y-flip is wrong; fix it here, never in the frontend.

