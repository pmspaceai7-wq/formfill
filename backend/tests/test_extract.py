"""Tests for fact extraction. No network, no API key."""
from __future__ import annotations

from app.extract import extract_facts, _clean_phone, _normalise_date


SAMPLE = """\
Full Name: Aswathi S Kumar
Email: aswathisajik1@gmail.com
Phone: 7306259524
City: Kottayam
State: Kerala
Country: India
Postal Code: 686001
Date of Birth: 01/01/2000
Job Title: Python Full Stack Developer
Employer: Luminar Technolab
Nationality: Indian
"""


def test_extracts_core_identity():
    facts = extract_facts(SAMPLE)
    assert facts["person.full_name"] == "Aswathi S Kumar"
    assert facts["person.first_name"] == "Aswathi"
    assert facts["person.last_name"] == "Kumar"
    assert facts["person.middle_name"] == "S"


def test_extracts_contact_and_address():
    facts = extract_facts(SAMPLE)
    assert facts["contact.email"] == "aswathisajik1@gmail.com"
    assert facts["address.city"] == "Kottayam"
    assert facts["address.state"] == "Kerala"
    assert facts["address.zip"] == "686001"
    assert facts["address.country"] == "India"


def test_extracts_employment():
    facts = extract_facts(SAMPLE)
    assert facts["employment.employer"] == "Luminar Technolab"
    assert facts["employment.job_title"] == "Python Full Stack Developer"


def test_aliases_are_matched_not_just_exact_keys():
    facts = extract_facts("Surname: Patel\nForename: Riya\nE-mail: r@x.com")
    assert facts["person.last_name"] == "Patel"
    assert facts["person.first_name"] == "Riya"
    assert facts["contact.email"] == "r@x.com"


def test_empty_input_is_safe():
    assert extract_facts("") == {}
    assert extract_facts("   \n\n  ") == {}


def test_no_facts_invented_from_noise():
    facts = extract_facts("The quick brown fox jumps over the lazy dog.")
    assert "contact.email" not in facts
    assert "address.zip" not in facts


def test_local_phone_is_not_reformatted_as_us():
    # Regression: a bare Indian mobile must not become "(730) 625-9524".
    assert _clean_phone("7306259524") == "7306259524"


def test_us_formatted_phone_is_preserved():
    assert _clean_phone("(555) 123-4567") == "(555) 123-4567"


def test_date_normalised_to_us_form():
    assert _normalise_date("January 15, 1990") == "01/15/1990"
    assert _normalise_date("1990-01-15") == "01/15/1990"


def test_values_are_bounded():
    facts = extract_facts("Employer: " + "x" * 5000)
    assert all(len(v) <= 200 for v in facts.values())
