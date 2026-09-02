# Phase 7 — Make it hold together

**You get.** Something you can show someone without narrating excuses.

**Files.** Small changes across both sides, plus `README.md`.

> ### PROMPT — Phase 7
>
> Tighten up FormFill v0 for a demo.
>
> 1. Run the full journey on all three forms in `samples/` and fix what breaks: upload form → boxes appear → add sources → fill → edit → download.
> 2. Every failure path must show a useful message, never "Something went wrong": a PDF with no fillable fields, a file too large, a non-PDF, an AI call that fails or times out, a scanned source with no text, and the backend being down.
> 3. Add loading states everywhere something takes more than half a second, and disable buttons while their action is in flight.
> 4. Add `backend/tests/test_pdf.py` covering the three sample forms: parsing produces the expected field count; every checkbox has an `on_state`; every bbox is within 0–1; and a write-then-read-back round trip returns the values that were written. `pytest` must pass with no API key set.
> 5. Write `README.md`: what it does, what it deliberately does not do yet, prerequisites, how to run both halves, where `data/` lives, and how to inspect a PDF with `python -m app.debug`.
> 6. Add a `.env.example` with every variable and no values.
>
> Report anything you could not fix rather than working around it silently.

**Check.** From a clean clone: install, add a key, run both halves, and complete the full journey without touching a terminal in between.
