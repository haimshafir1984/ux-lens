import { buildVisionPrompt } from "@/lib/audit/prompt-builder";
import { evaluateSignals } from "@/lib/audit/rules";
import type { AuditSignals } from "@/lib/audit/signals";
import type { AuditFinding, AuditReport } from "@/lib/audit/types";
import { getVisionFindings } from "@/lib/audit/vision-provider";
import { computeUxScore } from "@/lib/ux-score";
import { analyzeVisionUi, type VisionIssue } from "@/lib/vision-ui-analyzer";

type AnalyzeInput = {
  url: string;
  desktopPath: string;
  mobilePath: string;
  fullPagePath?: string;
  domSummary: string;
  signals: AuditSignals;
  screenshots?: {
    desktop: Buffer;
    mobile: Buffer;
    fullPage?: Buffer;
  };
};

type VisionPartial = {
  findings?: AuditFinding[];
};

function visionIssuesToFindings(issues: VisionIssue[]): AuditFinding[] {
  return issues.map((issue, index) => ({
    id: `vision-ui-${index}`,
    category:
      issue.type === "Contrast"
        ? "contrast"
        : issue.type === "Typography"
          ? "typography"
          : issue.type === "Navigation complexity"
            ? "navigation"
            : issue.type === "Mobile usability"
              ? "mobileTouch"
              : "visualHierarchy",
    title: issue.type,
    detail: `${issue.description} המלצה: ${issue.recommendation}`,
    severity: issue.severity === "high" ? "critical" : issue.severity === "low" ? "good" : "warning"
  }));
}

function mergeReports(base: AuditReport, vision?: VisionPartial, uxScore?: AuditReport["uxScore"]): AuditReport {
  if ((!vision?.findings || vision.findings.length === 0) && !uxScore) return base;

  const byKey = new Map<string, AuditFinding>();
  base.findings.forEach((finding) => byKey.set(`${finding.category}:${finding.title}`, finding));
  (vision?.findings ?? []).forEach((finding, idx) => {
    const key = `${finding.category}:${finding.title}`;
    if (!byKey.has(key)) {
      byKey.set(key, { ...finding, id: `vision-${idx}` });
    }
  });

  const mergedFindings = Array.from(byKey.values());
  const critical = mergedFindings.filter((f) => f.severity === "critical").length;
  const warning = mergedFindings.filter((f) => f.severity === "warning").length;
  const score = Math.max(0, Math.min(100, 100 - critical * 7 - warning * 3));

  return {
    ...base,
    score: uxScore?.overallScore ?? score,
    uxScore,
    topCriticalProblems: mergedFindings.filter((item) => item.severity === "critical").slice(0, 5),
    findings: mergedFindings
  };
}

async function maybeRunVision(input: AnalyzeInput): Promise<VisionPartial | undefined> {
  const prompt = buildVisionPrompt(input.url, input.domSummary, input.signals);
  const [vision, uiVision] = await Promise.all([
    getVisionFindings(prompt, input.desktopPath, input.mobilePath, input.fullPagePath),
    input.screenshots?.fullPage || input.screenshots?.desktop
      ? analyzeVisionUi({
          screenshot: input.screenshots?.fullPage ?? input.screenshots!.desktop,
          domSummary: input.domSummary,
          signals: input.signals
        })
      : Promise.resolve({ issues: [] as VisionIssue[] })
  ]);
  const merged = [...(vision?.findings ?? []), ...visionIssuesToFindings(uiVision.issues)];
  if (merged.length === 0) return undefined;
  return { findings: merged };
}

export async function analyzeScreenshotsWithVision(input: AnalyzeInput): Promise<AuditReport> {
  const deterministic = evaluateSignals(input.url, input.signals);
  const vision = await maybeRunVision(input);
  const uxScore = computeUxScore({
    signals: input.signals,
    issues: (vision?.findings ?? []).map((finding) => ({
      type:
        finding.category === "navigation"
          ? "Navigation complexity"
          : finding.category === "contrast"
            ? "Contrast"
            : finding.category === "typography"
              ? "Typography"
              : finding.category === "mobileTouch" || finding.category === "responsive"
                ? "Mobile usability"
                : finding.category === "conversion"
                  ? "CTA clarity"
                  : "Visual hierarchy",
      severity: finding.severity === "critical" ? "high" : finding.severity === "good" ? "low" : "medium",
      description: finding.title,
      recommendation: finding.detail
    }))
  });
  return mergeReports(deterministic, vision, uxScore);
}
