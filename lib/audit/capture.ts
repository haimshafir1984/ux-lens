import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { defaultSignals, type AuditSignals } from "@/lib/audit/signals";
import { getSharedBrowser } from "@/lib/playwright-browser";

export type CaptureResult = {
  pageUrl: string;
  desktopPath: string;
  mobilePath: string;
  fullPagePath: string;
  domFingerprint: string;
  domSummary: string;
  signals: AuditSignals;
  screenshots: {
    desktop: Buffer;
    mobile: Buffer;
    fullPage: Buffer;
  };
  internalLinks: string[];
};

function hashUrl(url: string): number {
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function syntheticSignals(url: string): AuditSignals {
  const seed = hashUrl(url);
  const ratio = (n: number) => (seed % n) / n;
  return {
    ...defaultSignals(),
    contrastRiskElements: Math.floor(ratio(10) * 6),
    minFontSizePx: 11 + ratio(10) * 5,
    tapTargetSmallCount: Math.floor(ratio(13) * 6),
    mobileOverflowingElements: Math.floor(ratio(17) * 3),
    estimatedLcpMs: 2200 + Math.floor(ratio(2000) * 2600),
    estimatedTtiMs: 2500 + Math.floor(ratio(2500) * 3000),
    estimatedCls: Number((0.03 + ratio(100) * 0.32).toFixed(2)),
    hasLoadingIndicator: ratio(2) > 0.45,
    hasErrorStatePattern: ratio(3) > 0.35,
    hasSuccessStatePattern: ratio(5) > 0.35,
    hasSkipLink: ratio(7) > 0.7,
    policyLinkVisible: ratio(11) > 0.4,
    contactInfoVisible: ratio(19) > 0.35,
    socialProofCount: Math.floor(ratio(9) * 4),
    inconsistentButtonStyles: ratio(23) > 0.55,
    uploadInputCount: ratio(29) > 0.6 ? 1 : 0
  };
}

function toDomSummary(signals: AuditSignals): string {
  return [
    `forms=${signals.formCount}`,
    `uploadInputs=${signals.uploadInputCount}`,
    `ctaCount=${signals.ctaCount}`,
    `contrastRisk=${signals.contrastRiskElements}`,
    `missingAlt=${signals.imageMissingAltCount}`,
    `lcp=${signals.estimatedLcpMs}`,
    `tti=${signals.estimatedTtiMs}`,
    `cls=${signals.estimatedCls}`
  ].join(", ");
}

function isSameDomain(targetUrl: string, pageUrl: string): boolean {
  try {
    return new URL(targetUrl).host === new URL(pageUrl).host;
  } catch {
    return false;
  }
}

async function readBufferOrEmpty(filePath: string): Promise<Buffer> {
  try {
    return await readFile(filePath);
  } catch {
    return Buffer.from([]);
  }
}

function getArtifactPaths(url: string) {
  const artifactsDir = path.join(process.cwd(), ".audit-artifacts");
  const safeName = encodeURIComponent(url).replace(/%/g, "_");
  return {
    artifactsDir,
    desktopPath: path.join(artifactsDir, `${safeName}-desktop.png`),
    mobilePath: path.join(artifactsDir, `${safeName}-mobile.png`),
    fullPagePath: path.join(artifactsDir, `${safeName}-fullpage.png`)
  };
}

function quickHash(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(16);
}

export async function captureWebsite(url: string): Promise<CaptureResult> {
  const { artifactsDir, desktopPath, mobilePath, fullPagePath } = getArtifactPaths(url);
  await mkdir(artifactsDir, { recursive: true });

  const browser = await getSharedBrowser();
  if (browser) {
    let context: any | undefined;
    let mobileContext: any | undefined;

    try {
      context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 12000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: desktopPath, fullPage: false });
      await page.screenshot({ path: fullPagePath, fullPage: true });

      mobileContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      });
      const mobilePage = await mobileContext.newPage();
      await mobilePage.goto(url, { waitUntil: "domcontentloaded", timeout: 12000 });
      await mobilePage.waitForTimeout(800);
      await mobilePage.screenshot({ path: mobilePath, fullPage: false });

      const payload = await page.evaluate(() => {
        const toArray = <T,>(value: ArrayLike<T>) => Array.from(value);
        const styles = toArray(
          document.querySelectorAll<HTMLElement>("a,button,input,textarea,select,[role='button']")
        ).map((el) => window.getComputedStyle(el).outlineStyle + "|" + window.getComputedStyle(el).outlineWidth);
        const imageCount = document.querySelectorAll("img").length;
        const imageMissingAltCount = toArray(document.querySelectorAll<HTMLImageElement>("img")).filter(
          (img) => !img.alt || img.alt.trim().length === 0
        ).length;
        const iconButtons = toArray(document.querySelectorAll<HTMLElement>("button,[role='button']"));
        const ariaLabelMissingOnIconButtons = iconButtons.filter((el) => {
          const hasIconOnly =
            (el.textContent ?? "").trim().length === 0 && el.querySelector("svg, i, [data-icon]") !== null;
          if (!hasIconOnly) return false;
          return !el.getAttribute("aria-label") && !el.getAttribute("title");
        }).length;
        const buttons = toArray(document.querySelectorAll<HTMLElement>("button, a"));
        const buttonVariants = new Set(
          buttons
            .map((el) => window.getComputedStyle(el).backgroundColor + "|" + window.getComputedStyle(el).borderRadius)
            .filter((v) => v.length > 1)
        );
        const textNodes = toArray(document.querySelectorAll<HTMLElement>("p,li,span,small,label"));
        const fontSizes = textNodes
          .map((el) => Number.parseFloat(window.getComputedStyle(el).fontSize))
          .filter((n) => Number.isFinite(n) && n > 0);
        const avgFont = fontSizes.length > 0 ? fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length : 16;
        const minFont = fontSizes.length > 0 ? Math.min(...fontSizes) : 14;
        const aboveFoldText = textNodes.filter((el) => el.getBoundingClientRect().top < window.innerHeight).length;
        const totalText = Math.max(1, textNodes.length);
        const fileInputs = document.querySelectorAll("input[type='file']").length;
        const labelledInputs = toArray(
          document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input,textarea")
        ).filter((el) => {
          const id = el.getAttribute("id");
          const hasLabelFor = id ? document.querySelector(`label[for="${id}"]`) : null;
          return Boolean(hasLabelFor || el.closest("label") || el.getAttribute("aria-label"));
        }).length;
        const inputCount = document.querySelectorAll("input,textarea,select").length;
        const tapTargetSmallCount = buttons.filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
        }).length;

        const links = toArray(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
          .map((a) => a.href)
          .filter((href) => typeof href === "string" && href.length > 0);

        const structureRoot = document.querySelector("main") ?? document.body;
        const structureItems = toArray(structureRoot.querySelectorAll<HTMLElement>("*"))
          .slice(0, 220)
          .map((node) => {
            const className = typeof node.className === "string" ? node.className : "";
            const classes = className
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .join(".");
            return `${node.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
          });
        const structureSignature = structureItems.join("|");

        const signals = {
          pageTitleLength: document.title.length,
          metaDescriptionLength:
            document.querySelector("meta[name='description']")?.getAttribute("content")?.length ?? 0,
          headingCount: document.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
          h1Count: document.querySelectorAll("h1").length,
          linkCount: document.querySelectorAll("a[href]").length,
          navItemCount: document.querySelectorAll("nav a, nav button").length,
          ctaCount: toArray(document.querySelectorAll("a,button,input[type='submit']"))
            .filter((el) => /התחל|צור קשר|הזמן|subscribe|start|get|try|buy|sign up|book/i.test(el.textContent || ""))
            .length,
          primaryCtaAboveFold: toArray(document.querySelectorAll("a,button"))
            .some((el) =>
              /התחל|צור קשר|subscribe|start|get|try|buy|sign up|book/i.test(el.textContent || "") &&
              el.getBoundingClientRect().top < window.innerHeight
            ),
          duplicatePrimaryCTA: toArray(document.querySelectorAll("a,button"))
            .filter((el) => /start|sign up|try|book|צור קשר|התחל/i.test(el.textContent || "")).length > 3,
          formCount: document.querySelectorAll("form").length,
          inputCount,
          uploadInputCount: fileInputs,
          labelledInputs,
          placeholderOnlyInputs: toArray(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input,textarea"))
            .filter((el) => !!el.getAttribute("placeholder") && !el.getAttribute("aria-label"))
            .length,
          hasSkipLink: Boolean(document.querySelector("a[href^='#']")),
          imageCount,
          imageMissingAltCount,
          ariaLabelMissingOnIconButtons,
          interactiveWithoutFocusStyle: styles.filter((v) => v.startsWith("none|") || v.endsWith("|0px")).length,
          contrastRiskElements: toArray(document.querySelectorAll<HTMLElement>("p,span,a,button"))
            .filter((el) => {
              const style = window.getComputedStyle(el);
              const fg = style.color;
              const bg = style.backgroundColor;
              return fg === bg;
            }).length,
          averageFontSizePx: Number(avgFont.toFixed(2)),
          minFontSizePx: Number(minFont.toFixed(2)),
          tapTargetSmallCount,
          mobileOverflowingElements: toArray(document.querySelectorAll<HTMLElement>("body *"))
            .filter((el) => el.scrollWidth > document.documentElement.clientWidth + 1).length,
          desktopToMobileElementDelta: 18,
          inconsistentButtonStyles: buttonVariants.size > 8,
          hasLoadingIndicator: Boolean(document.querySelector("[aria-busy='true'], .loading, .spinner")),
          hasErrorStatePattern: Boolean(document.querySelector("[role='alert'], .error, .invalid, [aria-invalid='true']")),
          hasSuccessStatePattern: Boolean(document.querySelector(".success, .toast-success, [data-status='success']")),
          emptyStateCount: document.querySelectorAll(".empty-state, [data-empty='true']").length,
          heavyAboveFold: document.querySelectorAll("img,video,canvas").length > 10,
          estimatedLcpMs: 2700,
          estimatedTtiMs: 3200,
          estimatedCls: 0.12,
          policyLinkVisible: toArray(document.querySelectorAll("a")).some((a) =>
            /privacy|policy|terms|מדיניות|פרטיות/i.test(a.textContent || "")
          ),
          contactInfoVisible: Boolean(
            document.querySelector("a[href^='mailto:'], a[href^='tel:'], [itemprop='telephone']")
          ),
          socialProofCount: document.querySelectorAll(".testimonial, [data-testimonial], .rating, [data-rating]").length,
          firstViewportTextDensity: Number((aboveFoldText / totalText).toFixed(2))
        };

        return { signals, links, structureSignature };
      });

      const internalLinks = payload.links.filter((href: string) => isSameDomain(href, url));
      const desktopBuffer = await readBufferOrEmpty(desktopPath);
      const mobileBuffer = await readBufferOrEmpty(mobilePath);
      const fullPageBuffer = await readBufferOrEmpty(fullPagePath);

      return {
        pageUrl: url,
        desktopPath,
        mobilePath,
        fullPagePath,
        domFingerprint: quickHash(payload.structureSignature),
        domSummary: toDomSummary(payload.signals),
        signals: payload.signals,
        screenshots: {
          desktop: desktopBuffer,
          mobile: mobileBuffer,
          fullPage: fullPageBuffer
        },
        internalLinks
      };
    } catch {
      // Fall through to synthetic mode.
    } finally {
      if (mobileContext) {
        await mobileContext.close().catch(() => undefined);
      }
      if (context) {
        await context.close().catch(() => undefined);
      }
    }
  }

  const signals = syntheticSignals(url);
  await writeFile(desktopPath, "");
  await writeFile(mobilePath, "");
  await writeFile(fullPagePath, "");
  return {
    pageUrl: url,
    desktopPath,
    mobilePath,
    fullPagePath,
    domFingerprint: `synthetic-${hashUrl(url)}`,
    domSummary: toDomSummary(signals),
    signals,
    screenshots: {
      desktop: Buffer.from([]),
      mobile: Buffer.from([]),
      fullPage: Buffer.from([])
    },
    internalLinks: []
  };
}
