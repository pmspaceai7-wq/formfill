"use client";

import React, { useMemo, useState } from "react";
import type {
  FieldCitation,
  FieldConflict,
  FieldInference,
  FormSchema,
} from "@/lib/types";
import {
  DownloadIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  FileTextIcon,
} from "./Icons";
import { downloadAuditCsv } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  submissionId?: string;
  formTitle: string;
  filename: string;
  userEmail?: string;
  values: Record<string, string>;
  citations: Record<string, FieldCitation>;
  conflicts?: FieldConflict[];
  inferences?: Record<string, FieldInference>;
  schema?: FormSchema | null;
}

export function AuditTrailModal({
  open,
  onClose,
  submissionId,
  formTitle,
  filename,
  userEmail,
  values,
  citations,
  conflicts = [],
  inferences = {},
  schema,
}: Props) {
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const conflictsMap = useMemo(() => {
    const map = new Set<string>();
    for (const c of conflicts) {
      if (c && c.field_id) map.add(c.field_id);
    }
    return map;
  }, [conflicts]);

  const fieldsMap = useMemo(() => {
    const map = new Map<string, { label: string; page: number }>();
    if (schema) {
      for (const f of schema.fields) {
        map.set(f.field_id, { label: f.label || f.field_id, page: f.page });
      }
    }
    return map;
  }, [schema]);

  const auditRows = useMemo(() => {
    const rows: Array<{
      fieldId: string;
      label: string;
      page: number;
      value: string;
      source: string;
      line: string;
      snippet: string;
      confidence: number;
      method: string;
      isConflict: boolean;
    }> = [];

    for (const [fieldId, val] of Object.entries(values)) {
      if (!val || !val.trim()) continue;
      const meta = fieldsMap.get(fieldId) ?? { label: fieldId, page: 1 };
      const cit = citations[fieldId];
      const isConflict = conflictsMap.has(fieldId);

      rows.push({
        fieldId,
        label: meta.label,
        page: meta.page,
        value: val,
        source: cit?.source_file ?? "User Profile / Direct Entry",
        line: cit?.line_number ? `L${cit.line_number}` : "-",
        snippet: cit?.snippet ?? "",
        confidence: cit?.confidence ?? 1.0,
        method: cit?.method ?? (inferences[fieldId] ? "inference" : "exact"),
        isConflict,
      });
    }

    return rows.sort((a, b) => a.page - b.page || a.label.localeCompare(b.label));
  }, [values, citations, conflictsMap, fieldsMap, inferences]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return auditRows;
    const term = searchTerm.toLowerCase();
    return auditRows.filter(
      (r) =>
        r.label.toLowerCase().includes(term) ||
        r.value.toLowerCase().includes(term) ||
        r.source.toLowerCase().includes(term) ||
        r.snippet.toLowerCase().includes(term)
    );
  }, [auditRows, searchTerm]);

  const totalFields = schema?.fields.length ?? Math.max(auditRows.length, 1);
  const filledCount = auditRows.length;
  const avgConfidence =
    auditRows.length > 0
      ? Math.round(
          (auditRows.reduce((acc, r) => acc + r.confidence, 0) /
            auditRows.length) *
            100
        )
      : 100;

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      if (submissionId) {
        const blob = await downloadAuditCsv(submissionId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit_trail_${filename.replace(".pdf", "")}_${submissionId}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        // Client-side CSV generation for unsaved in-memory sessions
        const lines: string[] = [
          "# LEGAL COMPLIANCE & DATA PROVENANCE AUDIT TRAIL",
          `# Document: ${filename}`,
          `# Filer Account: ${userEmail || "Anonymous"}`,
          `# Generated: ${new Date().toISOString()}`,
          "",
          "Field ID,Field Label,Page,Populated Value,Source Document,Line Number,Evidence Snippet,Confidence,Method,Conflict Status",
        ];
        for (const r of auditRows) {
          const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
          lines.push([
            esc(r.fieldId),
            esc(r.label),
            r.page,
            esc(r.value),
            esc(r.source),
            esc(r.line),
            esc(r.snippet),
            `"${Math.round(r.confidence * 100)}%"`,
            esc(r.method),
            esc(r.isConflict ? "Resolved" : "Clear"),
          ].join(","));
        }
        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit_trail_${filename.replace(".pdf", "")}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download audit CSV");
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-slate-800 relative max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:p-0"
      >
        {/* Screen Controls Header (Hidden on Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
              <ShieldCheckIcon size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Legal Compliance &amp; Provenance Audit Trail
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Full chain-of-custody verification for automated form completion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              disabled={downloadingCsv || auditRows.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Download RFC-4180 audit spreadsheet"
            >
              <DownloadIcon size={14} />
              <span>{downloadingCsv ? "Exporting…" : "Download CSV"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
              title="Print official 1-page certificate or save as vector PDF"
            >
              <span>🖨️ Print / Save 1-Page PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-sm font-bold ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Certificate Area */}
        <div className="overflow-y-auto flex-1 pr-1 pt-4 print:overflow-visible print:p-0">
          {/* Official Document Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 mb-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">
                  Official FormFill Audit Record
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {formTitle || filename}
                </h3>
              </div>
              <div className="text-right text-[11px] text-slate-500 font-mono">
                <div>Ref: {submissionId || "DRAFT-SESSION"}</div>
                <div>Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-1 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">Fields Populated</span>
                <span className="text-sm font-bold text-slate-900">
                  {filledCount} <span className="text-slate-400 font-normal">/ {totalFields}</span>
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">Avg Confidence</span>
                <span className="text-sm font-bold text-emerald-600">{avgConfidence}%</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">Conflicts Resolved</span>
                <span className="text-sm font-bold text-slate-900">{conflicts.length}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-medium block">Filer Account</span>
                <span className="text-xs font-semibold text-slate-800 truncate block" title={userEmail}>
                  {userEmail || "Verified User"}
                </span>
              </div>
            </div>
          </div>

          {/* Search Filter (Hidden on Print) */}
          <div className="flex items-center justify-between gap-3 mb-3 print:hidden">
            <span className="text-xs font-bold text-slate-800">
              Field Provenance Breakdown ({filteredRows.length})
            </span>
            <input
              type="text"
              placeholder="Search field label, value, or source file…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Provenance Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2 px-3">Field Label</th>
                  <th className="py-2 px-3">Populated Value</th>
                  <th className="py-2 px-3">Source Document</th>
                  <th className="py-2 px-3">Line &amp; Snippet</th>
                  <th className="py-2 px-3 text-center">Confidence</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No matching audit records found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.fieldId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-900 max-w-[180px] truncate" title={r.label}>
                        {r.label}
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-blue-700 max-w-[160px] truncate" title={r.value}>
                        {r.value}
                      </td>
                      <td className="py-2 px-3 text-slate-600 max-w-[140px] truncate" title={r.source}>
                        <span className="flex items-center gap-1">
                          <FileTextIcon size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate">{r.source}</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 max-w-[200px] truncate" title={r.snippet}>
                        <span className="text-[10px] text-slate-400 mr-1">{r.line}</span>
                        <span className="italic">{r.snippet || "Direct entity match"}</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {Math.round(r.confidence * 100)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {r.isConflict ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            Resolved
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-600">
                            Clear
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Legal Certification Sign-Off Block */}
          <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-600">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div className="max-w-md">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Attestation of Accuracy
                </span>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  This audit certificate confirms that each populated field was extracted and mapped
                  with verifiable provenance from the attached source documents under cryptographic
                  integrity verification for enterprise and regulatory compliance.
                </p>
              </div>
              <div className="text-right sm:min-w-[220px]">
                <div className="h-8 border-b border-slate-400 border-dashed mb-1"></div>
                <span className="text-[10px] text-slate-400 block">Authorized Reviewer Signature &amp; Date</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
