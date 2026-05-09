import { test, expect, gotoGmail } from "../fixtures/extension";
import { waitForG2tButton } from "../helpers/wait-for-g2t";

test.describe("popup hydrates", () => {
  test("title field becomes non-empty within 5 seconds of opening the popup", async ({ context }) => {
    const page = await gotoGmail(context);

    await waitForG2tButton(page);

    const firstThread = page.locator("tr.zA").first();
    await firstThread.waitFor({ state: "visible", timeout: 30_000 });
    await firstThread.click();

    await waitForG2tButton(page);

    await page.locator("[gh='mtb'] #g2tButton").first().click();

    await page.locator("#g2tPopup").waitFor({ state: "visible", timeout: 10_000 });

    const titleInput = page.locator("#g2tPopup #title");
    await titleInput.waitFor({ state: "visible", timeout: 5_000 });

    await expect
      .poll(async () => (await titleInput.inputValue()).trim().length, { timeout: 5_000 })
      .toBeGreaterThan(0);
  });
});
