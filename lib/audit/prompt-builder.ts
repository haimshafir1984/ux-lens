import { auditHeuristics } from "@/lib/audit/heuristics";
import type { AuditSignals } from "@/lib/audit/signals";

export function buildVisionPrompt(url: string, domSummary: string, signals: AuditSignals) {
  const heuristicsText = auditHeuristics
    .map((h) => `- ${h.title}: ${h.objective}`)
    .join("\n");

  return [
    `You are auditing the public website: ${url}.`,
    "Review screenshots and infer usability quality with strict UX standards.",
    "Return JSON only with: score (0-100), findings[], annotations[], requiresFileUpload, checksSummary.",
    "Each finding should include category, title, detail, severity (critical|warning|good).",
    "Use categories: contrast, accessibility, visualHierarchy, responsive, typography, forms, navigation, consistency, feedback, performance, trust, conversion, content, errorPrevention, mobileTouch.",
    "Heuristics:",
    heuristicsText,
    "DOM summary:",
    domSummary,
    "Deterministic signals JSON:",
    JSON.stringify(signals)
  ].join("\n");
}
