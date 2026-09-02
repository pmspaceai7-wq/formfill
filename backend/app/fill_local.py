"""
Local form filler — no AI API needed.
Extracts key:value pairs from source text and matches them to
form fields using keyword similarity and regex patterns.
"""
from __future__ import annotations

import logging
import re
from pathlib import Path

from app.models import FormField, FormSchema
from app.storage import form_dir, job_dir, read_json, source_dir, write_json

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Common field-label keyword groups → what to look for in source text
# ---------------------------------------------------------------------------

# Each entry: (list-of-label-keywords, list-of-source-keywords)
KEYWORD_RULES: list[tuple[list[str], list[str]]] = [
    # Name
    (["family name", "last name", "surname"],
     ["last name", "surname", "family name", "lname"]),
    (["given name", "first name", "forename"],
     ["first name", "given name", "forename", "fname"]),
    (["middle name", "middle initial"],
     ["middle name", "middle initial"]),
    (["full name", "name of individual"],
     ["full name", "name"]),
    # Dates
    (["date of birth", "birth date", "dob"],
     ["date of birth", "dob", "born", "birth date"]),
    (["date of admission", "admission date"],
     ["admission date", "admitted"]),
    # Contact
    (["daytime phone", "phone number", "telephone", "contact number", "mobile"],
     ["phone", "telephone", "mobile", "cell", "contact"]),
    (["email", "e-mail", "email address"],
     ["email", "e-mail", "mail"]),
    # Address
    (["street", "street number", "address line"],
     ["street", "address", "road", "avenue", "lane", "blvd"]),
    (["city", "city or town"],
     ["city", "town", "municipality"]),
    (["state", "province"],
     ["state", "province"]),
    (["zip", "postal code", "zip code"],
     ["zip", "postal", "pin code"]),
    (["country"],
     ["country", "nation", "nationality"]),
    # Identity
    (["passport number", "passport no"],
     ["passport number", "passport no", "passport"]),
    (["alien number", "a-number", "uscis"],
     ["alien number", "a-number", "a number"]),
    (["social security", "ssn"],
     ["social security", "ssn", "ss number"]),
    (["itin", "individual taxpayer", "tax number"],
     ["itin", "tax id", "taxpayer"]),
    # Employer / Organisation
    (["employer", "organization", "company", "petitioner"],
     ["employer", "company", "organization", "firm", "employer name"]),
    (["job title", "occupation", "position"],
     ["job title", "occupation", "position", "role", "designation"]),
    # Misc
    (["gender", "sex"],
     ["gender", "sex", "male", "female"]),
    (["nationality", "citizenship", "citizen"],
     ["nationality", "citizenship", "citizen"]),
    (["place of birth", "birth place", "city of birth"],
     ["place of birth", "birthplace", "born in", "birth city"]),
]

# ---------------------------------------------------------------------------
# Regex patterns for structured values
# ---------------------------------------------------------------------------

DATE_PATTERNS = [
    r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b",       # MM/DD/YYYY
    r"\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b",           # YYYY-MM-DD
    r"\b(\w+ \d{1,2},? \d{4})\b",                   # January 15, 1990
    r"\b(\d{1,2} \w+ \d{4})\b",                     # 15 January 1990
]

PHONE_PATTERN = r"\b(\+?\d[\d\s\-().]{7,}\d)\b"
EMAIL_PATTERN = r"\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b"
ZIP_PATTERN   = r"\b(\d{5}(?:-\d{4})?)\b"


# ---------------------------------------------------------------------------
# Text parsing
# ---------------------------------------------------------------------------

def _extract_resume_profile(text: str) -> dict[str, str]:
    """
    Extract structured candidate info from typical resume layouts:
    Header with Name, Title, Location, Phone, Email, Education.
    """
    profile: dict[str, str] = {}
    lines = [line.strip() for line in text.splitlines() if line.strip() and not line.strip().startswith("---")]
    if not lines:
        return profile

    # Line 1 is almost always the candidate's name if all caps or 2-4 words without special symbols
    cand_name = lines[0]
    if len(cand_name.split()) in (2, 3, 4) and not any(c in cand_name for c in [":", "@", "/", "\\", "http"]):
        parts = cand_name.split()
        profile["full name"] = cand_name.title()
        profile["first name"] = parts[0].title()
        profile["given name"] = parts[0].title()
        profile["last name"] = parts[-1].title()
        profile["family name"] = parts[-1].title()
        if len(parts) == 3:
            profile["middle name"] = parts[1].upper()
        elif len(parts) > 3:
            profile["middle name"] = " ".join(parts[1:-1]).title()

    # Look for City, State in the top 10 lines
    for line in lines[:10]:
        # e.g. "Kottayam, Kerala — 7306259524 — aswathisajik1@gmail.com"
        loc_match = re.search(r"\b([A-Z][a-zA-Z\s]+),\s*([A-Z][a-zA-Z\s]+)\b", line)
        if loc_match:
            city, state = loc_match.group(1).strip(), loc_match.group(2).strip()
            # filter out non-location words
            if len(city.split()) <= 2 and len(state.split()) <= 2:
                profile["city"] = city
                profile["city or town"] = city
                profile["state"] = state
                profile["province"] = state

    # Professional Title (usually line 2)
    if len(lines) > 1 and len(lines[1]) < 60 and not any(c in lines[1] for c in ["@", "http", "phone", "email"]):
        profile["job title"] = lines[1]
        profile["occupation"] = lines[1]
        profile["position"] = lines[1]

    # Email & Phone from regex
    email = _find_by_regex(EMAIL_PATTERN, text)
    if email:
        profile["email"] = email
        profile["email address"] = email

    phone = _find_by_regex(PHONE_PATTERN, text)
    if phone:
        profile["phone"] = phone
        profile["daytime phone"] = phone
        profile["mobile"] = phone
        profile["telephone"] = phone

    return profile


