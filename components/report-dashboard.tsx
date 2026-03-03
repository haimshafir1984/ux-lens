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
