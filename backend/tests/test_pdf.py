import pytest
from pathlib import Path
from pypdf import PdfReader
from app.pdf_read import parse_form
from app.pdf_export import export_filled_pdf
from app.models import FormSchema
from app.storage import form_dir, write_json, new_id

SAMPLES_DIR = Path(__file__).resolve().parent.parent.parent / "samples"


def test_parse_sample_form():
    """Test parsing instafill_form.pdf (I-129) AcroForm fields."""
    sample_pdf = SAMPLES_DIR / "instafill_form.pdf"
    if not sample_pdf.exists():
        sample_pdf = next(SAMPLES_DIR.glob("*.pdf"))

    schema = parse_form(sample_pdf)
    assert isinstance(schema, FormSchema)
    assert schema.page_count > 0
    assert len(schema.fields) > 0

    # Every checkbox must have an on_state
    for f in schema.fields:
        if f.type == "checkbox":
            assert f.on_state is not None, f"Checkbox {f.field_id} missing on_state"
            assert len(f.on_state) > 0

    # Every bbox must be strictly within 0.0 to 1.0 (origin top-left)
    for f in schema.fields:
        x0, y0, x1, y1 = f.bbox
        assert 0.0 <= x0 <= 1.0, f"Field {f.field_id} x0 out of bounds: {x0}"
        assert 0.0 <= y0 <= 1.0, f"Field {f.field_id} y0 out of bounds: {y0}"
        assert 0.0 <= x1 <= 1.0, f"Field {f.field_id} x1 out of bounds: {x1}"
        assert 0.0 <= y1 <= 1.0, f"Field {f.field_id} y1 out of bounds: {y1}"
        assert x0 <= x1, f"Field {f.field_id} invalid width (x0 > x1)"
        assert y0 <= y1, f"Field {f.field_id} invalid height (y0 > y1)"


def test_export_roundtrip():
    """Test filling fields and exporting to a valid AcroForm PDF."""
    sample_pdf = SAMPLES_DIR / "instafill_form.pdf"
    if not sample_pdf.exists():
        sample_pdf = next(SAMPLES_DIR.glob("*.pdf"))

    form_id = new_id("test_form")
    fdir = form_dir(form_id)
    (fdir / "original.pdf").write_bytes(sample_pdf.read_bytes())

    schema = parse_form(sample_pdf)
    write_json(fdir / "schema.json", schema.model_dump())

    # Write test values
    fillable_text_fields = [f for f in schema.fields if f.type == "text"]
    assert len(fillable_text_fields) > 0

    test_field = fillable_text_fields[0]
    test_values = {test_field.field_id: "TEST_ROUNDTRIP_VAL"}

    out_pdf = fdir / "test_out.pdf"
    count = export_filled_pdf(form_id, test_values, out_pdf)
    assert count >= 1
    assert out_pdf.exists()

    # Read back with pypdf and verify
    reader = PdfReader(str(out_pdf))
    assert len(reader.pages) == schema.page_count
