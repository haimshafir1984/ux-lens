import { analyzeScreenshotsWithVision } from "@/lib/audit/analyze";
import { captureWebsite } from "@/lib/audit/capture";

export async function runAudit(url: string) {
  const captured = await captureWebsite(url);
  const report = await analyzeScreenshotsWithVision({
    url,
    desktopPath: captured.desktopPath,
    mobilePath: captured.mobilePath,
    domSummary: captured.domSummary,
    signals: captured.signals
  });

  const requiresUpload = report.requiresFileUpload;
  if (requiresUpload) {
    return {
      step: "interactionRequired" as const,
      promptMessage:
        "הגעתי לשלב שדורש העלאת קובץ כדי להמשיך את הביקורת. נא להעלות כאן קובץ לדוגמה.",
      report
    };
  }

  return { step: "completed" as const, report };
}
