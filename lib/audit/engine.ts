import { analyzeScreenshotsWithVision } from "@/lib/audit/analyze";
import { captureWebsiteWithOptions } from "@/lib/audit/capture";
import type { ScanProgress } from "@/lib/audit/progress-store";
import type { AuditCheckResult, AuditFinding, AuditReport } from "@/lib/audit/types";
import { runWithConcurrency } from "@/lib/concurrency";
import { crawlWebsite } from "@/lib/crawler";
import { closeSharedBrowser } from "@/lib/playwright-browser";
import { generateRedesignSuggestions } from "@/lib/redesign-generator";
import { detectUxIntent } from "@/lib/ux-intent-detection";
import { detectUxPatterns } from "@/lib/ux-pattern-intelligence";

type RunAuditOptions = {
  maxPages?: number;
  timeoutMs?: number;
  onProgress?: (progress: ScanProgress) => void;
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
    pages: pageReports.map((page) => ({
      url: page.targetUrl,
      score: page.score,
      issues: page.findings
    })),
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
  const emitProgress = (progress: ScanProgress) => {
    options.onProgress?.(progress);
  };

  try {
    emitProgress({
      stage: "crawling",
      message: "סורק את דף הבית",
      progress: 10,
      currentPage: url
    });

    const pages = await crawlWebsite(url, { maxPages: options.maxPages ?? 10, timeoutMs: options.timeoutMs ?? 15000 });
    emitProgress({
      stage: "crawling",
      message: `נמצאו ${pages.length} עמודים פנימיים`,
      progress: 18,
      discoveredPages: pages
    });

    let startedCaptureCount = 0;
    const capturesRaw = await runWithConcurrency(pages, 3, async (pageUrl) => {
      const startedIndex = startedCaptureCount + 1;
      startedCaptureCount += 1;
      emitProgress({
        stage: "capturing",
        message: `מצלם עמוד ${startedIndex} מתוך ${pages.length}`,
        progress: 20 + Math.round((startedIndex / Math.max(1, pages.length)) * 25),
        currentPage: pageUrl,
        currentPageIndex: startedIndex,
        totalPages: pages.length,
        discoveredPages: pages
      });

      try {
        return await captureWebsiteWithOptions(pageUrl, { timeoutMs: options.timeoutMs ?? 15000 });
      } catch {
        // Fail-safe: skip a failed page and continue scanning.
        return null;
      }
    });
    const captures = capturesRaw.filter((value): value is NonNullable<typeof value> => Boolean(value));

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

    let startedAnalyzeCount = 0;
    const analyzedPairsRaw = await runWithConcurrency(captures, 3, async (captured) => {
      const analyzeIndex = startedAnalyzeCount + 1;
      startedAnalyzeCount += 1;
      emitProgress({
        stage: "analyzing",
        message: `מנתח עמוד ${analyzeIndex} מתוך ${captures.length}`,
        progress: 50 + Math.round((analyzeIndex / Math.max(1, captures.length)) * 30),
        currentPage: captured.pageUrl,
        currentPageIndex: analyzeIndex,
        totalPages: captures.length,
        discoveredPages: pages
      });

      try {
        const report = await analyzeScreenshotsWithVision({
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
        });
        return { captured, report };
      } catch {
        // Fail-safe: keep audit running even if one page analysis fails.
        return null;
      }
    });
    const analyzedPairs = analyzedPairsRaw.filter(
      (item): item is NonNullable<typeof item> => Boolean(item)
    );
    const pageReports = analyzedPairs.map(({ captured, report }) => ({
      ...report,
      targetUrl: captured.pageUrl
    }));
    if (pageReports.length === 0) {
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
          checksSummary: { total: 0, passed: 0, warnings: 0, critical: 0 },
          pages: []
        }
      };
    }

    const signalsByUrl = new Map(
      analyzedPairs.map(({ captured }) => [
        captured.pageUrl,
        {
          ctaCount: captured.signals.ctaCount,
          navItemCount: captured.signals.navItemCount,
          contrastRiskElements: captured.signals.contrastRiskElements,
          headingCount: captured.signals.headingCount
        }
      ])
    );

    const report = aggregateReports(url, pageReports);
    emitProgress({
      stage: "generating_report",
      message: "מריץ ניתוח UX ומייצר דוח",
      progress: 92,
      discoveredPages: pages
    });
    report.insights = detectUxPatterns({ pageReports });
    report.intentAnalysis = detectUxIntent({
      report,
      pages: analyzedPairs.slice(0, 5).map(({ captured }) => ({
        url: captured.pageUrl,
        pageTitle: captured.intentData.pageTitle,
        heroText: captured.intentData.heroText,
        headings: captured.intentData.headings,
        navLabels: captured.intentData.navLabels,
        ctaLabels: captured.intentData.ctaLabels,
        primaryCtaAboveFold: captured.signals.primaryCtaAboveFold,
        duplicatePrimaryCTA: captured.signals.duplicatePrimaryCTA,
        ctaCount: captured.signals.ctaCount
      }))
    });
    report.redesignSuggestions = await generateRedesignSuggestions(report.findings);
    report.pageReports = analyzedPairs.map(({ captured, report: pageReport }) => {
      return {
        url: captured.pageUrl,
        score: pageReport.score,
        findings: pageReport.findings.slice(0, 8),
        domFingerprint: captured.domFingerprint
      };
    });
    report.pages = analyzedPairs.map(({ captured, report: pageReport }) => ({
      url: captured.pageUrl,
      score: pageReport.score,
      issues: pageReport.findings
    }));

    const blockers = findCriticalBlockers(pageReports, signalsByUrl);
    if (blockers.length > 0) {
      report.criticalUxBlockersDetected = true;
      report.criticalUxBlockers = blockers;
      report.criticalUxBlockersMessage = "Critical UX blockers detected";
    }

    const requiresUpload = report.requiresFileUpload;
    emitProgress({
      stage: "generating_report",
      message: "מסיים יצירת דוח",
      progress: 100,
      discoveredPages: pages
    });
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
