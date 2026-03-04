import { analyzeScreenshotsWithVision } from "@/lib/audit/analyze";
import { captureWebsite } from "@/lib/audit/capture";
import type { AuditCheckResult, AuditFinding, AuditReport } from "@/lib/audit/types";
import { runWithConcurrency } from "@/lib/concurrency";
import { crawlWebsite } from "@/lib/crawler";
import { closeSharedBrowser } from "@/lib/playwright-browser";
import { generateRedesignSuggestions } from "@/lib/redesign-generator";
import { detectUxPatterns } from "@/lib/ux-pattern-intelligence";

type RunAuditOptions = {
  maxPages?: number;
};

function dedupeFindings(findings: AuditFinding[]): AuditFinding[] {
  const byKey = new Map<string, AuditFinding>();
  for (const finding of findings) {
    const key = `${finding.category}:${finding.title}`;
    if (!byKey.has(key)) {
      byKey.set(key, finding);
    }
  }
  return Array.from(byKey.values());
}

function summarizeChecks(checks: AuditCheckResult[]) {
  const total = checks.length;
  const passed = checks.filter((item) => item.status === "pass").length;
  const warnings = checks.filter((item) => item.status === "warning").length;
  const critical = checks.filter((item) => item.status === "critical").length;
  return { total, passed, warnings, critical };
}

function aggregateReports(targetUrl: string, pageReports: AuditReport[]): AuditReport {
  const allFindings = dedupeFindings(pageReports.flatMap((report) => report.findings));
  const allChecks = pageReports.flatMap((report, pageIndex) =>
    report.checks.map((check, checkIndex) => ({ ...check, id: `p${pageIndex + 1}-c${checkIndex + 1}` }))
  );
  const checksSummary = summarizeChecks(allChecks);
  const requiresFileUpload = pageReports.some((page) => page.requiresFileUpload);
  const averageScore =
    pageReports.length > 0
      ? Math.round(pageReports.reduce((sum, report) => sum + report.score, 0) / pageReports.length)
      : 0;

  const categories = pageReports
    .map((report) => report.uxScore?.categories)
    .filter((value): value is NonNullable<AuditReport["uxScore"]>["categories"] => Boolean(value));
  const averagedCategories = categories.length
    ? {
        navigation: Math.round(categories.reduce((sum, item) => sum + item.navigation, 0) / categories.length),
        hierarchy: Math.round(categories.reduce((sum, item) => sum + item.hierarchy, 0) / categories.length),
        CTA: Math.round(categories.reduce((sum, item) => sum + item.CTA, 0) / categories.length),
        typography: Math.round(categories.reduce((sum, item) => sum + item.typography, 0) / categories.length),
        spacing: Math.round(categories.reduce((sum, item) => sum + item.spacing, 0) / categories.length),
        contrast: Math.round(categories.reduce((sum, item) => sum + item.contrast, 0) / categories.length),
        mobile: Math.round(categories.reduce((sum, item) => sum + item.mobile, 0) / categories.length),
        performance: Math.round(categories.reduce((sum, item) => sum + (item.performance ?? 70), 0) / categories.length)
      }
    : undefined;

  return {
    targetUrl,
    generatedAt: new Date().toISOString(),
    score: averageScore,
    findings: allFindings,
    annotations: pageReports.flatMap((page) => page.annotations).slice(0, 12),
    requiresFileUpload,
    checks: allChecks,
    checksSummary,
    uxScore: averagedCategories
      ? {
          overallScore: averageScore,
          categories: averagedCategories
        }
      : undefined,
    topCriticalProblems: allFindings.filter((item) => item.severity === "critical").slice(0, 5),
    pageReports: pageReports.map((page) => ({
      url: page.targetUrl,
      score: page.score,
      findings: page.findings.slice(0, 8)
    }))
  };
}

function findCriticalBlockers(
  pageReports: AuditReport[],
  signalSource: Map<string, { ctaCount: number; navItemCount: number; contrastRiskElements: number; headingCount: number }>
): string[] {
  const blockers = new Set<string>();

  for (const page of pageReports) {
    const hasMissingCtaFinding = page.findings.some(
      (finding) =>
        finding.severity === "critical" &&
        (finding.category === "conversion" || finding.category === "visualHierarchy") &&
        /cta|action/i.test(finding.title)
    );
    if (hasMissingCtaFinding) blockers.add("missing CTA");

    const hasBrokenNavigation = page.findings.some(
      (finding) => finding.category === "navigation" && finding.severity === "critical"
    );
    if (hasBrokenNavigation) blockers.add("broken navigation");

    const hasVeryLowContrast = page.findings.some(
      (finding) => finding.category === "contrast" && finding.severity === "critical"
    );
    if (hasVeryLowContrast) blockers.add("very low contrast");

    const signals = signalSource.get(page.targetUrl);
    if (signals) {
      if (signals.ctaCount === 0) blockers.add("missing CTA");
      if (signals.navItemCount <= 1) blockers.add("broken navigation");
      if (signals.contrastRiskElements >= 6) blockers.add("very low contrast");
      if (signals.headingCount === 0) blockers.add("empty hero section");
    }
  }

  return Array.from(blockers);
}

