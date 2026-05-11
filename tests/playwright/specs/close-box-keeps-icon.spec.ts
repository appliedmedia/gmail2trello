import { test, expect, gotoGmail } from "../fixtures/extension";
import { g2tButtonLocator, waitForG2tButton } from "../helpers/wait-for-g2t";
import { openFirstThread } from "../helpers/open-first-thread";

test.describe("close-box keeps icon", () => {
  test("clicking the popup [x] does not remove #g2tButton from the toolbar", async ({ context }) => {
    const page = await gotoGmail(context);

    await waitForG2tButton(page);
    await openFirstThread(page);

    const g2tButton = await waitForG2tButton(page);
    await g2tButton.click();

    await page.locator("#g2tPopup").waitFor({ state: "visible", timeout: 10_000 });

    await page.locator("#g2tPopup #close-button").first().click();

    await page.locator("#g2tPopup").waitFor({ state: "hidden", timeout: 5_000 });

    await expect(g2tButtonLocator(page)).toBeVisible();
  });
});
