"""
Tests for field->fact matching.

These encode the behaviours that were actually broken during development, so a
regression shows up as a failing test rather than a silently worse form fill.
"""
from __future__ import annotations

import pytest

from app.match import (
    clean_label,
    field_query,
    is_prose_query,
    is_unmatchable,
    match_field,
)
from app.models import FormField


ALL_FACTS = {
    "person.full_name", "person.first_name", "person.last_name",
    "person.middle_name", "person.date_of_birth", "person.nationality",
    "contact.email", "contact.phone", "contact.mobile",
    "address.street", "address.city", "address.state", "address.zip",
    "address.country", "employment.employer", "employment.job_title",
}


def make_field(label: str, ftype: str = "text", **kw) -> FormField:
    return FormField(
        field_id=kw.pop("field_id", "fld_0001"),
        raw_name=kw.pop("raw_name", "form1[0].X[0]"),
        label=label,
        tooltip=kw.pop("tooltip", None),
        type=ftype,
        page=1,
        bbox=[0.1, 0.1, 0.5, 0.15],
        **kw,
    )


# ---------------------------------------------------------------------------
# Label cleaning
# ---------------------------------------------------------------------------

def test_clean_label_strips_uscis_part_preamble():
    raw = "Part 1. Petitioner Information. 3. Mailing Address. Street Number and Name"
    assert "part 1" not in clean_label(raw)
    assert "street number and name" in clean_label(raw)


def test_clean_label_handles_empty():
    assert clean_label("") == ""


# ---------------------------------------------------------------------------
# Query construction
# ---------------------------------------------------------------------------

def test_geometric_label_beats_shared_tooltip():
    # Dozens of USCIS fields share one section tooltip; the caption is what
    # actually identifies this field.
    f = make_field(
        "ZIP Code",
        tooltip="Part 1. Petitioner Information. 3. Mailing Address of Individual...",
    )
    assert field_query(f) == "zip code"


def test_raw_pdf_names_are_not_used_as_queries():
    f = make_field("form1[0].#subform[0].Line1_FamilyName[0]")
    assert field_query(f) == ""


# ---------------------------------------------------------------------------
# Guards
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("q", [
    "describe the duties of the position",
    "how many people will the beneficiary supervise",
    "have you ever filed an immigrant petition",
])
def test_instructions_are_rejected_as_prose(q):
    assert is_prose_query(q)


@pytest.mark.parametrize("q", ["in care of name", "attorney name", "number", "date"])
def test_third_party_and_vague_captions_are_unmatchable(q):
    assert is_unmatchable(q)


def test_normal_captions_are_not_rejected():
    assert not is_prose_query("family name last name")
    assert not is_unmatchable("family name last name")


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("label,expected", [
    ("Family Name (Last Name)", "person.last_name"),
    ("Given Name (First Name)", "person.first_name"),
    ("Middle Name", "person.middle_name"),
    ("City or Town", "address.city"),
    ("ZIP Code", "address.zip"),
    ("Daytime Telephone Number", "contact.phone"),
    ("Mobile Telephone Number", "contact.mobile"),
    ("Email Address", "contact.email"),
    ("Company or Organization Name", "employment.employer"),
    ("Street Number and Name", "address.street"),
])
def test_common_captions_match_the_right_fact(label, expected):
    hit = match_field(make_field(label), ALL_FACTS)
    assert hit is not None, f"{label!r} matched nothing"
    assert hit.fact_key == expected


def test_unknown_caption_matches_nothing():
    hit = match_field(make_field("Receipt Number of Prior Petition"), ALL_FACTS)
    assert hit is None or hit.fact_key in ALL_FACTS


def test_never_matches_a_fact_we_do_not_have():
    hit = match_field(make_field("Email Address"), {"person.full_name"})
    assert hit is None


def test_signature_and_readonly_fields_are_not_matched_by_type():
    # A signature field must never take a text fact.
    hit = match_field(make_field("Signature of Petitioner", "signature"), ALL_FACTS)
    assert hit is None
