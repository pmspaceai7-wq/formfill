"""
facts.py — the canonical fact vocabulary.

Every fact the system knows about a user is stored under one of these canonical
keys. `aliases` are the phrasings a form might use for that fact; they are what
match.py scores a field label against (fuzzy first, embeddings second).

This table is data, not control flow. The old KEYWORD_RULES list in fill_local.py
was the same idea buried inside if-statements — this replaces it.
"""
from __future__ import annotations

from dataclasses import dataclass, field as dc_field
from typing import Optional


@dataclass(frozen=True)
class FactSpec:
    key: str
    aliases: list[str]
    group: str                      # UI grouping: identity/contact/address/employment/other
    # Which form field types this fact can sensibly fill.
    types: tuple[str, ...] = ("text", "multiline_text")
    # Optional hint used by extract.py for regex/entity routing.
    kind: Optional[str] = None      # "date" | "phone" | "email" | "zip" | "state" | None


# ---------------------------------------------------------------------------
# The vocabulary
# ---------------------------------------------------------------------------

FACT_SPECS: list[FactSpec] = [
    # ---- Identity -------------------------------------------------------
    FactSpec("person.full_name", [
        "full name", "name", "your name", "legal name", "full legal name",
        "name of individual", "applicant name", "petitioner name",
        "beneficiary name", "print name", "name in full",
    ], "identity"),
    FactSpec("person.first_name", [
        "first name", "given name", "given names", "forename",
        "first given name", "fname",
    ], "identity"),
    FactSpec("person.middle_name", [
        "middle name", "middle initial", "middle names", "second name",
    ], "identity"),
    FactSpec("person.last_name", [
        "last name", "family name", "surname", "lname", "last family name",
    ], "identity"),
    FactSpec("person.suffix", [
        "suffix", "name suffix", "jr sr ii iii",
    ], "identity"),
    FactSpec("person.date_of_birth", [
        "date of birth", "birth date", "dob", "born on", "date you were born",
    ], "identity", kind="date"),
    FactSpec("person.place_of_birth", [
        "place of birth", "birth place", "city of birth", "town of birth",
        "city or town of birth",
    ], "identity"),
    FactSpec("person.country_of_birth", [
        "country of birth", "birth country", "nation of birth",
    ], "identity"),
    FactSpec("person.gender", [
        "gender", "sex", "male or female",
    ], "identity", types=("text", "checkbox", "radio", "dropdown")),
    FactSpec("person.nationality", [
        "nationality", "citizenship", "country of citizenship",
        "citizen of what country", "country of nationality",
    ], "identity"),
    FactSpec("person.marital_status", [
        "marital status", "married single divorced", "civil status",
    ], "identity", types=("text", "checkbox", "radio", "dropdown")),

    # ---- Government identifiers ----------------------------------------
    FactSpec("id.ssn", [
        "social security number", "ssn", "u.s. social security number",
        "social security", "ss number",
    ], "identity"),
    FactSpec("id.alien_number", [
        "alien registration number", "a-number", "a number", "uscis number",
        "uscis online account number", "alien number",
    ], "identity"),
    FactSpec("id.passport_number", [
        "passport number", "passport no", "travel document number",
        "passport",
    ], "identity"),
    FactSpec("id.tax_number", [
        "tax identification number", "itin", "individual taxpayer identification",
        "ein", "employer identification number", "tax number", "tin",
    ], "identity"),
    FactSpec("id.drivers_license", [
        "driver's license number", "drivers license", "license number",
        "dl number",
    ], "identity"),

    # ---- Contact --------------------------------------------------------
    FactSpec("contact.email", [
        "email address", "email", "e-mail address", "e-mail",
        "electronic mail address",
    ], "contact", kind="email"),
    FactSpec("contact.phone", [
        "phone number", "telephone number", "daytime telephone number",
        "daytime phone", "home phone", "contact number", "telephone",
    ], "contact", kind="phone"),
    FactSpec("contact.mobile", [
        "mobile telephone number", "mobile phone", "cell phone",
        "cell number", "mobile number", "mobile",
    ], "contact", kind="phone"),
    FactSpec("contact.fax", [
        "fax number", "facsimile number", "fax",
    ], "contact", kind="phone"),

    # ---- Address --------------------------------------------------------
    FactSpec("address.street", [
        "street number and name", "street address", "address line 1",
        "mailing address", "physical address", "street", "address",
        "number and street", "residential address", "home address",
    ], "address"),
    FactSpec("address.unit", [
        "apt ste flr number", "apartment suite floor", "unit number",
        "apartment number", "suite number", "apt", "unit",
    ], "address"),
    FactSpec("address.city", [
        "city or town", "city", "town", "city or township",
        "municipality", "city town or village",
    ], "address"),
    FactSpec("address.state", [
        "state", "province", "state or province", "state or territory",
    ], "address", types=("text", "dropdown", "listbox"), kind="state"),
    FactSpec("address.zip", [
        "zip code", "postal code", "zip", "zip or postal code",
        "postcode", "pin code",
    ], "address", kind="zip"),
    FactSpec("address.country", [
        "country", "nation", "country of residence",
    ], "address"),

    # ---- Employment -----------------------------------------------------
    FactSpec("employment.employer", [
        "employer name", "company or organization name", "company name",
        "name of employer", "organization name", "employer", "company",
        "name of company", "petitioner organization name", "firm name",
    ], "employment"),
    FactSpec("employment.job_title", [
        "job title", "occupation", "position", "title", "designation",
        "current position", "job", "role",
    ], "employment"),
    FactSpec("employment.start_date", [
        "employment start date", "date of hire", "hire date",
        "start date", "date employment began",
    ], "employment", kind="date"),
    FactSpec("employment.salary", [
        "annual salary", "wages", "salary", "compensation", "rate of pay",
        "income",
    ], "employment"),
    FactSpec("employment.work_email", [
        "work email", "business email", "company email",
    ], "employment", kind="email"),
    FactSpec("employment.work_phone", [
        "work phone", "business phone", "office phone", "work telephone",
    ], "employment", kind="phone"),

    # ---- Education ------------------------------------------------------
    FactSpec("education.school", [
        "school name", "university", "college", "institution",
        "name of school", "educational institution",
    ], "other"),
    FactSpec("education.degree", [
        "degree", "qualification", "level of education", "highest degree",
        "field of study", "major",
    ], "other"),
]


FACTS_BY_KEY: dict[str, FactSpec] = {s.key: s for s in FACT_SPECS}

# Flat (alias, key) pairs — the fuzzy matcher's candidate list.
ALIAS_PAIRS: list[tuple[str, str]] = [
    (alias, spec.key) for spec in FACT_SPECS for alias in spec.aliases
]


def spec_for(key: str) -> Optional[FactSpec]:
    return FACTS_BY_KEY.get(key)


def group_of(key: str) -> str:
    spec = FACTS_BY_KEY.get(key)
    return spec.group if spec else "other"


def allows_type(key: str, field_type: str) -> bool:
    """Can this fact plausibly fill a field of this type?"""
    spec = FACTS_BY_KEY.get(key)
    if spec is None:
        return False
    # multiline can always take a text-ish fact
    if field_type == "multiline_text" and "text" in spec.types:
        return True
    return field_type in spec.types
