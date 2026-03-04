"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AuditFinding } from "@/lib/audit/types";

type PageData = {
  url: string;
  score: number;
  findings: AuditFinding[];
  reusedFrom?: string;
};

type PageCardProps = {
  page: PageData;
  primaryCta?: string;
};

function pageTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "דף הבית" : parsed.pathname.replace(/\//g, " ").trim();
    return path.length > 0 ? path : "עמוד";
  } catch {
    return "עמוד";
  }
}

export function PageCard({ page, primaryCta }: PageCardProps) {
  const [open, setOpen] = useState(false);
  const navigationIssues = page.findings.filter((finding) => finding.category === "navigation");
  const ctaFindings = page.findings.filter(
    (finding) => finding.category === "conversion" || finding.category === "visualHierarchy"
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 h-24 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50" />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{pageTitleFromUrl(page.url)}</p>
            <p className="truncate text-xs text-slate-500">{page.url}</p>
          </div>
          <Badge variant={page.score < 60 ? "critical" : page.score < 75 ? "warning" : "good"}>
            {page.score}
          </Badge>
        </div>
        <p className="mt-2 text-xs text-slate-600">ממצאים: {page.findings.length}</p>
        {page.reusedFrom && <p className="mt-1 text-xs text-slate-500">נעשה שימוש חוזר מתבנית: {page.reusedFrom}</p>}

        <button type="button" className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700" onClick={() => setOpen((v) => !v)}>
          {open ? "הסתר פרטי עמוד" : "פתח פרטי עמוד"}
        </button>

        {open && (
          <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <p className="font-semibold text-slate-700">CTA שזוהו</p>
            <p className="text-slate-600">
              {ctaFindings.length > 0 ? ctaFindings.map((item) => item.title).slice(0, 3).join(" | ") : primaryCta ?? "לא זוהה"}
            </p>
            <p className="font-semibold text-slate-700">רכיבי ניווט</p>
            <p className="text-slate-600">
              {navigationIssues.length > 0 ? navigationIssues.map((item) => item.title).slice(0, 3).join(" | ") : "לא זוהו בעיות ניווט מרכזיות"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
