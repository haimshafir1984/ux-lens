"use client";

import { Card, CardContent } from "@/components/ui/card";

type AIFixCardProps = {
  problem: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
};

function whyItMatters(problem: string): string {
  if (/cta|action|signup|trial/i.test(problem)) {
    return "A weak primary action usually reduces conversion and makes the journey unclear.";
  }
  if (/navigation|menu/i.test(problem)) {
    return "Navigation friction increases bounce rate and slows task completion.";
  }
  if (/contrast|typography|mobile/i.test(problem)) {
    return "Readability and mobile ergonomics directly impact trust and usability.";
  }
  return "This issue impacts user confidence, clarity, and conversion outcomes.";
}

export function AIFixCard({ problem, suggestion, priority }: AIFixCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <details>
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Problem: {problem}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{priority}</span>
            </div>
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <p><span className="font-semibold">Why it matters:</span> {whyItMatters(problem)}</p>
            <p><span className="font-semibold">Suggested fix:</span> {suggestion}</p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
