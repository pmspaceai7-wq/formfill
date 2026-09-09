"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/AuthContext";
import {
  adminCreateUser,
  adminDeleteUser,
  adminListUsers,
  adminUpdateUser,
  type NewUserInput,
} from "@/lib/api";
import type { AuthUser } from "@/lib/types";
import {
  AlertCircleIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@/components/Icons";

const EMPTY_FORM: NewUserInput = {
  name: "",
  email: "",
  password: "",
  country: "",
  phone: "",
  company: "",
};

function formatDate(value: string | null): string {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AdminPage() {
  const { user, loading } = useAuth();

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");

  const [form, setForm] = useState<NewUserInput>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const refresh = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const list = await adminListUsers();
      setUsers(list);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      refresh();
    }
  }, [user, refresh]);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setCreateError("");
      setCreateSuccess("");
      setCreating(true);
      try {
        await adminCreateUser(form);
        setCreateSuccess(`Account created for ${form.email}.`);
        setForm(EMPTY_FORM);
        await refresh();
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : "Failed to create user");
      } finally {
        setCreating(false);
      }
    },
    [form, refresh]
  );

  const toggleStatus = useCallback(
    async (u: AuthUser) => {
      setBusyId(u.id);
      try {
        await adminUpdateUser(u.id, {
          status: u.status === "active" ? "disabled" : "active",
        });
        await refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to update user");
      } finally {
        setBusyId(null);
      }
    },
    [refresh]
  );

  const handleDelete = useCallback(
    async (u: AuthUser) => {
      if (!confirm(`Permanently delete ${u.email}? This cannot be undone.`)) return;
      setBusyId(u.id);
      try {
        await adminDeleteUser(u.id);
        await refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete user");
      } finally {
        setBusyId(null);
      }
    },
    [refresh]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar hasForm={false} />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-500 text-sm">
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar hasForm={false} />
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-3">
          <ShieldCheckIcon size={32} className="mx-auto text-slate-400" />
          <h1 className="text-lg font-bold text-slate-900">Sign in required</h1>
          <p className="text-sm text-slate-600">
            Sign in with the administrator account from the navbar to manage users.
          </p>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar hasForm={false} />
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-3">
          <AlertCircleIcon size={32} className="mx-auto text-red-500" />
          <h1 className="text-lg font-bold text-slate-900">Access denied</h1>
          <p className="text-sm text-slate-600">
            This area is restricted to the administrator account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar hasForm={false} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheckIcon size={22} className="text-emerald-600" />
            User Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage business accounts. Only the administrator can add new
            users — there is no public sign-up.
          </p>
        </div>

        {/* Create User */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Create a new user</h2>

          {createError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircleIcon size={14} className="shrink-0" />
              <span>{createError}</span>
            </div>
          )}
          {createSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckIcon size={14} className="shrink-0" />
              <span>{createSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Full Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Business Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@company.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 chars, letters + numbers"
                  className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Country</label>
              <input
                type="text"
                required
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="United States"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Phone Number</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 555 123 4567"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Company (optional)</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {creating ? "Creating…" : "Create User"}
              </button>
            </div>
          </form>
        </section>

        {/* Users Table */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">
              All users {users.length > 0 && `(${users.length})`}
            </h2>
            <button
              onClick={refresh}
              className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {usersError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircleIcon size={14} className="shrink-0" />
              <span>{usersError}</span>
            </div>
          )}

          {usersLoading ? (
            <p className="text-xs text-slate-500">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="text-xs text-slate-500">No users yet — create the first one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4 font-semibold">Name</th>
                    <th className="py-2 pr-4 font-semibold">Email</th>
                    <th className="py-2 pr-4 font-semibold">Role</th>
                    <th className="py-2 pr-4 font-semibold">Country</th>
                    <th className="py-2 pr-4 font-semibold">Phone</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-4 font-semibold">Created</th>
                    <th className="py-2 pr-4 font-semibold">Last Login</th>
                    <th className="py-2 pr-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{u.name}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{u.email}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.role === "admin"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">{u.country || "—"}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{u.phone || "—"}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.status === "active"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500">{formatDate(u.created_at)}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{formatDate(u.last_login_at)}</td>
                      <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                        {u.role !== "admin" && (
                          <div className="inline-flex items-center gap-2">
                            <button
                              disabled={busyId === u.id}
                              onClick={() => toggleStatus(u)}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                            >
                              {u.status === "active" ? "Disable" : "Enable"}
                            </button>
                            <button
                              disabled={busyId === u.id}
                              onClick={() => handleDelete(u)}
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                              title="Delete user"
                            >
                              <TrashIcon size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
