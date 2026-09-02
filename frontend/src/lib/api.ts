import type { FormSchema, SourceSummary } from "./types";

function getBase(): string {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8001`;
  }
  return "http://localhost:8001";
}

export async function uploadForm(file: File): Promise<FormSchema> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${getBase()}/api/forms`, { method: "POST", body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error ?? err.detail ?? "Upload failed");
  }
  return res.json();
}

export async function getForm(formId: string): Promise<FormSchema> {
  const res = await fetch(`${getBase()}/api/forms/${formId}`);
  if (!res.ok) throw new Error("Form not found");
  return res.json();
}

export function pageImageUrl(formId: string, page: number): string {
  return `${getBase()}/api/forms/${formId}/pages/${page}`;
}

export async function uploadSources(
  files: File[],
  text: string
): Promise<SourceSummary> {
  const body = new FormData();
  for (const f of files) body.append("files", f);
  if (text.trim()) body.append("text", text.trim());
  const res = await fetch(`${getBase()}/api/sources`, { method: "POST", body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error ?? err.detail ?? "Upload failed");
  }
  return res.json();
}

export async function getSource(sourceId: string): Promise<SourceSummary> {
  const res = await fetch(`${getBase()}/api/sources/${sourceId}`);
  if (!res.ok) throw new Error("Source not found");
  return res.json();
}

export interface FillStatus {
  job_id: string;
  status: string;
  done: number;
  total: number;
  error: string;
  values: Record<string, string> | null;
}

export async function startFill(formId: string, sourceId: string): Promise<FillStatus> {
  const body = new FormData();
  body.append("form_id", formId);
  body.append("source_id", sourceId);
  const res = await fetch(`${getBase()}/api/fill`, { method: "POST", body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to start fill" }));
    throw new Error(err.detail ?? "Failed to start fill");
  }
  return res.json();
}

export async function getFill(jobId: string): Promise<FillStatus> {
  const res = await fetch(`${getBase()}/api/fill/${jobId}`);
  if (!res.ok) throw new Error("Job not found");
  return res.json();
}

export async function exportPdf(
  formId: string,
  values: Record<string, string>
): Promise<Blob> {
  const body = new FormData();
  body.append("form_id", formId);
  body.append("values_json", JSON.stringify(values));
  const res = await fetch(`${getBase()}/api/export`, { method: "POST", body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Export failed" }));
    throw new Error(err.detail ?? "Export failed");
  }
  return res.blob();
}
