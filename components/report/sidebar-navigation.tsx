"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardSection = "summary" | "issues" | "pages" | "intent" | "fixes";

const NAV_ITEMS: Array<{ id: DashboardSection; label: string }> = [
  { id: "summary", label: "סיכום" },
  { id: "issues", label: "ממצאים" },
  { id: "pages", label: "עמודים" },
  { id: "intent", label: "כוונה" },
  { id: "fixes", label: "תיקוני AI" }
];

type SidebarNavigationProps = {
  section: DashboardSection;
  onSectionChange: (next: DashboardSection) => void;
};

export function SidebarNavigation({ section, onSectionChange }: SidebarNavigationProps) {
  return (
    <>
      <div className="sticky top-6 hidden rounded-2xl border border-slate-200 bg-white p-3 lg:block">
        <p className="mb-2 px-2 text-xs font-semibold tracking-wide text-slate-500">ניווט הדשבורד</p>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.id}
              variant={section === item.id ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => onSectionChange(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
              section === item.id
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
            onClick={() => onSectionChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
