from __future__ import annotations

import logging
import shutil
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

import pdfplumber
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import settings
from app.extract import extract_facts
from app.fill import fill_form
from app.fill_local import fill_form_local
from app.labels import label_for
from app.models import (
    CandidateValue,
    ErrorResponse,
    FieldCitation,
    FieldConflict,
    FieldInference,
    FormSchema,
    TemplateItem,
    TemplateListResponse,
)
from app.pdf_read import NoAcroFormError, parse_form
from app.pdf_render import render_pages, render_single_page
from app.sources import ACCEPTED_EXTENSIONS, extract_text
from app.storage import _base, form_dir, source_dir, job_dir, new_id, write_json, read_json
from app import profile as profile_store
from app.auth import (
    auth_router,
    admin_router,
    connect_db,
    close_db,
    get_current_user,
    increment_user_form_fill,
)
from app.submissions import submissions_router


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Connect to MongoDB on startup, disconnect on shutdown."""
    await connect_db()
    # Pre-warm the embedding model in a background thread so the first fill
    # doesn't have a cold-start delay. This runs concurrently with startup.
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _prewarm_embeddings)
    yield
    await close_db()


def _prewarm_embeddings() -> None:
    """Load model and alias embeddings from disk cache (or compute once)."""
    try:
        from app.match import _alias_embeddings
        _alias_embeddings()
    except Exception:
        pass


app = FastAPI(title="FormFill API", lifespan=lifespan)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(submissions_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _find_samples_dir() -> Path:
    candidates = [
        Path("../samples"),
        Path("samples"),
        Path(__file__).parent.parent.parent / "samples",
        Path(__file__).parent.parent / "samples",
    ]
    for c in candidates:
        if c.exists() and (c / "i129_sample_form.pdf").exists():
            return c.resolve()
    return Path("samples").resolve()


def _process_pdf_and_create_schema(pdf_path: Path, filename: str, form_id: str) -> FormSchema:
    fdir = form_dir(form_id)
    try:
        schema = parse_form(pdf_path)
        if not schema.fields:
            raise NoAcroFormError("PDF has no fillable fields")
    except NoAcroFormError:
        shutil.rmtree(fdir, ignore_errors=True)
        raise HTTPException(
            status_code=400,
            detail="This PDF has no fillable fields. v0 supports fillable PDF forms.",
        )

    schema = FormSchema(
        form_id=form_id,
        filename=filename,
        page_count=schema.page_count,
        pages=schema.pages,
        fields=schema.fields,
    )

    with pdfplumber.open(str(pdf_path)) as plumber_pdf:
        words_cache: dict[int, list[dict]] = {}
        for field in schema.fields:
            page_idx = field.page - 1
            if page_idx < len(plumber_pdf.pages):
                if page_idx not in words_cache:
                    pg = plumber_pdf.pages[page_idx]
                    pw, ph = pg.width, pg.height
                    raw_words = pg.extract_words()
                    words_cache[page_idx] = [
                        {
                            "x0": w["x0"] / pw,
                            "x1": w["x1"] / pw,
                            "top": w["top"] / ph,
                            "bottom": w["bottom"] / ph,
                            "text": w["text"],
                        }
                        for w in raw_words
                    ]
                field.label = label_for(field, words_cache[page_idx])

    render_pages(pdf_path, fdir, max_initial=3)
    write_json(fdir / "schema.json", schema.model_dump())
    return schema


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
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
)
async def upload_form(
    file: UploadFile,
    current_user: Optional[dict] = Depends(get_current_user),
) -> FormSchema:
    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Please sign in with your business email to upload forms.",
        )

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

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        _process_pdf_and_create_schema,
        pdf_path,
        file.filename or pdf_path.name,
        form_id,
    )



# ---------------------------------------------------------------------------
# Auto-restore missing form assets from samples/templates or MongoDB
# ---------------------------------------------------------------------------

async def _restore_form_if_needed(form_id: str) -> bool:
    """If original.pdf or schema.json is missing for form_id, restore from samples or MongoDB."""
    fdir = form_dir(form_id)
    pdf_path = fdir / "original.pdf"
    schema_path = fdir / "schema.json"

    if pdf_path.exists() and schema_path.exists():
        return True

    filename: Optional[str] = None
    stored_schema: Optional[dict] = None
    try:
        from app.auth import get_db
        db = get_db()
        doc = await db.submissions.find_one({"form_id": form_id})
        if doc:
            filename = doc.get("filename")
            stored_schema = doc.get("form_schema")
    except Exception:
        pass

    samples_dir = _find_samples_dir()

    # If original.pdf missing, try finding the file in samples
    if not pdf_path.exists() and samples_dir.exists():
        found_pdf: Optional[Path] = None
        if filename:
            for p in samples_dir.rglob("*.pdf"):
                if p.name.lower() == filename.lower():
                    found_pdf = p
                    break
            if not found_pdf and ("i129" in filename.lower() or "i-129" in filename.lower()):
                cand = samples_dir / "i129_sample_form.pdf"
                if cand.exists():
                    found_pdf = cand

        if not found_pdf:
            cand = samples_dir / "i129_sample_form.pdf"
            if cand.exists():
                found_pdf = cand

        if found_pdf and found_pdf.exists():
            shutil.copy2(str(found_pdf), str(pdf_path))

    # If schema.json missing, write stored_schema or generate from PDF
    if not schema_path.exists():
        if stored_schema:
            write_json(schema_path, stored_schema)
        elif pdf_path.exists():
            try:
                _process_pdf_and_create_schema(pdf_path, filename or pdf_path.name, form_id)
            except Exception:
                pass

    return schema_path.exists()


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
        await _restore_form_if_needed(form_id)
    if not schema_path.exists():
        raise HTTPException(status_code=404, detail="Form not found.")
    data = read_json(schema_path)
    return FormSchema(**data)


# ---------------------------------------------------------------------------
# GET /api/forms/{form_id}/pages/{n}  — retrieve page PNG (on-demand rendering)
# ---------------------------------------------------------------------------

@app.get(
    "/api/forms/{form_id}/pages/{n}",
    responses={404: {"model": ErrorResponse}},
)
async def get_page_image(form_id: str, n: int) -> FileResponse:
    fdir = form_dir(form_id)
    img_path = fdir / f"page-{n}.png"
    if not img_path.exists():
        pdf_path = fdir / "original.pdf"
        if not pdf_path.exists():
            await _restore_form_if_needed(form_id)
            pdf_path = fdir / "original.pdf"
        if pdf_path.exists():
            render_single_page(pdf_path, n, fdir)
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
    facts_learned: int = 0
    facts_total: int = 0


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

    # Learn facts now, not at fill time — this is what makes the *next* form
    # fill even if the user uploads no new source material for it.
    facts_learned = 0
    facts_total = 0
    combined = "\n\n".join(item.get("text", "") for item in items_data)
    if combined.strip():
        try:
            names = [i["name"] for i in items_data] or [source_id]
            stats = profile_store.merge_facts(
                extract_facts(combined), source=", ".join(names)
            )
            facts_learned = stats["changed"]
            facts_total = stats["total"]
        except Exception:
            # Fact extraction must never break source upload.
            logging.getLogger(__name__).exception("Fact extraction failed")

    return SourceSummary(
        source_id=source_id,
        items=summary_items,
        warnings=warnings,
        facts_learned=facts_learned,
        facts_total=facts_total,
    )


# ---------------------------------------------------------------------------
# Profile endpoints — the persistent fact store
# ---------------------------------------------------------------------------

class ProfileFact(BaseModel):
    key: str
    value: str
    group: str
    source: str
    updated_at: str
    user_edited: bool


class ProfileResponse(BaseModel):
    profile_id: str
    facts: list[ProfileFact]


class FactUpdate(BaseModel):
    key: str
    value: str


class OkResponse(BaseModel):
    ok: bool
    message: str = ""


@app.get("/api/profile", response_model=ProfileResponse)
async def get_profile() -> ProfileResponse:
    return ProfileResponse(
        profile_id=settings.PROFILE_ID,
        facts=[ProfileFact(**item) for item in profile_store.as_items()],
    )


@app.patch("/api/profile", response_model=ProfileResponse)
async def patch_profile(update: FactUpdate) -> ProfileResponse:
    """Edit one fact by hand. User edits outrank document-derived values."""
    value = update.value.strip()
    if value:
        profile_store.set_fact(update.key, value)
    else:
        profile_store.delete_fact(update.key)
    return ProfileResponse(
        profile_id=settings.PROFILE_ID,
        facts=[ProfileFact(**item) for item in profile_store.as_items()],
    )


@app.delete("/api/profile", response_model=OkResponse)
async def delete_profile() -> OkResponse:
    profile_store.clear_profile()
    return OkResponse(ok=True, message="Profile cleared.")


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
# GET /api/sources/{source_id}/file/{filename}  — serve source file content
# ---------------------------------------------------------------------------

class SourceFileResponse(BaseModel):
    filename: str
    lines: list[str]


@app.get(
    "/api/sources/{source_id}/file/{filename}",
    response_model=SourceFileResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_source_file(source_id: str, filename: str) -> SourceFileResponse:
    """Return the lines of a source file so the UI can show it with line highlighting."""
    import urllib.parse as _up
    safe_name = _up.unquote(filename).strip()
    # Prevent path traversal
    if ".." in safe_name or "/" in safe_name or "\\" in safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    def _extract_lines_from_source(sdir: Path) -> list[str] | None:
        text_path = sdir / "text.json"
        if text_path.exists():
            try:
                data = read_json(text_path)
                for it in data.get("items", []):
                    if it.get("name") == safe_name:
                        return it.get("text", "").splitlines()
            except Exception:
                pass

        file_path = sdir / "files" / safe_name
        if file_path.exists():
            try:
                ext = file_path.suffix.lower()
                if ext in (".pdf", ".docx"):
                    extracted, _ = extract_text(file_path)
                    return extracted.splitlines()
                else:
                    return file_path.read_text(encoding="utf-8", errors="replace").splitlines()
            except Exception:
                pass
        return None

    # 1. Try provided source_id if given
    if source_id and source_id not in ("any", "latest", "undefined", "null", "all"):
        lines = _extract_lines_from_source(source_dir(source_id))
        if lines is not None:
            return SourceFileResponse(filename=safe_name, lines=lines)

    # 2. Fallback: Search all sources directories (newest first)
    sources_dir = _base() / "sources"
    if sources_dir.exists():
        dirs = sorted(
            [d for d in sources_dir.iterdir() if d.is_dir()],
            key=lambda d: d.stat().st_mtime,
            reverse=True,
        )
        for d in dirs:
            lines = _extract_lines_from_source(d)
            if lines is not None:
                return SourceFileResponse(filename=safe_name, lines=lines)

    raise HTTPException(status_code=404, detail=f"File '{safe_name}' not found in source archives.")


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
    citations: dict[str, FieldCitation] | None = None
    conflicts: list[FieldConflict] | None = None
    inferences: dict[str, FieldInference] | None = None


# ---------------------------------------------------------------------------
# POST /api/fill  — start a background fill job
# ---------------------------------------------------------------------------

def _run_fill(job_id: str, form_id: str, source_id: str) -> None:
    """Run fill job in background thread."""
    if settings.FILL_MODE == "ai":
        import asyncio as _asyncio
        _asyncio.run(fill_form(form_id, source_id, job_id))
    else:
        fill_form_local(form_id, source_id, job_id)


@app.post(
    "/api/fill",
    response_model=FillStatus,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        402: {"model": ErrorResponse},
    },
)
async def start_fill(
    background_tasks: BackgroundTasks,
    form_id: str = Form(...),
    source_id: str = Form(default=""),
    current_user: Optional[dict] = Depends(get_current_user),
) -> FillStatus:
    # 1. Require authentication to track quota per business email
    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Please sign in with your business email to claim your 1 free form filling.",
        )

    # 2. Check quota: 1 free form filling per business email
    # Admins and subscribed users receive unlimited fills
    is_admin = current_user.get("role") == "admin"
    is_sub = current_user.get("is_subscribed", False)
    count = current_user.get("forms_filled_count", 0)
    limit = current_user.get("free_tier_limit", 1)

    if not is_admin and not is_sub and count >= limit:
        raise HTTPException(
            status_code=402,
            detail=f"You have used your {limit} free form filling. Upgrade your plan to continue filling forms.",
        )

    # Validate form exists
    if not (form_dir(form_id) / "schema.json").exists():
        raise HTTPException(status_code=400, detail="Form not found.")

    # source_id is optional: a saved profile alone is enough to fill a form,
    # which is the point of remembering details across forms. Only validate it
    # when one was actually supplied.
    if source_id and not (source_dir(source_id) / "text.json").exists():
        raise HTTPException(status_code=400, detail="Source not found.")

    if not source_id and not profile_store.get_values():
        raise HTTPException(
            status_code=400,
            detail="Nothing to fill from yet. Add a document or paste your details.",
        )

    job_id = new_id("j")
    jdir = job_dir(job_id)
    write_json(jdir / "status.json", {
        "status": "running", "done": 0, "total": 0, "error": "",
    })

    # Increment quota usage for business accounts
    if not is_admin:
        await increment_user_form_fill(current_user["email"])

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
    citations = None
    conflicts = None
    inferences = None
    if data.get("status") == "complete":
        vals_path = jdir / "values.json"
        if vals_path.exists():
            values = read_json(vals_path)
        enrich_path = jdir / "enrichment.json"
        if enrich_path.exists():
            try:
                enrich = read_json(enrich_path)
                citations = {
                    k: FieldCitation(**v) for k, v in enrich.get("citations", {}).items()
                }
                conflicts = [
                    FieldConflict(**c) for c in enrich.get("conflicts", [])
                ]
                inferences = {
                    k: FieldInference(**v) for k, v in enrich.get("inferences", {}).items()
                }
            except Exception:
                logging.getLogger(__name__).exception("Failed to parse enrichment metadata")

    return FillStatus(
        job_id=job_id,
        status=data.get("status", "running"),
        done=data.get("done", 0),
        total=data.get("total", 0),
        error=data.get("error", ""),
        values=values,
        citations=citations,
        conflicts=conflicts,
        inferences=inferences,
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


# ---------------------------------------------------------------------------
# Template Hub & 1-Click Demo Endpoints
# ---------------------------------------------------------------------------

class DemoLoadResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    schema: FormSchema
    source: SourceSummary


TEMPLATES_CATALOG: list[TemplateItem] = [
    # ── Employment ──
    TemplateItem(
        id="uscis-i765",
        code="Form I-765",
        title="Application for Employment Authorization (EAD)",
        category="Employment",
        pages=7,
        estimated_fields=142,
        description="Application for noncitizens seeking permission to work legally in the US (OPT, STEM OPT, DACA, Pending I-485).",
        required_sources=["Passport / Visa Copy", "Form I-94 Record", "Eligibility Category Details", "Prior EAD (if any)"],
        is_demo_ready=False,
        tags=["USCIS Official", "Work Authorization", "Checkboxes"],
        pdf_file="templates/02_employment/I-765_Employment-Authorization.pdf",
    ),
    TemplateItem(
        id="uscis-i9",
        code="Form I-9",
        title="Employment Eligibility Verification",
        category="Employment",
        pages=4,
        estimated_fields=85,
        description="Mandatory form used by all US employers to verify identity and employment authorization of hired workers.",
        required_sources=["Full Legal Name & DOB", "SSN / Alien Registration", "List A/B/C Identity Document Numbers"],
        is_demo_ready=False,
        tags=["Mandatory HR", "Compliance", "Digit Comb Boxes"],
        pdf_file="templates/02_employment/I-9_Employment-Eligibility-Verification.pdf",
    ),

    # ── Employer Petitions ──
    TemplateItem(
        id="uscis-i129",
        code="Form I-129",
        title="Petition for a Nonimmigrant Worker",
        category="Employer Petitions",
        pages=38,
        estimated_fields=927,
        description="Official petition for specialty occupations, intracompany transferees, and professional visas (H-1B, L-1, O-1, P-1, TN, E-2).",
        required_sources=["Company FEIN / Financials", "Beneficiary Passport / I-94", "Job Offer / LCA Details", "Educational Degrees"],
        is_demo_ready=True,
        tags=["USCIS Official", "Comb Boxes", "Multi-Visa Supplement", "Full Demo Packet"],
        pdf_file="templates/03_employer_petitions/I-129_Nonimmigrant-Worker-Petition.pdf",
    ),
    TemplateItem(
        id="uscis-i129s",
        code="Form I-129S",
        title="Nonimmigrant Petition Based on Blanket L Petition",
        category="Employer Petitions",
        pages=6,
        estimated_fields=120,
        description="Used during the L-1 blanket petition process for intracompany transferees under an approved blanket L petition.",
        required_sources=["Blanket Petition Approval Notice", "Beneficiary Qualifications", "Position Description"],
        is_demo_ready=False,
        tags=["USCIS Official", "L-1 Visa", "Intracompany Transfer"],
        pdf_file="templates/03_employer_petitions/I-129S_L1-Blanket-Petition.pdf",
    ),
    TemplateItem(
        id="uscis-i140",
        code="Form I-140",
        title="Immigrant Petition for Alien Workers",
        category="Employer Petitions",
        pages=9,
        estimated_fields=180,
        description="Employer petition for an employment-based immigrant classification for a foreign national worker.",
        required_sources=["Job Offer Letter", "Educational Credentials", "Labor Certification (if needed)", "Company Financials"],
        is_demo_ready=False,
        tags=["USCIS Official", "Green Card Pathway", "Employment-Based"],
        pdf_file="templates/03_employer_petitions/I-140_Immigrant-Petition-Alien-Workers.pdf",
    ),
    TemplateItem(
        id="uscis-i907",
        code="Form I-907",
        title="Request for Premium Processing Service",
        category="Employer Petitions",
        pages=3,
        estimated_fields=45,
        description="Request for USCIS to adjudicate a petition within 15 business days in exchange for an additional fee.",
        required_sources=["Petitioner Name & Address", "Underlying Petition Receipt Number", "Contact Person Details"],
        is_demo_ready=False,
        tags=["USCIS Official", "Premium Processing", "Expedite"],
        pdf_file="templates/03_employer_petitions/I-907_Premium-Processing.pdf",
    ),

    # ── Green Card ──
    TemplateItem(
        id="uscis-i485",
        code="Form I-485",
        title="Application to Register Permanent Residence (Green Card)",
        category="Green Card",
        pages=20,
        estimated_fields=410,
        description="Application for permanent resident status (Green Card) through family or employment-based immigrant categories.",
        required_sources=["Birth Certificate", "Biographical Notes", "Immigration History", "Address & Employment History"],
        is_demo_ready=False,
        tags=["USCIS Official", "Adjustment of Status", "Comprehensive"],
        pdf_file="templates/04_green_card/I-485_Adjustment-of-Status.pdf",
    ),
    TemplateItem(
        id="uscis-i693",
        code="Form I-693",
        title="Report of Medical Examination and Vaccination Record",
        category="Green Card",
        pages=11,
        estimated_fields=155,
        description="Medical examination form completed by a USCIS-designated civil surgeon for immigration purposes.",
        required_sources=["Medical History", "Vaccination Records", "Physical Exam Results", "Civil Surgeon Details"],
        is_demo_ready=False,
        tags=["USCIS Official", "Medical Exam", "Civil Surgeon Required"],
        pdf_file="templates/04_green_card/I-693_Medical-Examination.pdf",
    ),
    TemplateItem(
        id="uscis-i90",
        code="Form I-90",
        title="Application to Replace Permanent Resident Card",
        category="Green Card",
        pages=12,
        estimated_fields=110,
        description="Application to renew or replace an expiring or lost Permanent Resident Card (Green Card).",
        required_sources=["Current Green Card Info", "Address History", "Biographic Data", "Replacement Reason"],
        is_demo_ready=False,
        tags=["USCIS Official", "Green Card Renewal", "Replacement"],
        pdf_file="templates/04_green_card/I-90_Green-Card-Renewal.pdf",
    ),

    # ── Travel ──
    TemplateItem(
        id="uscis-i131",
        code="Form I-131",
        title="Application for Travel Document",
        category="Travel",
        pages=9,
        estimated_fields=130,
        description="Application for a reentry permit, refugee travel document, TPS travel authorization, or advance parole.",
        required_sources=["Passport & Visa Info", "Current Immigration Status", "Travel Purpose", "Address History"],
        is_demo_ready=False,
        tags=["USCIS Official", "Travel Authorization", "Advance Parole"],
        pdf_file="templates/05_travel/I-131_Travel-Document.pdf",
    ),
    TemplateItem(
        id="uscis-i131a",
        code="Form I-131A",
        title="Application for Carrier Documentation",
        category="Travel",
        pages=5,
        estimated_fields=65,
        description="Application for a transportation letter for LPRs stranded outside the US without a valid reentry permit or green card.",
        required_sources=["Proof of Lawful Permanent Residence", "Passport Details", "Travel Circumstances"],
        is_demo_ready=False,
        tags=["USCIS Official", "Carrier Documentation", "Stranded LPR"],
        pdf_file="templates/05_travel/I-131A_Carrier-Documentation.pdf",
    ),

    # ── Family & Relatives (from Infographic) ──
    TemplateItem(
        id="uscis-i130",
        code="Form I-130",
        title="Petition for Alien Relative",
        category="Family",
        pages=12,
        estimated_fields=450,
        description="Establishes a qualifying family relationship for immigration purposes (spouse, children, parents, or siblings).",
        required_sources=["Petitioner Proof of Status", "Beneficiary Birth / Marriage Certificate", "Family Relationship Proof"],
        is_demo_ready=False,
        tags=["USCIS Official", "Family Petitions", "High Priority"],
        pdf_file="templates/07_family/I-130_Petition-Alien-Relative.pdf",
    ),
    TemplateItem(
        id="uscis-i864",
        code="Form I-864",
        title="Affidavit of Support Under Section 213A",
        category="Family",
        pages=12,
        estimated_fields=219,
        description="Shows a qualifying sponsor accepts financial responsibility for an immigrant intending to permanently reside in the US.",
        required_sources=["Sponsor Tax Returns / W-2s", "Household Income Proof", "Proof of US Citizenship or LPR"],
        is_demo_ready=False,
        tags=["USCIS Official", "Affidavit of Support", "Financial Sponsor"],
        pdf_file="templates/07_family/I-864_Affidavit-of-Support.pdf",
    ),

    # ── Status Change & Condition Removal (from Infographic) ──
    TemplateItem(
        id="uscis-i539",
        code="Form I-539",
        title="Application to Extend/Change Nonimmigrant Status",
        category="Status Extension",
        pages=7,
        estimated_fields=159,
        description="Used to extend stay or change certain nonimmigrant classifications for dependents, visitors, students, and workers.",
        required_sources=["Form I-94 Arrival Record", "Passport & Visa Copy", "Proof of Maintained Status"],
        is_demo_ready=False,
        tags=["USCIS Official", "Dependents & Students", "Status Extension"],
        pdf_file="templates/08_status_change/I-539_Extend-Change-Status.pdf",
    ),
    TemplateItem(
        id="uscis-i751",
        code="Form I-751",
        title="Petition to Remove Conditions on Residence",
        category="Green Card",
        pages=11,
        estimated_fields=329,
        description="Used to remove conditions from certain marriage-based green cards to transition to permanent 10-year residency.",
        required_sources=["2-Year Conditional Green Card", "Joint Financial Records", "Cohabitation Evidence"],
        is_demo_ready=False,
        tags=["USCIS Official", "Marriage-Based", "Condition Removal"],
        pdf_file="templates/08_status_change/I-751_Remove-Conditions-Residence.pdf",
    ),
    TemplateItem(
        id="uscis-i829",
        code="Form I-829",
        title="Petition by Investor to Remove Conditions on Residence",
        category="Green Card",
        pages=10,
        estimated_fields=359,
        description="Used by eligible EB-5 investors to remove conditions on residence by proving investment and 10 job creations.",
        required_sources=["Commercial Enterprise Proof", "Payroll / I-9 Records (10 Jobs)", "Audited Financials"],
        is_demo_ready=False,
        tags=["USCIS Official", "EB-5 Investor", "Job Creation Proof"],
        pdf_file="templates/08_status_change/I-829_Remove-EB5-Conditions.pdf",
    ),

    # ── Citizenship & Naturalization (from Infographic) ──
    TemplateItem(
        id="uscis-n400",
        code="Form N-400",
        title="Application for Naturalization",
        category="Citizenship",
        pages=14,
        estimated_fields=440,
        description="Used by eligible lawful permanent residents (Green Card holders) to apply for United States citizenship.",
        required_sources=["Green Card Copy", "Physical Presence Travel Log", "5-Year Residence & Employment History"],
        is_demo_ready=False,
        tags=["USCIS Official", "US Citizenship", "Naturalization Flagship"],
        pdf_file="templates/09_citizenship/N-400_Application-for-Naturalization.pdf",
    ),

    # ── Consular & Labor Filings (from Infographic) ──
    TemplateItem(
        id="dos-ds160",
        code="Form DS-160",
        title="Online Nonimmigrant Visa Application",
        category="Consular",
        pages=8,
        estimated_fields=160,
        description="Used for temporary visa applications at U.S. consulates and embassies abroad (B-1/B-2, F-1, H-1B stamping).",
        required_sources=["Valid Passport Information", "Travel Details & Contacts", "5-Year Work & Travel History"],
        is_demo_ready=False,
        tags=["State Department", "Consular Processing", "Electronic Intake"],
        pdf_file=None,
    ),
    TemplateItem(
        id="dos-ds260",
        code="Form DS-260",
        title="Online Immigrant Visa Application",
        category="Consular",
        pages=12,
        estimated_fields=240,
        description="Used for immigrant visa cases processed through the National Visa Center (NVC) and U.S. consulates.",
        required_sources=["NVC Case Number", "Biographical Background", "Police & Military Records"],
        is_demo_ready=False,
        tags=["State Department", "NVC Immigrant Visa", "Consular Processing"],
        pdf_file=None,
    ),
    TemplateItem(
        id="dol-eta9089",
        code="ETA Form 9089",
        title="Application for Permanent Employment Certification (PERM)",
        category="Employer Petitions",
        pages=15,
        estimated_fields=310,
        description="Used in employer-sponsored EB-2 and EB-3 green-card cases to certify labor market testing before filing Form I-140.",
        required_sources=["Prevailing Wage Determination", "Recruitment Audit Documentation", "Beneficiary Credentials"],
        is_demo_ready=False,
        tags=["DOL Official", "PERM Labor Certification", "Permanent Green Card"],
        pdf_file=None,
    ),

    # ── IRS Tax Forms ──
    TemplateItem(
        id="irs-w9",
        code="IRS Form W-9",
        title="Request for Taxpayer Identification Number",
        category="Tax",
        pages=6,
        estimated_fields=23,
        description="Standard IRS certification providing correct Taxpayer Identification Number (TIN/SSN/EIN) for contractors and vendors.",
        required_sources=["Legal Entity / Individual Name", "Tax Classification", "Address", "SSN or EIN"],
        is_demo_ready=False,
        tags=["IRS Official", "Tax ID Certification", "Contractor Onboarding"],
        pdf_file="templates/10_tax/W-9_Request-TIN.pdf",
    ),
    TemplateItem(
        id="irs-w4",
        code="IRS Form W-4",
        title="Employee's Withholding Certificate",
        category="Tax",
        pages=5,
        estimated_fields=48,
        description="Federal tax withholding declaration completed by employees so employers withhold the correct federal income tax.",
        required_sources=["Marital Filing Status", "Dependents Count", "Other Income / Deductions", "SSN & Address"],
        is_demo_ready=False,
        tags=["IRS Official", "Payroll Withholding", "Annual Update"],
        pdf_file="templates/10_tax/W-4_Employee-Withholding.pdf",
    ),
]


def _build_demo_source_summary(source_id: str) -> SourceSummary:
    samples_dir = _find_samples_dir()
    packet_dir = samples_dir / "dummy_source_packet"
    sdir = source_dir(source_id)
    files_dir = sdir / "files"
    files_dir.mkdir(parents=True, exist_ok=True)

    items_data: list[dict] = []
    warnings: list[SourceWarning] = []
    summary_items: list[SourceItem] = []

    if packet_dir.exists() and packet_dir.is_dir():
        for src_file in sorted(packet_dir.glob("*.*")):
            if src_file.name.lower() in ("readme.txt", "readme.md"):
                continue
            ext = src_file.suffix.lower()
            if ext not in ACCEPTED_EXTENSIONS:
                continue

            dest = files_dir / src_file.name
            shutil.copy2(str(src_file), str(dest))

            extracted, warn = extract_text(dest)
            if warn:
                warnings.append(SourceWarning(file=src_file.name, warning=warn))

            items_data.append({"name": src_file.name, "chars": len(extracted), "text": extracted})
            summary_items.append(SourceItem(name=src_file.name, chars=len(extracted)))

    text_json = {
        "source_id": source_id,
        "items": items_data,
        "warnings": [w.model_dump() for w in warnings],
    }
    write_json(sdir / "text.json", text_json)

    facts_learned = 0
    facts_total = 0
    combined = "\n\n".join(item.get("text", "") for item in items_data)
    if combined.strip():
        try:
            names = [i["name"] for i in items_data] or [source_id]
            stats = profile_store.merge_facts(
                extract_facts(combined), source=", ".join(names), profile_id="demo"
            )
            facts_learned = stats["changed"]
            facts_total = stats["total"]
        except Exception:
            logging.getLogger(__name__).exception("Demo fact extraction failed")

    return SourceSummary(
        source_id=source_id,
        items=summary_items,
        warnings=warnings,
        facts_learned=facts_learned,
        facts_total=facts_total,
    )


@app.post(
    "/api/sources/sample",
    response_model=SourceSummary,
)
async def load_sample_source() -> SourceSummary:
    """Provisions a pre-loaded sample applicant source packet (passport, resume, notes)."""
    source_id = new_id("s")
    return _build_demo_source_summary(source_id)


@app.get("/api/templates", response_model=TemplateListResponse)
async def list_templates() -> TemplateListResponse:
    """Return pre-loaded template catalog."""
    return TemplateListResponse(templates=TEMPLATES_CATALOG)


@app.post(
    "/api/templates/demo",
    response_model=DemoLoadResponse,
    responses={400: {"model": ErrorResponse}},
)
async def load_demo() -> DemoLoadResponse:
    """1-Click Demo: provisions 38-page I-129 PDF + categorized dummy source packet."""
    samples_dir = _find_samples_dir()
    sample_pdf = samples_dir / "i129_sample_form.pdf"
    if not sample_pdf.exists():
        raise HTTPException(status_code=400, detail="Demo sample PDF not found on system.")

    form_id = new_id("f")
    fdir = form_dir(form_id)
    dest_pdf = fdir / "original.pdf"
    shutil.copy2(str(sample_pdf), str(dest_pdf))

    schema = _process_pdf_and_create_schema(dest_pdf, "i-129_sample_form.pdf", form_id)

    source_id = new_id("s")
    source_summary = _build_demo_source_summary(source_id)

    return DemoLoadResponse(schema=schema, source=source_summary)


@app.post(
    "/api/templates/{template_id}/load",
    response_model=FormSchema,
    responses={404: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
)
async def load_template_form(template_id: str) -> FormSchema:
    """Load a template PDF into Form Studio and return its schema."""
    template = next((t for t in TEMPLATES_CATALOG if t.id == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found.")

    samples_dir = _find_samples_dir()

    # Resolve the PDF path
    if template.pdf_file:
        # pdf_file is relative to samples/ directory
        sample_pdf = samples_dir / template.pdf_file
    else:
        # No PDF yet — fall back to demo I-129 for preview, or raise 400
        sample_pdf = samples_dir / "i129_sample_form.pdf"

    if not sample_pdf.exists():
        raise HTTPException(
            status_code=400,
            detail=f"PDF for '{template.code}' is not yet available on this server."
        )

    form_id = new_id("f")
    fdir = form_dir(form_id)
    dest_pdf = fdir / "original.pdf"
    shutil.copy2(str(sample_pdf), str(dest_pdf))

    filename = sample_pdf.name
    return _process_pdf_and_create_schema(dest_pdf, filename, form_id)



