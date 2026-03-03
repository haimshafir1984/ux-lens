export type AuditSeverity = "critical" | "warning" | "good";

export type AuditCategory =
  | "contrast"
  | "accessibility"
  | "visualHierarchy"
  | "responsive"
  | "typography"
  | "forms"
  | "navigation"
  | "consistency"
  | "feedback"
  | "performance"
  | "trust"
  | "conversion"
  | "content"
  | "errorPrevention"
  | "mobileTouch";

export type AuditStep =
  | "idle"
  | "scanning"
  | "interactionRequired"
  | "finalizing"
  | "completed"
  | "failed";

export type Annotation = {
  id: string;
  label: string;
  severity: AuditSeverity;
  x: number;
  y: number;
};

export type AuditFinding = {
  id: string;
  category: AuditCategory;
  title: string;
  detail: string;
  severity: AuditSeverity;
};

export type AuditCheckStatus = "pass" | "warning" | "critical";

export type AuditCheckResult = {
  id: string;
  category: AuditCategory;
  label: string;
  detail: string;
  status: AuditCheckStatus;
};

export type AuditChecksSummary = {
  total: number;
  passed: number;
  warnings: number;
  critical: number;
};

export type AuditReport = {
  targetUrl: string;
  generatedAt: string;
  score: number;
  findings: AuditFinding[];
  annotations: Annotation[];
  requiresFileUpload: boolean;
  checks: AuditCheckResult[];
  checksSummary: AuditChecksSummary;
};

export type AuditContext = {
  url: string;
  screenshotDesktop?: string;
  screenshotMobile?: string;
  domSummary?: string;
  report?: AuditReport;
  promptMessage?: string;
};

export type AuditState = {
  step: AuditStep;
  context: AuditContext;
};

export type AuditEvent =
  | { type: "START"; url: string }
  | { type: "SCAN_COMPLETE"; report: AuditReport }
  | { type: "REQUIRE_UPLOAD"; promptMessage: string }
  | { type: "UPLOAD_RECEIVED" }
  | { type: "FINALIZE_SUCCESS"; report: AuditReport }
  | { type: "FAIL"; message?: string }
  | { type: "RESET" };
