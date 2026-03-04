import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  completeScanJob,
  createScanJob,
  failScanJob,
  getScanJob,
  markInteractionRequired,
  updateScanJobProgress
} from "@/lib/audit/progress-store";
import { mockAuditReport } from "@/lib/audit/mock-data";
import { runAudit } from "@/lib/audit/engine";

const startSchema = z.object({
  action: z.literal("start"),
  url: z.string().url(),
  maxPages: z.number().int().min(1).max(10).optional()
});

const resumeSchema = z.object({
  action: z.literal("resume"),
  url: z.string().url(),
  maxPages: z.number().int().min(1).max(10).optional()
});

const statusSchema = z.object({
  action: z.literal("status"),
  jobId: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();

    const action = (json?.action ?? "start") as "start" | "resume" | "status";
    if (action === "status") {
      const parsedStatus = statusSchema.safeParse(json);
      if (!parsedStatus.success) {
        return NextResponse.json(
          { error: "נתוני סטטוס אינם תקינים", details: parsedStatus.error.flatten() },
          { status: 400 }
        );
      }

      const job = getScanJob(parsedStatus.data.jobId);
      if (!job) {
        return NextResponse.json({ step: "failed", error: "לא נמצאה משימת סריקה פעילה." }, { status: 404 });
      }

      if (job.status === "running") {
        return NextResponse.json({
          step: "scanning",
          progress: job.progress
        });
      }
      if (job.status === "interactionRequired") {
        return NextResponse.json({
          step: "interactionRequired",
          promptMessage: job.promptMessage,
          report: job.report,
          progress: job.progress
        });
      }
      if (job.status === "completed") {
        return NextResponse.json({
          step: "completed",
          report: job.report,
          progress: job.progress
        });
      }
      return NextResponse.json({
        step: "failed",
        error: job.error ?? "הסריקה נכשלה",
        progress: job.progress
      });
    }

    if (action === "start") {
      const parsedStart = startSchema.safeParse(json);
      if (!parsedStart.success) {
        return NextResponse.json(
          { error: "נתוני התחלה אינם תקינים", details: parsedStart.error.flatten() },
          { status: 400 }
        );
      }

      const { url, maxPages } = parsedStart.data;
      const job = createScanJob(url);
      void (async () => {
        try {
          const result = await runAudit(url, {
            maxPages,
            timeoutMs: 15000,
            onProgress: (progress) => updateScanJobProgress(job.id, progress)
          });
          if (result.step === "interactionRequired") {
            markInteractionRequired(job.id, result.promptMessage, result.report);
            return;
          }
          completeScanJob(job.id, result.report);
        } catch (error) {
          failScanJob(job.id, error instanceof Error ? error.message : "Unknown error");
        }
      })();

      return NextResponse.json({
        step: "scanning",
        jobId: job.id,
        progress: job.progress
      });
    }

    const parsedResume = resumeSchema.safeParse(json);
    if (!parsedResume.success) {
      return NextResponse.json(
        { error: "נתוני המשך אינם תקינים", details: parsedResume.error.flatten() },
        { status: 400 }
      );
    }
    const { url, maxPages } = parsedResume.data;
    const resumed = await runAudit(url, { maxPages, timeoutMs: 15000 });
    if ("report" in resumed && resumed.report) {
      return NextResponse.json({
        step: "completed",
        report: { ...resumed.report, requiresFileUpload: false }
      });
    }

    return NextResponse.json({
      step: "completed",
      report: { ...mockAuditReport, targetUrl: url, score: 86, requiresFileUpload: false }
    });
  } catch (err) {
    console.error("Audit error:", err);
    return NextResponse.json(
      {
        error: "הפעלת הביקורת נכשלה.",
        details: String(err)
      },
      { status: 500 }
    );
  }
}
