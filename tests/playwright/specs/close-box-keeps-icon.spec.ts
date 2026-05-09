import { test, expect, gotoGmail } from "../fixtures/extension";
import { waitForG2tButton } from "../helpers/wait-for-g2t";

test.describe("close-box keeps icon", () => {
  test("clicking the popup [x] does not remove #g2tButton from the toolbar", async ({ context }) => {
    const page = await gotoGmail(context);

    await waitForG2tButton(page);

    const firstThread = page.locator("tr.zA").first();
    await firstThread.waitFor({ state: "visible", timeout: 30_000 });
    await firstThread.click();

    await waitForG2tButton(page);

    await page.locator("[gh='mtb'] #g2tButton").first().click();

    await page.locator("#g2tPopup").waitFor({ state: "visible", timeout: 10_000 });

    await page.locator("#g2tPopup #close-button").first().click();

    await page.waitForTimeout(250);

    const buttonCount = await page.locator("[gh='mtb'] #g2tButton").count();
    expect(buttonCount).toBeGreaterThanOrEqual(1);
  });
});
