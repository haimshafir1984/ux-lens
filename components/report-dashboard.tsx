import { AlertTriangle, CheckCircle2, ShieldAlert, Smartphone, Type } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AuditFinding, AuditReport } from "@/lib/audit/types";

function severityVariant(severity: AuditFinding["severity"]) {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  return "good";
}

function severityLabel(severity: AuditFinding["severity"]) {
  if (severity === "critical") return "קריטי";
  if (severity === "warning") return "אזהרה";
  return "טוב";
}

function categoryLabel(category: AuditFinding["category"]) {
  if (category === "contrast") return "ניגודיות ונגישות";
  if (category === "accessibility") return "נגישות";
  if (category === "visualHierarchy") return "היררכיה חזותית";
  if (category === "responsive") return "רספונסיביות";
  if (category === "typography") return "טיפוגרפיה";
  if (category === "forms") return "טפסים ומצבים ריקים";
  if (category === "navigation") return "בהירות ניווט";
  if (category === "consistency") return "עקביות חזותית";
  if (category === "feedback") return "פידבק ומצבי מערכת";
  if (category === "performance") return "ביצועים נתפסים";
  if (category === "trust") return "אמון ואמינות";
  if (category === "conversion") return "חסמי המרה";
  if (category === "content") return "בהירות תוכן";
  if (category === "errorPrevention") return "מניעת שגיאות";
  return "ארגונומיית מגע";
}

function severityIcon(severity: AuditFinding["severity"]) {
  if (severity === "critical") return <ShieldAlert className="h-4 w-4 text-red-400" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
}

function priorityLabel(priority: "high" | "medium" | "low") {
  if (priority === "high") return "גבוהה";
  if (priority === "low") return "נמוכה";
  return "בינונית";
}

