import type { AuditFinding, AuditReport } from "@/lib/audit/types";

export type UxInsight = {
  pattern:
    | "confusing navigation"
    | "weak value proposition"
    | "unclear primary action"
    | "cognitive overload"
    | "poor onboarding path";
  severity: "high" | "medium" | "low";
  evidence: string[];
};

type InsightInput = {
  pageReports: AuditReport[];
};

function topFindingTitles(findings: AuditFinding[], limit = 2): string[] {
  return findings.slice(0, limit).map((finding) => finding.title);
}

export function buildUxInsights(input: InsightInput): UxInsight[] {
  const allFindings = input.pageReports.flatMap((page) => page.findings);
  const navFindings = allFindings.filter((finding) => finding.category === "navigation");
  const ctaFindings = allFindings.filter(
    (finding) => finding.category === "conversion" || finding.category === "visualHierarchy"
  );
  const contentFindings = allFindings.filter((finding) => finding.category === "content");
  const overloadFindings = allFindings.filter(
    (finding) =>
      finding.category === "typography" || finding.category === "consistency" || finding.category === "performance"
  );
  const formsFindings = allFindings.filter(
    (finding) => finding.category === "forms" || finding.category === "feedback"
  );

  const insights: UxInsight[] = [];
  if (navFindings.length >= 2) {
    insights.push({
      pattern: "confusing navigation",
      severity: navFindings.some((item) => item.severity === "critical") ? "high" : "medium",
      evidence: topFindingTitles(navFindings, 3)
    });
  }
  if (contentFindings.length >= 2) {
    insights.push({
      pattern: "weak value proposition",
      severity: "medium",
      evidence: topFindingTitles(contentFindings, 3)
    });
  }
  if (ctaFindings.length >= 2) {
    insights.push({
      pattern: "unclear primary action",
      severity: ctaFindings.some((item) => item.severity === "critical") ? "high" : "medium",
      evidence: topFindingTitles(ctaFindings, 3)
    });
  }
  if (overloadFindings.length >= 3) {
    insights.push({
      pattern: "cognitive overload",
      severity: "medium",
      evidence: topFindingTitles(overloadFindings, 3)
    });
  }
  if (formsFindings.length >= 2) {
    insights.push({
      pattern: "poor onboarding path",
      severity: formsFindings.some((item) => item.severity === "critical") ? "high" : "medium",
      evidence: topFindingTitles(formsFindings, 3)
    });
  }

  return insights.slice(0, 5);
}
