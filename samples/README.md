# samples/

Put your three test forms here before Phase 1, plus the source documents that
contain the answers.

Suggested:
- `i-129.pdf` — complex, many pages, radio groups and checkboxes
- `w-9.pdf` — short, simple
- one more fillable form from your own use case

Source documents (any of): a passport or ID with a text layer, a company letter,
a previous filled form, a CSV of details.

All three forms must be **fillable (AcroForm) PDFs** — v0 rejects flat and
scanned PDFs by design. Check with:

    cd backend && python -m app.debug ../samples/i-129.pdf
