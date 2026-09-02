# Phase 2 — Render the form with typable boxes

**You get.** The screen from your screenshot: the PDF page rendered, an input box sitting on every field, and a hover tooltip showing the field's name and description.

**Files.** `frontend/next.config.ts`, `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts`, `frontend/src/app/page.tsx`, `frontend/src/components/PdfPage.tsx`, `.../FieldOverlay.tsx`, `.../FieldBox.tsx`, `.../Toolbar.tsx`.

> ### PROMPT — Phase 2
>
> Build the form viewer with a typable overlay.
>
> 1. Install `react-pdf` (v10, which bundles `pdfjs-dist` v5). Setup: the viewer component starts with `'use client'`; set the worker with `pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()` — check the installed pdfjs-dist major and use `.mjs` for v5, `.js` for older. Add `config.resolve.alias.canvas = false` to `next.config.ts`. Import react-pdf's annotation and text-layer CSS.
> 2. `lib/types.ts` — TypeScript interfaces mirroring `docs/SCHEMA.md`. Keep them in sync by hand for now.
> 3. `lib/api.ts` — typed wrappers for `POST /api/forms`, `GET /api/forms/{id}`, and the page image URL.
> 4. `app/page.tsx` — the single screen. States: empty (a dropzone for the form PDF, showing upload progress), error (show the backend's message — especially the "no fillable fields" one), and loaded (toolbar, page, overlay). Hold all field values in one `Record<field_id, string>` in React state.
> 5. `PdfPage.tsx` — render one page to a canvas via `react-pdf`. Compute scale to fit the container width using a `ResizeObserver`, clamped 0.5–3.0, and expose the **rendered pixel width and height** — the overlay depends on those and on nothing else.
> 6. `FieldOverlay.tsx` — an absolutely positioned div exactly covering the canvas, holding one `FieldBox` per field on the current page. Position each one with exactly these four expressions and nothing else — `bbox` is already normalised and top-left origin, so if you find yourself flipping a y-axis here, the bug is in the backend:
>
>     - `left = bbox[0] * renderedWidth`
>     - `top = bbox[1] * renderedHeight`
>     - `width = (bbox[2] - bbox[0]) * renderedWidth`
>     - `height = (bbox[3] - bbox[1]) * renderedHeight`
> 7. `FieldBox.tsx` — renders by `type`. `text` → an `<input>` filling the box, font-size `height * 0.62`, no border, light blue translucent background so the underlying PDF stays readable. `multiline_text` → `<textarea>`. `checkbox` → a click target that draws a check. `dropdown` / `listbox` → a `<select>` from `options`. `radio` → the group's options as clickable boxes. `signature` and `read_only` → a grey non-interactive box.
> 8. **Tooltip.** On hover or focus, show a dark tooltip near the field with two lines: `Name: {label}` and `Description: {tooltip}`. Omit the description line when there is no tooltip. Position it so it never leaves the viewport.
> 9. `Toolbar.tsx` — filename, page N of M with prev/next, zoom out / fit / zoom in, and a field counter.
> 10. Interaction: click a box to focus it. `Tab` moves through fields in **reading order** — sort by page, then by `bbox[1]` bucketed into bands of half a field height, then by `bbox[0]`. Not DOM order.
>
> Render only the current page. Do not build a continuous scroll.
>
> Do not modify files outside the list above.

**Check.** Upload the I-129. Boxes must sit exactly on their fields. Zoom to 50% and 300% and resize the window — they must stay aligned. Type into three boxes and change pages and back; the values must persist. Hover a field and confirm the tooltip reads like the one in your screenshot.

**Watch out.** Misalignment after a resize means someone used the container's CSS width instead of the canvas's rendered width. It almost always works on first render and breaks on resize, so test the resize specifically.

