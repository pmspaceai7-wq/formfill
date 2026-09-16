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
        -> "street number and name"
    """
    if not raw:
        return ""
    s = raw.strip()

    # Extract target prompt sentence if buried in long multi-sentence instructions
    sentences = [sent.strip() for sent in re.split(r'\.\s+', s) if sent.strip()]
    if len(sentences) > 1:
        for sent in reversed(sentences):
            clean_sent = _RE_ITEM_NUMBER.sub("", sent).strip()
            m = re.match(r'^(enter|provide|select|check|choose)\s+(.*)', clean_sent, re.I)
            if m and len(m.group(2).split()) <= 10:
                s = m.group(2).strip()
                break

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
_ALIAS_EXACT_MAP: dict[str, str] = {a.lower().strip(): k for a, k in ALIAS_PAIRS}


@lru_cache(maxsize=2048)
def _fuzzy_match(query: str) -> tuple[Optional[str], float]:
    if not query:
        return None, 0.0
    q = query.lower().strip()
    if q in _ALIAS_EXACT_MAP:
        return _ALIAS_EXACT_MAP[q], 100.0
    hit = process.extractOne(query, _ALIAS_STRINGS, scorer=fuzz.WRatio)
    if not hit:
        return None, 0.0
    alias, score, idx = hit
    return _ALIAS_KEYS[idx], float(score)


# ---------------------------------------------------------------------------
# Stage 2 — embeddings
# ---------------------------------------------------------------------------

import hashlib as _hashlib
from pathlib import Path as _Path

# Cache alias embeddings to disk so the ~30s encode runs only on first launch.
_CACHE_DIR = _Path(__file__).parent.parent / "data" / ".embed_cache"
_ALIAS_HASH = _hashlib.md5("|".join(_ALIAS_STRINGS).encode()).hexdigest()[:12]
_ALIAS_CACHE_PATH = _CACHE_DIR / f"alias_vecs_{_ALIAS_HASH}.npy"


@lru_cache(maxsize=1)
def _alias_embeddings():
    """Embed every alias once; persisted to disk so subsequent boots are instant."""
    import numpy as np
    # Fast path: load from disk cache
    if _ALIAS_CACHE_PATH.exists():
        try:
            vecs = np.load(str(_ALIAS_CACHE_PATH))
            logger.info("Loaded alias embeddings from disk cache (%d vectors)", len(vecs))
            return vecs
        except Exception:
            pass

    m = _model()
    if m is None:
        return None

    logger.info("Computing alias embeddings for first time (this takes ~30s on CPU)...")
    vecs = m.encode(_ALIAS_STRINGS, convert_to_numpy=True, normalize_embeddings=True,
                    batch_size=64, show_progress_bar=False)
    try:
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        np.save(str(_ALIAS_CACHE_PATH), vecs)
        logger.info("Alias embeddings saved to disk cache: %s", _ALIAS_CACHE_PATH)
    except Exception as exc:
        logger.warning("Could not save alias embeddings to disk: %s", exc)
    return vecs


def _embed_match(query: str, precomputed: dict | None = None) -> tuple[Optional[str], float]:
    m = _model()
    if m is None or not query:
        return None, 0.0
    alias_vecs = _alias_embeddings()
    if alias_vecs is None:
        return None, 0.0
    import numpy as np
    if precomputed is not None and query in precomputed:
        qv = precomputed[query]
    else:
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


def match_field(field: FormField, available_keys: set[str], precomputed: dict | None = None) -> Optional[MatchResult]:
    """
    Return the best fact key for this field, or None if nothing is confident.

    `available_keys` is what the profile actually knows — matching a field to a
    fact we have no value for is wasted work, so candidates are filtered to it.
    `precomputed` maps query string -> numpy embedding vector (pre-batched for speed).
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

    # Stage 2 — embeddings (use precomputed batch if available).
    ekey, escore = _embed_match(query, precomputed=precomputed)
    if usable(ekey) and escore >= EMBED_ACCEPT:
        return MatchResult(ekey, escore, "embed")

    # A strong-ish fuzzy hit is still better than nothing if embeddings are off.
    if usable(fkey) and fscore >= 80.0 and not model_available():
        return MatchResult(fkey, fscore / 100.0, "fuzzy-weak")

    return None


def batch_embed_fields(fields: list[FormField]) -> dict:
    """
    Pre-embed all field queries in one batched model.encode() call.
    Returns a dict mapping query_string -> numpy vector.
    Results are cached to disk by content hash so repeat fills are instant.
    """
    import numpy as np

    # Collect unique, non-empty queries that would reach the embed stage
    unique_queries: list[str] = []
    seen: set[str] = set()
    for field in fields:
        q = field_query(field)
        if q and not is_unmatchable(q) and not is_prose_query(q) and q not in seen:
            seen.add(q)
            unique_queries.append(q)

    if not unique_queries:
        return {}

    # Check disk cache — keyed by hash of the sorted queries
    cache_key = _hashlib.md5("|".join(sorted(unique_queries)).encode()).hexdigest()[:12]
    cache_path = _CACHE_DIR / f"fields_{cache_key}.npy"
    queries_path = _CACHE_DIR / f"fields_{cache_key}_keys.txt"

    if cache_path.exists() and queries_path.exists():
        try:
            vecs = np.load(str(cache_path))
            keys = queries_path.read_text(encoding="utf-8").splitlines()
            if len(keys) == len(vecs):
                logger.info("Loaded %d field embeddings from disk cache", len(vecs))
                return dict(zip(keys, vecs))
        except Exception:
            pass

    m = _model()
    if m is None:
        return {}

    logger.info("Batch-embedding %d unique field queries...", len(unique_queries))
    vecs = m.encode(unique_queries, convert_to_numpy=True, normalize_embeddings=True,
                    batch_size=64, show_progress_bar=False)
    try:
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        np.save(str(cache_path), vecs)
        queries_path.write_text("\n".join(unique_queries), encoding="utf-8")
        logger.info("Field embeddings saved to disk cache")
    except Exception as exc:
        logger.warning("Could not save field embeddings: %s", exc)

    return dict(zip(unique_queries, vecs))

