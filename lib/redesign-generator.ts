import type { AuditFinding } from "@/lib/audit/types";

export type RedesignSuggestion = {
  problem: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
};

function fallbackSuggestion(finding: AuditFinding): RedesignSuggestion {
  if (finding.category === "visualHierarchy" || finding.category === "conversion") {
    return {
      problem: finding.title,
      suggestion:
        "להעביר CTA עיקרי מעל הקיפול, להגדיל אותו ל-48px לפחות, להוסיף צבע בעל קונטרסט גבוה וטקסט תומך קצר.",
      priority: finding.severity === "critical" ? "high" : "medium"
    };
  }

  if (finding.category === "navigation") {
    return {
      problem: finding.title,
      suggestion:
        "לצמצם ניווט ראשי ל-4-7 פריטים, להבליט נתיב ראשי למשתמש חדש ולהוסיף הדגשה ברורה לפעולה מרכזית.",
      priority: finding.severity === "critical" ? "high" : "medium"
    };
  }

  if (finding.category === "responsive" || finding.category === "mobileTouch") {
    return {
      problem: finding.title,
      suggestion:
        "לבצע התאמת מובייל מלאה: ביטול overflow אופקי, הגדלת tap targets ל-44x44 ומעלה, ושיפור ריווחים אנכיים.",
      priority: "high"
    };
  }

  return {
    problem: finding.title,
    suggestion:
      "להחיל תיקון ממוקד לרכיב הבעייתי, לעדכן Design Tokens רלוונטיים ולהוסיף בדיקה חוזרת בדסקטופ ובמובייל.",
    priority: finding.severity === "critical" ? "high" : "medium"
  };
}

async function tryAiSuggestions(findings: AuditFinding[]): Promise<RedesignSuggestion[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || findings.length === 0) return null;

  const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini";
  const prompt = [
    "Transform UX findings into concrete redesign recommendations.",
    "Return JSON only with schema: {\"suggestions\":[{\"problem\":\"...\",\"suggestion\":\"...\",\"priority\":\"high|medium|low\"}]}",
    "Keep suggestions implementation-ready and specific.",
    JSON.stringify(findings.slice(0, 8))
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
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) return null;
  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed?.suggestions)) return null;
    return parsed.suggestions
      .filter((item: any) => item && typeof item === "object")
      .map((item: any) => ({
        problem: String(item.problem ?? "UX issue"),
        suggestion: String(item.suggestion ?? "Improve the UI component and validate with users."),
        priority: item.priority === "high" || item.priority === "low" ? item.priority : "medium"
      }));
  } catch {
    return null;
  }
}

export async function generateRedesignSuggestions(
  findings: AuditFinding[]
): Promise<RedesignSuggestion[]> {
  const criticalFirst = [...findings].sort((a, b) => {
    const rank = (severity: string) => (severity === "critical" ? 0 : severity === "warning" ? 1 : 2);
    return rank(a.severity) - rank(b.severity);
  });

  const aiSuggestions = await tryAiSuggestions(criticalFirst);
  if (aiSuggestions && aiSuggestions.length > 0) {
    return aiSuggestions.slice(0, 6);
  }

  return criticalFirst.slice(0, 6).map(fallbackSuggestion);
}
