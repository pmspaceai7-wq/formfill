import type {
  DemoLoadResponse,
  FillStatus,
  FormSchema,
  ProfileResponse,
  SourceSummary,
  TemplateItem,
  TemplateListResponse,
} from "./types";

function getBase(): string {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8001`;
  }
  return "http://localhost:8001";
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface AuthSuccess {
  token: string;
  user: AuthUser;
}

interface AuthError {
  error: string;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("spacefill_token");
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: string
): Promise<AuthSuccess | AuthError> {
  try {
    const res = await fetch(`${getBase()}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Registration failed" }));
      return { error: err.detail ?? "Registration failed" };
    }
    return res.json();
  } catch {
    return { error: "Network error — is the backend running?" };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthSuccess | AuthError> {
  try {
    const res = await fetch(`${getBase()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      return { error: err.detail ?? "Login failed" };
    }
    return res.json();
  } catch {
    return { error: "Network error — is the backend running?" };
  }
}

export async function getMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${getBase()}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
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

export async function getSourceFile(
  sourceId: string | undefined | null,
  filename: string
): Promise<{ filename: string; lines: string[] }> {
  const sid = sourceId && sourceId.trim() ? sourceId : "any";
  const res = await fetch(
    `${getBase()}/api/sources/${encodeURIComponent(sid)}/file/${encodeURIComponent(filename)}`
  );
  if (!res.ok) throw new Error("File not found");
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

