from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel


FieldType = Literal[
    "text", "multiline_text", "checkbox", "radio",
    "dropdown", "listbox", "signature"
]


class FormField(BaseModel):
    field_id: str
    raw_name: str
    label: str
    tooltip: Optional[str] = None
    type: FieldType
    page: int
    bbox: list[float]          # [x0, y0, x1, y1] normalised 0-1, top-left origin
    options: Optional[list[str]] = None
    on_state: Optional[str] = None
    max_len: Optional[int] = None
    is_comb: bool = False
    required: bool = False
    read_only: bool = False


class PageInfo(BaseModel):
    number: int
    width: float               # PDF points
    height: float              # PDF points
    image: str                 # filename e.g. "page-1.png"


class FormSchema(BaseModel):
    form_id: str
    filename: str
    page_count: int
    pages: list[PageInfo]
    fields: list[FormField]


class TemplateItem(BaseModel):
    id: str
    code: str
    title: str
    category: str              # "Immigration", "Tax", "Corporate & HR"
    pages: int
    estimated_fields: int
    description: str
    required_sources: list[str]
    is_demo_ready: bool = False
    tags: list[str] = []
    pdf_file: Optional[str] = None   # relative path under samples/templates/ — None = not yet available


class TemplateListResponse(BaseModel):
    templates: list[TemplateItem]


class FieldCitation(BaseModel):
    field_id: str
    fact_key: str
    value: str
    source_file: str            # e.g. "04_job_offer.docx" or "profile"
    line_number: Optional[int] = None
    snippet: str                # verbatim line/sentence excerpt
    confidence: float = 1.0     # 0.0 - 1.0
    method: str = "exact"       # "exact", "fuzzy", "embed", "inference", "csv_column"


class CandidateValue(BaseModel):
    value: str
    source_file: str
    line_number: Optional[int] = None
    snippet: str
    confidence: float = 1.0
    method: str = "exact"


class FieldConflict(BaseModel):
    field_id: str
    fact_key: str
    field_label: str
    current_value: str
    candidates: list[CandidateValue]


class FieldInference(BaseModel):
    field_id: str
    rule_id: str
    reasoning: str              # human-readable explanation of why this was inferred
    source_evidence: str        # supporting text excerpt
    value: str


class ErrorResponse(BaseModel):
    error: str


