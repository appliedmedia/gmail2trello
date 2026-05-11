import { type Page } from "@playwright/test";
import { waitForG2tButton } from "./wait-for-g2t";

/**
 * Open the first thread in the Gmail inbox and wait until the G2T toolbar
 * button is visible again. Specs share this setup; keep it in one place so
 * the inbox row selector and the post-click readiness gate stay in sync.
 */
export async function openFirstThread(page: Page): Promise<void> {
  const firstThread = page.locator("tr.zA").first();
  await firstThread.waitFor({ state: "visible", timeout: 30_000 });
  await firstThread.click();
  await waitForG2tButton(page);
}
