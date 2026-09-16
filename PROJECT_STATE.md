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

## Phase 8 & Intelligence Engine measured results

Against `samples/i129_sample_form.pdf` (real 38-page I-129, 927 fillable fields) with
categorized source documents (`dummy_source_packet`), `FILL_MODE=local`, no external API key needed:

| Metric | Value |
|---|---|
| Facts extracted from multi-file source packet | 58+ facts |
| Fields filled | **354 fields** (38.2%) |
| Provenance citations generated | **354 citations** (100% of filled fields) |
| Multi-candidate data conflicts detected | **294 fields** |
| Smart conditional inferences evaluated | **13 rules** |
| Execution time | **< 0.5s** |
| Fields written to exported PDF | 354 |

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
- PDF Export: AcroForm XFA stripped and `/NeedAppearances` set to true so modern viewers render fields natively; `flatten` kept false to prevent double-printed / blurry ghost characters.
- Session Auto-Save: Form exports automatically save to MongoDB history for authenticated users with status `exported`. Unauthenticated saves cleanly prompt the sign-in modal.
- Navbar Streamlining: In active form filling view (`hasForm=true`), clutter is reduced to core items: Home, Services, FAQ, and Book Demo.
- Product Demo Booking: Added interactive Cal.com demo booking modal (`https://cal.com/space-ai/space-lizit-product-demo`) with native dark theme embedding.
- Performance Optimizations: Disk embedding cache + batch encoding added to cut form fill time from ~30s to ~1-2s; initial PDF render trimmed to first 3 pages with on-demand streaming.
