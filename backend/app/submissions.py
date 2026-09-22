"""Submissions Router — Save, retrieve, and export filled form sessions with legal audit trail."""
from __future__ import annotations

import csv
import io
import logging
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from app.auth import get_current_user, get_db
from app.models import (
    ErrorResponse,
    FieldCitation,
    FieldConflict,
    FieldInference,
)
from app.pdf_export import export_filled_pdf
from app.storage import form_dir, read_json

log = logging.getLogger(__name__)

submissions_router = APIRouter(prefix="/api/submissions", tags=["submissions"])


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class SubmissionSummary(BaseModel):
    id: str
    form_id: str
    filename: str
    title: str
    user_email: str
    status: str  # "draft" | "filled" | "exported"
    fields_filled: int = 0
    fields_total: int = 0
    created_at: str
    updated_at: str


class SubmissionListResponse(BaseModel):
    submissions: List[SubmissionSummary]
    total: int


class SubmissionDetail(BaseModel):
    id: str
    form_id: str
    filename: str
    title: str
    user_email: str
    status: str
    fields_filled: int = 0
    fields_total: int = 0
    created_at: str
    updated_at: str
    values: Dict[str, str] = Field(default_factory=dict)
    citations: Dict[str, FieldCitation] = Field(default_factory=dict)
    conflicts: List[FieldConflict] = Field(default_factory=list)
    inferences: Dict[str, FieldInference] = Field(default_factory=dict)
    source_id: Optional[str] = None
    form_schema: Optional[Dict[str, Any]] = None  # snapshot of schema at save time


class SaveSubmissionRequest(BaseModel):
    form_id: str
    filename: str
    title: Optional[str] = None
    values: Dict[str, str] = Field(default_factory=dict)
    citations: Optional[Dict[str, FieldCitation]] = None
    conflicts: Optional[List[FieldConflict]] = None
    inferences: Optional[Dict[str, FieldInference]] = None
    source_id: Optional[str] = None
    status: Optional[str] = "filled"
    submission_id: Optional[str] = None  # If provided, update existing
    form_schema: Optional[Dict[str, Any]] = None  # Snapshot of FormSchema for restore


class UpdateSubmissionRequest(BaseModel):
    title: Optional[str] = None
    values: Optional[Dict[str, str]] = None
    status: Optional[str] = None


class DeleteSubmissionResponse(BaseModel):
    success: bool
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_summary(doc: dict) -> SubmissionSummary:
    return SubmissionSummary(
        id=doc.get("id", str(doc.get("_id", ""))),
        form_id=doc.get("form_id", ""),
        filename=doc.get("filename", "untitled.pdf"),
        title=doc.get("title") or doc.get("filename", "Untitled Form"),
        user_email=doc.get("user_email", ""),
        status=doc.get("status", "filled"),
        fields_filled=doc.get("fields_filled", 0),
        fields_total=doc.get("fields_total", 0),
        created_at=doc.get("created_at", ""),
        updated_at=doc.get("updated_at", ""),
    )


