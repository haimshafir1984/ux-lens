let sharedBrowserPromise: Promise<any | null> | null = null;

async function tryImportPlaywright(): Promise<any | null> {
  try {
    const importer = new Function('return import("playwright")') as () => Promise<any>;
    return await importer();
  } catch {
    return null;
  }
}

export async function getSharedBrowser(): Promise<any | null> {
  if (!sharedBrowserPromise) {
    sharedBrowserPromise = (async () => {
      const playwright = await tryImportPlaywright();
      if (!playwright?.chromium) return null;
      return playwright.chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
    })();
  }
  return sharedBrowserPromise;
}

export async function closeSharedBrowser(): Promise<void> {
  if (!sharedBrowserPromise) return;
  try {
    const browser = await sharedBrowserPromise;
    if (browser) await browser.close();
  } catch {
    // Best effort browser cleanup.
  } finally {
    sharedBrowserPromise = null;
  }
}
