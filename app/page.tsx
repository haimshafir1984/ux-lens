import { Radar } from "lucide-react";

import { AuditWorkbench } from "@/components/audit-workbench";

export default function Page() {
  return (
    <main className="relative overflow-hidden px-6 py-10 md:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.14),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.1),transparent_36%)]" />
      <div className="relative mx-auto mb-8 max-w-6xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs text-slate-600">
          <Radar className="h-3.5 w-3.5 text-blue-400" />
          UX-Lens, מערכת ביקורת מבוססת AI
        </div>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          ביקורת UI/UX אוטומטית תוך דקות
        </h1>
        <p className="max-w-2xl text-sm text-slate-600 md:text-base">
          צילום מסכים עם Playwright, ניתוח עם GPT-4o או Claude Vision, ודוח ויזואלי עם תובנות מעשיות
          לשיפור חוויית המשתמש.
        </p>
      </div>
      <AuditWorkbench />
    </main>
  );
}
