import type {
  AuthUser,
  DemoLoadResponse,
  FillStatus,
  FormSchema,
  ProfileResponse,
  SourceSummary,
  TemplateItem,
  TemplateListResponse,
  SubmissionSummary,
  SubmissionListResponse,
  SubmissionDetail,
  SaveSubmissionRequest,
  UpdateSubmissionRequest,
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

export async function registerUser(
  input: NewUserInput
): Promise<AuthSuccess | AuthError> {
  try {
    const res = await fetch(`${getBase()}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
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
  const res = await fetch(`${getBase()}/api/forms`, {
    method: "POST",
    headers: { ...authHeaders() },
    body,
  });
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
  const res = await fetch(`${getBase()}/api/fill`, {
    method: "POST",
    headers: { ...authHeaders() },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to start fill" }));
    const errorObj = new Error(err.detail ?? "Failed to start fill");
    (errorObj as unknown as { status?: number }).status = res.status;
    throw errorObj;
  }
  return res.json();
}

export async function simulateUpgrade(
  is_subscribed: boolean = true,
  reset_count: boolean = false
): Promise<AuthUser> {
  const token = getAuthToken();
  const res = await fetch(`${getBase()}/api/auth/simulate-upgrade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ is_subscribed, reset_count }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to simulate upgrade" }));
    throw new Error(err.detail ?? "Failed to simulate upgrade");
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

// ---------------------------------------------------------------------------
// Admin — user management (admin-only, JWT required)
// ---------------------------------------------------------------------------

export interface NewUserInput {
  name: string;
  email: string;
  password: string;
  country: string;
  phone: string;
  company?: string;
}

export interface UpdateUserInput {
  status?: "active" | "disabled";
  country?: string;
  phone?: string;
  company?: string;
  password?: string;
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function adminListUsers(): Promise<AuthUser[]> {
  return adminRequest<AuthUser[]>("/api/admin/users");
}

export function adminCreateUser(input: NewUserInput): Promise<AuthUser> {
  return adminRequest<AuthUser>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function adminUpdateUser(userId: string, input: UpdateUserInput): Promise<AuthUser> {
  return adminRequest<AuthUser>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function adminDeleteUser(userId: string): Promise<void> {
  return adminRequest<void>(`/api/admin/users/${userId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Submissions & Legal Audit Trail
// ---------------------------------------------------------------------------

export async function listSubmissions(): Promise<SubmissionSummary[]> {
  const res = await fetch(`${getBase()}/api/submissions`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to list submissions" }));
    throw new Error(err.detail ?? "Failed to list submissions");
  }
  const data: SubmissionListResponse = await res.json();
  return data.submissions;
}

export async function saveSubmission(payload: SaveSubmissionRequest): Promise<SubmissionDetail> {
  const res = await fetch(`${getBase()}/api/submissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to save submission" }));
    throw new Error(err.detail ?? "Failed to save submission");
  }
  return res.json();
}

export async function getSubmission(id: string): Promise<SubmissionDetail> {
  const res = await fetch(`${getBase()}/api/submissions/${id}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to fetch submission" }));
    throw new Error(err.detail ?? "Failed to fetch submission");
  }
  return res.json();
}

export async function updateSubmission(id: string, payload: UpdateSubmissionRequest): Promise<SubmissionDetail> {
  const res = await fetch(`${getBase()}/api/submissions/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update submission" }));
    throw new Error(err.detail ?? "Failed to update submission");
  }
  return res.json();
}

export async function deleteSubmission(id: string): Promise<void> {
  const res = await fetch(`${getBase()}/api/submissions/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to delete submission" }));
    throw new Error(err.detail ?? "Failed to delete submission");
  }
}

export async function exportSubmissionPdf(id: string): Promise<Blob> {
  const res = await fetch(`${getBase()}/api/submissions/${id}/export`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to export PDF" }));
    throw new Error(err.detail ?? "Failed to export PDF");
  }
  return res.blob();
}

export async function downloadAuditCsv(id: string): Promise<Blob> {
  const res = await fetch(`${getBase()}/api/submissions/${id}/audit/csv`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to download audit CSV" }));
    throw new Error(err.detail ?? "Failed to download audit CSV");
  }
  return res.blob();
}


