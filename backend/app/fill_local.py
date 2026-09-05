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

from app.extract import extract_facts_with_provenance
from app.inference import infer_form_fields
from app.match import match_field, model_available
from app.models import (
    CandidateValue,
    FieldCitation,
    FieldConflict,
    FieldInference,
    FormField,
    FormSchema,
)
from app.postprocess import clean_value
from app.profile import get_values, merge_facts
from app.storage import form_dir, job_dir, read_json, source_dir, write_json

logger = logging.getLogger(__name__)


def _load_source_items(source_id: str) -> tuple[list[dict], str, str]:
    """Return (items_list, combined_text, label_for_provenance)."""
    if not source_id:
        return [], "", ""
    sdir = source_dir(source_id)
    path = sdir / "text.json"
    if not path.exists():
        return [], "", source_id
    data = read_json(path)
    items = data.get("items", [])
    text = "\n\n".join(item.get("text", "") for item in items)
    names = [i.get("name", "") for i in items if i.get("name")]
    label = ", ".join(names) if names else source_id
    return items, text, label


def fill_form_local(
    form_id: str, source_id: str, job_id: str
) -> dict[str, str]:
    """Fill using local extraction + semantic matching + smart inferences."""
    jdir = job_dir(job_id)

    def _progress(done: int, total: int, status: str = "running", error: str = ""):
        write_json(jdir / "status.json", {
            "status": status, "done": done, "total": total, "error": error,
        })

    _progress(0, 0)

    try:
        # 1. Learn from source files with full provenance and candidate tracking
        items, text, source_label = _load_source_items(source_id)
        provenance_by_key = {}
        candidates_by_key = {}

        if items:
            new_facts, provenance_by_key, candidates_by_key = extract_facts_with_provenance(items)
            stats = merge_facts(new_facts, source=source_label)
            logger.info(
                "Extracted %d facts from %s (%d new/changed)",
                len(new_facts), source_label, stats["changed"],
            )
        elif text.strip():
            new_facts, provenance_by_key, candidates_by_key = extract_facts_with_provenance(
                [{"name": "source", "text": text}]
            )
            stats = merge_facts(new_facts, source=source_label)

        known = get_values()
        if not known:
            _progress(0, 0, status="complete")
            write_json(jdir / "values.json", {})
            write_json(jdir / "enrichment.json", {"citations": {}, "conflicts": [], "inferences": {}})
            logger.warning("Profile is empty — nothing to fill from")
            return {}

        available = set(known.keys())

        # 2. Load the form schema
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

        # 3. Match and clean
        result: dict[str, str] = {}
        citations: dict[str, FieldCitation] = {}
        conflicts: list[FieldConflict] = []
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

                    # Provenance Citation
                    p = provenance_by_key.get(hit.fact_key)
                    if p:
                        citations[field.field_id] = FieldCitation(
                            field_id=field.field_id,
                            fact_key=hit.fact_key,
                            value=cleaned,
                            source_file=p.source_file,
                            line_number=p.line_number,
                            snippet=p.snippet,
                            confidence=round(min(1.0, hit.score), 2),
                            method=hit.method,
                        )
                    else:
                        citations[field.field_id] = FieldCitation(
                            field_id=field.field_id,
                            fact_key=hit.fact_key,
                            value=cleaned,
                            source_file="Profile Store",
                            line_number=None,
                            snippet=f"Persisted profile fact: {known[hit.fact_key]}",
                            confidence=round(hit.score, 2),
                            method=hit.method,
                        )

                    # Multi-candidate Conflict Detection
                    cands = candidates_by_key.get(hit.fact_key, [])
                    if len(cands) >= 2:
                        conflicts.append(
                            FieldConflict(
                                field_id=field.field_id,
                                fact_key=hit.fact_key,
                                field_label=field.label or field.field_id,
                                current_value=cleaned,
                                candidates=[
                                    CandidateValue(
                                        value=c.value,
                                        source_file=c.source_file,
                                        line_number=c.line_number,
                                        snippet=c.snippet,
                                        confidence=round(c.confidence, 2),
                                        method=c.method,
                                    )
                                    for c in cands
                                ],
                            )
                        )

            if (i + 1) % 25 == 0 or i == total - 1:
                _progress(i + 1, total)

        # 4. Evaluate Smart Checkbox & Radio Inferences
        inferred_vals, inferred_cits, inferences = infer_form_fields(
            schema, known, provenance_by_key, raw_source_text=text
        )
        for fid, ival in inferred_vals.items():
            if fid not in result or not result[fid]:
                result[fid] = ival
                if fid in inferred_cits:
                    citations[fid] = inferred_cits[fid]

        # 5. Persist values and enriched intelligence metadata
        write_json(jdir / "values.json", result)
        write_json(
            jdir / "enrichment.json",
            {
                "citations": {k: v.model_dump() for k, v in citations.items()},
                "conflicts": [c.model_dump() for c in conflicts],
                "inferences": {k: v.model_dump() for k, v in inferences.items()},
            },
        )

        _progress(total, total, status="complete")
        logger.info(
            "Local fill complete: %d/%d filled (%s), %d citations, %d conflicts, %d inferences",
            len(result), total, matched_by_method or "none",
            len(citations), len(conflicts), len(inferences),
        )
        return result

    except Exception as exc:
        logger.exception("Local fill failed")
        _progress(0, 0, status="error", error=str(exc))
        return {}