export function ReportDashboard({ report }: { report: AuditReport }) {
  const criticalCount = report.findings.filter((f) => f.severity === "critical").length;
  const warningCount = report.findings.filter((f) => f.severity === "warning").length;
  const goodCount = report.findings.filter((f) => f.severity === "good").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">ציון בריאות UX</CardTitle>
            <CardDescription>{report.targetUrl}</CardDescription>
          </div>
          <div className="text-start">
            <div className="text-4xl font-bold text-slate-900">{report.score}</div>
            <p className="text-xs text-slate-500">מתוך 100</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={report.score} />
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Badge variant="critical">קריטי: {criticalCount}</Badge>
            <Badge variant="warning">אזהרה: {warningCount}</Badge>
            <Badge variant="good">טוב: {goodCount}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              סה"כ בדיקות: {report.checksSummary.total}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              עברו: {report.checksSummary.passed}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              אזהרות: {report.checksSummary.warnings}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              קריטיות: {report.checksSummary.critical}
            </div>
          </div>
        </CardContent>
      </Card>

      {report.criticalUxBlockersDetected && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">{report.criticalUxBlockersMessage ?? "Critical UX blockers detected"}</CardTitle>
            <CardDescription>התגלו חסמים מערכתיים שעלולים לפגוע משמעותית בהמרה ובשימושיות.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(report.criticalUxBlockers ?? []).map((blocker) => (
              <Badge key={blocker} variant="critical">
                {blocker}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {report.uxScore && (
        <Card>
          <CardHeader>
            <CardTitle>UX Score לפי קטגוריות</CardTitle>
            <CardDescription>שקלול משולב של כל העמודים שנסרקו.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">ניווט: {report.uxScore.categories.navigation}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">היררכיה: {report.uxScore.categories.hierarchy}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">CTA: {report.uxScore.categories.CTA}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">טיפוגרפיה: {report.uxScore.categories.typography}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">Spacing: {report.uxScore.categories.spacing}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">ניגודיות: {report.uxScore.categories.contrast}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">מובייל: {report.uxScore.categories.mobile}</div>
            {typeof report.uxScore.categories.performance === "number" && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                ביצועים נתפסים: {report.uxScore.categories.performance}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {report.topCriticalProblems && report.topCriticalProblems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 בעיות קריטיות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.topCriticalProblems.slice(0, 5).map((problem) => (
              <div key={problem.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
                <p className="font-medium text-red-800">{problem.title}</p>
                <p className="text-red-700">{problem.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>אנוטציות חזותיות</CardTitle>
          <CardDescription>שכבת סימון על צילום המסך עם אלמנטים שסומנו לבדיקה.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative h-72 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white">
            <div className="absolute inset-x-0 top-0 h-16 border-b border-slate-200 bg-white/90" />
            <div className="absolute left-6 top-6 h-3 w-20 rounded bg-slate-300" />
            <div className="absolute right-8 top-6 h-8 w-28 rounded-lg bg-blue-500/90" />
            <div className="absolute left-8 top-24 h-7 w-52 rounded bg-slate-300" />
            <div className="absolute left-8 top-36 h-4 w-72 rounded bg-slate-300" />
            <div className="absolute left-8 top-44 h-4 w-64 rounded bg-slate-300" />
            <div className="absolute left-8 top-56 h-10 w-32 rounded-xl bg-blue-500" />

            {report.annotations.map((annotation) => (
              <div
                key={annotation.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
              >
                <div
                  className={[
                    "h-4 w-4 rounded-full ring-4",
                    annotation.severity === "critical"
                      ? "bg-red-500 ring-red-500/20"
                      : annotation.severity === "warning"
                        ? "bg-amber-500 ring-amber-500/20"
                        : "bg-emerald-500 ring-emerald-500/20"
                  ].join(" ")}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {report.pageReports && report.pageReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ממצאים לפי עמוד</CardTitle>
            <CardDescription>כיסוי רב־עמודי עם ציון לכל עמוד מרכזי.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.pageReports.map((page) => (
              <div key={page.url} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="truncate text-slate-700">{page.url}</span>
                  <Badge variant={page.score < 60 ? "critical" : page.score < 75 ? "warning" : "good"}>
                    ציון: {page.score}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">ממצאים: {page.findings.length}</p>
                {page.reusedFrom && (
                  <p className="text-xs text-slate-500">Template duplicate, reused analysis from: {page.reusedFrom}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {report.redesignSuggestions && report.redesignSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>הצעות Redesign מבוססות AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.redesignSuggestions.map((item, index) => (
              <div key={`${item.problem}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-1 text-sm font-semibold text-slate-900">בעיה: {item.problem}</p>
                <p className="text-sm text-slate-600">הצעה: {item.suggestion}</p>
                <p className="mt-2 text-xs text-slate-500">עדיפות: {priorityLabel(item.priority)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {report.insights && report.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>UX Insights חוצי־עמודים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.insights.map((insight, index) => (
              <div key={`${insight.pattern}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{insight.pattern}</p>
                <p className="text-xs text-slate-600">חומרה: {insight.severity}</p>
                <p className="mt-1 text-xs text-slate-500">{insight.evidence.join(" | ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>כיסוי בדיקות</CardTitle>
          <CardDescription>תוצאות של בדיקות עומק דטרמיניסטיות שנרצו על העמוד.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.checks.slice(0, 12).map((check) => (
            <div
              key={check.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{check.label}</p>
                <p className="text-xs text-slate-500">{check.detail}</p>
              </div>
              <Badge
                variant={
                  check.status === "critical"
                    ? "critical"
                    : check.status === "warning"
                      ? "warning"
                      : "good"
                }
              >
                {check.status === "critical"
                  ? "קריטי"
                  : check.status === "warning"
                    ? "אזהרה"
                    : "עבר"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>פידבק לפי קטגוריות</CardTitle>
          <CardDescription>
            ממצאים לפי רמת חומרה ועקרונות UX כולל נגישות ורספונסיביות.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.findings.map((finding) => (
            <div
              key={finding.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  {severityIcon(finding.severity)}
                  {finding.title}
                </p>
                <Badge variant={severityVariant(finding.severity)}>
                  {severityLabel(finding.severity)}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">{finding.detail}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                {finding.category === "responsive" && <Smartphone className="h-3 w-3" />}
                {finding.category === "typography" && <Type className="h-3 w-3" />}
                <span>{categoryLabel(finding.category)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
