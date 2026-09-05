import type {
  DemoLoadResponse,
  FillStatus,
  FormSchema,
  ProfileResponse,
  SourceSummary,
  TemplateListResponse,
} from "./types";

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

// ---------------------------------------------------------------------------
// Profile — the details remembered across every form
// ---------------------------------------------------------------------------

export async function getProfile(): Promise<ProfileResponse> {
  const res = await fetch(`${getBase()}/api/profile`);
  if (!res.ok) throw new Error("Could not load your profile");
  return res.json();
}

export async function updateProfileFact(
  key: string,
  value: string
): Promise<ProfileResponse> {
  const res = await fetch(`${getBase()}/api/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) throw new Error("Could not save that change");
  return res.json();
}

export async function clearProfile(): Promise<void> {
  const res = await fetch(`${getBase()}/api/profile`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not clear your profile");
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

// ---------------------------------------------------------------------------
// Templates Hub & 1-Click Demo API
// ---------------------------------------------------------------------------

export async function getTemplates(): Promise<TemplateItem[]> {
  const res = await fetch(`${getBase()}/api/templates`);
  if (!res.ok) throw new Error("Failed to load template catalog");
  const data: TemplateListResponse = await res.json();
  return data.templates;
}

export async function loadDemoTemplate(): Promise<DemoLoadResponse> {
  const res = await fetch(`${getBase()}/api/templates/demo`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to load demo" }));
    throw new Error(err.detail ?? "Failed to load demo");
  }
  return res.json();
}

export async function loadTemplateById(templateId: string): Promise<FormSchema> {
  const res = await fetch(`${getBase()}/api/templates/${templateId}/load`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to load template" }));
    throw new Error(err.detail ?? "Failed to load template");
  }
  return res.json();
}

