# Phase 8 — Local intelligence engine (SpaceFill parity, no API key)

## Why this phase exists

Phases 0–6 built a correct, working pipeline: parse AcroForm → render pages →
overlay typable boxes → collect source text → fill → export. That machinery is
sound and does not need to change.

What's weak is `fill_local.py`. It matches a field's label against source text
with substring checks and ~20 hardcoded keyword groups. That works on a hand-written
`my_info.txt` with lines like `City: Kottayam`. It does not work on real forms.
Inspecting `samples/i129_sample_form.pdf` (a real USCIS petition) shows labels like:

    "Part 1. Petitioner Information. 3. Mailing Address... Street Number and Name"
    "Part 3. Beneficiary Information. Information About... Country of Birth"

No keyword list survives contact with that. `"city"` doesn't appear anywhere near
the actual city field's tooltip. This is the gap between "demo on a toy .txt file"
and "SpaceFill quality on a real government form."

The second gap: **there is no persistent profile.** SpaceFill's actual value
proposition is fill once, reuse forever — every subsequent form is faster and more
accurate because it already knows you. Today, `fill_local.py` and `fill.py` both
start from zero on every job, re-reading whatever was pasted into that session's
`SourcePanel`. Two forms filled back to back learn nothing from each other.

This phase closes both gaps, entirely with local packages — no AI_API_KEY required,
consistent with `FILL_MODE=local` already being the default.

## Scope

