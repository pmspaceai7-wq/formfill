"""
extract.py — turn raw source text into typed facts.

Input:  the plain text pulled out of a resume / ID / pasted notes by sources.py
Output: {canonical_key: value} using the vocabulary in facts.py

Three layers, cheapest first:
  1. Explicit "Key: Value" lines — highest confidence, the user told us directly.
  2. Regex for well-defined shapes (email, phone, SSN, zip, dates).
  3. spaCy NER for prose (PERSON / ORG / GPE / DATE) where nothing else fired.

Layer 1 always wins over 2, which wins over 3. Nothing here calls the network.
"""
from __future__ import annotations

import logging
import re
from typing import Optional

from rapidfuzz import fuzz, process

from app.facts import ALIAS_PAIRS, FACTS_BY_KEY

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Optional heavy deps — degrade gracefully if unavailable
# ---------------------------------------------------------------------------

_NLP = None
_NLP_TRIED = False


def _nlp():
    """Lazy-load spaCy. Returns None if unavailable (never raises)."""
    global _NLP, _NLP_TRIED
    if _NLP_TRIED:
        return _NLP
    _NLP_TRIED = True
    try:
        import spacy
        _NLP = spacy.load("en_core_web_sm", disable=["lemmatizer", "textcat"])
        logger.info("spaCy en_core_web_sm loaded")
    except Exception as exc:
        logger.warning("spaCy unavailable, falling back to regex only: %s", exc)
        _NLP = None
    return _NLP


# ---------------------------------------------------------------------------
# Regex shapes
# ---------------------------------------------------------------------------

RE_EMAIL = re.compile(r"\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b")
RE_PHONE = re.compile(r"(?<!\d)(\+?\d[\d\s\-().]{8,}\d)(?!\d)")
RE_SSN = re.compile(r"\b(\d{3}-\d{2}-\d{4})\b")
RE_ZIP = re.compile(r"\b(\d{5}(?:-\d{4})?)\b")
RE_ANUM = re.compile(r"\bA[-\s]?(\d{8,9})\b", re.I)
RE_PASSPORT = re.compile(r"\b([A-Z]{1,2}\d{6,8})\b")

RE_DATES = [
    re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b"),
    re.compile(r"\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b"),
    re.compile(r"\b([A-Z][a-z]+ \d{1,2},? \d{4})\b"),
    re.compile(r"\b(\d{1,2} [A-Z][a-z]+ \d{4})\b"),
]

# Lines that are section headers, not data.
RE_NOISE_LINE = re.compile(r"^\s*(---|===|\*\*|#)", re.M)

US_STATES = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE",
    "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC",
    "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR",
    "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA",
    "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
}


# ---------------------------------------------------------------------------
# Layer 1 — explicit Key: Value lines
# ---------------------------------------------------------------------------

_SEPARATORS = (":", " — ", " – ", " -- ", "\t")

# Alias -> key lookup, lowercased, for exact hits before fuzzy.
_ALIAS_EXACT: dict[str, str] = {a.lower(): k for a, k in ALIAS_PAIRS}


def _split_kv(line: str) -> Optional[tuple[str, str]]:
    for sep in _SEPARATORS:
        if sep in line:
            k, _, v = line.partition(sep)
            k, v = k.strip(), v.strip()
            if k and v and len(k) <= 60:
                return k, v
    return None


def _key_to_fact(raw_key: str, min_score: int = 88) -> Optional[str]:
    """Map a source-document key like 'Mobile' onto a canonical fact key."""
    k = raw_key.strip().lower().rstrip(":").strip()
    if not k:
        return None
    if k in _ALIAS_EXACT:
        return _ALIAS_EXACT[k]
    match = process.extractOne(
        k, list(_ALIAS_EXACT.keys()), scorer=fuzz.WRatio, score_cutoff=min_score
    )
    if match:
        return _ALIAS_EXACT[match[0]]
    return None


def _extract_kv_lines(text: str) -> dict[str, str]:
    found: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or len(line) > 300 or RE_NOISE_LINE.match(line):
            continue
        kv = _split_kv(line)
        if not kv:
            continue
        raw_key, value = kv
        # A URL or time ("09:30") is not a key:value pair.
        if raw_key.lower().startswith(("http", "https")) or raw_key.isdigit():
            continue
        fact_key = _key_to_fact(raw_key)
        if fact_key and fact_key not in found:
            found[fact_key] = value
    return found


