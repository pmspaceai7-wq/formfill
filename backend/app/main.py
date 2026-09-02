from __future__ import annotations

import shutil
import asyncio
from pathlib import Path

import pdfplumber
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import settings
from app.fill import fill_form
from app.fill_local import fill_form_local
from app.labels import label_for
from app.models import ErrorResponse, FormSchema
from app.pdf_read import NoAcroFormError, parse_form
from app.pdf_render import render_pages
from app.sources import ACCEPTED_EXTENSIONS, extract_text
from app.storage import form_dir, source_dir, job_dir, new_id, write_json, read_json

app = FastAPI(title="FormFill API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


# ---------------------------------------------------------------------------
# POST /api/forms  — upload & parse
# ---------------------------------------------------------------------------

@app.post(
    "/api/forms",
    response_model=FormSchema,
    responses={400: {"model": ErrorResponse}},
)
async def upload_form(file: UploadFile) -> FormSchema:
    # 1. Check magic bytes (%PDF)
    header = await file.read(4)
    if header != b"%PDF":
        raise HTTPException(status_code=400, detail="File is not a PDF.")
    await file.seek(0)

    # 2. Check size
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB limit.",
        )

    # 3. Save to disk
    form_id = new_id("f")
    fdir = form_dir(form_id)
    pdf_path = fdir / "original.pdf"
    pdf_path.write_bytes(content)

    # 4. Parse AcroForm
    try:
        schema = parse_form(pdf_path)
    except NoAcroFormError:
        shutil.rmtree(fdir, ignore_errors=True)
        raise HTTPException(
            status_code=400,
            detail="This PDF has no fillable fields. v0 supports fillable PDF forms.",
        )

    # Override form_id so it matches storage
    schema = FormSchema(
        form_id=form_id,
        filename=file.filename or pdf_path.name,
        page_count=schema.page_count,
        pages=schema.pages,
        fields=schema.fields,
    )

    # 5. Improve labels with pdfplumber geometric proximity
    with pdfplumber.open(str(pdf_path)) as plumber_pdf:
        for field in schema.fields:
            page_idx = field.page - 1
            if page_idx < len(plumber_pdf.pages):
                pg = plumber_pdf.pages[page_idx]
                pw, ph = pg.width, pg.height
                raw_words = pg.extract_words()
                norm_words = [
                    {
                        "x0": w["x0"] / pw,
                        "x1": w["x1"] / pw,
                        "top": w["top"] / ph,
                        "bottom": w["bottom"] / ph,
                        "text": w["text"],
                    }
                    for w in raw_words
                ]
                field.label = label_for(field, norm_words)

    # 6. Render pages as PNGs
    render_pages(pdf_path, fdir)

    # 7. Persist schema
    write_json(fdir / "schema.json", schema.model_dump())

    return schema


# ---------------------------------------------------------------------------
# GET /api/forms/{form_id}  — retrieve stored schema
# ---------------------------------------------------------------------------

@app.get(
    "/api/forms/{form_id}",
    response_model=FormSchema,
    responses={404: {"model": ErrorResponse}},
)
async def get_form(form_id: str) -> FormSchema:
    fdir = form_dir(form_id)
    schema_path = fdir / "schema.json"
    if not schema_path.exists():
        raise HTTPException(status_code=404, detail="Form not found.")
    data = read_json(schema_path)
    return FormSchema(**data)


# ---------------------------------------------------------------------------
# GET /api/forms/{form_id}/pages/{n}  — retrieve page PNG
# ---------------------------------------------------------------------------

@app.get(
    "/api/forms/{form_id}/pages/{n}",
    responses={404: {"model": ErrorResponse}},
)
async def get_page_image(form_id: str, n: int) -> FileResponse:
    fdir = form_dir(form_id)
    img_path = fdir / f"page-{n}.png"
    if not img_path.exists():
        raise HTTPException(status_code=404, detail=f"Page {n} not found.")
    return FileResponse(str(img_path), media_type="image/png")


# ---------------------------------------------------------------------------
# Source material models
# ---------------------------------------------------------------------------

class SourceItem(BaseModel):
    name: str
    chars: int


class SourceWarning(BaseModel):
    file: str
    warning: str


class SourceSummary(BaseModel):
    source_id: str
    items: list[SourceItem]
    warnings: list[SourceWarning]


# ---------------------------------------------------------------------------
# POST /api/sources  — upload source documents + optional pasted text
# ---------------------------------------------------------------------------

