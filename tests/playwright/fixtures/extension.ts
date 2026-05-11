import { test as base, chromium, type BrowserContext, type Worker } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const extensionPath = path.join(repoRoot, "chrome_manifest_v3");
const userDataDir = path.resolve(__dirname, "..", "user-data");
const storageStatePath = path.resolve(__dirname, "..", "auth", "storage-state.json");

export type ExtensionFixtures = {
  context: BrowserContext;
  serviceWorker: Worker;
};

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    // chromium.launchPersistentContext does not consume project.use.launchOptions
    // from playwright.config.ts, so extension args, headless, and viewport must
    // live here. The config now intentionally omits them to avoid divergence.
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
      viewport: { width: 1280, height: 900 },
    });

    if (fs.existsSync(storageStatePath)) {
      let state: { cookies?: unknown[]; origins?: Array<{ origin: string; localStorage?: Array<{ name: string; value: string }> }> };
      try {
        state = JSON.parse(fs.readFileSync(storageStatePath, "utf-8"));
      } catch (err) {
        throw new Error(
          `Failed to parse ${storageStatePath}: ${(err as Error).message}. Re-run "npm run test:e2e:bootstrap".`,
        );
      }
      if (Array.isArray(state.cookies) && state.cookies.length > 0) {
        await context.addCookies(state.cookies as Parameters<typeof context.addCookies>[0]);
      }
      if (Array.isArray(state.origins)) {
        for (const origin of state.origins) {
          if (!origin.localStorage || origin.localStorage.length === 0) continue;
          const page = await context.newPage();
          try {
            await page.goto(origin.origin, { waitUntil: "load" });
            await page.evaluate((items) => {
              for (const { name, value } of items) {
                localStorage.setItem(name, value);
              }
            }, origin.localStorage);
          } finally {
            await page.close();
          }
        }
      }
    }

    await use(context);
    await context.close();
  },

  serviceWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) {
      try {
        worker = await context.waitForEvent("serviceworker", { timeout: 30_000 });
      } catch (err) {
        throw new Error(
          `Timed out after 30s waiting for the gmail2trello extension service worker. ` +
            `context.serviceWorkers() returned ${context.serviceWorkers().length} workers. ` +
            `Underlying error: ${(err as Error).message}`,
        );
      }
    }
    await use(worker);
  },
});

export const expect = test.expect;

export async function gotoGmail(context: BrowserContext) {
  const page = await context.newPage();
  // "load" instead of "domcontentloaded" so the content script has a chance
  // to attach before the fixture returns; specs still call waitForG2tButton
  // for the toolbar-readiness gate.
  await page.goto("https://mail.google.com/mail/u/0/#inbox", { waitUntil: "load" });
  return page;
}
