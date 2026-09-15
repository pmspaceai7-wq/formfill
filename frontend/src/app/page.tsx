"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  uploadForm,
  getForm,
  exportPdf,
  getProfile,
  loadDemoTemplate,
  loadTemplateById,
  getSubmission,
  saveSubmission,
} from "@/lib/api";
import type { FieldConflict, FormSchema, SourceSummary } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { HeroUpload } from "@/components/HeroUpload";
import { Toolbar } from "@/components/Toolbar";
import { PdfPage } from "@/components/PdfPage";
import { FieldOverlay } from "@/components/FieldOverlay";
import { SourcePanel } from "@/components/SourcePanel";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import { TemplatesModal } from "@/components/TemplatesModal";
import { SourceFileViewerModal } from "@/components/SourceFileViewerModal";
import { useFillJob } from "@/hooks/useFillJob";
import { useAuth } from "@/lib/AuthContext";
import { UpgradeModal } from "@/components/UpgradeModal";
import { AuditTrailModal } from "@/components/AuditTrailModal";
import { AlertCircleIcon, RefreshCwIcon } from "@/components/Icons";

type State = "empty" | "uploading" | "loaded" | "error";

export default function Home() {
  const [state, setState] = useState<State>("empty");
  const [error, setError] = useState<string>("");
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [renderedSize, setRenderedSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Values: all field values (merged AI + user)
  const [values, setValues] = useState<Record<string, string>>({});
  // AI-filled values (reference — used to track which fields AI filled)
  const [aiValues, setAiValues] = useState<Record<string, string>>({});
  // Fields the user has manually edited
  const [userEdited, setUserEdited] = useState<Set<string>>(new Set());

  // Source panel
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceSummary, setSourceSummary] = useState<SourceSummary | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Source File Viewer Modal
  const [sourceViewer, setSourceViewer] = useState<{
    filename: string;
    line?: number | null;
    snippet?: string;
    fieldLabel?: string;
    value?: string;
  } | null>(null);

  // Profile — details remembered across forms
  const [profileOpen, setProfileOpen] = useState(false);
  const [factCount, setFactCount] = useState(0);

  // Template Hub & 1-Click Demo
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);

  const fillJob = useFillJob();
  const { user, refreshUser } = useAuth();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [authModalTrigger, setAuthModalTrigger] = useState<"login" | "signup" | null>(null);
  const lastEmptyFieldIdRef = useRef<string | null>(null);
  const lastConflictFieldIdRef = useRef<string | null>(null);

  // Submissions & Audit State
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  // Load saved submission if ?submission_id=... is present in URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const subId = params.get("submission_id");
    if (!subId) return;

    getSubmission(subId)
      .then(async (sub) => {
        try {
          const loadedSchema = await getForm(sub.form_id);
          setSchema(loadedSchema);
          setValues(sub.values || {});
          setAiValues(sub.values || {});
          setActiveSubmissionId(sub.id);
          setIsSaved(true);
          if (sub.source_id) {
            setSourceId(sub.source_id);
          }
          setState("loaded");
        } catch {
          setError("Failed to load base form schema for this submission.");
          setState("error");
        }
      })
      .catch((err) => {
        console.error("Failed to load submission:", err);
      });
  }, []);

  // Automatically show upgrade modal if API returns quota exceeded (402)
  useEffect(() => {
    if (fillJob.isQuotaExceeded) {
      setUpgradeModalOpen(true);
    }
  }, [fillJob.isQuotaExceeded]);

  // Load the remembered-detail count on mount so the header badge is accurate
  // even before the user touches anything.
  useEffect(() => {
    getProfile()
      .then((p) => setFactCount(p.facts.length))
      .catch(() => {
        /* backend may be down; the badge simply stays hidden */
      });
  }, []);

  // Stable callbacks
  const handleRendered = useCallback((w: number, h: number) => {
    setRenderedSize({ w, h });
  }, []);

  const handleChange = useCallback((id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    setUserEdited((prev) => new Set(prev).add(id));
    setIsSaved(false);
  }, []);

  // When fill completes, merge AI values — skip user-edited fields
  useEffect(() => {
    if (fillJob.status === "complete" && fillJob.values) {
      const incoming = fillJob.values;
      setAiValues(incoming);
      setValues((prev) => {
        const merged = { ...prev };
        for (const [id, val] of Object.entries(incoming)) {
          if (!userEdited.has(id)) {
            merged[id] = val;
          }
        }
        return merged;
      });
      // Refresh user account so forms_filled_count updates immediately in the UI
      refreshUser().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillJob.status, fillJob.values]);

  // Keyboard shortcut: Ctrl/Cmd+↓ → next empty field
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowDown") {
        e.preventDefault();
        focusNextEmpty();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const focusNextEmpty = useCallback(() => {
    if (!schema) return;
    const sorted = [...schema.fields].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      if (Math.abs(a.bbox[1] - b.bbox[1]) > 0.01) return a.bbox[1] - b.bbox[1];
      return a.bbox[0] - b.bbox[0];
    });

    const empty = sorted.filter(
      (f) =>
        (!values[f.field_id] || !values[f.field_id].trim()) &&
        !f.read_only &&
        f.type !== "signature"
    );
    if (empty.length === 0) return;

    let nextIndex = 0;
    const activeEl = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    const activeFieldId =
      activeEl?.getAttribute("data-field") ||
      activeEl?.closest("[data-field]")?.getAttribute("data-field");

    const referenceId = activeFieldId || lastEmptyFieldIdRef.current;

    if (referenceId) {
      const currEmptyIdx = empty.findIndex((f) => f.field_id === referenceId);
      if (currEmptyIdx !== -1) {
        nextIndex = (currEmptyIdx + 1) % empty.length;
      } else {
        const refSortedIdx = sorted.findIndex((f) => f.field_id === referenceId);
        if (refSortedIdx !== -1) {
          const subsequent = empty.find((f) => {
            const fIdx = sorted.findIndex((s) => s.field_id === f.field_id);
            return fIdx > refSortedIdx;
          });
          if (subsequent) {
            nextIndex = empty.findIndex((f) => f.field_id === subsequent.field_id);
          }
        }
      }
    }

    const targetField = empty[nextIndex];
    lastEmptyFieldIdRef.current = targetField.field_id;
    const targetFieldId = targetField.field_id;

    const doFocus = (attempts = 0) => {
      const allFieldEls = document.querySelectorAll<HTMLElement>("[data-field]");
      let targetEl: HTMLElement | null = null;
      for (let i = 0; i < allFieldEls.length; i++) {
        if (allFieldEls[i].getAttribute("data-field") === targetFieldId) {
          targetEl = allFieldEls[i];
          break;
        }
      }

      if (targetEl) {
        targetEl.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        const inputEl =
          targetEl.querySelector<HTMLElement>("input, textarea, select, button") || targetEl;
        try {
          inputEl.focus({ preventScroll: true });
        } catch {
          inputEl.focus();
        }

        targetEl.classList.add("highlight-empty-field");
        setTimeout(() => {
          targetEl?.classList.remove("highlight-empty-field");
        }, 2200);
      } else if (attempts < 15) {
        setTimeout(() => doFocus(attempts + 1), 50);
      }
    };

    if (targetField.page !== page) {
      setPage(targetField.page);
      setTimeout(() => doFocus(0), 100);
    } else {
      doFocus(0);
    }
  }, [schema, values, page]);

  const conflictsMap = useMemo(() => {
    const map: Record<string, FieldConflict> = {};
    const list = fillJob.conflicts ?? [];
    for (const c of list) {
      if (c && c.field_id) {
        map[c.field_id] = c;
      }
    }
    return map;
  }, [fillJob.conflicts]);

  const focusNextConflict = useCallback(() => {
    const conflictsList = fillJob.conflicts ?? [];
    if (!schema || conflictsList.length === 0) return;
    const conflictFieldIds = new Set(conflictsList.map((c) => c.field_id));
    const sorted = [...schema.fields].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      if (Math.abs(a.bbox[1] - b.bbox[1]) > 0.01) return a.bbox[1] - b.bbox[1];
      return a.bbox[0] - b.bbox[0];
    });
    const conflictFields = sorted.filter((f) => conflictFieldIds.has(f.field_id));
    if (conflictFields.length === 0) return;

    let nextIndex = 0;
    const activeEl = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    const activeFieldId =
      activeEl?.getAttribute("data-field") ||
      activeEl?.closest("[data-field]")?.getAttribute("data-field");

    const referenceId = activeFieldId || lastConflictFieldIdRef.current;
    if (referenceId) {
      const currIdx = conflictFields.findIndex((f) => f.field_id === referenceId);
      if (currIdx !== -1) {
        nextIndex = (currIdx + 1) % conflictFields.length;
      }
    }

    const targetField = conflictFields[nextIndex];
    lastConflictFieldIdRef.current = targetField.field_id;
    const targetFieldId = targetField.field_id;

    const doFocus = (attempts = 0) => {
      const allFieldEls = document.querySelectorAll<HTMLElement>("[data-field]");
      let targetEl: HTMLElement | null = null;
      for (let i = 0; i < allFieldEls.length; i++) {
        if (allFieldEls[i].getAttribute("data-field") === targetFieldId) {
          targetEl = allFieldEls[i];
          break;
        }
      }

      if (targetEl) {
        targetEl.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        const inputEl =
          targetEl.querySelector<HTMLElement>("input, textarea, select, button") || targetEl;
        try {
          inputEl.focus({ preventScroll: true });
        } catch {
          inputEl.focus();
        }

        targetEl.classList.add("highlight-conflict-field");
        setTimeout(() => {
          targetEl?.classList.remove("highlight-conflict-field");
        }, 2200);
      } else if (attempts < 15) {
        setTimeout(() => doFocus(attempts + 1), 50);
      }
    };

    if (targetField.page !== page) {
      setPage(targetField.page);
      setTimeout(() => doFocus(0), 100);
    } else {
      doFocus(0);
    }
  }, [schema, fillJob.conflicts, page]);

  const handleDownload = useCallback(async () => {
    if (!schema) return;
    setDownloading(true);
    try {
      const blob = await exportPdf(schema.form_id, values);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = schema.filename.replace(/\.pdf$/i, "") + "_filled.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Auto-save submission for logged-in user so it appears in My Forms
      if (user) {
        try {
          const saved = await saveSubmission({
            form_id: schema.form_id,
            filename: schema.filename,
            title: schema.filename,
            values,
            citations: fillJob.citations ?? undefined,
            conflicts: fillJob.conflicts ?? undefined,
            inferences: fillJob.inferences ?? undefined,
            source_id: sourceId,
            submission_id: activeSubmissionId ?? undefined,
            status: "exported",
          });
          setActiveSubmissionId(saved.id);
          setIsSaved(true);
        } catch (saveErr) {
          console.warn("Auto-save on download failed:", saveErr);
        }
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setDownloading(false);
    }
  }, [schema, values, user, fillJob.citations, fillJob.conflicts, fillJob.inferences, sourceId, activeSubmissionId]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!user) {
        setAuthModalTrigger("signup");
        setError("Please sign in or create an account with your business email to upload forms.");
        return;
      }
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please upload a PDF file (.pdf).");
        setState("error");
        return;
      }
      setError("");
      setState("uploading");
      try {
        const result = await uploadForm(file);
        setSchema(result);
        setPage(1);
        setValues({});
        setAiValues({});
        setUserEdited(new Set());
        setSourceId(null);
        setSourceSummary(null);
        fillJob.reset();
        setState("loaded");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(msg);
        setState("error");
      }
    },
    [user, fillJob]
  );

  const handleLoadDemo = useCallback(async () => {
    if (!user) {
      setAuthModalTrigger("signup");
      setError("Please sign in or create an account with your business email to load templates.");
      return;
    }
    setError("");
    setLoadingDemo(true);
    try {
      const demo = await loadDemoTemplate();
      setSchema(demo.schema);
      setSourceId(demo.source.source_id);
      setSourceSummary(demo.source);
      setPage(1);
      setValues({});
      setAiValues({});
      setUserEdited(new Set());
      fillJob.reset();
      if (demo.source.facts_total !== undefined) {
        setFactCount(demo.source.facts_total);
      }
      setState("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo");
      setState("error");
    } finally {
      setLoadingDemo(false);
    }
  }, [user, fillJob]);

  const handleLoadTemplate = useCallback(
    async (templateId: string) => {
      if (!user) {
        setAuthModalTrigger("signup");
        setError("Please sign in or create an account with your business email to load templates.");
        return;
      }
      setError("");
      setLoadingTemplateId(templateId);
      try {
        const loadedSchema = await loadTemplateById(templateId);
        setSchema(loadedSchema);
        setPage(1);
        setValues({});
        setAiValues({});
        setUserEdited(new Set());
        setSourceId(null);
        setSourceSummary(null);
        fillJob.reset();
        setState("loaded");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load template");
        setState("error");
      } finally {
        setLoadingTemplateId(null);
      }
    },
    [user, fillJob]
  );

  const resetAll = useCallback(() => {
    setSchema(null);
    setState("empty");
    setError("");
    setValues({});
    setAiValues({});
    setUserEdited(new Set());
    setSourceId(null);
    setSourceSummary(null);
    setActiveSubmissionId(null);
    setIsSaved(false);
    fillJob.reset();
  }, [fillJob]);

  const sortedFields = schema
    ? schema.fields
        .filter((f) => f.page === page)
        .sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0])
    : [];

  const filledCount = Object.values(values).filter((v) =>
    Boolean(v && v.trim())
  ).length;

  const isSubscribed = user?.role === "admin" || Boolean(user?.is_subscribed);
  const quotaRemaining =
    user && user.role !== "admin" && !user.is_subscribed
      ? Math.max(0, (user.free_tier_limit ?? 1) - (user.forms_filled_count ?? 0))
      : null;

  const handleFill = useCallback(() => {
    if (!schema) return;
    if (!user) {
      alert("Please sign in with your business email to fill forms.");
      return;
    }
    const filledTotal = user.forms_filled_count ?? 0;
    const freeLimit = user.free_tier_limit ?? 1;
    if (user.role !== "admin" && !user.is_subscribed && filledTotal >= freeLimit) {
      setUpgradeModalOpen(true);
      return;
    }
    fillJob.start(schema.form_id, sourceId ?? "");
  }, [schema, user, sourceId, fillJob]);

  const handleSaveSubmission = useCallback(async () => {
    if (!schema) return;
    if (!user) {
      setAuthModalTrigger("login");
      setError("Please sign in or create an account with your business email to save submissions to My Forms.");
      return;
    }
    setIsSaving(true);
    try {
      const saved = await saveSubmission({
        form_id: schema.form_id,
        filename: schema.filename,
        title: schema.filename,
        values,
        citations: fillJob.citations ?? undefined,
        conflicts: fillJob.conflicts ?? undefined,
        inferences: fillJob.inferences ?? undefined,
        source_id: sourceId,
        submission_id: activeSubmissionId ?? undefined,
        status: "filled",
      });
      setActiveSubmissionId(saved.id);
      setIsSaved(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save submission");
    } finally {
      setIsSaving(false);
    }
  }, [schema, user, values, fillJob.citations, fillJob.conflicts, fillJob.inferences, sourceId, activeSubmissionId]);

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-100">
      {/* Top SaaS Header */}
      <Navbar
        hasForm={state === "loaded"}
        onReset={resetAll}
        onOpenProfile={() => setProfileOpen(true)}
        factCount={factCount}
        onLoadDemo={handleLoadDemo}
        onLoadTemplate={handleLoadTemplate}
        loadingDemo={loadingDemo}
        loadingTemplateId={loadingTemplateId}
        authModalOpen={authModalTrigger}
        onAuthModalClose={() => setAuthModalTrigger(null)}
      />

      <TemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onLoadDemo={async () => {
          setTemplatesOpen(false);
          await handleLoadDemo();
        }}
        onLoadTemplate={async (id) => {
          setTemplatesOpen(false);
          await handleLoadTemplate(id);
        }}
        loadingDemo={loadingDemo}
        loadingTemplateId={loadingTemplateId}
      />

      <ProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onChanged={setFactCount}
      />

      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgradeSuccess={() => fillJob.reset()}
      />

      <AuditTrailModal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        submissionId={activeSubmissionId ?? undefined}
        formTitle={schema?.filename ?? "Form Submission"}
        filename={schema?.filename ?? "form.pdf"}
        userEmail={user?.email}
        values={values}
        citations={fillJob.citations ?? {}}
        conflicts={fillJob.conflicts ?? []}
        inferences={fillJob.inferences ?? {}}
        schema={schema}
      />

      {sourceViewer && (
        <SourceFileViewerModal
          isOpen={Boolean(sourceViewer)}
          onClose={() => setSourceViewer(null)}
          sourceId={sourceId}
          filename={sourceViewer.filename}
          targetLine={sourceViewer.line}
          snippet={sourceViewer.snippet}
          fieldLabel={sourceViewer.fieldLabel}
          value={sourceViewer.value}
        />
      )}

      {/* Main Body */}
      {state === "empty" || state === "uploading" ? (
        <HeroUpload
          onFileSelected={handleFile}
          isLoading={state === "uploading"}
          error={error}
          onClearError={() => setError("")}
          isLoggedIn={Boolean(user)}
          onRequireAuth={() => setAuthModalTrigger("signup")}
        />
      ) : state === "error" ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircleIcon size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Form Error</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{error}</p>
            <div className="pt-2">
              <button
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                onClick={() => {
                  setError("");
                  setState("empty");
                }}
              >
                <RefreshCwIcon size={14} />
                Try Another PDF
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Form Studio Workspace with Smooth Entrance Animation */
        <div className="flex flex-col flex-1 min-h-0 animate-fade-in-up">
          <Toolbar
            filename={schema!.filename}
            page={page}
            pageCount={schema!.page_count}
            zoom={zoom}
            fieldCount={
              schema!.fields.filter((f) => !f.read_only && f.type !== "signature")
                .length
            }
            filledCount={filledCount}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(schema!.page_count, p + 1))}
            onZoomIn={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
            onZoomOut={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            onZoomFit={() => setZoom(1.0)}
            /* A saved profile is enough on its own — that is the whole point of
               remembering details. A source upload is only needed the first time. */
            canFill={Boolean(sourceId) || factCount > 0}
            hasProfileOnly={!sourceId && factCount > 0}
            fillStatus={fillJob.status}
            fillDone={fillJob.done}
            fillTotal={fillJob.total}
            fillError={fillJob.error}
            isQuotaExceeded={fillJob.isQuotaExceeded}
            onOpenUpgrade={() => setUpgradeModalOpen(true)}
            quotaRemaining={quotaRemaining}
            isSubscribed={isSubscribed}
            onFill={handleFill}
            onFillRetry={handleFill}
            onNextEmpty={focusNextEmpty}
            onDownload={handleDownload}
            downloading={downloading}
            onResetForm={resetAll}
            conflictCount={fillJob.conflicts?.length ?? 0}
            onNextConflict={focusNextConflict}
            onOpenAudit={() => setAuditModalOpen(true)}
            onSaveSubmission={handleSaveSubmission}
            isSaving={isSaving}
            isSaved={isSaved}
          />

          <div className="flex flex-1 min-h-0 items-start">
            {/* Left Source Documents Studio Panel — sticks while the page scrolls */}
            <div className="flex-shrink-0 z-20 sticky top-[104px] self-start max-h-[calc(100vh-104px)]">
              <SourcePanel
                onSourceReady={(id) => setSourceId(id)}
                initialSummary={sourceSummary}
              />
            </div>

            {/* Center Canvas PDF Viewer */}
            <div
              ref={overlayRef}
              className="flex-1 min-w-0 overflow-x-auto flex justify-center items-start p-6 bg-slate-200/80"
            >
              <div className="relative inline-block shadow-2xl rounded-lg bg-white overflow-hidden border border-slate-300">
                <PdfPage
                  formId={schema!.form_id}
                  page={page}
                  zoom={zoom}
                  onRendered={handleRendered}
                />
                {renderedSize.w > 0 && (
                  <FieldOverlay
                    fields={sortedFields}
                    renderedWidth={renderedSize.w}
                    renderedHeight={renderedSize.h}
                    values={values}
                    aiValues={aiValues}
                    userEdited={userEdited}
                    onChange={handleChange}
                    citations={fillJob.citations ?? {}}
                    conflicts={conflictsMap}
                    inferences={fillJob.inferences ?? {}}
                    sourceId={sourceId}
                    onViewSource={setSourceViewer}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