@app.post(
    "/api/sources",
    response_model=SourceSummary,
    responses={400: {"model": ErrorResponse}},
)
async def upload_sources(
    files: list[UploadFile] = File(default=[]),
    text: str = Form(default=""),
) -> SourceSummary:
    source_id = new_id("s")
    sdir = source_dir(source_id)
    files_dir = sdir / "files"
    files_dir.mkdir(parents=True, exist_ok=True)

    items_data: list[dict] = []
    warnings: list[SourceWarning] = []
    summary_items: list[SourceItem] = []

    # Process uploaded files
    for upload in files:
        fname = Path(upload.filename or "file").name
        ext = Path(fname).suffix.lower()

        if ext not in ACCEPTED_EXTENSIONS:
            warnings.append(SourceWarning(
                file=fname,
                warning=f"Unsupported file type '{ext}' — skipped.",
            ))
            continue

        content = await upload.read()
        dest = files_dir / fname
        dest.write_bytes(content)

        extracted, warn = extract_text(dest)
        if warn:
            warnings.append(SourceWarning(file=fname, warning=warn))

        items_data.append({"name": fname, "chars": len(extracted), "text": extracted})
        summary_items.append(SourceItem(name=fname, chars=len(extracted)))

    # Process pasted text
    pasted = (text or "").strip()
    if pasted:
        items_data.append({"name": "(pasted)", "chars": len(pasted), "text": pasted})
        summary_items.append(SourceItem(name="(pasted)", chars=len(pasted)))

    # Persist text.json
    text_json = {
        "source_id": source_id,
        "items": items_data,
        "warnings": [w.model_dump() for w in warnings],
    }
    write_json(sdir / "text.json", text_json)

    return SourceSummary(
        source_id=source_id,
        items=summary_items,
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# GET /api/sources/{source_id}  — retrieve source summary
# ---------------------------------------------------------------------------

@app.get(
    "/api/sources/{source_id}",
    response_model=SourceSummary,
    responses={404: {"model": ErrorResponse}},
)
async def get_source(source_id: str) -> SourceSummary:
    sdir = source_dir(source_id)
    text_path = sdir / "text.json"
    if not text_path.exists():
        raise HTTPException(status_code=404, detail="Source not found.")
    data = read_json(text_path)
    items = [SourceItem(name=it["name"], chars=it["chars"]) for it in data["items"]]
    warnings = [SourceWarning(**w) for w in data.get("warnings", [])]
    return SourceSummary(source_id=source_id, items=items, warnings=warnings)


# ---------------------------------------------------------------------------
# Fill models
# ---------------------------------------------------------------------------

class FillRequest(BaseModel):
    form_id: str
    source_id: str


class FillStatus(BaseModel):
    job_id: str
    status: str          # "running" | "complete" | "error"
    done: int = 0
    total: int = 0
    error: str = ""
    values: dict[str, str] | None = None


# ---------------------------------------------------------------------------
# POST /api/fill  — start a background fill job
# ---------------------------------------------------------------------------

def _run_fill(job_id: str, form_id: str, source_id: str) -> None:
    """Sync wrapper so FastAPI BackgroundTasks can run the async fill."""
    import asyncio as _asyncio
    if settings.FILL_MODE == "ai":
        _asyncio.run(fill_form(form_id, source_id, job_id))
    else:
        _asyncio.run(fill_form_local(form_id, source_id, job_id))


@app.post(
    "/api/fill",
    response_model=FillStatus,
    responses={400: {"model": ErrorResponse}},
)
async def start_fill(
    background_tasks: BackgroundTasks,
    form_id: str = Form(...),
    source_id: str = Form(...),
) -> FillStatus:
    # Validate form and source exist
    if not (form_dir(form_id) / "schema.json").exists():
        raise HTTPException(status_code=400, detail="Form not found.")
    if not (source_dir(source_id) / "text.json").exists():
        raise HTTPException(status_code=400, detail="Source not found.")

    job_id = new_id("j")
    jdir = job_dir(job_id)
    write_json(jdir / "status.json", {
        "status": "running", "done": 0, "total": 0, "error": "",
    })

    background_tasks.add_task(_run_fill, job_id, form_id, source_id)

    return FillStatus(job_id=job_id, status="running", done=0, total=0)


# ---------------------------------------------------------------------------
# GET /api/fill/{job_id}  — poll job status + get values when complete
# ---------------------------------------------------------------------------

@app.get(
    "/api/fill/{job_id}",
    response_model=FillStatus,
    responses={404: {"model": ErrorResponse}},
)
async def get_fill(job_id: str) -> FillStatus:
    jdir = job_dir(job_id)
    status_path = jdir / "status.json"
    if not status_path.exists():
        raise HTTPException(status_code=404, detail="Job not found.")

    data = read_json(status_path)
    values = None
    if data.get("status") == "complete":
        vals_path = jdir / "values.json"
        if vals_path.exists():
            values = read_json(vals_path)

    return FillStatus(
        job_id=job_id,
        status=data.get("status", "running"),
        done=data.get("done", 0),
        total=data.get("total", 0),
        error=data.get("error", ""),
        values=values,
    )


# ---------------------------------------------------------------------------
# POST /api/export  — write current values into PDF, return for download
# ---------------------------------------------------------------------------

class ExportRequest(BaseModel):
    form_id: str
    values: dict[str, str]   # {field_id: value}

@app.post(
    "/api/export",
    responses={400: {"model": ErrorResponse}},
)
async def export_pdf(
    form_id: str = Form(...),
    values_json: str = Form(...),
) -> FileResponse:
    import json as _json
    from app.pdf_export import export_filled_pdf

    try:
        values: dict[str, str] = _json.loads(values_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid values_json")

    fdir = form_dir(form_id)
    if not (fdir / "schema.json").exists():
        raise HTTPException(status_code=400, detail="Form not found.")

    output_path = fdir / "filled.pdf"
    try:
        written = export_filled_pdf(form_id, values, output_path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {e}")

    return FileResponse(
        str(output_path),
        media_type="application/pdf",
        filename="filled_form.pdf",
        headers={"X-Fields-Written": str(written)},
    )


