"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AuditFinding, AuditReport } from "@/lib/audit/types";
import { cn } from "@/lib/utils";

export type IssueSeverityLevel = "critical" | "high" | "medium" | "low";

type IssueCardProps = {
  issue: AuditFinding;
  report: AuditReport;
  defaultOpen?: boolean;
};

function toSeverity(issue: AuditFinding): IssueSeverityLevel {
  if (issue.severity === "critical") return "critical";
  if (issue.severity === "warning") return "high";
  return "low";
}

function severityClasses(level: IssueSeverityLevel): string {
  if (level === "critical") return "border-red-200 bg-red-50";
  if (level === "high") return "border-orange-200 bg-orange-50";
  if (level === "medium") return "border-yellow-200 bg-yellow-50";
  return "border-slate-200 bg-slate-50";
}

function severityLabel(level: IssueSeverityLevel): string {
  if (level === "critical") return "Critical";
  if (level === "high") return "High";
  if (level === "medium") return "Medium";
  return "Low";
}

function affectedPages(issue: AuditFinding, report: AuditReport): string[] {
  const pages = report.pageReports ?? [];
  const matched = pages
    .filter((page) =>
      page.findings.some((finding) => finding.title === issue.title || finding.category === issue.category)
    )
    .map((page) => page.url);
  return matched.length > 0 ? matched : [report.targetUrl];
}

export function IssueCard({ issue, report, defaultOpen = false }: IssueCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const level = toSeverity(issue);
  const pages = useMemo(() => affectedPages(issue, report), [issue, report]);
  const relatedFixes = (report.redesignSuggestions ?? []).filter(
    (fix) => fix.problem === issue.title || fix.problem.toLowerCase().includes(issue.category.toLowerCase())
  );

  return (
    <Card className={cn("border", severityClasses(level))}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{issue.title}</p>
            <p className="text-xs text-slate-600">{issue.detail.slice(0, 130)}{issue.detail.length > 130 ? "..." : ""}</p>
          </div>
          <Badge variant={level === "critical" ? "critical" : level === "high" ? "warning" : "default"}>
            {severityLabel(level)}
          </Badge>
        </div>

        <p className="text-xs text-slate-500">Affected pages: {pages.length}</p>
        <button type="button" className="text-xs font-medium text-blue-600 hover:text-blue-700" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide details" : "Show details"}
        </button>

        {open && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <p><span className="font-semibold">Explanation:</span> {issue.detail}</p>
            <p><span className="font-semibold">Affected pages:</span> {pages.join(" | ")}</p>
            <p><span className="font-semibold">Screenshots:</span> Available in capture artifacts (not embedded in current API payload).</p>
            {relatedFixes.length > 0 && (
              <div className="space-y-1">
                <p className="font-semibold">AI fix suggestions:</p>
                {relatedFixes.map((fix, index) => (
                  <p key={`${fix.problem}-${index}`}>- {fix.suggestion}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
