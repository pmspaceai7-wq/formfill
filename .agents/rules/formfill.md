# FormFill v0 — Agent Rules

Upload a fillable PDF, show it with typable boxes, fill it from source documents
using one AI call, download the result. Next.js + FastAPI. No database, no Docker,
no auth in v0.

## Read first
- @PROJECT_STATE.md — which phase is done
- @docs/SCHEMA.md — the FormSchema contract
- @docs/prompts/phase-NN.md — only the phase you were asked to do

## Hard rules
1. Work only on the current phase. Do not touch files outside its file list.
   If a file outside the list must change, STOP and say why.
2. PDF libraries: pypdf, pdfplumber, pypdfium2 ONLY. PyMuPDF/fitz is AGPL — FORBIDDEN.
3. bbox is normalised 0.0-1.0, origin TOP-LEFT. Flip the y-axis once, in Python,
   at parse time. Never do coordinate maths in React.
4. No database. Metadata is JSON files under data/. No MongoDB, no SQLAlchemy.
5. No auth, no user accounts, no sessions in v0.
6. The AI returns {field_id: value} only. Never coordinates, never page numbers.
7. If a PDF has no AcroForm, return 400 with a clear message. Never invent a
   fallback detector.
8. Every endpoint gets a Pydantic response model. No bare dict returns.
9. Secrets from .env via config.py. Never hardcode a key, never commit .env.

## Style
Python 3.12, type hints, async where it helps. TypeScript strict, no `any`.

## Commands
- Backend: `cd backend && uvicorn app.main:app --reload --port 8000`
- Frontend: `cd frontend && npm run dev`
- Inspect a PDF: `cd backend && python -m app.debug ../samples/i-129.pdf`

## When you finish
Run the phase's check. Update PROJECT_STATE.md. Report anything you did NOT do.
