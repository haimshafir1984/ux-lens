"use client";

import { useMemo, useState } from "react";

import { AIFixCard } from "@/components/report/ai-fix-card";
import { IntentPanel } from "@/components/report/intent-panel";
import { IssueCard, type IssueSeverityLevel } from "@/components/report/issue-card";
import { PageCard } from "@/components/report/page-card";
import {
  SidebarNavigation,
  type DashboardSection
} from "@/components/report/sidebar-navigation";
import { SummaryCards } from "@/components/report/summary-cards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditFinding, AuditReport } from "@/lib/audit/types";

function toIssueSeverity(issue: AuditFinding): IssueSeverityLevel {
  if (issue.severity === "critical") return "critical";
  if (issue.severity === "warning") return "high";
  return "low";
}

function categoryLabel(category: AuditFinding["category"]): string {
  if (category === "contrast") return "ניגודיות";
  if (category === "accessibility") return "נגישות";
  if (category === "visualHierarchy") return "היררכיה חזותית";
  if (category === "responsive") return "רספונסיביות";
  if (category === "typography") return "טיפוגרפיה";
  if (category === "forms") return "טפסים";
  if (category === "navigation") return "ניווט";
  if (category === "consistency") return "עקביות";
  if (category === "feedback") return "פידבק מערכת";
  if (category === "performance") return "ביצועים";
  if (category === "trust") return "אמון";
  if (category === "conversion") return "המרה";
  if (category === "content") return "תוכן";
  if (category === "errorPrevention") return "מניעת שגיאות";
  return "מגע במובייל";
}

export function ReportDashboard({ report }: { report: AuditReport }) {
  const [section, setSection] = useState<DashboardSection>("summary");
  const [issueSearch, setIssueSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | IssueSeverityLevel>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | AuditFinding["category"]>("all");
  const [focusIssueId, setFocusIssueId] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(report.findings.map((item) => item.category))),
    [report.findings]
  );
  const filteredIssues = useMemo(() => {
    return report.findings.filter((issue) => {
      const matchesSeverity = severityFilter === "all" || toIssueSeverity(issue) === severityFilter;
      const matchesCategory = categoryFilter === "all" || issue.category === categoryFilter;
      const matchesSearch =
        issueSearch.trim().length === 0 ||
        issue.title.toLowerCase().includes(issueSearch.toLowerCase()) ||
        issue.detail.toLowerCase().includes(issueSearch.toLowerCase());
      return matchesSeverity && matchesCategory && matchesSearch;
    });
  }, [report.findings, severityFilter, categoryFilter, issueSearch]);

  function openIssue(issueId: string) {
    setSection("issues");
    setFocusIssueId(issueId);
  }

  const pageData =
    report.pages?.map((page) => ({
      url: page.url,
      score: page.score,
      findings: page.issues
    })) ??
    report.pageReports ??
    [{ url: report.targetUrl, score: report.score, findings: report.findings }];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">דשבורד ביקורת UX</CardTitle>
          <CardDescription>{report.targetUrl}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <SidebarNavigation section={section} onSectionChange={setSection} />

        <div className="space-y-4">
          {section === "summary" && <SummaryCards report={report} onViewIssue={openIssue} />}

          {section === "issues" && (
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>סייר ממצאים</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-3">
                  <input
                    value={issueSearch}
                    onChange={(event) => setIssueSearch(event.target.value)}
                    placeholder="חיפוש ממצאים..."
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  />
                  <select
                    value={severityFilter}
                    onChange={(event) => setSeverityFilter(event.target.value as "all" | IssueSeverityLevel)}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    <option value="all">כל רמות החומרה</option>
                    <option value="critical">קריטי</option>
                    <option value="high">גבוה</option>
                    <option value="medium">בינוני</option>
                    <option value="low">נמוך</option>
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(event) =>
                      setCategoryFilter(event.target.value as "all" | AuditFinding["category"])
                    }
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    <option value="all">כל הקטגוריות</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {categoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>

              <div className="space-y-2">
                {filteredIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    report={report}
                    defaultOpen={focusIssueId === issue.id}
                  />
                ))}
                {filteredIssues.length === 0 && (
                  <Card>
                    <CardContent className="p-4 text-sm text-slate-500">לא נמצאו ממצאים שתואמים לסינון.</CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {section === "pages" && (
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>תצוגת עמודים</CardTitle>
                  <CardDescription>סקירה מהירה של העמודים שנסרקו והממצאים בכל עמוד.</CardDescription>
                </CardHeader>
              </Card>
              <div className="grid gap-3 md:grid-cols-2">
                {pageData.map((page) => (
                  <PageCard
                    key={page.url}
                    page={page}
                    primaryCta={report.intentAnalysis?.primaryCTA}
                  />
                ))}
              </div>
            </div>
          )}

          {section === "intent" && <IntentPanel report={report} />}

          {section === "fixes" && (
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>תיקוני AI</CardTitle>
                  <CardDescription>בעיה, ההשפעה שלה, והצעת תיקון.</CardDescription>
                </CardHeader>
              </Card>
              {(report.redesignSuggestions ?? []).map((item, index) => (
                <AIFixCard
                  key={`${item.problem}-${index}`}
                  problem={item.problem}
                  suggestion={item.suggestion}
                  priority={item.priority}
                />
              ))}
              {(report.redesignSuggestions ?? []).length === 0 && (
                <Card>
                  <CardContent className="p-4 text-sm text-slate-500">
                    אין כרגע הצעות תיקון מבוססות AI לדוח זה.
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