Backend only. No frontend contract changes — `POST /api/fill` keeps its shape.
One new endpoint set for profile management (needed so the frontend can show
"filled from your profile" state, phase 9's job). `AGENTS.md`'s hard rules still
apply: no DB engine (profile is a JSON file), bbox rules unchanged, no PyMuPDF.

## New dependencies

Add to `backend/requirements.txt`:

```
sentence-transformers>=3.0    # local embedding model, no API key
rapidfuzz>=3.0                # replaces difflib for option/label matching
spacy>=3.7                    # NER: PERSON, DATE, GPE, ORG entities
python-dateutil>=2.9          # date parsing/normalisation
phonenumbers>=8.13            # phone parsing/normalisation to E.164 + display format
nameparser>=1.1               # split "John Q. Public" into title/first/middle/last/suffix
usaddress>=0.5.10             # parse US-style street addresses into components
```

Post-install: `python -m spacy download en_core_web_sm` (~15MB, CPU, no GPU needed).

Model choice and why:
- **`all-MiniLM-L6-v2`** (sentence-transformers default candidate) — 22M params,
  384-dim, ~14k sentences/sec on CPU, small enough to bundle without a GPU
  requirement. This is the standard choice for exactly this "semantic match two
  short strings, run locally, no GPU" use case.
- **`rapidfuzz`** over the existing `difflib` — same job (closest_option matching
  in `fill.py`/`fill_local.py`) but C++-backed, 5-100x faster, MIT licensed
  (`difflib` is stdlib and fine, but `rapidfuzz` gives better algorithms:
  `token_sort_ratio`, `WRatio` handle word-reordering that `difflib` misses).
- **`spaCy` `en_core_web_sm`** — turns unstructured pasted text or resume/ID
  text into typed entities (PERSON, DATE, GPE, ORG, CARDINAL) instead of the
  current line-by-line regex/colon-splitting in `fill_local.py`.
- **`nameparser` / `usaddress` / `phonenumbers` / `python-dateutil`** — each
  solves one normalisation problem SpaceFill clearly needs to solve (split names
  into parts for forms with separate First/Middle/Last fields; split addresses
  into Street/City/State/Zip; normalise phone/date formats to match `max_len`
  and field expectations). All pure-Python or C-extension, no network calls,
  no API keys, small footprint (usaddress and nameparser are each <1MB).
  Confirmed `usaddress` is actively maintained (not archived) as of this check.
  Note its own docs are explicit that it *parses* components but does not
  *normalize* or validate them (e.g. won't expand "St" → "Street" or verify the
  address is real) — fine for this phase, since the goal is only splitting a
  pasted address into the right form fields, not USPS-grade normalization. If a
  later phase needs that, `usaddress-scourgify` is the companion package for it
  — not needed now, don't add it speculatively.

Packages deliberately **not** added: `spacy`'s larger `en_core_web_lg`/transformer
models (too slow to load per-request for a v0), any OCR library (`pytesseract`,
`easyocr`) — out of scope per `sources.py`'s existing "no text layer, no OCR"
warning, and `transformers`/`torch` directly — `sentence-transformers` already
vendors what's needed and installing bare `torch` adds ~700MB for nothing extra.

## Packages evaluated and rejected (checked, not just skipped)

Three more candidates were investigated specifically for this phase and deliberately
left out — recorded here so a future pass doesn't re-litigate them without cause:

- **`PDF Oxide`** (Rust-core, MIT/Apache-2.0, ~5x faster than pypdf/PyMuPDF per its
  own benchmarks, and notable for *native XFA support*, which sounded directly
  relevant since `samples/i129_sample_form.pdf` turned out to genuinely be an
  XFA-hybrid form — verified with `pdf.trailer["/Root"]["/AcroForm"]["/XFA"]`).
  **Rejected anyway**: also verified `pypdf.get_fields()` already returns all 1121
  fields correctly on that same file via the AcroForm fallback XFA-hybrid forms
  carry — the thing PDF Oxide would fix isn't actually broken here. Swapping the
  PDF layer would violate `AGENTS.md` hard rule #2 (pypdf/pdfplumber/pypdfium2 only)
  for no measured benefit, and would put `pdf_read.py`, `pdf_export.py`, and
  `pdf_render.py` all back in play at once — a rewrite, not a phase. Revisit only
  if a real future sample form has XFA fields with *no* AcroForm fallback and
  `parse_form()` actually fails on it.
- **`GLiNER`** (Apache-2.0, open-vocabulary NER, no retraining needed for new
  entity types) — a real quality upgrade over spaCy's closed-vocabulary NER in
  isolation. **Rejected**: its dependency chain pulls in `torch` + `transformers` +
  `onnxruntime` (checked on PyPI — order of ~1-2GB installed, versus spaCy's
  `en_core_web_sm` at ~15MB). For a v0 whose whole pitch is "no API key, install
  and go," that install-size tax isn't worth it for entity types (PERSON, DATE,
  GPE, ORG) that closed-vocabulary spaCy already covers well. Worth reconsidering
  later only if profile-fact extraction quality against real (non-resume) source
  documents proves spaCy's recall too low in practice.
