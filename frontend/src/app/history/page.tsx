"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/AuthContext";
import {
  listSubmissions,
  deleteSubmission,
  exportSubmissionPdf,
  getSubmission,
} from "@/lib/api";
import type { SubmissionDetail, SubmissionSummary } from "@/lib/types";
import {
  FileTextIcon,
  DownloadIcon,
  TrashIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ZapIcon,
} from "@/components/Icons";
import { AuditTrailModal } from "@/components/AuditTrailModal";

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Audit modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDetail | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const list = await listSubmissions();
      setSubmissions(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load past submissions");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchSubmissions();
    }
  }, [authLoading, fetchSubmissions]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    setDeletingId(id);
    try {
      await deleteSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete submission");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (sub: SubmissionSummary) => {
    setDownloadingId(sub.id);
    try {
      const blob = await exportSubmissionPdf(sub.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = sub.filename.replace(/\.pdf$/i, "") + "_filled.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download filled PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenAudit = async (sub: SubmissionSummary) => {
    setLoadingAudit(true);
    try {
      const detail = await getSubmission(sub.id);
      setSelectedSubmission(detail);
      setAuditModalOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load audit trail");
    } finally {
      setLoadingAudit(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || s.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [submissions, searchTerm, statusFilter]);

  const totalFieldsAutomated = useMemo(() => {
    return submissions.reduce((acc, s) => acc + s.fields_filled, 0);
  }, [submissions]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-100 text-slate-800">
      {/* SaaS Navbar */}
      <Navbar hasForm={false} />

      {/* Audit Trail Modal */}
      {selectedSubmission && (
        <AuditTrailModal
          open={auditModalOpen}
          onClose={() => setAuditModalOpen(false)}
          submissionId={selectedSubmission.id}
          formTitle={selectedSubmission.title}
          filename={selectedSubmission.filename}
          userEmail={selectedSubmission.user_email}
          values={selectedSubmission.values}
          citations={selectedSubmission.citations}
          conflicts={selectedSubmission.conflicts}
          inferences={selectedSubmission.inferences}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                My Forms &amp; Submissions
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                {submissions.length} Saved
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Re-open, edit, download filled PDFs, or generate legal audit trails anytime
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSubmissions}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-xs"
              title="Refresh submissions list"
            >
              <RefreshCwIcon size={15} className={loading ? "animate-spin" : ""} />
            </button>

            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5 hover:scale-[1.02] cursor-pointer"
            >
              <span>+ New Form Studio</span>
            </Link>
          </div>
        </div>

        {/* Not Logged In Banner */}
        {!user && !authLoading && (
          <div className="mt-6 p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircleIcon size={24} className="text-amber-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold">Sign In Required</h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  Sign in with your business email to view your saved forms and legal audit history.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        )}

        {/* Stats Metrics Cards */}
        {user && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Forms Saved
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {submissions.length}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FileTextIcon size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Fields Auto-Populated
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {totalFieldsAutomated}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircleIcon size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Account Plan
                </span>
                <span className="text-base font-bold text-slate-900 mt-1 block">
                  {user.role === "admin"
                    ? "Admin (Unlimited)"
                    : user.is_subscribed
                    ? "Business Pro (Unlimited)"
                    : `${user.forms_filled_count ?? 0} / ${user.free_tier_limit ?? 1} Free Used`}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <ZapIcon size={22} />
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters Bar */}
        {user && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
            <div className="w-full sm:w-80">
              <input
                type="text"
                placeholder="Search by form name, file, or ID…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                All ({submissions.length})
              </button>
              <button
                onClick={() => setStatusFilter("filled")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  statusFilter === "filled"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Filled
              </button>
              <button
                onClick={() => setStatusFilter("exported")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  statusFilter === "exported"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Exported
              </button>
            </div>
          </div>
        )}

        {/* Submissions List / Grid */}
        {user && (
          <div className="mt-4">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-medium">Loading your submissions…</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs mt-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                  <FileTextIcon size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Form Submissions Yet</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  When you auto-fill or complete forms in the Form Studio, you can save them here to
                  re-download, re-edit, or generate legal audit reports.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
                >
                  <ZapIcon size={14} />
                  <span>Start Your First Form</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredSubmissions.map((sub) => {
                  const pct =
                    sub.fields_total > 0
                      ? Math.min(100, Math.round((sub.fields_filled / sub.fields_total) * 100))
                      : 100;
                  return (
                    <div
                      key={sub.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      {/* Left: Info */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                          <FileTextIcon size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 truncate" title={sub.title}>
                              {sub.title}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                sub.status === "exported"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {sub.status}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              #{sub.id}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            <span className="truncate max-w-[200px]" title={sub.filename}>
                              📄 {sub.filename}
                            </span>
                            <span>•</span>
                            <span>
                              🕒 {new Date(sub.updated_at || sub.created_at).toLocaleDateString()} at{" "}
                              {new Date(sub.updated_at || sub.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-2.5 max-w-xs flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                              {sub.fields_filled} / {sub.fields_total} fields ({pct}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
                        {/* Open in Editor */}
                        <Link
                          href={`/?submission_id=${sub.id}`}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Load this submission back into the Form Studio with all fields restored"
                        >
                          <span>Open in Editor →</span>
                        </Link>

                        {/* Download Filled PDF */}
                        <button
                          onClick={() => handleDownload(sub)}
                          disabled={downloadingId === sub.id}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                          title="Download final filled vector PDF"
                        >
                          <DownloadIcon size={13} />
                          <span>{downloadingId === sub.id ? "Exporting…" : "Download PDF"}</span>
                        </button>

                        {/* Audit Trail Modal */}
                        <button
                          onClick={() => handleOpenAudit(sub)}
                          disabled={loadingAudit}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
                          title="View legal compliance provenance trail and download CSV"
                        >
                          <ShieldCheckIcon size={13} className="text-blue-600" />
                          <span>Audit Trail</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(sub.id, sub.title)}
                          disabled={deletingId === sub.id}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                          title="Delete submission"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
