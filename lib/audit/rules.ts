import type {
  Annotation,
  AuditCategory,
  AuditCheckResult,
  AuditChecksSummary,
  AuditFinding,
  AuditReport,
  AuditSeverity
} from "@/lib/audit/types";
import type { AuditSignals } from "@/lib/audit/signals";

type CheckInput = {
  category: AuditCategory;
  label: string;
  detail: string;
  failWhen: boolean;
  severityWhenFail: AuditSeverity;
};

function toCheckStatus(severity: AuditSeverity): "warning" | "critical" {
  return severity === "critical" ? "critical" : "warning";
}

function pushCheck(
  checks: AuditCheckResult[],
  findings: AuditFinding[],
  input: CheckInput,
  idx: number
) {
  const status = input.failWhen ? toCheckStatus(input.severityWhenFail) : "pass";
  const id = `check-${idx}`;
  checks.push({
    id,
    category: input.category,
    label: input.label,
    detail: input.detail,
    status
  });

  if (input.failWhen) {
    findings.push({
      id: `finding-${idx}`,
      category: input.category,
      title: input.label,
      detail: input.detail,
      severity: input.severityWhenFail
    });
  }
}

function computeSummary(checks: AuditCheckResult[]): AuditChecksSummary {
  const critical = checks.filter((c) => c.status === "critical").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const passed = checks.filter((c) => c.status === "pass").length;
  return { total: checks.length, passed, warnings, critical };
}

function computeScore(summary: AuditChecksSummary): number {
  const penalties = summary.critical * 7 + summary.warnings * 3;
  const raw = 100 - penalties;
  return Math.max(0, Math.min(100, raw));
}

function annotationsFromFindings(findings: AuditFinding[]): Annotation[] {
  return findings.slice(0, 10).map((finding, idx) => ({
    id: `ann-${idx}`,
    label: finding.title,
    severity: finding.severity,
    x: 14 + ((idx * 11) % 72),
    y: 18 + ((idx * 9) % 64)
  }));
}

