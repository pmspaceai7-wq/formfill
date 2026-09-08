"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadForm, exportPdf, getProfile, loadDemoTemplate, loadTemplateById } from "@/lib/api";
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
      (f) => !values[f.field_id] && !f.read_only && f.type !== "signature"
    );
    if (empty.length === 0) return;
    const first = empty[0];
    if (first.page !== page) setPage(first.page);
    // Focus after render
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-field="${first.field_id}"]`
      );
      if (el) {
        el.focus();
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 100);
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
    const first = conflictFields[0];
    if (first.page !== page) setPage(first.page);
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-field="${first.field_id}"]`
      );
      if (el) {
        el.focus();
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 100);
  }, [schema, fillJob.conflicts, page]);

  const handleDownload = useCallback(async () => {
    if (!schema) return;
    setDownloading(true);
    try {
      const blob = await exportPdf(schema.form_id, values);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = schema.filename.replace(".pdf", "_filled.pdf");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setDownloading(false);
    }
  }, [schema, values]);

  const handleFile = useCallback(
    async (file: File) => {
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
    [fillJob]
  );

  const handleLoadDemo = useCallback(async () => {
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
  }, [fillJob]);

  const handleLoadTemplate = useCallback(
    async (templateId: string) => {
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
    [fillJob]
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
            onFill={() => fillJob.start(schema!.form_id, sourceId ?? "")}
            onFillRetry={() => fillJob.start(schema!.form_id, sourceId ?? "")}
            onNextEmpty={focusNextEmpty}
            onDownload={handleDownload}
            downloading={downloading}
            onResetForm={resetAll}
            conflictCount={fillJob.conflicts?.length ?? 0}
            onNextConflict={focusNextConflict}
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
