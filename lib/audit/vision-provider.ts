import { readFile } from "node:fs/promises";

import type { AuditFinding } from "@/lib/audit/types";

type VisionResult = {
  findings: AuditFinding[];
};

function parseJsonSafely(content: string): any | null {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function normalizeFindings(payload: any): AuditFinding[] {
  if (!payload || !Array.isArray(payload.findings)) return [];
  return payload.findings
    .filter((item: any) => item && typeof item === "object")
    .map((item: any, idx: number) => ({
      id: `vision-${idx}`,
      category: item.category ?? "visualHierarchy",
      title: String(item.title ?? "ממצא ויזואלי נוסף"),
      detail: String(item.detail ?? "התקבל ממצא מהמודל הוויזואלי."),
      severity:
        item.severity === "critical" || item.severity === "warning" || item.severity === "good"
          ? item.severity
          : "warning"
    }));
}

async function imageToBase64(path: string): Promise<string | null> {
  try {
    const data = await readFile(path);
    if (data.byteLength === 0) return null;
    return data.toString("base64");
  } catch {
    return null;
  }
}

async function callOpenAI(
  prompt: string,
  desktopPath: string,
  mobilePath: string,
  fullPagePath?: string
): Promise<VisionResult | undefined> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return undefined;

  const desktop = await imageToBase64(desktopPath);
  const mobile = await imageToBase64(mobilePath);
  const fullPage = fullPagePath ? await imageToBase64(fullPagePath) : null;
  if (!desktop && !mobile && !fullPage) return undefined;

  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
  const content: any[] = [{ type: "text", text: prompt }];
  if (desktop) content.push({ type: "image_url", image_url: { url: `data:image/png;base64,${desktop}` } });
  if (mobile) content.push({ type: "image_url", image_url: { url: `data:image/png;base64,${mobile}` } });
  if (fullPage) content.push({ type: "image_url", image_url: { url: `data:image/png;base64,${fullPage}` } });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }]
    })
  });

  if (!response.ok) return undefined;
  const json = await response.json();
  const contentText = json?.choices?.[0]?.message?.content;
  if (typeof contentText !== "string") return undefined;
  const parsed = parseJsonSafely(contentText);
  return { findings: normalizeFindings(parsed) };
}

async function callAnthropic(
  prompt: string,
  desktopPath: string,
  mobilePath: string,
  fullPagePath?: string
): Promise<VisionResult | undefined> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return undefined;

  const desktop = await imageToBase64(desktopPath);
  const mobile = await imageToBase64(mobilePath);
  const fullPage = fullPagePath ? await imageToBase64(fullPagePath) : null;
  if (!desktop && !mobile && !fullPage) return undefined;

  const model = process.env.ANTHROPIC_VISION_MODEL ?? "claude-3-5-sonnet-latest";
  const content: any[] = [{ type: "text", text: `${prompt}\nReturn JSON only.` }];
  if (desktop) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: desktop }
    });
  }
  if (mobile) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: mobile }
    });
  }
  if (fullPage) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: fullPage }
    });
  }

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
      messages: [{ role: "user", content }]
    })
  });

  if (!response.ok) return undefined;
  const json = await response.json();
  const contentText = json?.content?.[0]?.text;
  if (typeof contentText !== "string") return undefined;
  const parsed = parseJsonSafely(contentText);
  return { findings: normalizeFindings(parsed) };
}

export async function getVisionFindings(
  prompt: string,
  desktopPath: string,
  mobilePath: string,
  fullPagePath?: string
): Promise<VisionResult | undefined> {
  const provider = process.env.AI_PROVIDER;
  if (provider === "openai") {
    return callOpenAI(prompt, desktopPath, mobilePath, fullPagePath);
  }
  if (provider === "anthropic") {
    return callAnthropic(prompt, desktopPath, mobilePath, fullPagePath);
  }

  // Auto mode: try OpenAI first, then Anthropic.
  return (
    (await callOpenAI(prompt, desktopPath, mobilePath, fullPagePath)) ??
    (await callAnthropic(prompt, desktopPath, mobilePath, fullPagePath))
  );
}
