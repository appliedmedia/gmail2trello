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

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
      viewport: { width: 1280, height: 900 },
    });

    if (fs.existsSync(storageStatePath)) {
      const state = JSON.parse(fs.readFileSync(storageStatePath, "utf-8"));
      if (Array.isArray(state.cookies) && state.cookies.length > 0) {
        await context.addCookies(state.cookies);
      }
    }

    await use(context);
    await context.close();
  },

  serviceWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent("serviceworker", { timeout: 30_000 });
    }
    await use(worker);
  },
});

export const expect = test.expect;

export async function gotoGmail(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto("https://mail.google.com/mail/u/0/#inbox", { waitUntil: "domcontentloaded" });
  return page;
}
