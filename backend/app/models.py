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


class ErrorResponse(BaseModel):
    error: str
