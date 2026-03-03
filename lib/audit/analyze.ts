import { buildVisionPrompt } from "@/lib/audit/prompt-builder";
import { evaluateSignals } from "@/lib/audit/rules";
import type { AuditSignals } from "@/lib/audit/signals";
import type { AuditFinding, AuditReport } from "@/lib/audit/types";
import { getVisionFindings } from "@/lib/audit/vision-provider";

type AnalyzeInput = {
  url: string;
  desktopPath: string;
  mobilePath: string;
  domSummary: string;
  signals: AuditSignals;
};

type VisionPartial = {
  findings?: AuditFinding[];
};

function mergeReports(base: AuditReport, vision?: VisionPartial): AuditReport {
  if (!vision?.findings || vision.findings.length === 0) return base;

  const byKey = new Map<string, AuditFinding>();
  base.findings.forEach((finding) => byKey.set(`${finding.category}:${finding.title}`, finding));
  vision.findings.forEach((finding, idx) => {
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
    score,
    findings: mergedFindings
  };
}

async function maybeRunVision(input: AnalyzeInput): Promise<VisionPartial | undefined> {
  const prompt = buildVisionPrompt(input.url, input.domSummary, input.signals);
  const vision = await getVisionFindings(prompt, input.desktopPath, input.mobilePath);
  if (!vision || vision.findings.length === 0) return undefined;
  return { findings: vision.findings };
}

export async function analyzeScreenshotsWithVision(input: AnalyzeInput): Promise<AuditReport> {
  const deterministic = evaluateSignals(input.url, input.signals);
  const vision = await maybeRunVision(input);
  return mergeReports(deterministic, vision);
}
