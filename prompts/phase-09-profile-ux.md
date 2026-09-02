# Phase 9 — Profile UX (fill-once-reuse-forever, visible)

## Why this phase exists

Phase 8 makes the backend actually remember facts across forms and match them
well. This phase makes that visible and useful in the UI — otherwise it's
invisible plumbing. SpaceFill's headline UX is: upload sources once, every
future form is pre-filled and gets better over time, and the user can see and
edit "what we know about you" directly instead of re-pasting it per form.

Depends on Phase 8 (`GET /api/profile`, `DELETE /api/profile`, profile-aware
`/api/fill`) being merged first.

## Files this phase touches

**New:**
- `frontend/src/components/ProfileDrawer.tsx` — a slide-over or modal showing
  current profile facts as editable key/value rows (grouped: Identity, Contact,
  Address, Employment, Other), sourced from `GET /api/profile`. Editing a value
  here should call a new `PATCH /api/profile` (small addition to `main.py`,
  same file `profile.py` already touches) so corrections stick permanently —
  this is the "SpaceFill got my middle name wrong, let me fix it once" moment.
- `frontend/src/lib/types.ts` additions — `ProfileFact`, `ProfileSummary` types
  matching the new Pydantic response models.

**Edited:**
- `frontend/src/components/SourcePanel.tsx` — after `uploadSources` succeeds,
  show a short "Learned: full name, email, 3 more facts" confirmation instead
  of only "Source Data Ready", so the accumulation is visible per upload.
- `frontend/src/app/page.tsx` — add a "Your Profile" button in the toolbar/navbar
  area that opens `ProfileDrawer`; on fill completion, distinguish (visually,
  e.g. a small badge) fields filled *from profile* vs. fields the source upload
  in this session newly taught — reuse the existing `aiValues`/`userEdited`
  tri-state pattern already in `page.tsx`, add a third provenance type rather
  than inventing a new state machine.
- `backend/app/main.py` — add `PATCH /api/profile` (edit one fact) alongside
  phase 8's `GET`/`DELETE`.

## What "done" looks like

- Upload a source once. Fill form A. Close the tab, come back (data/ persists
  on disk — no server restart needed to prove this). Upload form B with zero
  new source material, hit Fill, and see fields populate from the same profile.
- Open the profile drawer, correct one fact, refill form B, see the correction
  reflected — without re-uploading any document.
- Everything from `phase-07.md`'s failure-path checklist still holds (no
  regressions to loading states / error messages).
