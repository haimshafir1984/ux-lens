"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditReport } from "@/lib/audit/types";

type SummaryCardsProps = {
  report: AuditReport;
  onViewIssue: (issueId: string) => void;
};

function intentLabel(intent?: string): string {
  if (!intent) return "לא זוהתה";
  if (intent === "ecommerce purchase") return "רכישה באתר";
  if (intent === "lead generation") return "לכידת לידים";
  if (intent === "SaaS signup") return "הרשמה לשירות";
  if (intent === "content consumption") return "צריכת תוכן";
  if (intent === "product marketing") return "שיווק מוצר";
  if (intent === "information / documentation") return "מידע / תיעוד";
  return intent;
}

function toPageLabel(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.pathname === "/" || parsed.pathname.length === 0) return "דף הבית";
    return parsed.pathname.split("/").filter(Boolean)[0] ?? "עמוד";
  } catch {
    return "עמוד";
  }
}

export function SummaryCards({ report, onViewIssue }: SummaryCardsProps) {
  const criticalIssues = report.findings.filter((item) => item.severity === "critical");
  const pagesScanned = report.pageReports?.length ?? 1;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-500">ציון UX</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-slate-900">{report.score}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-500">כוונה ראשית</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-slate-900">
              {intentLabel(report.intentAnalysis?.primaryIntent)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-500">עמודים שנסרקו</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{pagesScanned}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(report.pageReports ?? [{ url: report.targetUrl, score: report.score, findings: report.findings }])
                .slice(0, 6)
                .map((page) => (
                  <span
                    key={page.url}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
                  >
                    {toPageLabel(page.url)}
                  </span>
                ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-500">בעיות קריטיות</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{criticalIssues.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>3 הבעיות הקריטיות המובילות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {criticalIssues.slice(0, 3).map((issue) => (
            <div key={issue.id} className="rounded-xl border border-red-200/70 bg-red-50/70 p-3">
              <p className="text-sm font-semibold text-red-800">{issue.title}</p>
              <p className="line-clamp-2 text-xs text-red-700">{issue.detail}</p>
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => onViewIssue(issue.id)}>
                מעבר לבעיה
              </Button>
            </div>
          ))}
          {criticalIssues.length === 0 && <p className="text-sm text-slate-500">לא נמצאו בעיות קריטיות.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
