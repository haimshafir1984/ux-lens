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

  const pageData = report.pageReports ?? [{ url: report.targetUrl, score: report.score, findings: report.findings }];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">UX Audit Dashboard</CardTitle>
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
                  <CardTitle>Issues Explorer</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-3">
                  <input
                    value={issueSearch}
                    onChange={(event) => setIssueSearch(event.target.value)}
                    placeholder="Search issues..."
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  />
                  <select
                    value={severityFilter}
                    onChange={(event) => setSeverityFilter(event.target.value as "all" | IssueSeverityLevel)}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    <option value="all">All severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={(event) =>
                      setCategoryFilter(event.target.value as "all" | AuditFinding["category"])
                    }
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    <option value="all">All categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
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
                    <CardContent className="p-4 text-sm text-slate-500">No issues match your filters.</CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {section === "pages" && (
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>Pages View</CardTitle>
                  <CardDescription>Explore scanned pages and issues per page.</CardDescription>
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
                  <CardTitle>AI Fixes</CardTitle>
                  <CardDescription>Problem, why it matters, and suggested fix.</CardDescription>
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
                    No AI fix suggestions available for this report.
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
