import { type Page } from "@playwright/test";

/**
 * Polls for the G2T button inside the Gmail toolbar.
 *
 * Gmail's toolbar mounts asynchronously after the content script bootstraps;
 * cold caches and slow networks can push that past Playwright's default
 * waits, so this helper gives 30 seconds by default.
 */
export async function waitForG2tButton(page: Page, timeoutMs = 30_000): Promise<void> {
  await page.locator("[gh='mtb'] #g2tButton").first().waitFor({
    state: "visible",
    timeout: timeoutMs,
  });
}
