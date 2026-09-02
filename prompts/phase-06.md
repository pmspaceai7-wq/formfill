# Phase 6 — Export the filled PDF

**You get.** A downloaded PDF that opens correctly, with the values in the right places.

**Files.** `backend/app/pdf_write.py`, `backend/app/main.py` (one route), `frontend/src/components/Toolbar.tsx`.

> ### PROMPT — Phase 6
>
> Implement filled-PDF export.
>
> 1. `app/pdf_write.py` — `write_filled(form_id, values, flatten=False) -> Path` using `pypdf`:
>
>     - `writer = PdfWriter(clone_from=reader)`. Do **not** build the writer with `add_page()` in a loop — that drops the `/AcroForm` dictionary and silently produces an unfillable, empty-looking PDF. This is the number-one cause of "it says it filled but the file is blank".
>     - Write values with `writer.update_page_form_field_values(page, {raw_name: value}, auto_regenerate=False)`, per page, keyed by the field's **fully-qualified** `raw_name`.
>     - Call `writer.set_need_appearances_writer(True)` so viewers render the values.
>     - Checkboxes and radios: write the field's stored `on_state`, not the string `"Yes"`.
>     - Skip empty and null values entirely — do not write empty strings.
>     - If `flatten=True`, pass `flatten=True` to `update_page_form_field_values` and then `writer.remove_annotations(subtypes="/Widget")`. The result must contain no `/AcroForm` key.
>     - Write to `data/jobs/{job_id}/filled.pdf` or `data/forms/{form_id}/filled.pdf`.
> 2. **Read-back assertion.** After writing, reopen the output with a fresh `PdfReader`, call `get_fields()`, and assert every non-empty value you wrote is present. Raise if not. Keep this in the code path, not just in a test — it turns a silent wrong-output bug into a loud error.
> 3. `POST /api/forms/{form_id}/export` — body `{values, flatten}`. Returns the PDF as a `FileResponse` with `Content-Disposition: attachment` naming it `{original-stem}-filled.pdf`.
> 4. Toolbar: a **Download filled PDF** button opening a small dialog with a flatten toggle — "Flatten: the values become part of the page and can no longer be edited. Leave off if you want to keep editing in a PDF reader." Then download.
>
> Do not modify files outside the list above.

**Check.** Export unflattened, open it in a PDF reader, and confirm every value is visible and the fields are still editable. Export flattened and confirm the values are visible and the fields are gone. Do this on all three sample forms — different form authors produce very different PDFs.

