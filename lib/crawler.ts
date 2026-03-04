import { getSharedBrowser } from "@/lib/playwright-browser";

type CrawlOptions = {
  maxPages?: number;
  timeoutMs?: number;
};

type CrawlItem = {
  url: string;
  score: number;
};

const HIGH_PRIORITY_PATHS = ["/pricing", "/product", "/features", "/signup", "/contact", "/about"];
const LOW_PRIORITY_PATHS = ["/blog", "/legal", "/privacy"];

function normalizeUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    const keysToDelete: string[] = [];
    parsed.searchParams.forEach((_value, key) => {
      const lower = key.toLowerCase();
      if (
        lower.startsWith("utm_") ||
        lower === "gclid" ||
        lower === "fbclid" ||
        lower === "_ga"
      ) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => parsed.searchParams.delete(key));
    if (!parsed.pathname) parsed.pathname = "/";
    return parsed.toString();
  } catch {
    return null;
  }
}

function toAbsoluteUrl(baseUrl: string, href: string): string | null {
  try {
    return normalizeUrl(new URL(href, baseUrl).toString());
  } catch {
    return null;
  }
}

function canonicalHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

function isSameDomain(url: string, originHost: string): boolean {
  try {
    return canonicalHost(new URL(url).host) === canonicalHost(originHost);
  } catch {
    return false;
  }
}

function scoreUrl(url: string): number {
  const lower = url.toLowerCase();
  let score = 0;

  for (const keyword of HIGH_PRIORITY_PATHS) {
    if (lower.includes(keyword)) score += 40;
  }
  for (const keyword of LOW_PRIORITY_PATHS) {
    if (lower.includes(keyword)) score -= 30;
  }
  if (lower.endsWith("/") || lower.split("/").length <= 4) score += 10;
  return score;
}

function enqueue(queue: CrawlItem[], url: string) {
  queue.push({ url, score: scoreUrl(url) });
  queue.sort((a, b) => b.score - a.score);
}

function isIgnorableHref(href: string): boolean {
  const lower = href.toLowerCase();
  return (
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("javascript:") ||
    lower === "#" ||
    lower.startsWith("#")
  );
}

async function extractLinksWithPlaywright(url: string, timeoutMs: number): Promise<string[]> {
  const browser = await getSharedBrowser();
  if (!browser) return [];
  let page: any | undefined;

  try {
    page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForTimeout(600);
    const links = await page.$$eval("a", (anchors: Element[]) =>
      anchors
        .map((anchor) => {
          const a = anchor as HTMLAnchorElement;
          return a.getAttribute("href") ?? a.href;
        })
        .filter((href: string | null): href is string => typeof href === "string" && href.length > 0)
    );
    return links;
  } catch {
    return [];
  } finally {
    if (page) {
      await page.close().catch(() => undefined);
    }
  }
}

export async function crawlWebsite(startUrl: string, options: CrawlOptions = {}): Promise<string[]> {
  const normalizedStart = normalizeUrl(startUrl);
  if (!normalizedStart) return [startUrl];

  const maxPages = Math.max(1, Math.min(10, options.maxPages ?? 10));
  const timeoutMs = Math.max(1000, options.timeoutMs ?? 15000);
  const host = new URL(normalizedStart).host;

  const queue: CrawlItem[] = [{ url: normalizedStart, score: 1000 }];
  const visited = new Set<string>();
  const output: string[] = [];

  while (queue.length > 0 && output.length < maxPages) {
    const current = queue.shift();
    if (!current || visited.has(current.url)) continue;

    visited.add(current.url);
    output.push(current.url);

    const hrefs = await extractLinksWithPlaywright(current.url, timeoutMs);
    for (const href of hrefs) {
      if (isIgnorableHref(href)) continue;
      const absolute = toAbsoluteUrl(current.url, href);
      if (!absolute) continue;
      if (!isSameDomain(absolute, host)) continue;
      if (visited.has(absolute)) continue;
      if (queue.some((item) => item.url === absolute)) continue;
      enqueue(queue, absolute);
    }
  }

  return output;
}