- **A dedicated "form-field semantic classifier" library** — searched for one
  specifically (something that maps a label string directly to a canonical field
  type the way SpaceFill's own matching logic must). Nothing usable exists
  as an open Python package; what turned up was patent filings, not libraries.
  Confirms `match.py`'s own fuzzy-then-embedding approach (below) is the right
  build, not a wrapper around an existing tool.

## A verified fact about the sample data (useful context for whoever implements this)

`samples/i129_sample_form.pdf` is confirmed XFA-hybrid, not plain AcroForm:

```python
>>> r = pypdf.PdfReader("samples/i129_sample_form.pdf")
>>> acro = r.trailer["/Root"]["/AcroForm"].get_object()
>>> "/XFA" in acro
True
>>> len(r.get_fields())
1121
```

This matters for phase 8 specifically because it means the 1121-field real-world
label mess (`"Part 1. Petitioner Information. 3. Mailing Address... Street Number
and Name"`) is coming through the *existing, correct* pypdf path — it is not a
parsing bug to fix, it's exactly the input `match.py` has to be good enough to
handle. Keep this file as the primary stress test for phase 8's matching quality,
not just `my_info.txt`.

## Architecture change

```
                 ┌─────────────────────────────────────────┐
                 │            data/profiles/<id>/           │
                 │              profile.json                 │
                 │  { facts: {canonical_key: FactValue} }    │
                 └───────────────▲───────────────┬───────────┘
                                  │ merge          │ read
                          extract │                │
┌──────────────┐    ┌────────────┴──────┐   ┌──────▼───────────┐
│ sources.py    │───▶│ extract.py (NEW)   │   │ match.py (NEW)   │
│ (unchanged)   │    │ spaCy NER +        │   │ embeddings +     │
│ raw text out  │    │ nameparser/        │   │ rapidfuzz to     │
│               │    │ usaddress/         │   │ pick best fact   │
│               │    │ phonenumbers/      │   │ per field        │
│               │    │ dateutil           │   │                  │
└──────────────┘    └────────────────────┘   └────────┬─────────┘
                                                         │
                                              ┌──────────▼─────────┐
                                              │ fill_local.py       │
                                              │ (REWRITTEN)         │
                                              │ orchestrates:       │
                                              │ extract → merge     │
                                              │ into profile →      │
                                              │ match → post-process│
                                              └─────────────────────┘
```

`fill.py` (the AI-mode path) is untouched — phase stays local-first, AI mode
remains available later as an optional upgrade path behind `FILL_MODE=ai`, and
both paths can eventually share `extract.py`'s output as pre-structured context
fed into the AI prompt (cheaper, more accurate prompts) — that wiring is phase 9,
not this phase.

## Files this phase touches

**New:**
- `backend/app/extract.py` — turns raw source text into typed facts
  (`{"person.first_name": "Aswathi", "address.city": "Kottayam", ...}`)
  using spaCy NER + nameparser + usaddress + phonenumbers + dateutil regex
  fallbacks. Pure functions, unit-testable without a server running.
- `backend/app/match.py` — given a `FormField` (label + tooltip + type) and a
  dict of facts, returns the best-matching fact key + confidence score using
  sentence-transformers cosine similarity, with rapidfuzz as a cheap pre-filter
  (fuzzy-score field label against fact keys first; only embed if no fuzzy hit
  clears a threshold — keeps embedding calls down to what's actually ambiguous).
- `backend/app/profile.py` — `load_profile(profile_id) -> dict`,
  `merge_facts(profile_id, new_facts) -> dict` (new facts win on conflict, but
  keep provenance: which source_id last set each fact, so a future UI can show
  "from resume.pdf" next to a value). Storage: `data/profiles/<profile_id>/profile.json`,
  same JSON-file pattern as `storage.py`'s existing `form_dir`/`source_dir`.
- `backend/tests/test_extract.py`, `test_match.py`, `test_profile.py` — unit
  tests against `samples/my_info.txt` and a synthetic resume-shaped fixture,
  asserting specific facts extract correctly and specific field labels match
  the right fact even when phrased like the USCIS sample (long tooltip sentences).

**Rewritten:**
- `backend/app/fill_local.py` — replace `_extract_kv_pairs`/`_best_value_for_field`
  keyword-rule body with: call `extract.py` on new source text → `profile.merge_facts`
  → for each fillable field call `match.py` → run through the *same*
  `_post_process` validation logic already in `fill.py` (max_len truncation,
  dropdown snapping via rapidfuzz instead of difflib, checkbox on_state mapping) —
  extract that shared function into a new `app/postprocess.py` so `fill.py` and
  `fill_local.py` stop duplicating it.

**Small edits:**
- `backend/app/config.py` — add `PROFILE_ID: str = "default"` (v0 has no auth,
  so one profile for now; the field exists so phase-9 auth work is additive,
  not a rename).
- `backend/app/main.py` — after a successful `/api/sources` upload, call
  `extract.py` + `profile.merge_facts` so facts accumulate immediately (not only
  at fill time) — this is what makes the *second* form faster than the first.
  Add `GET /api/profile` (return current facts, for a future "review what we
  know about you" screen) and `DELETE /api/profile` (clear it — privacy, and
  needed for demo resets). Both behind the same Pydantic-response-model rule
  as every other endpoint.
- `backend/requirements.txt`, `backend/.env.example` — new deps, no new secrets
  (everything here is local, nothing needs a key).
- `PROJECT_STATE.md` — add phase 8 row.

## Matching algorithm detail (the part that actually has to match SpaceFill's bar)

For each fillable field:

1. **Build the match query** from `tooltip or label`, plus `type` and `options`
   if present (dropdown options themselves are useful signal — a field whose
   options are US state codes is almost certainly `address.state`).
2. **Fast path — rapidfuzz.** Compare the query against every fact's canonical
   key and its known aliases (e.g. `address.city` has aliases `["city",
   "city or town", "municipality"]` — this is where the current `KEYWORD_RULES`
   table migrates to, as data, not control flow) using `rapidfuzz.fuzz.WRatio`.
   If the top match clears a high threshold (e.g. 85), use it — cheap, instant,
   handles the common case without touching the embedding model.
3. **Slow path — embeddings.** If nothing clears the fuzzy threshold (the USCIS
   case: `"Part 1. Petitioner Information. 3. Mailing Address... Street Number
   and Name"` won't fuzzy-match `"street"` well because of all the preamble),
   embed the query and every candidate fact key/alias with `all-MiniLM-L6-v2`
   (cache fact embeddings — they don't change per field), take the highest
   cosine similarity above a floor (e.g. 0.5). This is what actually gets
   SpaceFill-level behavior on real government forms.
4. **Never invent.** If nothing clears either threshold, leave the field empty
   — same "return null, never invent" rule `fill.py`'s system prompt already
   encodes; local mode must hold itself to the same standard.
5. Run the result through shared `postprocess.py` (max_len, dropdown snap via
   rapidfuzz against `field.options`, checkbox on_state mapping, radio group
   on_state selection — radios aren't handled by current `_post_process` at all
   and should be: pick the radio option whose fact value fuzzy-matches best).

## What "done" looks like

- Run the existing three-form journey from `phase-07.md` end to end with
  `FILL_MODE=local` and **no `.env` AI key at all**, using `samples/my_info.txt`
  as source, and get materially more fields filled on `i129_sample_form.pdf`
  than today's keyword matcher achieves (today: likely near-zero on that form's
  real labels; target: matches everything the fact set can answer).
- Upload `my_info.txt` as a source once, fill form A, then upload a *different*
  unrelated form B with no new source — `GET /api/profile` shows the facts
  persisted, and filling form B (after linking to the same profile, or a new
  `/api/fill` call that defaults to `PROFILE_ID`) still fills matching fields,
  proving persistence works, not just single-session extraction.
- `pytest` passes with zero network calls and no `AI_API_KEY` set — assert this
  explicitly in a test that monkeypatches `httpx` to raise if called, to catch
  any future regression where local mode accidentally reaches the network
  (sentence-transformers first run *downloads* the model — that's fine locally
  but tests should point `SENTENCE_TRANSFORMERS_HOME` at a pre-populated cache
  or skip gracefully in CI without network; document this in `README.md`).
- Report anything that still doesn't match well (e.g. field types with no
  reasonable fact — signature fields, form-specific classification codes) —
  those are correctly out of scope, not failures.

## Explicit non-goals for this phase

- OCR / scanned-PDF support (`sources.py` already warns and skips — stays that way).
- Multi-user auth / multiple named profiles (single `PROFILE_ID="default"`, per
  `config.py` above — real multi-profile support is a phase-9-or-later, auth-shaped
  problem, not a matching problem).
- Changing `FormSchema`, the bbox contract, or any frontend component — this is
  entirely behind `POST /api/fill`'s existing black box.
- Wiring `extract.py`'s structured facts into the *AI* path (`fill.py`) to cut
  prompt size/cost — good idea, but a separate, smaller phase once this is proven.
