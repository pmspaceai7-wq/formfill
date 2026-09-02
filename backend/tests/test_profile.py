"""Tests for the persistent profile store and value post-processing."""
from __future__ import annotations

import pytest

from app import profile as P
from app.models import FormField
from app.postprocess import clean_value


@pytest.fixture(autouse=True)
def isolated_data_dir(tmp_path, monkeypatch):
    """Every test gets its own data dir — never touch the real profile."""
    monkeypatch.setattr(P.settings, "DATA_DIR", str(tmp_path))
    monkeypatch.setattr(P.settings, "PROFILE_ID", "test")
    yield


def test_empty_profile_is_readable():
    assert P.get_values() == {}
    assert P.as_items() == []


def test_merge_then_read_round_trip():
    P.merge_facts({"person.first_name": "Aswathi"}, source="my_info.txt")
    assert P.get_values()["person.first_name"] == "Aswathi"


def test_facts_accumulate_across_sources():
    """This is the whole point: form #2 benefits from form #1's upload."""
    P.merge_facts({"person.first_name": "Aswathi"}, source="a.txt")
    P.merge_facts({"contact.email": "a@b.com"}, source="b.pdf")
    values = P.get_values()
    assert values["person.first_name"] == "Aswathi"
    assert values["contact.email"] == "a@b.com"


def test_newer_document_value_overwrites_older():
    P.merge_facts({"address.city": "Kottayam"}, source="old.txt")
    P.merge_facts({"address.city": "Kochi"}, source="new.txt")
    assert P.get_values()["address.city"] == "Kochi"


def test_user_edit_survives_later_document_upload():
    P.merge_facts({"person.last_name": "Kumar"}, source="resume.pdf")
    P.set_fact("person.last_name", "Nair")
    P.merge_facts({"person.last_name": "Kumar"}, source="stale_resume.pdf")
    assert P.get_values()["person.last_name"] == "Nair"


def test_empty_values_are_ignored():
    P.merge_facts({"person.first_name": "  "}, source="x")
    assert "person.first_name" not in P.get_values()


def test_delete_and_clear():
    P.merge_facts({"contact.email": "a@b.com"}, source="x")
    assert P.delete_fact("contact.email") is True
    assert P.get_values() == {}
    P.merge_facts({"contact.email": "a@b.com"}, source="x")
    P.clear_profile()
    assert P.get_values() == {}


def test_items_carry_provenance_and_group():
    P.merge_facts({"contact.email": "a@b.com"}, source="resume.pdf")
    item = P.as_items()[0]
    assert item["key"] == "contact.email"
    assert item["source"] == "resume.pdf"
    assert item["group"] == "contact"


# ---------------------------------------------------------------------------
# postprocess
# ---------------------------------------------------------------------------

def _field(**kw) -> FormField:
    base = dict(
        field_id="f1", raw_name="X", label="L", type="text",
        page=1, bbox=[0, 0, 1, 1],
    )
    base.update(kw)
    return FormField(**base)


def test_atomic_value_is_dropped_rather_than_truncated():
    """A truncated email is wrong data that looks filled in — never write it."""
    f = _field(max_len=10)
    assert clean_value("aswathisajik1@gmail.com", f) is None


def test_prose_may_be_truncated():
    f = _field(type="multiline_text", max_len=10)
    assert clean_value("some longer descriptive text here", f) == "some longe"


def test_checkbox_only_takes_boolean_values():
    f = _field(type="checkbox", on_state="Y")
    assert clean_value("Yes", f) == "Y"
    assert clean_value("no", f) is None
    assert clean_value("Aswathi", f) is None


def test_dropdown_snaps_to_a_real_option():
    f = _field(type="dropdown", options=["CA", "NY", "TX"])
    assert clean_value("NY", f) == "NY"
    assert clean_value("Kerala", f) is None


def test_readonly_and_signature_never_written():
    assert clean_value("x", _field(read_only=True)) is None
    assert clean_value("x", _field(type="signature")) is None


def test_comb_field_strips_separators():
    f = _field(is_comb=True)
    assert clean_value("01/01/2000", f) == "01012000"


def test_newlines_stripped_from_single_line_text():
    assert clean_value("a\nb", _field()) == "a b"
