import crypto from "node:crypto";

const MAX_FILENAME_LENGTH = 120;

function normalizeDomainLabel(hostname: string): string {
  const withoutWww = hostname.replace(/^www\./i, "");
  const firstSegment = withoutWww.split(".")[0] || "site";
  const safe = firstSegment.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return safe.length > 0 ? safe : "site";
}

export function shortUrlId(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 12);
}

export function extractDomainLabel(url: string): string {
  try {
    return normalizeDomainLabel(new URL(url).hostname);
  } catch {
    return "site";
  }
}

export function buildScreenshotFilename(url: string, viewport: "desktop" | "mobile" | "full"): string {
  const domain = extractDomainLabel(url);
  const hash = shortUrlId(url);
  const extension = ".png";
  const middle = `-${hash}-${viewport}`;
  const maxDomainLength = Math.max(8, MAX_FILENAME_LENGTH - extension.length - middle.length);
  const trimmedDomain = domain.slice(0, maxDomainLength);
  return `${trimmedDomain}${middle}${extension}`;
}

export function isFilenameLengthSafe(filename: string): boolean {
  return filename.length <= MAX_FILENAME_LENGTH;
}