# ---------------------------------------------------------------------------
# Layer 2 — regex shapes
# ---------------------------------------------------------------------------

def _first(pattern: re.Pattern, text: str) -> Optional[str]:
    m = pattern.search(text)
    return m.group(1).strip() if m else None


def _extract_regex(text: str) -> dict[str, str]:
    out: dict[str, str] = {}

    email = _first(RE_EMAIL, text)
    if email:
        out["contact.email"] = email

    phone = _first(RE_PHONE, text)
    if phone:
        out["contact.phone"] = _clean_phone(phone)

    ssn = _first(RE_SSN, text)
    if ssn:
        out["id.ssn"] = ssn

    anum = RE_ANUM.search(text)
    if anum:
        out["id.alien_number"] = "A" + anum.group(1)

    return out


def _clean_phone(raw: str) -> str:
    """
    Tidy a phone number without inventing a country.

    We deliberately do NOT guess a region for bare local numbers: parsing
    "7306259524" as US yields "(730) 625-9524", which is a plausible-looking
    but wrong US number for what is actually an Indian mobile. Only numbers
    that carry their own "+<country code>" get reformatted; everything else
    is just stripped of separators and left as the user wrote it.
    """
    raw = raw.strip()
    if raw.startswith("+"):
        try:
            import phonenumbers
            parsed = phonenumbers.parse(raw, None)
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(
                    parsed, phonenumbers.PhoneNumberFormat.INTERNATIONAL
                )
        except Exception:
            pass
    digits = re.sub(r"[^\d]", "", raw)
    # US 10-digit numbers are unambiguous enough to prettify.
    if len(digits) == 10 and _looks_us(raw):
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return digits or raw


def _looks_us(raw: str) -> bool:
    """Only treat a number as US-formatted if it was already written that way."""
    return bool(re.match(r"^\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$", raw.strip()))


def _normalise_date(raw: str) -> str:
    """Normalise a date to MM/DD/YYYY — the format US forms expect."""
    try:
        from dateutil import parser as dparser
        dt = dparser.parse(raw, dayfirst=False, fuzzy=True)
        return dt.strftime("%m/%d/%Y")
    except Exception:
        return raw


# ---------------------------------------------------------------------------
# Layer 3 — structured parsers + spaCy NER
# ---------------------------------------------------------------------------

def _split_name(full: str) -> dict[str, str]:
    """Split a full name into parts using nameparser when available."""
    out: dict[str, str] = {}
    full = full.strip()
    if not full:
        return out
    out["person.full_name"] = full
    try:
        from nameparser import HumanName
        hn = HumanName(full)
        if hn.first:
            out["person.first_name"] = hn.first
        if hn.middle:
            out["person.middle_name"] = hn.middle
        if hn.last:
            out["person.last_name"] = hn.last
        if hn.suffix:
            out["person.suffix"] = hn.suffix
        return out
    except ImportError:
        pass
    parts = full.split()
    if len(parts) >= 2:
        out["person.first_name"] = parts[0]
        out["person.last_name"] = parts[-1]
        if len(parts) > 2:
            out["person.middle_name"] = " ".join(parts[1:-1])
    return out


def _split_address(line: str) -> dict[str, str]:
    """Split a US-style address line into components via usaddress."""
    out: dict[str, str] = {}
    try:
        import usaddress
        tagged, _ = usaddress.tag(line)
    except Exception:
        return out

    street_parts = [
        tagged.get(k) for k in (
            "AddressNumber", "StreetNamePreDirectional", "StreetName",
            "StreetNamePostType", "StreetNamePostDirectional",
        ) if tagged.get(k)
    ]
    if street_parts:
        out["address.street"] = " ".join(street_parts)
    if tagged.get("OccupancyIdentifier"):
        out["address.unit"] = tagged["OccupancyIdentifier"]
    if tagged.get("PlaceName"):
        out["address.city"] = tagged["PlaceName"]
    if tagged.get("StateName"):
        out["address.state"] = _normalise_state(tagged["StateName"])
    if tagged.get("ZipCode"):
        out["address.zip"] = tagged["ZipCode"]
    return out