export async function runAudit(url: string, options: RunAuditOptions = {}) {
  try {
    const pages = await crawlWebsite(url, { maxPages: options.maxPages ?? 8 });
    const captures = await runWithConcurrency(pages, 3, async (pageUrl) => captureWebsite(pageUrl));
    if (captures.length === 0) {
      return {
        step: "completed" as const,
        report: {
          targetUrl: url,
          generatedAt: new Date().toISOString(),
          score: 0,
          findings: [],
          annotations: [],
          requiresFileUpload: false,
          checks: [],
          checksSummary: { total: 0, passed: 0, warnings: 0, critical: 0 }
        }
      };
    }

    const firstByFingerprint = new Map<string, (typeof captures)[number]>();
    for (const capture of captures) {
      if (!firstByFingerprint.has(capture.domFingerprint)) {
        firstByFingerprint.set(capture.domFingerprint, capture);
      }
    }

    const uniqueCaptures = Array.from(firstByFingerprint.values());
    const analyzedUnique = await runWithConcurrency(uniqueCaptures, 3, async (captured) =>
      analyzeScreenshotsWithVision({
        url: captured.pageUrl,
        desktopPath: captured.desktopPath,
        mobilePath: captured.mobilePath,
        fullPagePath: captured.fullPagePath,
        domSummary: captured.domSummary,
        signals: captured.signals,
        screenshots: {
          desktop: captured.screenshots.desktop,
          mobile: captured.screenshots.mobile,
          fullPage: captured.screenshots.fullPage
        }
      })
    );

    const reportByFingerprint = new Map<string, AuditReport>();
    uniqueCaptures.forEach((capture, index) => {
      const analyzed = analyzedUnique[index];
      if (analyzed) {
        reportByFingerprint.set(capture.domFingerprint, analyzed);
      }
    });

    const signalsByUrl = new Map(
      captures.map((capture) => [
        capture.pageUrl,
        {
          ctaCount: capture.signals.ctaCount,
          navItemCount: capture.signals.navItemCount,
          contrastRiskElements: capture.signals.contrastRiskElements,
          headingCount: capture.signals.headingCount
        }
      ])
    );

    const firstUrlByFingerprint = new Map<string, string>();
    const pageReports = captures.map((capture) => {
      const templateReport = reportByFingerprint.get(capture.domFingerprint);
      const canonicalUrl = firstUrlByFingerprint.get(capture.domFingerprint) ?? capture.pageUrl;
      if (!firstUrlByFingerprint.has(capture.domFingerprint)) {
        firstUrlByFingerprint.set(capture.domFingerprint, capture.pageUrl);
      }

      const report = templateReport ?? analyzedUnique[0];
      if (!report) {
        throw new Error("No analyzed report available");
      }
      return {
        ...report,
        targetUrl: capture.pageUrl,
        pageReports: [
          {
            url: capture.pageUrl,
            score: report.score,
            findings: report.findings.slice(0, 8),
            domFingerprint: capture.domFingerprint,
            reusedFrom: canonicalUrl === capture.pageUrl ? undefined : canonicalUrl
          }
        ]
      };
    });

    const report = aggregateReports(url, pageReports);
    report.insights = detectUxPatterns({ pageReports });
    report.redesignSuggestions = await generateRedesignSuggestions(report.findings);
    report.pageReports = captures.map((capture) => {
      const page = pageReports.find((item) => item.targetUrl === capture.pageUrl);
      const firstUrl = firstUrlByFingerprint.get(capture.domFingerprint) ?? capture.pageUrl;
      return {
        url: capture.pageUrl,
        score: page?.score ?? report.score,
        findings: (page?.findings ?? report.findings).slice(0, 8),
        domFingerprint: capture.domFingerprint,
        reusedFrom: firstUrl === capture.pageUrl ? undefined : firstUrl
      };
    });

    const blockers = findCriticalBlockers(pageReports, signalsByUrl);
    if (blockers.length > 0) {
      report.criticalUxBlockersDetected = true;
      report.criticalUxBlockers = blockers;
      report.criticalUxBlockersMessage = "Critical UX blockers detected";
    }

    const requiresUpload = report.requiresFileUpload;
    if (requiresUpload) {
      return {
        step: "interactionRequired" as const,
        promptMessage:
          "הגעתי לשלב שדורש העלאת קובץ כדי להמשיך את הביקורת. נא להעלות כאן קובץ לדוגמה.",
        report
      };
    }

    return { step: "completed" as const, report };
  } finally {
    await closeSharedBrowser();
  }
}