export function evaluateSignals(url: string, signals: AuditSignals): AuditReport {
  const checks: AuditCheckResult[] = [];
  const findings: AuditFinding[] = [];
  let idx = 1;

  const checksToRun: CheckInput[] = [
    {
      category: "accessibility",
      label: "קיים קישור דילוג לתוכן (Skip Link)",
      detail: "לא נמצא Skip Link, מה שמקשה על ניווט מקלדת מהיר לקוראי מסך.",
      failWhen: !signals.hasSkipLink,
      severityWhenFail: "warning"
    },
    {
      category: "contrast",
      label: "ניגודיות טקסט עומדת ברף מומלץ",
      detail: `זוהו ${signals.contrastRiskElements} אזורי ניגודיות בסיכון.`,
      failWhen: signals.contrastRiskElements > 0,
      severityWhenFail: signals.contrastRiskElements > 3 ? "critical" : "warning"
    },
    {
      category: "accessibility",
      label: "לכל התמונות יש alt מתאים",
      detail: `נמצאו ${signals.imageMissingAltCount} תמונות ללא alt.`,
      failWhen: signals.imageMissingAltCount > 0,
      severityWhenFail: signals.imageMissingAltCount > 3 ? "critical" : "warning"
    },
    {
      category: "accessibility",
      label: "כפתורי אייקון כוללים תווית נגישות",
      detail: `נמצאו ${signals.ariaLabelMissingOnIconButtons} כפתורי אייקון ללא aria-label.`,
      failWhen: signals.ariaLabelMissingOnIconButtons > 0,
      severityWhenFail: "warning"
    },
    {
      category: "accessibility",
      label: "רכיבים אינטראקטיביים ניתנים לפוקוס ברור",
      detail: `זוהו ${signals.interactiveWithoutFocusStyle} רכיבים עם פוקוס חלש או חסר.`,
      failWhen: signals.interactiveWithoutFocusStyle > 0,
      severityWhenFail: "warning"
    },
    {
      category: "typography",
      label: "גודל פונט מינימלי קריא במובייל",
      detail: `הגודל המינימלי שזוהה הוא ${signals.minFontSizePx.toFixed(1)}px.`,
      failWhen: signals.minFontSizePx < 14,
      severityWhenFail: signals.minFontSizePx < 12 ? "critical" : "warning"
    },
    {
      category: "typography",
      label: "צפיפות טקסט מעל הקיפול מאוזנת",
      detail: "עומס טקסט גבוה מדי בתחילת העמוד מגדיל עומס קוגניטיבי.",
      failWhen: signals.firstViewportTextDensity > 0.4,
      severityWhenFail: "warning"
    },
    {
      category: "visualHierarchy",
      label: "CTA ראשי מופיע מעל קו הקיפול",
      detail: "כפתור פעולה ראשי אינו נראה מספיק מוקדם במסך ראשון.",
      failWhen: !signals.primaryCtaAboveFold,
      severityWhenFail: "critical"
    },
    {
      category: "conversion",
      label: "אין כפילות CTA ראשי עם מסר מתחרה",
      detail: "נמצאה כפילות של CTA ראשי שעלולה לבלבל את המשתמש.",
      failWhen: signals.duplicatePrimaryCTA,
      severityWhenFail: "warning"
    },
    {
      category: "navigation",
      label: "תפריט ניווט ראשי ברור ולא עמוס",
      detail: `מספר פריטי ניווט ראשיים: ${signals.navItemCount}.`,
      failWhen: signals.navItemCount < 3 || signals.navItemCount > 9,
      severityWhenFail: "warning"
    },
    {
      category: "content",
      label: "קיים H1 יחיד וממוקד",
      detail: `נמצאו ${signals.h1Count} תגיות H1.`,
      failWhen: signals.h1Count !== 1,
      severityWhenFail: "warning"
    },
    {
      category: "content",
      label: "יש מספיק כותרות משנה לסריקה מהירה",
      detail: `נמצאו ${signals.headingCount} כותרות בעמוד.`,
      failWhen: signals.headingCount < 3,
      severityWhenFail: "warning"
    },
    {
      category: "content",
      label: "אורך title תקין לתוצאה ברורה",
      detail: `אורך כותרת עמוד הוא ${signals.pageTitleLength} תווים.`,
      failWhen: signals.pageTitleLength < 25 || signals.pageTitleLength > 65,
      severityWhenFail: "warning"
    },
    {
      category: "content",
      label: "meta description באורך שימושי",
      detail: `אורך meta description הוא ${signals.metaDescriptionLength} תווים.`,
      failWhen: signals.metaDescriptionLength < 80 || signals.metaDescriptionLength > 180,
      severityWhenFail: "warning"
    },
    {
      category: "forms",
      label: "לשדות בטופס יש תוויות ברורות",
      detail: `מתוך ${signals.inputCount} שדות, ${signals.labelledInputs} כוללים label מזוהה.`,
      failWhen: signals.inputCount > 0 && signals.labelledInputs < signals.inputCount,
      severityWhenFail: signals.labelledInputs === 0 ? "critical" : "warning"
    },
    {
      category: "forms",
      label: "לא מסתמכים רק על placeholder כהנחיה",
      detail: `נמצאו ${signals.placeholderOnlyInputs} שדות עם placeholder בלבד.`,
      failWhen: signals.placeholderOnlyInputs > 0,
      severityWhenFail: "warning"
    },
    {
      category: "forms",
      label: "קיים טיפול ברור בשדות העלאת קובץ",
      detail: `זוהו ${signals.uploadInputCount} רכיבי העלאת קובץ הדורשים תיווך משתמש.`,
      failWhen: signals.uploadInputCount > 0,
      severityWhenFail: "warning"
    },
    {
      category: "feedback",
      label: "קיים מצב טעינה ברור בפעולות",
      detail: "לא זוהתה אינדיקציית טעינה עקבית.",
      failWhen: !signals.hasLoadingIndicator,
      severityWhenFail: "critical"
    },
    {
      category: "feedback",
      label: "קיימות הודעות שגיאה ברורות",
      detail: "לא זוהו תבניות שגיאה מספקות לתרחישי כשל.",
      failWhen: !signals.hasErrorStatePattern,
      severityWhenFail: "warning"
    },
    {
      category: "feedback",
      label: "קיימים מצבי הצלחה לאחר פעולות",
      detail: "לא זוהתה אינדיקציה להשלמת פעולה בהצלחה.",
      failWhen: !signals.hasSuccessStatePattern,
      severityWhenFail: "warning"
    },
    {
      category: "errorPrevention",
      label: "יש מצבים ריקים עם הכוונה לפעולה",
      detail: "לא זוהו מצבים ריקים או מסרים מסייעים למקרה שאין נתונים.",
      failWhen: signals.emptyStateCount === 0,
      severityWhenFail: "warning"
    },
    {
      category: "mobileTouch",
      label: "גודל אזורי לחיצה מתאים למובייל",
      detail: `זוהו ${signals.tapTargetSmallCount} יעדי לחיצה קטנים מהמומלץ.`,
      failWhen: signals.tapTargetSmallCount > 0,
      severityWhenFail: signals.tapTargetSmallCount > 4 ? "critical" : "warning"
    },
    {
      category: "responsive",
      label: "אין גלישה אופקית במובייל",
      detail: `זוהו ${signals.mobileOverflowingElements} אלמנטים שיוצרים overflow.`,
      failWhen: signals.mobileOverflowingElements > 0,
      severityWhenFail: "critical"
    },
    {
      category: "responsive",
      label: "פער מבנה דסקטופ/מובייל נשלט",
      detail: `פער אלמנטים משוער בין דסקטופ למובייל: ${signals.desktopToMobileElementDelta}.`,
      failWhen: signals.desktopToMobileElementDelta > 25,
      severityWhenFail: "warning"
    },
    {
      category: "consistency",
      label: "סגנון כפתורים עקבי לאורך הדף",
      detail: "נמצאה שונות לא עקבית בין רכיבי CTA וכפתורים.",
      failWhen: signals.inconsistentButtonStyles,
      severityWhenFail: "warning"
    },
    {
      category: "performance",
      label: "LCP משוער ברמה טובה",
      detail: `LCP משוער: ${signals.estimatedLcpMs}ms.`,
      failWhen: signals.estimatedLcpMs > 2500,
      severityWhenFail: signals.estimatedLcpMs > 4000 ? "critical" : "warning"
    },
    {
      category: "performance",
      label: "TTI משוער מאפשר אינטראקציה מהירה",
      detail: `TTI משוער: ${signals.estimatedTtiMs}ms.`,
      failWhen: signals.estimatedTtiMs > 3000,
      severityWhenFail: signals.estimatedTtiMs > 5000 ? "critical" : "warning"
    },
    {
      category: "performance",
      label: "יציבות פריסה (CLS) תקינה",
      detail: `CLS משוער: ${signals.estimatedCls.toFixed(2)}.`,
      failWhen: signals.estimatedCls > 0.1,
      severityWhenFail: signals.estimatedCls > 0.25 ? "critical" : "warning"
    },
    {
      category: "performance",
      label: "אזור עליון לא כבד מדי",
      detail: "נראה עומס רכיבים/מדיה גבוה מעל הקיפול.",
      failWhen: signals.heavyAboveFold,
      severityWhenFail: "warning"
    },
    {
      category: "trust",
      label: "קישור מדיניות גלוי",
      detail: "לא נמצא קישור מדיניות/פרטיות במקום גלוי.",
      failWhen: !signals.policyLinkVisible,
      severityWhenFail: "warning"
    },
    {
      category: "trust",
      label: "פרטי יצירת קשר ברורים",
      detail: "לא זוהו פרטי קשר גלויים להגברת אמון.",
      failWhen: !signals.contactInfoVisible,
      severityWhenFail: "warning"
    },
    {
      category: "trust",
      label: "סימני אמון/הוכחה חברתית",
      detail: `כמות סימני אמון שזוהו: ${signals.socialProofCount}.`,
      failWhen: signals.socialProofCount < 2,
      severityWhenFail: "warning"
    }
  ];

  checksToRun.forEach((check) => {
    pushCheck(checks, findings, check, idx);
    idx += 1;
  });

  const summary = computeSummary(checks);
  const score = computeScore(summary);

  return {
    targetUrl: url,
    generatedAt: new Date().toISOString(),
    score,
    findings,
    annotations: annotationsFromFindings(findings),
    requiresFileUpload: signals.uploadInputCount > 0,
    checks,
    checksSummary: summary
  };
}
