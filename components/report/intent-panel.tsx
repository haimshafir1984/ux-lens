"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditReport } from "@/lib/audit/types";

type IntentPanelProps = {
  report: AuditReport;
};

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
          <CardTitle>Intent Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">Intent analysis data is not available for this report.</p>
        </CardContent>
      </Card>
    );
  }

  const intent = report.intentAnalysis;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Intent Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            Primary intent: <span className="font-semibold">{intent.primaryIntent}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            Primary CTA: <span className="font-semibold">{intent.primaryCTA}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            Confidence: <span className="font-semibold">{Math.round(intent.confidence * 100)}%</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            Intent clarity score: <span className="font-semibold">{intent.intentClarityScore}</span>
          </div>
        </div>
        <div className="space-y-2">
          {intent.issues.map((issue, index) => (
            <div key={`${issue.type}-${index}`} className={`rounded-lg border px-3 py-2 text-sm ${toneBySeverity(issue.severity)}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{issue.type}</p>
                <Badge variant={issue.severity === "high" ? "warning" : "default"}>{issue.severity}</Badge>
              </div>
            </div>
          ))}
          {intent.issues.length === 0 && <p className="text-sm text-slate-500">No intent friction issues found.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
