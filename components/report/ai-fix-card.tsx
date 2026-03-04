"use client";

import { Card, CardContent } from "@/components/ui/card";

type AIFixCardProps = {
  problem: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
};

function whyItMatters(problem: string): string {
  if (/cta|action|signup|trial/i.test(problem)) {
    return "פעולה ראשית חלשה בדרך כלל מורידה המרות ומקשה על המשתמש להבין את הצעד הבא.";
  }
  if (/navigation|menu/i.test(problem)) {
    return "חיכוך בניווט מעלה נטישה ומאט השלמת משימות.";
  }
  if (/contrast|typography|mobile/i.test(problem)) {
    return "קריאות וארגונומיה במובייל משפיעות ישירות על אמון ושימושיות.";
  }
  return "הבעיה משפיעה על בהירות, אמון המשתמש ותוצאות ההמרה.";
}

export function AIFixCard({ problem, suggestion, priority }: AIFixCardProps) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <details>
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">בעיה: {problem}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {priority === "high" ? "עדיפות גבוהה" : priority === "medium" ? "עדיפות בינונית" : "עדיפות נמוכה"}
              </span>
            </div>
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <p><span className="font-semibold">למה זה חשוב:</span> {whyItMatters(problem)}</p>
            <p><span className="font-semibold">תיקון מוצע:</span> {suggestion}</p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
