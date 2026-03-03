"use client";

import { useMemo, useState } from "react";
import { Bot, Sparkles } from "lucide-react";

import { AuditStateTimeline } from "@/components/audit-state-timeline";
import { InteractionRequiredCard } from "@/components/interaction-required-card";
import { ReportDashboard } from "@/components/report-dashboard";
import { UrlInputStage } from "@/components/url-input-stage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mockAuditReport } from "@/lib/audit/mock-data";
import { initialAuditState, transitionAuditState } from "@/lib/audit/state-machine";
import type { AuditState } from "@/lib/audit/types";

export function AuditWorkbench() {
  const [url, setUrl] = useState("https://example.com");
  const [state, setState] = useState<AuditState>(initialAuditState);
  const [loading, setLoading] = useState(false);
  const uploadPrompt =
    "הגעתי לשלב שדורש העלאת קובץ כדי להמשיך את הביקורת. נא להעלות כאן קובץ לדוגמה.";

  const canShowReport = useMemo(
    () => state.step === "completed" || state.step === "interactionRequired" || state.step === "finalizing",
    [state.step]
  );

  async function startAudit() {
    setLoading(true);
    setState((prev) => transitionAuditState(prev, { type: "START", url }));

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, action: "start" })
      });
      const data = await response.json();

      if (data.step === "interactionRequired") {
        setState((prev) =>
          transitionAuditState(prev, {
            type: "REQUIRE_UPLOAD",
            promptMessage: data.promptMessage ?? uploadPrompt
          })
        );
        if (data.report) {
          setState((prev) =>
            transitionAuditState(prev, { type: "SCAN_COMPLETE", report: data.report })
          );
          setState((prev) =>
            transitionAuditState(prev, {
              type: "REQUIRE_UPLOAD",
              promptMessage: data.promptMessage ?? uploadPrompt
            })
          );
        }
      } else if (data.step === "completed" && data.report) {
        setState((prev) => transitionAuditState(prev, { type: "FINALIZE_SUCCESS", report: data.report }));
      } else {
        setState((prev) => transitionAuditState(prev, { type: "FAIL", message: "התקבלה תשובה לא צפויה מהשרת." }));
      }
    } catch {
      setState((prev) => transitionAuditState(prev, { type: "FAIL", message: "בקשת הביקורת נכשלה." }));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    setLoading(true);
    setState((prev) => transitionAuditState(prev, { type: "UPLOAD_RECEIVED" }));

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, action: "resume" })
      });
      const data = await response.json();
      if (data.report) {
        setState((prev) => transitionAuditState(prev, { type: "FINALIZE_SUCCESS", report: data.report }));
      } else {
        setState((prev) => transitionAuditState(prev, { type: "FAIL", message: "לא התקבל דוח מהשרת." }));
      }
    } catch {
      setState((prev) => transitionAuditState(prev, { type: "FAIL", message: "בקשת ההמשך נכשלה." }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <UrlInputStage value={url} onChange={setUrl} onStart={startAudit} loading={loading} />

        {state.step === "interactionRequired" && (
          <InteractionRequiredCard
            message={
              state.context.promptMessage ?? uploadPrompt
            }
            onUpload={handleUpload}
            loading={loading}
          />
        )}

        {canShowReport && <ReportDashboard report={state.context.report ?? mockAuditReport} />}
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-slate-900">מנוע הביקורת</h2>
            </div>
            <p className="text-sm text-slate-600">
              Playwright מצלם גרסאות דסקטופ ומובייל, ואז GPT-4o/Claude מעריכים נגישות, היררכיה חזותית,
              רספונסיביות, טיפוגרפיה, איכות טפסים, בהירות ניווט, עקביות, פידבק מערכת וסימני אמון.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setState(initialAuditState)}>
              <Sparkles className="mr-2 h-4 w-4" />
              איפוס סשן
            </Button>
          </CardContent>
        </Card>

        <AuditStateTimeline step={state.step} />
      </div>
    </div>
  );
}
