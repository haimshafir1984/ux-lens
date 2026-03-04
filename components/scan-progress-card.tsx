"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type ScanProgress = {
  stage: "crawling" | "capturing" | "analyzing" | "generating_report";
  message: string;
  progress: number;
  currentPage?: string;
  currentPageIndex?: number;
  totalPages?: number;
  discoveredPages?: string[];
};

type Props = {
  progress: ScanProgress | null;
};

const stageLabels: Record<ScanProgress["stage"], string> = {
  crawling: "סריקת האתר",
  capturing: "צילום עמודים",
  analyzing: "ניתוח UX",
  generating_report: "יצירת דוח"
};

function compactPageLabel(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.pathname === "/") return "Homepage";
    return parsed.pathname;
  } catch {
    return url;
  }
}

export function ScanProgressCard({ progress }: Props) {
  const currentStage = progress?.stage ?? "crawling";
  const discovered = progress?.discoveredPages ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>התקדמות סריקה</CardTitle>
        <CardDescription>{progress?.message ?? "מתחיל סריקה..."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Progress value={progress?.progress ?? 0} className="h-3" />
          <p className="mt-1 text-xs text-slate-500">{Math.round(progress?.progress ?? 0)}%</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {(["crawling", "capturing", "analyzing", "generating_report"] as const).map((stage) => (
            <div
              key={stage}
              className={[
                "rounded-lg border px-3 py-2 text-xs",
                currentStage === stage ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"
              ].join(" ")}
            >
              {stageLabels[stage]}
            </div>
          ))}
        </div>

        {progress?.currentPage && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="font-medium text-slate-700">
              {progress.currentPageIndex && progress.totalPages
                ? `מנתח עמוד ${progress.currentPageIndex} מתוך ${progress.totalPages}`
                : "עמוד נוכחי"}
            </p>
            <p className="truncate text-xs text-slate-500">{compactPageLabel(progress.currentPage)}</p>
          </div>
        )}

        {discovered.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">עמודים שהתגלו</p>
            <div className="flex flex-wrap gap-1.5">
              {discovered.slice(0, 10).map((page) => {
                const isCurrent = progress?.currentPage === page;
                return (
                  <Badge key={page} variant={isCurrent ? "warning" : "default"}>
                    {compactPageLabel(page)}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
