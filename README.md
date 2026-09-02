# InstaFill AI (FormFill v0)

**AI-powered PDF form auto-filler.** Upload any fillable AcroForm PDF, provide source documents (Resume, Word doc, CSV, or raw notes), and automatically populate the form in seconds with 100% precision and vector fidelity.

---

## ✨ Features

- **⚡ Instant AcroForm Parsing:** Detects text fields, comb boxes, dropdowns, radio groups, and checkboxes.
- **📄 Multi-Format Source Intake:** Ingests Resumes, Word documents (`.docx`), CSVs, plain text (`.txt`, `.md`), or pasted notes.
- **🤖 Dual Fill Modes:**
  - **Local Mode (`FILL_MODE=local`):** Fast, deterministic rule and keyword pattern matcher that works with zero external API calls or keys.
  - **AI Mode (`FILL_MODE=ai`):** LLM-based field reasoning and mapping via OpenAI-compatible endpoints (Groq, OpenAI, Ollama, etc.).
- **🎨 Interactive Web Studio:**
  - Modern SaaS web interface ready for deployment.
  - Interactive typeable field overlays with visual states:
    - 🟦 **AI Filled** (`#2563eb`)
    - 🟩 **User Edited** (`#16a34a`)
    - 🔲 **Empty Field**
  - Next Empty Field jump shortcut (`Ctrl + ↓`).
  - Smooth page navigation, zooming, and tooltips.
- **⬇️ Direct PDF Export:** Writes directly into original PDF AcroForm structures and exports high-quality, standardized PDF files.

---

## 🚫 What v0 Deliberately Does Not Do Yet

- **No Scanned OCR:** Only fillable AcroForm PDFs are supported (scanned flat images are rejected by design).
- **No Database:** All session metadata is persisted cleanly as JSON files under `data/`.
- **No User Accounts / Auth:** Designed for instant zero-friction sessions with zero data retention.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Python 3.12+**
- **Node.js 18+** and `npm`

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# Activate venv:
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
pip install pytest
```

### 3. Running the Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8001
```
The FastAPI backend runs at: **http://127.0.0.1:8001** (Health check: `http://127.0.0.1:8001/health`).

### 4. Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 🧪 Inspecting PDFs & Running Tests

### Inspect any PDF structure via CLI:
```bash
cd backend
python -m app.debug ../samples/instafill_form.pdf
```

### Run automated verification tests:
```bash
cd backend
python -m pytest tests/test_pdf.py -v
```

---

## 📁 Project Architecture

```
instafill/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI routes (forms, sources, fill, export)
│   │   ├── models.py        # Pydantic models (FormField, FormSchema)
│   │   ├── pdf_read.py      # AcroForm parser & bbox extraction (0-1 top-left)
│   │   ├── pdf_render.py    # High-resolution page renderer (pypdfium2)
│   │   ├── pdf_export.py    # Form-field value injector (pypdf)
│   │   ├── sources.py       # Multi-format text extractor
│   │   ├── fill_local.py    # Fast local regex & keyword matcher
│   │   ├── fill.py          # AI batch fill pipeline
│   │   └── storage.py       # Atomic file storage under data/
│   └── tests/
│       └── test_pdf.py      # Pytest verification suite
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router (Studio workspace & Layout)
│   │   ├── components/      # UI (Navbar, HeroUpload, Toolbar, SourcePanel, PdfPage)
│   │   ├── hooks/           # useFillJob polling hook
│   │   └── lib/             # API client & TypeScript interfaces
├── samples/                 # Sample fillable forms and test source data
└── data/                    # Local storage (forms, sources, jobs)
```
