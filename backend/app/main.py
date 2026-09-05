from __future__ import annotations

import logging
import shutil
import asyncio
from pathlib import Path

import pdfplumber
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
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
from app.storage import form_dir, source_dir, job_dir, new_id, write_json, read_json
from app import profile as profile_store

app = FastAPI(title="FormFill API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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

    return _process_pdf_and_create_schema(pdf_path, file.filename or pdf_path.name, form_id)



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
    responses={400: {"model": ErrorResponse}},
)
async def start_fill(
    background_tasks: BackgroundTasks,
    form_id: str = Form(...),
    source_id: str = Form(default=""),
) -> FillStatus:
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
    # ── Immigration (USCIS) ──
    TemplateItem(
        id="uscis-i129",
        code="USCIS Form I-129",
        title="Petition for a Nonimmigrant Worker",
        category="Immigration",
        pages=38,
        estimated_fields=927,
        description="Official petition for specialty occupations, intracompany transferees, and professional visas (H-1B, L-1, O-1, P-1, TN, E-2).",
        required_sources=["Company FEIN / Financials", "Beneficiary Passport / I-94", "Job Offer / LCA Details", "Educational Degrees"],
        is_demo_ready=True,
        tags=["USCIS Official", "Comb Boxes", "Multi-Visa Supplement", "Full Demo Packet"],
    ),
    TemplateItem(
        id="uscis-i765",
        code="USCIS Form I-765",
        title="Application for Employment Authorization (EAD)",
        category="Immigration",
        pages=7,
        estimated_fields=142,
        description="Application for noncitizens seeking permission to work legally in the United States (OPT, STEM OPT, DACA, Pending I-485).",
        required_sources=["Passport / Visa Copy", "Form I-94 Record", "Eligibility Category Details", "Prior EAD (if any)"],
        is_demo_ready=False,
        tags=["USCIS Official", "Work Authorization", "Checkboxes"],
    ),
    TemplateItem(
        id="uscis-i485",
        code="USCIS Form I-485",
        title="Application to Register Permanent Residence (Green Card)",
        category="Immigration",
        pages=20,
        estimated_fields=410,
        description="Application for permanent resident status (Green Card) through family or employment-based immigrant categories.",
        required_sources=["Birth Certificate", "Biographical Notes", "Immigration History", "Address & Employment History"],
        is_demo_ready=False,
        tags=["USCIS Official", "Adjustment of Status", "Comprehensive"],
    ),
    TemplateItem(
        id="uscis-i130",
        code="USCIS Form I-130",
        title="Petition for Alien Relative",
        category="Immigration",
        pages=12,
        estimated_fields=230,
        description="Petition to establish relationship for eligible relatives who wish to immigrate to the United States.",
        required_sources=["Petitioner Proof of Citizenship", "Beneficiary Info", "Marriage / Relationship Evidence"],
        is_demo_ready=False,
        tags=["USCIS Official", "Family Based", "AcroForm Certified"],
    ),
    TemplateItem(
        id="uscis-i9",
        code="USCIS Form I-9",
        title="Employment Eligibility Verification",
        category="Immigration",
        pages=4,
        estimated_fields=85,
        description="Mandatory verification used for all U.S. employers to verify identity and employment authorization of hired workers.",
        required_sources=["Full Legal Name & DOB", "SSN / Alien Registration", "List A/B/C Identity Document Numbers"],
        is_demo_ready=False,
        tags=["Mandatory HR", "Compliance", "Digit Comb Boxes"],
    ),

    # ── IRS Tax Forms ──
    TemplateItem(
        id="irs-w9",
        code="IRS Form W-9",
        title="Request for Taxpayer Identification Number & Certification",
        category="Tax",
        pages=6,
        estimated_fields=42,
        description="Standard IRS certification providing correct Taxpayer Identification Number (TIN/SSN/EIN) for contractors and vendors.",
        required_sources=["Legal Entity / Individual Name", "Tax Classification", "Address", "SSN or Employer Identification (EIN)"],
        is_demo_ready=False,
        tags=["IRS Official", "Tax ID Certification", "Contractor Onboarding"],
    ),
    TemplateItem(
        id="irs-w4",
        code="IRS Form W-4",
        title="Employee's Withholding Certificate",
        category="Tax",
        pages=4,
        estimated_fields=38,
        description="Federal tax withholding declaration completed by employees so employers withhold the correct federal income tax.",
        required_sources=["Marital Filing Status", "Dependents Count", "Other Income / Deductions", "SSN & Address"],
        is_demo_ready=False,
        tags=["IRS Official", "Payroll Withholding", "Annual Update"],
    ),
    TemplateItem(
        id="irs-1099nec",
        code="IRS Form 1099-NEC",
        title="Nonemployee Compensation",
        category="Tax",
        pages=3,
        estimated_fields=24,
        description="Reports payments of $600 or more made to nonemployees, independent contractors, or freelancers during the tax year.",
        required_sources=["Payer Name & TIN", "Recipient Name & Address", "Total Compensation Amount"],
        is_demo_ready=False,
        tags=["IRS Official", "Contractor Payouts", "Annual Tax"],
    ),
    TemplateItem(
        id="irs-8821",
        code="IRS Form 8821",
        title="Tax Information Authorization",
        category="Tax",
        pages=2,
        estimated_fields=36,
        description="Authorizes any designated individual, corporation, or firm to inspect and receive confidential tax information from the IRS.",
        required_sources=["Taxpayer Name & SSN/EIN", "Designee Appointee Info", "Tax Matters / Form Years Covered"],
        is_demo_ready=False,
        tags=["IRS Official", "Power of Info", "Authorization"],
    ),

    # ── Corporate & HR ──
    TemplateItem(
        id="hr-nda",
        code="Standard NDA",
        title="Mutual Non-Disclosure & Confidentiality Agreement",
        category="Corporate & HR",
        pages=4,
        estimated_fields=28,
        description="Bilateral confidentiality agreement protecting proprietary technology, financial records, trade secrets, and business discussions.",
        required_sources=["Disclosing Party Entity", "Receiving Party Entity", "Governing State / Jurisdiction", "Term Duration"],
        is_demo_ready=False,
        tags=["Standard Legal", "Corporate", "Bilateral Agreement"],
    ),
    TemplateItem(
        id="hr-direct-deposit",
        code="Direct Deposit",
        title="Employee Direct Deposit Authorization Form",
        category="Corporate & HR",
        pages=2,
        estimated_fields=32,
        description="Direct deposit authorization form for employee payroll processing and automated electronic bank account disbursement.",
        required_sources=["Employee Name & Contact", "Bank Routing / ABA Number", "Checking / Savings Account Number"],
        is_demo_ready=False,
        tags=["HR Onboarding", "Banking Authorization", "Payroll"],
    ),
    TemplateItem(
        id="hr-equipment-receipt",
        code="Asset Receipt",
        title="Company Equipment Receipt & Asset Security Agreement",
        category="Corporate & HR",
        pages=2,
        estimated_fields=20,
        description="Equipment custody and security policy acknowledgment for company laptops, peripherals, security badges, and access tokens.",
        required_sources=["Employee Name & Department", "Device Serial Numbers & Models", "Issue Date & Signatory"],
        is_demo_ready=False,
        tags=["IT Asset Management", "HR Onboarding", "Security Agreement"],
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
            stats = profile_store.merge_facts(extract_facts(combined), source=", ".join(names))
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
    """Load a template directly into Form Studio."""
    template = next((t for t in TEMPLATES_CATALOG if t.id == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found.")

    samples_dir = _find_samples_dir()
    sample_pdf = samples_dir / "i129_sample_form.pdf"
    if not sample_pdf.exists():
        sample_pdf = samples_dir / "test_form.pdf"

    if not sample_pdf.exists():
        raise HTTPException(status_code=400, detail="Template sample PDF asset not found.")

    form_id = new_id("f")
    fdir = form_dir(form_id)
    dest_pdf = fdir / "original.pdf"
    shutil.copy2(str(sample_pdf), str(dest_pdf))

    filename = f"{template.code.lower().replace(' ', '_')}.pdf"
    return _process_pdf_and_create_schema(dest_pdf, filename, form_id)



