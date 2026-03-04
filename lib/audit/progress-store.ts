import crypto from "node:crypto";

import type { AuditReport } from "@/lib/audit/types";

export type ScanStage = "crawling" | "capturing" | "analyzing" | "generating_report";

export type ScanProgress = {
  stage: ScanStage;
  message: string;
  progress: number;
  currentPage?: string;
  currentPageIndex?: number;
  totalPages?: number;
  discoveredPages?: string[];
};

type JobStatus = "running" | "completed" | "interactionRequired" | "failed";

type ScanJob = {
  id: string;
  url: string;
  status: JobStatus;
  progress: ScanProgress;
  report?: AuditReport;
  promptMessage?: string;
  error?: string;
  updatedAt: number;
};

const jobs = new Map<string, ScanJob>();
const MAX_AGE_MS = 30 * 60 * 1000;

function cleanupOldJobs() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.updatedAt > MAX_AGE_MS) {
      jobs.delete(id);
    }
  }
}

export function createScanJob(url: string): ScanJob {
  cleanupOldJobs();
  const id = crypto.randomUUID();
  const job: ScanJob = {
    id,
    url,
    status: "running",
    progress: {
      stage: "crawling",
      message: "מתחיל סריקה...",
      progress: 5
    },
    updatedAt: Date.now()
  };
  jobs.set(id, job);
  return job;
}

export function updateScanJobProgress(id: string, progress: ScanProgress) {
  const job = jobs.get(id);
  if (!job) return;
  job.progress = {
    ...progress,
    progress: Math.max(0, Math.min(100, Math.round(progress.progress)))
  };
  job.updatedAt = Date.now();
}

export function completeScanJob(id: string, report: AuditReport) {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "completed";
  job.report = report;
  job.progress = {
    stage: "generating_report",
    message: "הדוח הושלם",
    progress: 100,
    discoveredPages: job.progress.discoveredPages
  };
  job.updatedAt = Date.now();
}

export function markInteractionRequired(id: string, promptMessage: string, report: AuditReport) {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "interactionRequired";
  job.promptMessage = promptMessage;
  job.report = report;
  job.progress = {
    stage: "generating_report",
    message: "נדרשת פעולה להמשך הביקורת",
    progress: 100,
    discoveredPages: job.progress.discoveredPages
  };
  job.updatedAt = Date.now();
}

export function failScanJob(id: string, error: string) {
  const job = jobs.get(id);
  if (!job) return;
  job.status = "failed";
  job.error = error;
  job.progress = {
    stage: "generating_report",
    message: "הסריקה נכשלה",
    progress: 100
  };
  job.updatedAt = Date.now();
}

export function getScanJob(id: string): ScanJob | null {
  cleanupOldJobs();
  return jobs.get(id) ?? null;
}
