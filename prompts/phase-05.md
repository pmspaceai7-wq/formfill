# Phase 5 — Wire the fill into the UI

**You get.** A **Fill with AI** button that populates the boxes, and clear marking of which values you have since edited.

**Files.** `frontend/src/app/page.tsx`, `frontend/src/components/Toolbar.tsx`, `.../FieldBox.tsx`, `frontend/src/lib/api.ts`, `frontend/src/hooks/useFillJob.ts`.

> ### PROMPT — Phase 5
>
> Connect the AI fill to the interface.
>
> 1. `useFillJob.ts` — calls `POST /api/fill`, then polls `GET /api/fill/{job_id}` every 1.5 seconds until it terminates. Returns `{status, done, total, values, error}`. Stops polling on completion or failure, and on unmount.
> 2. Toolbar gets a **Fill with AI** button, disabled until both a form and sources exist. While running it shows a spinner and "Filling — 24 of 68 fields". On failure it shows the error with a Retry button.
> 3. On completion, merge the returned values into the field-value state. **Do not overwrite anything the user has already typed** — track a `Set<field_id>` of user-edited fields and skip those on merge.
> 4. Visual states on each `FieldBox`, as a background tint and a left border:
>
>     - filled by AI — light blue
>     - edited by you — light green
>     - empty — plain, dashed outline
>
>     Put a three-item legend in the toolbar. This is what makes a 68-field form reviewable at a glance: you look at the blue ones.
> 5. Add a counter: "52 of 68 filled · 16 empty". Add a **Next empty field** button that focuses the next unfilled field in reading order and scrolls to it, bound to `Ctrl/Cmd + ↓`.
> 6. Editing any box marks it user-edited and turns it green immediately.
>
> Do not modify files outside the list above.

**Check.** Fill a real form. Type into a box, run the fill again, and confirm your typed value survives. The counter must match reality.

