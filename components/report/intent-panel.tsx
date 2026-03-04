"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditReport } from "@/lib/audit/types";

type IntentPanelProps = {
  report: AuditReport;
};

function intentLabel(intent: string): string {
  if (intent === "ecommerce purchase") return "רכישה באתר";
  if (intent === "lead generation") return "לכידת לידים";
  if (intent === "SaaS signup") return "הרשמה ל-SaaS";
  if (intent === "content consumption") return "צריכת תוכן";
  if (intent === "product marketing") return "שיווק מוצר";
  if (intent === "information / documentation") return "מידע / תיעוד";
  return intent;
}

function frictionLabel(type: string): string {
  if (type === "unclear primary action") return "פעולה ראשית לא ברורה";
  if (type === "too many CTAs") return "יותר מדי קריאות לפעולה";
  if (type === "missing signup path") return "אין מסלול הרשמה ברור";
  if (type === "weak value proposition") return "הצעת ערך חלשה";
  if (type === "competing CTAs") return "קריאות לפעולה מתחרות";
  return type;
}

function toneBySeverity(severity: "high" | "medium" | "low"): string {
  if (severity === "high") return "border-orange-200 bg-orange-50";
  if (severity === "medium") return "border-yellow-200 bg-yellow-50";
  return "border-slate-200 bg-slate-50";
}

export function IntentPanel({ report }: IntentPanelProps) {
  if (!report.intentAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ניתוח כוונה</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">נתוני ניתוח כוונה לא זמינים בדוח זה.</p>
        </CardContent>
      </Card>
    );
  }

  const intent = report.intentAnalysis;
  return (
    <Card>
      <CardHeader>
        <CardTitle>ניתוח כוונה</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            כוונה ראשית: <span className="font-semibold">{intentLabel(intent.primaryIntent)}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            CTA ראשי: <span className="font-semibold">{intent.primaryCTA}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            רמת ודאות: <span className="font-semibold">{Math.round(intent.confidence * 100)}%</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            ציון בהירות הכוונה: <span className="font-semibold">{intent.intentClarityScore}</span>
          </div>
        </div>
        <div className="space-y-2">
          {intent.issues.map((issue, index) => (
            <div key={`${issue.type}-${index}`} className={`rounded-lg border px-3 py-2 text-sm ${toneBySeverity(issue.severity)}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{frictionLabel(issue.type)}</p>
                <Badge variant={issue.severity === "high" ? "warning" : "default"}>
                  {issue.severity === "high" ? "גבוהה" : issue.severity === "medium" ? "בינונית" : "נמוכה"}
                </Badge>
              </div>
            </div>
          ))}
          {intent.issues.length === 0 && <p className="text-sm text-slate-500">לא נמצאו חיכוכים מהותיים בכוונת המשתמש.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
