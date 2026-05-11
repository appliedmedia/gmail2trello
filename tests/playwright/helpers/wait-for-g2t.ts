import { type Locator, type Page } from "@playwright/test";

/**
 * Single source of truth for the toolbar-side G2T button selector.
 */
export function g2tButtonLocator(page: Page): Locator {
  return page.locator("[gh='mtb'] #g2tButton").first();
}

/**
 * Polls for the G2T button inside the Gmail toolbar and returns the locator.
 *
 * Gmail's toolbar mounts asynchronously after the content script bootstraps;
 * cold caches and slow networks can push that past Playwright's default
 * waits, so this helper gives 30 seconds by default.
 */
export async function waitForG2tButton(page: Page, timeoutMs = 30_000): Promise<Locator> {
  const button = g2tButtonLocator(page);
  await button.waitFor({ state: "visible", timeout: timeoutMs });
  return button;
}
