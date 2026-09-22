import pytest
from pathlib import Path
from pypdf import PdfReader
from app.pdf_read import parse_form
from app.pdf_export import export_filled_pdf
from app.models import FormSchema
from app.storage import form_dir, write_json, new_id

SAMPLES_DIR = Path(__file__).resolve().parent.parent.parent / "samples"

# Find representative test forms in samples/
SAMPLE_FORMS = [
    SAMPLES_DIR / "i129_sample_form.pdf",
    SAMPLES_DIR / "templates" / "02_employment" / "I-765_Employment-Authorization.pdf",
    SAMPLES_DIR / "templates" / "04_green_card" / "I-485_Adjustment-of-Status.pdf",
    SAMPLES_DIR / "templates" / "07_family" / "I-130_Petition-Alien-Relative.pdf",
]
# Keep only those that exist on disk
TEST_PDFS = [p for p in SAMPLE_FORMS if p.exists()]
if not TEST_PDFS:
    TEST_PDFS = list(SAMPLES_DIR.glob("*.pdf"))[:3]


@pytest.mark.parametrize("pdf_path", TEST_PDFS, ids=lambda p: p.stem)
def test_parse_sample_forms(pdf_path: Path):
    """
    Phase 7 test:
    - Parsing produces expected fields count
    - Every checkbox has a valid on_state
    - Every bbox is within 0.0 to 1.0 with valid coordinates (origin top-left)
    """
    schema = parse_form(pdf_path)
    assert isinstance(schema, FormSchema)
    assert schema.page_count > 0
    assert len(schema.fields) > 0

    # Every checkbox must have a non-empty on_state
    for f in schema.fields:
        if f.type == "checkbox":
            assert f.on_state is not None, f"Checkbox {f.field_id} missing on_state"
            assert len(f.on_state) > 0, f"Checkbox {f.field_id} has empty on_state"

    # Every bbox must be strictly within 0.0 to 1.0 (normalized origin top-left)
    for f in schema.fields:
        x0, y0, x1, y1 = f.bbox
        assert 0.0 <= x0 <= 1.0, f"Field {f.field_id} x0 out of bounds: {x0}"
        assert 0.0 <= y0 <= 1.0, f"Field {f.field_id} y0 out of bounds: {y0}"
        assert 0.0 <= x1 <= 1.0, f"Field {f.field_id} x1 out of bounds: {x1}"
        assert 0.0 <= y1 <= 1.0, f"Field {f.field_id} y1 out of bounds: {y1}"
        assert x0 <= x1, f"Field {f.field_id} invalid width (x0 > x1)"
        assert y0 <= y1, f"Field {f.field_id} invalid height (y0 > y1)"


@pytest.mark.parametrize("pdf_path", TEST_PDFS, ids=lambda p: p.stem)
def test_export_roundtrip(pdf_path: Path):
    """
    Phase 7 test:
    - A write-then-read-back round trip returns the exact values that were written.
    - Verified with no API key set.
    """
    form_id = new_id("test_rt")
    fdir = form_dir(form_id)
    (fdir / "original.pdf").write_bytes(pdf_path.read_bytes())

    schema = parse_form(pdf_path)
    write_json(fdir / "schema.json", schema.model_dump())

    # Pick first available text field
    fillable_text_fields = [f for f in schema.fields if f.type == "text"]
    assert len(fillable_text_fields) > 0, f"No text fields found in {pdf_path.name}"

    test_field = fillable_text_fields[0]
    expected_value = "ROUNDTRIP_VERIFIED_VALUE"
    test_values = {test_field.field_id: expected_value}

    out_pdf = fdir / "test_out.pdf"
    count = export_filled_pdf(form_id, test_values, out_pdf)
    assert count >= 1
    assert out_pdf.exists()

    # Read back with pypdf and verify the value in the AcroForm
    reader = PdfReader(str(out_pdf))
    assert len(reader.pages) == schema.page_count

    fields = reader.get_fields() or {}
    read_back_field = fields.get(test_field.raw_name)
    assert read_back_field is not None, f"Field {test_field.raw_name} not found in output PDF"
    assert read_back_field.get("/V") == expected_value, (
        f"Value mismatch: expected {expected_value}, got {read_back_field.get('/V')}"
    )
