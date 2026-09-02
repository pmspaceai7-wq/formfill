# Project State

**Current phase:** 7

| # | Phase | Status |
|---|---|---|
| 0 | Skeleton | done |
| 1 | Read form fields | done |
| 2 | Render with typable boxes | done |
| 3 | Source material intake | done |
| 4 | AI fill (backend) | done |
| 5 | Wire fill into UI | done |
| 6 | Export filled PDF | done |
| 7 | Make it hold together | not started |
| 8 | Local intelligence engine (embeddings/NER matching, persistent profile) | done |
| 9 | Profile UX (fill-once-reuse-forever, visible) | not started |

## Phase 8 measured results

Against `samples/i129_sample_form.pdf` (real I-129, 927 fillable fields) with
`samples/my_info.txt` as the only source, `FILL_MODE=local`, no API key:

| Metric | Value |
|---|---|
| Facts extracted from source | 16 |
| Fields filled | 192 (20.7%) |
| Match method | 190 fuzzy / 2 embedding |
| Fields written to exported PDF | 192 |
| Fill from *persisted profile with an empty source* | 192 |

20.7% is the honest ceiling for this input, not a shortfall: most of the 927
fields are employer attestations, wage data, prior-petition receipt numbers and
case-specific questions that no personal profile can answer. Filling them would
mean inventing data. Verified offline with all sockets blocked.

Phases 8-9 defined in `prompts/phase-08-local-intelligence.md` and
`prompts/phase-09-profile-ux.md`. They replace `fill_local.py`'s keyword-rule
matcher (weak against real forms — see phase 8's rationale) with local
embeddings + NER, and add a persisted `data/profiles/` store so facts survive
across forms without needing AI_API_KEY. Phase 7 should still land first —
it's demo-hardening for what already exists, independent of this work.

## Deviations
- Backend on port 8001
- PdfPage uses backend-rendered PNGs
- is_comb field added for digit-per-box fields
- FILL_MODE=local (no AI API needed)
- pdf_export.py uses same pypdf technique as pdf_autofiller repo
- Phase 8: `labels.py` now prefers the geometric caption over `/TU`. On USCIS
  forms one section tooltip is shared by dozens of fields, making them
  indistinguishable; the caption beside the box is the real identifier.
- Phase 8: a value that cannot fit `max_len` without corrupting it (email,
  phone, ID) is dropped rather than truncated — an empty box beats a
  plausible-looking wrong one.
