"""
fill_local.py — fill a form with no AI API key.

Pipeline:
    source text -> extract.py -> facts -> profile (persisted)
    form schema -> match.py (fuzzy + embeddings) -> {field_id: fact_key}
    fact values -> postprocess.py -> {field_id: value}

The profile step is what makes this more than a one-shot parser: facts learned
from any earlier upload are available to every later form, so filling form #2
works even with no new source material at all.
"""
from __future__ import annotations

import logging

from app.extract import extract_facts
from app.match import match_field, model_available
from app.models import FormField, FormSchema
from app.postprocess import clean_value
from app.profile import get_values, merge_facts
from app.storage import form_dir, job_dir, read_json, source_dir, write_json

logger = logging.getLogger(__name__)


def _load_source_text(source_id: str) -> tuple[str, str]:
    """Return (combined_text, label_for_provenance). Empty id = profile-only fill."""
    if not source_id:
        return "", ""
    sdir = source_dir(source_id)
    path = sdir / "text.json"
    if not path.exists():
        return "", source_id
    data = read_json(path)
    items = data.get("items", [])
    text = "\n\n".join(item.get("text", "") for item in items)
    names = [i.get("name", "") for i in items if i.get("name")]
    label = ", ".join(names) if names else source_id
    return text, label


async def fill_form_local(
    form_id: str, source_id: str, job_id: str
) -> dict[str, str]:
    """Fill using local extraction + semantic matching. No network calls."""
    jdir = job_dir(job_id)

    def _progress(done: int, total: int, status: str = "running", error: str = ""):
        write_json(jdir / "status.json", {
            "status": status, "done": done, "total": total, "error": error,
        })

    _progress(0, 0)

    try:
        # 1. Learn from this source, then read back everything we know.
        text, source_label = _load_source_text(source_id)
        if text.strip():
            new_facts = extract_facts(text)
            stats = merge_facts(new_facts, source=source_label)
            logger.info(
                "Extracted %d facts from %s (%d new/changed)",
                len(new_facts), source_label, stats["changed"],
            )

        known = get_values()
        if not known:
            _progress(0, 0, status="complete")
            write_json(jdir / "values.json", {})
            logger.warning("Profile is empty — nothing to fill from")
            return {}

        available = set(known.keys())

        # 2. Load the form.
        schema = FormSchema(**read_json(form_dir(form_id) / "schema.json"))
        fillable: list[FormField] = [
            f for f in schema.fields
            if not f.read_only and f.type != "signature"
        ]
        total = len(fillable)
        _progress(0, total)

        logger.info(
            "Local fill: %d fillable fields, %d known facts, embeddings=%s",
            total, len(known), model_available(),
        )

        # 3. Match and clean.
        result: dict[str, str] = {}
        matched_by_method: dict[str, int] = {}

        for i, field in enumerate(fillable):
            hit = match_field(field, available)
            if hit is not None:
                cleaned = clean_value(known[hit.fact_key], field)
                if cleaned:
                    result[field.field_id] = cleaned
                    matched_by_method[hit.method] = (
                        matched_by_method.get(hit.method, 0) + 1
                    )
            if (i + 1) % 25 == 0 or i == total - 1:
                _progress(i + 1, total)

        write_json(jdir / "values.json", result)
        _progress(total, total, status="complete")
        logger.info(
            "Local fill complete: %d/%d filled (%s)",
            len(result), total, matched_by_method or "none",
        )
        return result

    except Exception as exc:
        logger.exception("Local fill failed")
        _progress(0, 0, status="error", error=str(exc))
        return {}
