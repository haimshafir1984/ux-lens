import type { AuditSignals } from "@/lib/audit/signals";

export type VisionIssueType =
  | "CTA clarity"
  | "Visual hierarchy"
  | "Spacing"
  | "Typography"
  | "Contrast"
  | "Layout clutter"
  | "Navigation complexity"
  | "Mobile usability";

export type VisionIssue = {
  type: VisionIssueType;
  severity: "high" | "medium" | "low";
  description: string;
  recommendation: string;
};

type VisionUiInput = {
  screenshot: Buffer;
  domSummary: string;
  signals: AuditSignals;
};

type VisionUiResult = {
  issues: VisionIssue[];
};

function parseJsonSafely(content: string): any | null {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function tryExtractJsonObject(content: string): any | null {
  const direct = parseJsonSafely(content);
  if (direct) return direct;
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return parseJsonSafely(content.slice(start, end + 1));
  }
  return null;
}

function normalizeVisionIssues(payload: any): VisionIssue[] {
  if (!payload || !Array.isArray(payload.issues)) return [];
  return payload.issues
    .filter((item: any) => item && typeof item === "object")
    .map((item: any) => ({
      type: item.type ?? "Visual hierarchy",
      severity: item.severity === "high" || item.severity === "low" ? item.severity : "medium",
      description: String(item.description ?? "זוהתה בעיית UX ויזואלית כללית."),
      recommendation: String(item.recommendation ?? "מומלץ לבצע חידוד היררכיה והתאמה למובייל.")
    }));
}

function fallbackIssues(signals: AuditSignals): VisionIssue[] {
  const issues: VisionIssue[] = [];

  if (!signals.primaryCtaAboveFold || signals.ctaCount === 0) {
    issues.push({
      type: "CTA clarity",
      severity: "high",
      description: "הקריאה לפעולה הראשית אינה בולטת מספיק במסך הראשון.",
      recommendation: "להבליט CTA ראשי מעל הקיפול עם גודל, צבע וקונטרסט חזקים יותר."
    });
  }
  if (signals.contrastRiskElements > 0) {
    issues.push({
      type: "Contrast",
      severity: signals.contrastRiskElements > 3 ? "high" : "medium",
      description: "זוהו אזורי טקסט עם ניגודיות נמוכה יחסית לרקע.",
      recommendation: "להעלות יחס ניגודיות טקסט/רקע לפי WCAG AA."
    });
  }
  if (signals.navItemCount > 9 || signals.navItemCount < 3) {
    issues.push({
      type: "Navigation complexity",
      severity: "medium",
      description: "מבנה הניווט עשוי להיות עמוס או דל מדי להבנת המסלול הראשי.",
      recommendation: "למקד ניווט ראשי ל-4-7 פריטים ולחדד היררכיה בין primary/secondary."
    });
  }
  if (signals.mobileOverflowingElements > 0 || signals.tapTargetSmallCount > 0) {
    issues.push({
      type: "Mobile usability",
      severity: "high",
      description: "זוהו בעיות שימושיות במובייל כמו overflow או יעדי מגע קטנים.",
      recommendation: "לתקן גלישה אופקית, להגדיל tap targets ולבדוק פריסות במסך קטן."
    });
  }

  return issues.slice(0, 6);
}

async function callOpenAiVision(input: VisionUiInput): Promise<VisionUiResult | undefined> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || input.screenshot.byteLength === 0) return undefined;

  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
  const prompt = [
    "Analyze this website screenshot and return JSON only.",
    "Return schema: {\"issues\":[{\"type\":\"CTA clarity|Visual hierarchy|Spacing|Typography|Contrast|Layout clutter|Navigation complexity|Mobile usability\",\"severity\":\"high|medium|low\",\"description\":\"...\",\"recommendation\":\"...\"}]}",
    "Focus on visual hierarchy, CTA clarity, spacing, typography, contrast, layout clutter, navigation complexity and mobile usability.",
    `DOM summary: ${input.domSummary}`,
    `Signals: ${JSON.stringify(input.signals)}`
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${input.screenshot.toString("base64")}`
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) return undefined;
  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return undefined;
  const parsed = parseJsonSafely(content);
  return { issues: normalizeVisionIssues(parsed) };
}

async function callClaudeVision(input: VisionUiInput): Promise<VisionUiResult | undefined> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || input.screenshot.byteLength === 0) return undefined;

  const model = process.env.ANTHROPIC_VISION_MODEL ?? "claude-3-7-sonnet-latest";
  const prompt = [
    "Analyze this UI screenshot and return JSON only.",
    "Required schema: {\"issues\":[{\"type\":\"CTA clarity|Visual hierarchy|Spacing|Typography|Contrast|Layout clutter|Navigation complexity|Mobile usability\",\"severity\":\"high|medium|low\",\"description\":\"...\",\"recommendation\":\"...\"}]}",
    "Focus only on: visual hierarchy, CTA clarity, spacing, typography, contrast, layout clutter, navigation complexity, mobile usability.",
    `DOM summary: ${input.domSummary}`,
    `Signals: ${JSON.stringify(input.signals)}`
  ].join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: input.screenshot.toString("base64")
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) return undefined;
  const json = await response.json();
  const content = json?.content?.[0]?.text;
  if (typeof content !== "string") return undefined;
  const parsed = tryExtractJsonObject(content);
  return { issues: normalizeVisionIssues(parsed) };
}

export async function analyzeVisionUi(input: VisionUiInput): Promise<VisionUiResult> {
  const modelResult =
    (await callOpenAiVision(input)) ??
    (await callClaudeVision(input));
  if (modelResult && modelResult.issues.length > 0) {
    return modelResult;
  }
  return { issues: fallbackIssues(input.signals) };
}
