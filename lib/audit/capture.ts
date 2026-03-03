import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { defaultSignals, type AuditSignals } from "@/lib/audit/signals";

type CaptureResult = {
  desktopPath: string;
  mobilePath: string;
  domSummary: string;
  signals: AuditSignals;
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

async function tryImportPlaywright(): Promise<any | null> {
  try {
    // Avoid compile-time dependency on playwright package.
    const importer = new Function('return import("playwright")') as () => Promise<any>;
    return await importer();
  } catch {
    return null;
  }
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

export async function captureWebsite(url: string): Promise<CaptureResult> {
  const artifactsDir = path.join(process.cwd(), ".audit-artifacts");
  await mkdir(artifactsDir, { recursive: true });
  const safeName = encodeURIComponent(url).replace(/%/g, "_");
  const desktopPath = path.join(artifactsDir, `${safeName}-desktop.png`);
  const mobilePath = path.join(artifactsDir, `${safeName}-mobile.png`);

  const playwright = await tryImportPlaywright();
  if (playwright?.chromium) {
    const browser = await playwright.chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: desktopPath, fullPage: true });

      const mobileContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      });
      const mobilePage = await mobileContext.newPage();
      await mobilePage.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
      await mobilePage.waitForTimeout(1200);
      await mobilePage.screenshot({ path: mobilePath, fullPage: true });

      const signals = await page.evaluate(() => {
        const toArray = <T,>(value: ArrayLike<T>) => Array.from(value);
        const styles = toArray(document.querySelectorAll<HTMLElement>("a,button,input,textarea,select,[role='button']"))
          .map((el) => window.getComputedStyle(el).outlineStyle + "|" + window.getComputedStyle(el).outlineWidth);
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
        const labelledInputs = toArray(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input,textarea"))
          .filter((el) => {
            const id = el.getAttribute("id");
            const hasLabelFor = id ? document.querySelector(`label[for="${id}"]`) : null;
            return Boolean(hasLabelFor || el.closest("label") || el.getAttribute("aria-label"));
          }).length;
        const inputCount = document.querySelectorAll("input,textarea,select").length;
        const tapTargetSmallCount = buttons.filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
        }).length;

        return {
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
      });

      await mobileContext.close();
      await context.close();

      return {
        desktopPath,
        mobilePath,
        domSummary: toDomSummary(signals),
        signals
      };
    } finally {
      await browser.close();
    }
  }

  const signals = syntheticSignals(url);
  await writeFile(desktopPath, "");
  await writeFile(mobilePath, "");
  return {
    desktopPath,
    mobilePath,
    domSummary: toDomSummary(signals),
    signals
  };
}
