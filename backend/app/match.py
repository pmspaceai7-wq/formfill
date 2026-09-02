"""
match.py — decide which fact (if any) answers a given form field.

Two-stage, cheapest first:
  1. rapidfuzz against every alias in facts.py. Real forms often do say
     "Family Name" verbatim; when they do, this is instant and exact.
  2. sentence-transformers cosine similarity. This is what handles the real
     USCIS labels like "Part 1. Petitioner Information. ... Street Number and
     Name", where the useful words are buried in a sentence of preamble and
     fuzzy string distance is useless.

If neither clears its threshold, return None. Never guess — an empty field is
strictly better than a confidently wrong one, and that mirrors the "return null,
never invent" rule the AI path already follows.
"""
from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import Optional

from rapidfuzz import fuzz, process

from app.facts import ALIAS_PAIRS, FACTS_BY_KEY, allows_type
from app.models import FormField

logger = logging.getLogger(__name__)

# Thresholds. Tuned against samples/i129_sample_form.pdf — see tune_thresholds.py.
FUZZY_ACCEPT = 88.0     # rapidfuzz WRatio 0-100; above this, take it immediately
# Cosine floor. Measured on samples/i129_sample_form.pdf: genuine caption matches
# sit at 0.70+, while 0.52-0.68 was almost entirely instruction text scoring
# spuriously against person/employer facts. 0.70 keeps the true positives and
# drops that band.
EMBED_ACCEPT = 0.70

_MODEL_NAME = "all-MiniLM-L6-v2"

# Preamble that USCIS-style tooltips prefix onto every field on a page.
# Stripping it dramatically improves both fuzzy and embedding scores.
_RE_PART_PREFIX = re.compile(
    r"^\s*part\s+\d+[a-z]?\.?\s*[^.]*\.\s*", re.I
)
_RE_ITEM_NUMBER = re.compile(r"^\s*\d+\.?[a-z]?\.?\s*")
_RE_WS = re.compile(r"\s+")


# ---------------------------------------------------------------------------
# Model loading (lazy, optional)
# ---------------------------------------------------------------------------

_MODEL = None
_MODEL_TRIED = False


def _model():
    """Lazy-load the embedding model. Returns None if unavailable."""
    global _MODEL, _MODEL_TRIED
    if _MODEL_TRIED:
        return _MODEL
    _MODEL_TRIED = True
    try:
        from sentence_transformers import SentenceTransformer
        _MODEL = SentenceTransformer(_MODEL_NAME)
        logger.info("Embedding model %s loaded", _MODEL_NAME)
    except Exception as exc:
        logger.warning(
            "Embedding model unavailable (%s) — fuzzy matching only", exc
        )
        _MODEL = None
    return _MODEL


def model_available() -> bool:
    return _model() is not None


# ---------------------------------------------------------------------------
# Query building
# ---------------------------------------------------------------------------

def clean_label(raw: str) -> str:
    """
    Strip the boilerplate that real government forms bury the useful words in.

    "Part 1. Petitioner Information. 3. Mailing Address... Street Number and Name"
        -> "mailing address street number and name"
    """
    if not raw:
        return ""
    s = raw.strip()
    # Drop leading "Part 1. Petitioner Information." style preamble, repeatedly.
    for _ in range(3):
        new = _RE_PART_PREFIX.sub("", s)
        if new == s:
            break
        s = new
    s = _RE_ITEM_NUMBER.sub("", s)
    s = s.replace("(", " ").replace(")", " ")
    s = re.sub(r"[^\w\s/-]", " ", s)
    s = _RE_WS.sub(" ", s).strip().lower()
    return s


# A tooltip longer than this is a section description shared by many fields,
# not a per-field caption — useless for telling those fields apart.
_TOOLTIP_MAX_USEFUL = 80


def field_query(field: FormField) -> str:
    """
    The text we actually match on.

    `field.label` is the geometric caption produced by labels.py ("Family Name
    (Last Name)"). It is field-specific and therefore the primary signal.
    `field.tooltip` is only used when it is short enough to be a real caption —
    on USCIS forms a single section tooltip is repeated across dozens of
    fields, so matching on it makes every field in the section look identical.
    """
    label = clean_label(field.label or "")
    if _looks_like_raw_name(label):
        label = ""

    tooltip = clean_label(field.tooltip or "")
    if _looks_like_raw_name(tooltip) or len(tooltip) > _TOOLTIP_MAX_USEFUL:
        tooltip = ""

    # The geometric caption wins outright when we have one. Appending the
    # tooltip actively hurts: "ZIP Code" + "...Mailing Address of Individual"
    # drifts the match from address.zip towards address.street.
    if label:
        return label
    return tooltip


def _looks_like_raw_name(s: str) -> bool:
    """'form1 0 subform 0 line1 familyname 0' is a raw PDF name, not a label."""
    return bool(re.search(r"(form1|subform|pdf417|\[\d+\])", s))


