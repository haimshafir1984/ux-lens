import { AlertCircle, CheckCircle2, Loader2, PauseCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditStep } from "@/lib/audit/types";

const orderedSteps: Array<{ id: AuditStep; label: string }> = [
  { id: "scanning", label: "סריקה" },
  { id: "interactionRequired", label: "נדרשת אינטראקציה" },
  { id: "finalizing", label: "סיום עיבוד" },
  { id: "completed", label: "הושלם" }
];

function stateBadge(step: AuditStep) {
  if (step === "failed") return <Badge variant="critical">נכשל</Badge>;
  if (step === "interactionRequired") return <Badge variant="warning">ממתין למשתמש</Badge>;
  if (step === "completed") return <Badge variant="good">הושלם</Badge>;
  return <Badge>בתהליך</Badge>;
}

export function AuditStateTimeline({ step }: { step: AuditStep }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>תהליך הביקורת</CardTitle>
        {stateBadge(step)}
      </CardHeader>
      <CardContent className="space-y-3">
        {orderedSteps.map((item) => {
          const active = step === item.id;
          const complete =
            orderedSteps.findIndex((x) => x.id === step) > orderedSteps.findIndex((x) => x.id === item.id);
          return (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <p className="text-sm text-slate-700">{item.label}</p>
              {complete && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              {active && step !== "completed" && step !== "interactionRequired" && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              )}
              {active && step === "interactionRequired" && (
                <PauseCircle className="h-4 w-4 text-amber-400" />
              )}
              {step === "failed" && <AlertCircle className="h-4 w-4 text-red-400" />}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
