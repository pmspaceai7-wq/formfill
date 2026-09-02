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
| 7 | Make it hold together | done |

## Deviations
- Backend on port 8001
- PdfPage uses backend-rendered PNGs
- is_comb field added for digit-per-box fields
- FILL_MODE=local (no AI API needed)
- pdf_export.py uses same pypdf technique as pdf_autofiller repo