# Words that mark a query as an instruction or question rather than a caption.
# "Describe the duties...", "How many people will the beneficiary supervise" —
# these are free-text prompts, and pasting a name or employer into them is
# always wrong, however similar the embedding says they are.
_RE_PROSE = re.compile(
    r"\b(describe|explain|how many|how much|list all|provide a|if yes|if no|"
    r"have you ever|will the|does the|did the|are you|is any|specify|"
    r"attach|see instructions|check the box|complete the blocks)\b"
)

# A caption is short. Anything much longer is a sentence of instructions that
# happens to contain a noun we recognise.
_QUERY_MAX_WORDS = 9


# Captions that refer to somebody other than the profile holder. "In Care Of
# Name" is a forwarding agent, not the applicant; filling it with the user's
# own name is wrong even though it matches "name" strongly.
_RE_THIRD_PARTY = re.compile(
    r"\b(in care of|c/o|attorney|preparer|interpreter|representative|"
    r"authorized signatory|on behalf of|witness|spouse s|parent s)\b"
)

# Bare, contentless captions. A field labelled just "Number" could be anything;
# guessing one particular identifier is a coin flip.
_VAGUE = {
    "number", "no", "name", "date", "type", "other", "code", "id",
    "amount", "title", "value", "item", "if any", "and", "or",
}


def is_prose_query(query: str) -> bool:
    """True when the query reads like an instruction, not a field caption."""
    if not query:
        return True
    if _RE_PROSE.search(query):
        return True
    return len(query.split()) > _QUERY_MAX_WORDS


def is_unmatchable(query: str) -> bool:
    """True when the caption cannot safely identify one of OUR facts."""
    if not query:
        return True
    if _RE_THIRD_PARTY.search(query):
        return True
    return query.strip() in _VAGUE


# ---------------------------------------------------------------------------
# Stage 1 — fuzzy
# ---------------------------------------------------------------------------

_ALIAS_STRINGS = [a for a, _ in ALIAS_PAIRS]
_ALIAS_KEYS = [k for _, k in ALIAS_PAIRS]


def _fuzzy_match(query: str) -> tuple[Optional[str], float]:
    if not query:
        return None, 0.0
    hit = process.extractOne(query, _ALIAS_STRINGS, scorer=fuzz.WRatio)
    if not hit:
        return None, 0.0
    alias, score, idx = hit
    return _ALIAS_KEYS[idx], float(score)


# ---------------------------------------------------------------------------
# Stage 2 — embeddings
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _alias_embeddings():
    """Embed every alias once; cached for the process lifetime."""
    m = _model()
    if m is None:
        return None
    return m.encode(_ALIAS_STRINGS, convert_to_numpy=True, normalize_embeddings=True)


def _embed_match(query: str) -> tuple[Optional[str], float]:
    m = _model()
    if m is None or not query:
        return None, 0.0
    alias_vecs = _alias_embeddings()
    if alias_vecs is None:
        return None, 0.0
    import numpy as np
    qv = m.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]
    sims = alias_vecs @ qv          # both normalised -> cosine similarity
    best_idx = int(np.argmax(sims))
    return _ALIAS_KEYS[best_idx], float(sims[best_idx])


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class MatchResult:
    __slots__ = ("fact_key", "score", "method")

    def __init__(self, fact_key: str, score: float, method: str):
        self.fact_key = fact_key
        self.score = score
        self.method = method

    def __repr__(self) -> str:  # pragma: no cover - debug aid
        return f"<Match {self.fact_key} {self.score:.2f} via {self.method}>"


def match_field(field: FormField, available_keys: set[str]) -> Optional[MatchResult]:
    """
    Return the best fact key for this field, or None if nothing is confident.

    `available_keys` is what the profile actually knows — matching a field to a
    fact we have no value for is wasted work, so candidates are filtered to it.
    """
    query = field_query(field)
    if not query or is_unmatchable(query):
        return None

    def usable(key: Optional[str]) -> bool:
        return (
            key is not None
            and key in available_keys
            and allows_type(key, field.type)
        )

    # Stage 1 — fuzzy. A high fuzzy score means the caption literally says
    # "Family Name", so it stands even for a longer query.
    fkey, fscore = _fuzzy_match(query)
    if usable(fkey) and fscore >= FUZZY_ACCEPT:
        return MatchResult(fkey, fscore / 100.0, "fuzzy")

    # An instruction or question is never a field caption. Bail before the
    # embedding stage, which is exactly where such text produces confident
    # nonsense ("describe the duties" scoring 0.64 against person.full_name).
    if is_prose_query(query):
        return None

    # Stage 2 — embeddings.
    ekey, escore = _embed_match(query)
    if usable(ekey) and escore >= EMBED_ACCEPT:
        return MatchResult(ekey, escore, "embed")

    # A strong-ish fuzzy hit is still better than nothing if embeddings are off.
    if usable(fkey) and fscore >= 80.0 and not model_available():
        return MatchResult(fkey, fscore / 100.0, "fuzzy-weak")

    return None
