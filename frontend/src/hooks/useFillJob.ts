"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldCitation, FieldConflict, FieldInference } from "@/lib/types";
import { startFill, getFill } from "@/lib/api";

export type FillJobState = {
  status: "idle" | "running" | "complete" | "error";
  done: number;
  total: number;
  values: Record<string, string> | null;
  citations: Record<string, FieldCitation>;
  conflicts: FieldConflict[];
  inferences: Record<string, FieldInference>;
  error: string;
};

export function useFillJob() {
  const [state, setState] = useState<FillJobState>({
    status: "idle",
    done: 0,
    total: 0,
    values: null,
    citations: {},
    conflicts: [],
    inferences: {},
    error: "",
  });
  const jobIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const poll = useCallback(async (jobId: string) => {
    if (!mountedRef.current) return;
    try {
      const data = await getFill(jobId);
      if (!mountedRef.current) return;

      if (data.status === "complete") {
        setState({
          status: "complete",
          done: data.done,
          total: data.total,
          values: data.values ?? {},
          citations: data.citations ?? {},
          conflicts: data.conflicts ?? [],
          inferences: data.inferences ?? {},
          error: "",
        });
      } else if (data.status === "error") {
        setState(s => ({ ...s, status: "error", error: data.error || "Fill failed" }));
      } else {
        setState(s => ({ ...s, status: "running", done: data.done, total: data.total }));
        timerRef.current = setTimeout(() => poll(jobId), 1500);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setState(s => ({ ...s, status: "error", error: e instanceof Error ? e.message : "Poll failed" }));
    }
  }, []);

  const start = useCallback(async (formId: string, sourceId: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({
      status: "running",
      done: 0,
      total: 0,
      values: null,
      citations: {},
      conflicts: [],
      inferences: {},
      error: "",
    });
    try {
      const job = await startFill(formId, sourceId);
      jobIdRef.current = job.job_id;
      timerRef.current = setTimeout(() => poll(job.job_id), 1000);
    } catch (e) {
      setState((s) => ({
        ...s,
        status: "error",
        error: e instanceof Error ? e.message : "Start failed",
      }));
    }
  }, [poll]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({
      status: "idle",
      done: 0,
      total: 0,
      values: null,
      citations: {},
      conflicts: [],
      inferences: {},
      error: "",
    });
    jobIdRef.current = null;
  }, []);

  return { ...state, start, reset };
}
