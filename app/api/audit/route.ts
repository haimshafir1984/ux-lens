import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { mockAuditReport } from "@/lib/audit/mock-data";
import { runAudit } from "@/lib/audit/engine";

const requestSchema = z.object({
  url: z.string().url(),
  action: z.enum(["start", "resume"]).default("start"),
  maxPages: z.number().int().min(1).max(10).optional()
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתוני הבקשה אינם תקינים", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { url, action, maxPages } = parsed.data;
    if (action === "start") {
      const result = await runAudit(url, { maxPages });
      return NextResponse.json(result);
    }

    const resumed = await runAudit(url, { maxPages });
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
  } 
  catch (err) {

  console.error("Audit error:", err)

  return Response.json(
    {
      error: "הפעלת הביקורת נכשלה.",
      details: String(err)
    },
    { status: 500 }
  )

}
}