def _normalise_state(raw: str) -> str:
    """'Kerala' stays 'Kerala'; 'California' becomes 'CA' for US dropdowns."""
    s = raw.strip()
    return US_STATES.get(s.lower(), s)


def _extract_ner(text: str, already: dict[str, str]) -> dict[str, str]:
    """Fill gaps with spaCy entities. Only used where nothing better fired."""
    nlp = _nlp()
    if nlp is None:
        return {}

    # Cap work — NER over a whole book is pointless and slow.
    doc = nlp(text[:20_000])
    out: dict[str, str] = {}

    persons = [e.text.strip() for e in doc.ents if e.label_ == "PERSON"]
    orgs = [e.text.strip() for e in doc.ents if e.label_ == "ORG"]
    gpes = [e.text.strip() for e in doc.ents if e.label_ == "GPE"]
    dates = [e.text.strip() for e in doc.ents if e.label_ == "DATE"]

    if "person.full_name" not in already and persons:
        out.update(_split_name(persons[0]))
    if "employment.employer" not in already and orgs:
        out["employment.employer"] = orgs[0]
    if "address.city" not in already and gpes:
        out["address.city"] = gpes[0]
        if len(gpes) > 1:
            out.setdefault("address.country", gpes[-1])
    if "person.date_of_birth" not in already and dates:
        for d in dates:
            if re.search(r"\d{4}", d):
                out["person.date_of_birth"] = _normalise_date(d)
                break
    return out


# ---------------------------------------------------------------------------
# Header heuristics — resumes put the name on line 1
# ---------------------------------------------------------------------------

def _extract_header(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    lines = [
        ln.strip() for ln in text.splitlines()
        if ln.strip() and not RE_NOISE_LINE.match(ln.strip())
    ]
    if not lines:
        return out

    first = lines[0]
    # A name line: 2-4 words, no punctuation that implies prose or contact info.
    if (
        2 <= len(first.split()) <= 4
        and not any(c in first for c in ":@/\\|0123456789")
        and len(first) < 50
    ):
        out.update(_split_name(first))

    # "Kottayam, Kerala" style location line near the top.
    for line in lines[1:8]:
        m = re.match(r"^([A-Z][\w\s]{2,25}),\s*([A-Z][\w\s]{2,25})$", line.strip())
        if m:
            out.setdefault("address.city", m.group(1).strip())
            out.setdefault("address.state", _normalise_state(m.group(2).strip()))
            break
    return out


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def extract_facts(text: str) -> dict[str, str]:
    """
    Extract canonical facts from raw source text.
    Precedence: explicit key:value > regex shapes > header heuristics > NER.
    """
    if not text or not text.strip():
        return {}

    facts: dict[str, str] = {}

    # Layer 1 — explicit, highest confidence.
    facts.update(_extract_kv_lines(text))

    # Layer 2 — regex, only where layer 1 said nothing.
    for k, v in _extract_regex(text).items():
        facts.setdefault(k, v)

    # Layer 2.5 — derive name parts / address parts from composites.
    if "person.full_name" in facts and "person.first_name" not in facts:
        for k, v in _split_name(facts["person.full_name"]).items():
            facts.setdefault(k, v)
    if "address.street" in facts:
        for k, v in _split_address(facts["address.street"]).items():
            facts.setdefault(k, v)

    # Layer 3 — header heuristics, then NER for whatever is still missing.
    for k, v in _extract_header(text).items():
        facts.setdefault(k, v)
    for k, v in _extract_ner(text, facts).items():
        facts.setdefault(k, v)

    # Normalise the typed ones.
    for key, value in list(facts.items()):
        spec = FACTS_BY_KEY.get(key)
        if not spec:
            continue
        if spec.kind == "date":
            facts[key] = _normalise_date(value)
        elif spec.kind == "phone":
            facts[key] = _clean_phone(value)
        elif spec.kind == "state":
            facts[key] = _normalise_state(value)

    # Drop empties and absurd values.
    return {
        k: v.strip() for k, v in facts.items()
        if v and v.strip() and len(v.strip()) <= 200
    }
