import type { AuditReport } from "@/lib/audit/types";

type IntentIssue = {
  type:
    | "unclear primary action"
    | "too many CTAs"
    | "missing signup path"
    | "weak value proposition"
    | "competing CTAs";
  severity: "high" | "medium" | "low";
};

type PageIntentSignals = {
  url: string;
  pageTitle: string;
  heroText: string;
  headings: string[];
  navLabels: string[];
  ctaLabels: string[];
  primaryCtaAboveFold: boolean;
  duplicatePrimaryCTA: boolean;
  ctaCount: number;
};

export type IntentAnalysis = {
  primaryIntent:
    | "ecommerce purchase"
    | "lead generation"
    | "SaaS signup"
    | "content consumption"
    | "product marketing"
    | "information / documentation";
  confidence: number;
  primaryCTA: string;
  intentClarityScore: number;
  issues: IntentIssue[];
};

type IntentInput = {
  pages: PageIntentSignals[];
  report: AuditReport;
};

type IntentCandidate = IntentAnalysis["primaryIntent"];

const INTENT_KEYWORDS: Record<IntentCandidate, string[]> = {
  "ecommerce purchase": ["buy", "shop", "cart", "checkout", "price", "order", "קנה", "עגלה"],
  "lead generation": ["contact", "talk", "book", "call", "quote", "demo", "צור קשר", "השאר פרטים"],
  "SaaS signup": ["sign up", "start free", "free trial", "register", "login", "account", "הרשמה", "נסיון חינם"],
  "content consumption": ["blog", "article", "read", "news", "insights", "מדריך", "מאמר"],
  "product marketing": ["features", "product", "benefits", "solution", "platform", "יכולות", "מוצר"],
  "information / documentation": ["docs", "documentation", "api", "guides", "support", "knowledge", "תיעוד"]
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreIntent(pages: PageIntentSignals[]): Map<IntentCandidate, number> {
  const scores = new Map<IntentCandidate, number>();
  (Object.keys(INTENT_KEYWORDS) as IntentCandidate[]).forEach((intent) => scores.set(intent, 0));

  for (const page of pages) {
    const corpus = [page.pageTitle, page.heroText, ...page.headings, ...page.navLabels, ...page.ctaLabels]
      .join(" ")
      .toLowerCase();
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [IntentCandidate, string[]][]) {
      const hitCount = keywords.reduce((sum, keyword) => sum + (corpus.includes(keyword.toLowerCase()) ? 1 : 0), 0);
      scores.set(intent, (scores.get(intent) ?? 0) + hitCount);
    }
  }

  return scores;
}

function detectPrimaryCta(pages: PageIntentSignals[]): string {
  const counts = new Map<string, number>();
  for (const label of pages.flatMap((page) => page.ctaLabels)) {
    const normalized = label.toLowerCase();
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  const best = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (!best) return "Unknown";
  return best[0];
}

export function detectUxIntent(input: IntentInput): IntentAnalysis {
  const intentScores = scoreIntent(input.pages);
  const ranked = Array.from(intentScores.entries()).sort((a, b) => b[1] - a[1]);
  const [topIntent, topScore] = ranked[0] ?? ["product marketing", 0];
  const secondScore = ranked[1]?.[1] ?? 0;
  const confidence = clamp(topScore <= 0 ? 0.35 : 0.5 + (topScore - secondScore) / Math.max(8, topScore + secondScore), 0.35, 0.97);

  const primaryCTA = detectPrimaryCta(input.pages);
  const issues: IntentIssue[] = [];

  const hasAboveFoldCta = input.pages.some((page) => page.primaryCtaAboveFold);
  const hasCompetingCtas = input.pages.some((page) => page.duplicatePrimaryCTA);
  const avgCtaCount =
    input.pages.length > 0 ? input.pages.reduce((sum, page) => sum + page.ctaCount, 0) / input.pages.length : 0;
  const hasWeakValueProp = input.report.findings.some(
    (finding) =>
      finding.category === "content" &&
      finding.severity !== "good" &&
      /value|headline|message|בהירות|תוכן/i.test(`${finding.title} ${finding.detail}`)
  );

  if (!hasAboveFoldCta) {
    issues.push({ type: "unclear primary action", severity: "high" });
  }
  if (hasCompetingCtas) {
    issues.push({ type: "competing CTAs", severity: "medium" });
  }
  if (avgCtaCount > 5) {
    issues.push({ type: "too many CTAs", severity: "medium" });
  }
  if (["SaaS signup", "lead generation"].includes(topIntent) && primaryCTA === "Unknown") {
    issues.push({ type: "missing signup path", severity: "high" });
  }
  if (hasWeakValueProp) {
    issues.push({ type: "weak value proposition", severity: "medium" });
  }

  const penalty = issues.reduce((sum, issue) => {
    if (issue.severity === "high") return sum + 20;
    if (issue.severity === "medium") return sum + 10;
    return sum + 4;
  }, 0);
  const clarityFromScore = input.report.uxScore?.categories.CTA ?? input.report.score;
  const intentClarityScore = clamp(Math.round(clarityFromScore - penalty * 0.6), 0, 100);

  return {
    primaryIntent: topIntent,
    confidence: Number(confidence.toFixed(2)),
    primaryCTA,
    intentClarityScore,
    issues
  };
}
