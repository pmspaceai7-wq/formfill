# Phase 3 — Take in the source material

**You get.** Upload PDFs, drop a whole folder, or paste text — all of it turned into plain text the AI can read.

**Files.** `backend/app/sources.py`, `backend/app/main.py` (two routes), `frontend/src/components/SourcePanel.tsx`, `frontend/src/lib/api.ts`.

> ### PROMPT — Phase 3
>
> Implement source-material intake.
>
> 1. `app/sources.py` — `extract_text(path) -> str` per file type:
>
>     - PDF: `pdfplumber`, page by page, joined with `\n\n--- page N ---\n\n`.
>     - DOCX: `python-docx`, paragraphs plus table cell text.
>     - TXT / CSV / MD: read directly; render CSV rows as `column: value` lines, which models read far more reliably than raw commas.
>     - Anything else: skip with a recorded warning.
>     - **If a PDF yields fewer than 50 characters**, record `{"file": name, "warning": "no text layer — probably a scan. OCR is not supported in v0."}` and continue. Do not attempt OCR.
> 2. `POST /api/sources` — multipart accepting many files plus an optional `text` field for pasted content. Save the files under `data/sources/{source_id}/files/`, extract each, and write `text.json` in the shape given at the end of this prompt. The response returns the source id, per-file character counts, and warnings — never the full text.
> 3. `GET /api/sources/{source_id}` — the same summary.
> 4. `SourcePanel.tsx` — a side panel with: a multi-file dropzone; a **folder** picker using `<input type="file" webkitdirectory>`, recursing and keeping only accepted extensions; and a textarea for pasted information. Show each accepted file as a row with its name, size, and character count once processed, and show warnings prominently in amber — a user whose scanned passport produced no text needs to know before they wonder why the fill was empty.
>
> Do not modify files outside the list above.
>
> `text.json` shape:
>
> ```json
> {"source_id": "s_x1", "items": [
>   {"name": "passport.pdf", "chars": 1840, "text": "..."},
>   {"name": "(pasted)", "chars": 210, "text": "..."}
> ], "warnings": []}
> ```

**Check.** Upload two PDFs plus a folder of three, and paste a paragraph. `text.json` must contain all six with plausible character counts. Feed it a scanned PDF and confirm the amber warning appears rather than a silent empty entry.

