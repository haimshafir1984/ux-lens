import { auditHeuristics } from "@/lib/audit/heuristics";
import type { AuditReport } from "@/lib/audit/types";

export type SiteUxInsight = {
  pattern:
    | "unclear primary action"
    | "weak value proposition"
    | "confusing navigation structure"
    | "conversion friction"
    | "lack of trust signals";
  severity: "high" | "medium" | "low";
  evidence: string[];
  source: Array<"rules" | "heuristics" | "vision" | "uxScore">;
};

type UxPatternInput = {
  pageReports: AuditReport[];
};

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoreSeverity(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function detectUxPatterns(input: UxPatternInput): SiteUxInsight[] {
  const findings = input.pageReports.flatMap((page) => page.findings);
  const checks = input.pageReports.flatMap((page) => page.checks);

  const ctaCritical = findings.filter(
    (finding) =>
      finding.severity === "critical" &&
      (finding.category === "conversion" ||
        finding.category === "visualHierarchy" ||
        /cta|action|primary/i.test(finding.title))
  );
  const navigationRisk = findings.filter(
    (finding) => finding.category === "navigation" && finding.severity !== "good"
  );
  const conversionRisk = findings.filter(
    (finding) =>
      (finding.category === "forms" || finding.category === "conversion" || finding.category === "feedback") &&
      finding.severity !== "good"
  );
  const trustRisk = findings.filter(
    (finding) => finding.category === "trust" && finding.severity !== "good"
  );
  const valuePropRisk = findings.filter(
    (finding) =>
      (finding.category === "content" || finding.category === "visualHierarchy") &&
      /headline|value|hero|content|clarity|message/i.test(`${finding.title} ${finding.detail}`)
  );

  const uxScores = input.pageReports
    .map((page) => page.uxScore?.categories)
    .filter((value): value is NonNullable<AuditReport["uxScore"]>["categories"] => Boolean(value));
  const avgCta = avg(uxScores.map((score) => score.CTA));
  const avgNavigation = avg(uxScores.map((score) => score.navigation));
  const avgTrust = avg(uxScores.map((score) => score.contrast));

  const heuristics = new Map(auditHeuristics.map((item) => [item.id, item.title]));
  const insights: SiteUxInsight[] = [];

  if (ctaCritical.length > 0 || avgCta < 62) {
    insights.push({
      pattern: "unclear primary action",
      severity: scoreSeverity(ctaCritical.length * 25 + Math.max(0, 65 - avgCta)),
      evidence: [
        ...ctaCritical.slice(0, 2).map((item) => item.title),
        `CTA avg score: ${Math.round(avgCta) || 0}`,
        `Heuristic: ${heuristics.get("conversion") ?? "Conversion Friction"}`
      ],
      source: ["rules", "vision", "uxScore", "heuristics"]
    });
  }

  if (valuePropRisk.length > 0) {
    insights.push({
      pattern: "weak value proposition",
      severity: scoreSeverity(valuePropRisk.length * 20),
      evidence: [
        ...valuePropRisk.slice(0, 2).map((item) => item.title),
        `Heuristic: ${heuristics.get("content") ?? "Content Clarity"}`
      ],
      source: ["rules", "heuristics", "vision"]
    });
  }

  if (navigationRisk.length > 0 || avgNavigation < 65) {
    insights.push({
      pattern: "confusing navigation structure",
      severity: scoreSeverity(navigationRisk.length * 20 + Math.max(0, 70 - avgNavigation)),
      evidence: [
        ...navigationRisk.slice(0, 2).map((item) => item.title),
        `Navigation avg score: ${Math.round(avgNavigation) || 0}`,
        `Heuristic: ${heuristics.get("navigation") ?? "Navigation Clarity"}`
      ],
      source: ["rules", "heuristics", "uxScore"]
    });
  }

  if (conversionRisk.length > 0) {
    insights.push({
      pattern: "conversion friction",
      severity: scoreSeverity(conversionRisk.length * 15),
      evidence: [
        ...conversionRisk.slice(0, 2).map((item) => item.title),
        ...checks
          .filter((item) => item.category === "forms" && item.status !== "pass")
          .slice(0, 1)
          .map((item) => item.label)
      ],
      source: ["rules", "vision", "heuristics"]
    });
  }

  if (trustRisk.length > 0 || avgTrust < 60) {
    insights.push({
      pattern: "lack of trust signals",
      severity: scoreSeverity(trustRisk.length * 20 + Math.max(0, 60 - avgTrust)),
      evidence: [
        ...trustRisk.slice(0, 2).map((item) => item.title),
        `Contrast/trust proxy score: ${Math.round(avgTrust) || 0}`,
        `Heuristic: ${heuristics.get("trust") ?? "Trust & Credibility Signals"}`
      ],
      source: ["rules", "heuristics", "uxScore"]
    });
  }

  return insights.slice(0, 5);
}