def _serialize_detail(doc: dict) -> SubmissionDetail:
    raw_citations = doc.get("citations", {}) or {}
    citations_dict: Dict[str, FieldCitation] = {}
    for k, v in raw_citations.items():
        if isinstance(v, dict):
            citations_dict[k] = FieldCitation(**v)
        elif isinstance(v, FieldCitation):
            citations_dict[k] = v

    raw_conflicts = doc.get("conflicts", []) or []
    conflicts_list: List[FieldConflict] = []
    for c in raw_conflicts:
        if isinstance(c, dict):
            conflicts_list.append(FieldConflict(**c))
        elif isinstance(c, FieldConflict):
            conflicts_list.append(c)

    raw_inferences = doc.get("inferences", {}) or {}
    inferences_dict: Dict[str, FieldInference] = {}
    for k, v in raw_inferences.items():
        if isinstance(v, dict):
            inferences_dict[k] = FieldInference(**v)
        elif isinstance(v, FieldInference):
            inferences_dict[k] = v

    return SubmissionDetail(
        id=doc.get("id", str(doc.get("_id", ""))),
        form_id=doc.get("form_id", ""),
        filename=doc.get("filename", "untitled.pdf"),
        title=doc.get("title") or doc.get("filename", "Untitled Form"),
        user_email=doc.get("user_email", ""),
        status=doc.get("status", "filled"),
        fields_filled=doc.get("fields_filled", 0),
        fields_total=doc.get("fields_total", 0),
        created_at=doc.get("created_at", ""),
        updated_at=doc.get("updated_at", ""),
        values=doc.get("values", {}) or {},
        citations=citations_dict,
        conflicts=conflicts_list,
        inferences=inferences_dict,
        source_id=doc.get("source_id"),
        form_schema=doc.get("form_schema"),  # may be None for old submissions
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@submissions_router.get(
    "",
    response_model=SubmissionListResponse,
    responses={401: {"model": ErrorResponse}},
)
async def list_submissions(
    current_user: Optional[dict] = Depends(get_current_user),
) -> SubmissionListResponse:
    """List past form submissions for the logged-in user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    db = get_db()
    email = current_user["email"].strip().lower()
    is_admin = current_user.get("role") == "admin"

    query = {} if is_admin else {"user_email": email}
    cursor = db.submissions.find(query).sort("updated_at", -1)
    docs = await cursor.to_list(length=200)

    items = [_serialize_summary(d) for d in docs]
    return SubmissionListResponse(submissions=items, total=len(items))


@submissions_router.post(
    "",
    response_model=SubmissionDetail,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
)
async def save_submission(
    payload: SaveSubmissionRequest,
    current_user: Optional[dict] = Depends(get_current_user),
) -> SubmissionDetail:
    """Save or update a form submission in MongoDB."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    db = get_db()
    email = current_user["email"].strip().lower()
    now_iso = datetime.now(timezone.utc).isoformat()

    fdir = form_dir(payload.form_id)
    schema_path = fdir / "schema.json"
    fields_total = 0
    if schema_path.exists():
        schema_data = read_json(schema_path)
        fields_total = len(schema_data.get("fields", []))

    non_empty_values = {k: v for k, v in payload.values.items() if str(v).strip()}
    fields_filled = len(non_empty_values)
    if fields_total == 0:
        fields_total = max(fields_filled, len(payload.values))

    citations_data = (
        {k: v.model_dump() for k, v in payload.citations.items()}
        if payload.citations
        else {}
    )
    conflicts_data = (
        [c.model_dump() for c in payload.conflicts]
        if payload.conflicts
        else []
    )
    inferences_data = (
        {k: v.model_dump() for k, v in payload.inferences.items()}
        if payload.inferences
        else {}
    )

    # Capture a schema snapshot so "Open in Editor" works even after server files are gone.
    # Prefer what's on disk (most complete); fall back to what the frontend sent.
    form_schema_data: Optional[dict] = None
    if schema_path.exists():
        form_schema_data = read_json(schema_path)
    elif payload.form_schema:
        form_schema_data = payload.form_schema

    title = payload.title or payload.filename

    if payload.submission_id:
        existing = await db.submissions.find_one({
            "id": payload.submission_id,
            "user_email": email,
        })
        if not existing and current_user.get("role") != "admin":
            raise HTTPException(status_code=404, detail="Submission not found.")

        update_fields: dict[str, Any] = {
            "values": payload.values,
            "fields_filled": fields_filled,
            "fields_total": fields_total,
            "updated_at": now_iso,
            "status": payload.status or "filled",
        }
        if payload.title:
            update_fields["title"] = payload.title
        if payload.citations is not None:
            update_fields["citations"] = citations_data
        if payload.conflicts is not None:
            update_fields["conflicts"] = conflicts_data
        if payload.inferences is not None:
            update_fields["inferences"] = inferences_data
        if payload.source_id:
            update_fields["source_id"] = payload.source_id
        # Only overwrite schema snapshot if we have a fresh one (don't erase old)
        if form_schema_data and not existing.get("form_schema"):
            update_fields["form_schema"] = form_schema_data

        await db.submissions.update_one(
            {"id": payload.submission_id},
            {"$set": update_fields},
        )
        updated_doc = await db.submissions.find_one({"id": payload.submission_id})
        return _serialize_detail(updated_doc)

    sub_id = f"sub_{uuid.uuid4().hex[:10]}"
    doc = {
        "id": sub_id,
        "form_id": payload.form_id,
        "filename": payload.filename,
        "title": title,
        "user_email": email,
        "status": payload.status or "filled",
        "fields_filled": fields_filled,
        "fields_total": fields_total,
        "created_at": now_iso,
        "updated_at": now_iso,
        "values": payload.values,
        "citations": citations_data,
        "conflicts": conflicts_data,
        "inferences": inferences_data,
        "source_id": payload.source_id,
        "form_schema": form_schema_data,  # snapshot for editor restore
    }

    await db.submissions.insert_one(doc)
    return _serialize_detail(doc)



@submissions_router.get(
    "/{submission_id}",
    response_model=SubmissionDetail,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def get_submission(
    submission_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
) -> SubmissionDetail:
    """Get full details of a saved submission."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    db = get_db()
    email = current_user["email"].strip().lower()
    is_admin = current_user.get("role") == "admin"

    query = {"id": submission_id} if is_admin else {"id": submission_id, "user_email": email}
    doc = await db.submissions.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found.")

    # Auto-restore form assets and form_schema if missing
    form_id = doc.get("form_id")
    if form_id:
        fdir = form_dir(form_id)
        schema_path = fdir / "schema.json"
        pdf_path = fdir / "original.pdf"

        # If original.pdf missing, try to find in samples/
        if not pdf_path.exists() and doc.get("filename"):
            samples_dir = Path("samples").resolve()
            if not samples_dir.exists():
                samples_dir = Path("../samples").resolve()
            found_pdf = None
            for p in samples_dir.rglob("*.pdf"):
                if p.name.lower() == doc["filename"].lower():
                    found_pdf = p
                    break
            if not found_pdf and ("i129" in doc["filename"].lower() or "i-129" in doc["filename"].lower()):
                cand = samples_dir / "i129_sample_form.pdf"
                if cand.exists():
                    found_pdf = cand
            if found_pdf and found_pdf.exists():
                shutil.copy2(str(found_pdf), str(pdf_path))

        # If form_schema is missing from doc, restore from disk schema or parse PDF
        if not doc.get("form_schema"):
            if schema_path.exists():
                schema_data = read_json(schema_path)
                doc["form_schema"] = schema_data
                await db.submissions.update_one({"id": submission_id}, {"$set": {"form_schema": schema_data}})
            elif pdf_path.exists():
                try:
                    from app.main import _process_pdf_and_create_schema
                    schema_obj = _process_pdf_and_create_schema(pdf_path, doc.get("filename", "form.pdf"), form_id)
                    schema_data = schema_obj.model_dump()
                    doc["form_schema"] = schema_data
                    await db.submissions.update_one({"id": submission_id}, {"$set": {"form_schema": schema_data}})
                except Exception:
                    pass

    return _serialize_detail(doc)


@submissions_router.put(
    "/{submission_id}",
    response_model=SubmissionDetail,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def update_submission(
    submission_id: str,
    payload: UpdateSubmissionRequest,
    current_user: Optional[dict] = Depends(get_current_user),
) -> SubmissionDetail:
    """Update title, values, or status of a submission."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    db = get_db()
    email = current_user["email"].strip().lower()
    is_admin = current_user.get("role") == "admin"

    query = {"id": submission_id} if is_admin else {"id": submission_id, "user_email": email}
    doc = await db.submissions.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    updates: dict[str, Any] = {"updated_at": now_iso}

    if payload.title is not None:
        updates["title"] = payload.title
    if payload.status is not None:
        updates["status"] = payload.status
    if payload.values is not None:
        updates["values"] = payload.values
        non_empty = {k: v for k, v in payload.values.items() if str(v).strip()}
        updates["fields_filled"] = len(non_empty)

    await db.submissions.update_one({"id": submission_id}, {"$set": updates})
    updated_doc = await db.submissions.find_one({"id": submission_id})
    return _serialize_detail(updated_doc)


@submissions_router.delete(
    "/{submission_id}",
    response_model=DeleteSubmissionResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def delete_submission(
    submission_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
) -> DeleteSubmissionResponse:
    """Delete a submission."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    db = get_db()
    email = current_user["email"].strip().lower()
    is_admin = current_user.get("role") == "admin"

    query = {"id": submission_id} if is_admin else {"id": submission_id, "user_email": email}
    res = await db.submissions.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found.")

    return DeleteSubmissionResponse(success=True, message="Submission deleted successfully.")


@submissions_router.get(
    "/{submission_id}/audit/csv",
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def download_audit_csv(
    submission_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
) -> StreamingResponse:
    """Stream an RFC-4180 compliant CSV audit report of field values & source provenance."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    db = get_db()
    email = current_user["email"].strip().lower()
    is_admin = current_user.get("role") == "admin"

    query = {"id": submission_id} if is_admin else {"id": submission_id, "user_email": email}
    doc = await db.submissions.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found.")

    form_id = doc.get("form_id", "")
    fdir = form_dir(form_id)
    schema_path = fdir / "schema.json"
    fields_map: dict[str, dict] = {}
    if schema_path.exists():
        schema_data = read_json(schema_path)
        for f in schema_data.get("fields", []):
            fields_map[f["field_id"]] = f

    values = doc.get("values", {}) or {}
    citations = doc.get("citations", {}) or {}
    conflicts = {c.get("field_id"): c for c in doc.get("conflicts", []) if isinstance(c, dict)}

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    writer.writerow(["# LEGAL COMPLIANCE & DATA PROVENANCE AUDIT TRAIL"])
    writer.writerow(["# Submission ID", doc.get("id", "")])
    writer.writerow(["# Document", doc.get("filename", "")])
    writer.writerow(["# Filer Account", doc.get("user_email", "")])
    writer.writerow(["# Generated At", datetime.now(timezone.utc).isoformat()])
    writer.writerow(["# Status", doc.get("status", "")])
    writer.writerow([])

    writer.writerow([
        "Field ID",
        "Field Label",
        "Page",
        "Populated Value",
        "Source Document",
        "Line Number",
        "Evidence Snippet",
        "Confidence",
        "Method",
        "Conflict Status",
    ])

    for field_id, value in values.items():
        if not str(value).strip():
            continue
        field_meta = fields_map.get(field_id, {})
        label = field_meta.get("label", field_id)
        page = field_meta.get("page", 1)

        cit = citations.get(field_id, {})
        source_doc = cit.get("source_file", "User Profile / Manual")
        line = cit.get("line_number", "")
        snippet = cit.get("snippet", "")
        confidence = f"{int(cit.get('confidence', 1.0) * 100)}%"
        method = cit.get("method", "manual")

        conflict = conflicts.get(field_id)
        conflict_status = "Resolved" if conflict else "Clear"

        writer.writerow([
            field_id,
            label,
            page,
            value,
            source_doc,
            line,
            snippet,
            confidence,
            method,
            conflict_status,
        ])

    output.seek(0)
    filename = f"audit_trail_{doc.get('filename', 'form').replace('.pdf', '')}_{submission_id}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@submissions_router.post(
    "/{submission_id}/export",
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def export_submission_pdf(
    submission_id: str,
    current_user: Optional[dict] = Depends(get_current_user),
) -> FileResponse:
    """Directly export and return the filled PDF for a saved submission."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")

    db = get_db()
    email = current_user["email"].strip().lower()
    is_admin = current_user.get("role") == "admin"

    query = {"id": submission_id} if is_admin else {"id": submission_id, "user_email": email}
    doc = await db.submissions.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Submission not found.")

    form_id = doc.get("form_id", "")
    fdir = form_dir(form_id)
    if not (fdir / "schema.json").exists():
        raise HTTPException(status_code=404, detail="Base form schema not found on server.")

    values = doc.get("values", {})
    output_path = fdir / f"export_{submission_id}.pdf"
    try:
        export_filled_pdf(form_id, values, output_path)
    except Exception as e:
        log.exception("PDF export failed for submission %s", submission_id)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    download_name = doc.get("filename", "form.pdf").replace(".pdf", "_filled.pdf")
    return FileResponse(
        path=output_path,
        media_type="application/pdf",
        filename=download_name,
    )
