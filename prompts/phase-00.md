# Phase 0 — Skeleton

**You get.** A FastAPI server answering `/health` and a Next.js page, both running, no Docker.

**Files.** `AGENTS.md`, `PROJECT_STATE.md`, `.gitignore`, `docs/SCHEMA.md`, `backend/requirements.txt`, `backend/.env.example`, `backend/app/main.py`, `backend/app/config.py`, `backend/app/storage.py`, `frontend/` (create-next-app output).

> ### PROMPT — Phase 0
>
> Set up a project called **FormFill**: upload a fillable PDF form, display it with typable boxes, fill it from source documents with an AI call, download the result. Next.js frontend, FastAPI backend. **No database, no Docker, no authentication.**
>
> Create:
>
> 1. `backend/requirements.txt` — `fastapi`, `uvicorn[standard]`, `pydantic>=2.9`, `pydantic-settings`, `python-multipart`, `httpx`, `pypdf`, `pdfplumber`, `pypdfium2`, `python-docx`.
> 2. `backend/app/config.py` — a Pydantic `Settings` class reading from `.env`: `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `DATA_DIR` (default `../data`), `FRONTEND_ORIGIN` (default `http://localhost:3000`), `MAX_UPLOAD_MB` (default 50). No defaults for secrets.
> 3. `backend/app/storage.py` — path helpers only, no I/O logic yet: `form_dir(form_id)`, `source_dir(source_id)`, `job_dir(job_id)`, plus `new_id(prefix)` returning e.g. `f_a1b2c3`, and `read_json(path)` / `write_json(path, obj)`. Every directory is created on demand under `DATA_DIR`.
> 4. `backend/app/main.py` — FastAPI app, CORS allowing `FRONTEND_ORIGIN`, and `GET /health` returning `{"status":"ok"}`. Mount routes under `/api`.
> 5. Frontend via `create-next-app`: TypeScript, App Router, Tailwind, ESLint, `src/` directory, alias `@/*`. Replace the default page with a placeholder that fetches `/health` through the backend and shows the result, proving CORS works.
> 6. `AGENTS.md` and `PROJECT_STATE.md` exactly as given in `docs/prompts/phase-00.md`.
> 7. `.gitignore` covering Python, Node, `.env`, and **`data/`** — but NOT `samples/`, which is committed on purpose.
>
> Do not create empty placeholder modules for later phases. Do not implement any PDF or AI logic.
>
> Do not modify files outside the list above. If you believe a file outside the list must change, stop and report why instead of changing it.

**Check.** `curl localhost:8000/health` returns ok, and `localhost:3000` shows the health result rather than an error.