def _extract_kv_pairs(text: str) -> list[tuple[str, str]]:
    """
    Extract (key, value) pairs from source text.
    Handles lines like:
      "First Name: John"
      "First Name — John"
      "First Name   John"
    """
    pairs: list[tuple[str, str]] = []
    # Add extracted resume profile keys
    profile = _extract_resume_profile(text)
    for k, v in profile.items():
        pairs.append((k.lower(), v))

    for line in text.splitlines():
        line = line.strip()
        if not line or len(line) > 300:
            continue
        # Try colon separator
        if ":" in line:
            k, _, v = line.partition(":")
            k, v = k.strip(), v.strip()
            if k and v and len(k) < 80:
                pairs.append((k.lower(), v))
        # Try dash/em-dash separator
        elif " — " in line or " – " in line:
            for sep in (" — ", " – "):
                if sep in line:
                    k, _, v = line.partition(sep)
                    k, v = k.strip(), v.strip()
                    if k and v and len(k) < 80:
                        pairs.append((k.lower(), v))
                    break
    return pairs


def _find_by_regex(pattern: str, text: str) -> str | None:
    m = re.search(pattern, text, re.IGNORECASE)
    return m.group(1) if m else None


def _find_date(text: str) -> str | None:
    for pat in DATE_PATTERNS:
        v = _find_by_regex(pat, text)
        if v:
            return v
    return None


def _label_words(label: str) -> set[str]:
    return set(re.sub(r"[^\w\s]", " ", label.lower()).split())


# ---------------------------------------------------------------------------
# Main matching logic
# ---------------------------------------------------------------------------

def _best_value_for_field(
    field: FormField,
    kv_pairs: list[tuple[str, str]],
    full_text: str,
) -> str | None:
    label_lower = field.label.lower()

    # 1. Direct key match from kv pairs
    for key, val in kv_pairs:
        if key in label_lower or label_lower in key:
            return val.strip()

    # 2. Keyword rules
    for label_kws, source_kws in KEYWORD_RULES:
        if any(kw in label_lower for kw in label_kws):
            # Search kv pairs
            for key, val in kv_pairs:
                if any(skw in key for skw in source_kws):
                    return val.strip()
            # Search full text for context
            for skw in source_kws:
                pattern = rf"(?i){re.escape(skw)}[\s:—\-]+([^\n,;]+)"
                m = re.search(pattern, full_text)
                if m:
                    v = m.group(1).strip()
                    if v and len(v) < 100:
                        return v

    # 3. Regex fallback for known-format fields
    label_lower_nospace = label_lower.replace(" ", "")
    if any(w in label_lower for w in ["date", "birth", "dob"]):
        return _find_date(full_text)
    if any(w in label_lower for w in ["phone", "telephone", "mobile", "cell"]):
        return _find_by_regex(PHONE_PATTERN, full_text)
    if any(w in label_lower for w in ["email", "e-mail"]):
        return _find_by_regex(EMAIL_PATTERN, full_text)
    if any(w in label_lower for w in ["zip", "postal"]):
        return _find_by_regex(ZIP_PATTERN, full_text)

    return None


def _post_process(val: str, field: FormField) -> str | None:
    """Validate and clean the matched value."""
    val = val.strip()
    if not val:
        return None

    # Truncate to max_len
    if field.max_len and len(val) > field.max_len:
        val = val[:field.max_len]

    # Dropdown: match to option
    if field.type in ("dropdown", "listbox") and field.options:
        v_low = val.lower()
        for opt in field.options:
            if opt.lower() == v_low or v_low in opt.lower():
                return opt
        return None

    # Checkbox: only return on_state if clearly truthy
    if field.type == "checkbox":
        if val.lower() in ("yes", "true", "x", "✓", "1"):
            return field.on_state or "Yes"
        return None

    # Strip newlines from single-line fields
    if field.type == "text":
        val = re.sub(r"[\r\n]+", " ", val).strip()

    return val if val else None


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def fill_form_local(form_id: str, source_id: str, job_id: str) -> dict[str, str]:
    """Fill form using local keyword+regex matching — no API needed."""
    jdir = job_dir(job_id)

    def _progress(done: int, total: int, status: str = "running"):
        write_json(jdir / "status.json", {
            "status": status, "done": done, "total": total, "error": "",
        })

    # Load schema
    schema_data = read_json(form_dir(form_id) / "schema.json")
    schema = FormSchema(**schema_data)

    fillable = [
        f for f in schema.fields
        if not f.read_only and f.type not in ("signature",)
    ]
    total = len(fillable)
    _progress(0, total)

    # Load source text
    sdir = source_dir(source_id)
    data = read_json(sdir / "text.json")
    full_text = "\n\n".join(
        item.get("text", "") for item in data.get("items", [])
    )
    kv_pairs = _extract_kv_pairs(full_text)

    logger.info("Local fill: %d fields, %d kv pairs, %d chars of source",
                total, len(kv_pairs), len(full_text))

    result: dict[str, str] = {}
    for i, field in enumerate(fillable):
        raw = _best_value_for_field(field, kv_pairs, full_text)
        if raw:
            clean = _post_process(raw, field)
            if clean:
                result[field.field_id] = clean
        if (i + 1) % 50 == 0 or i == total - 1:
            _progress(i + 1, total)

    write_json(jdir / "values.json", result)
    _progress(total, total, status="complete")
    logger.info("Local fill complete: %d/%d fields filled", len(result), total)
    return result
