import { test, expect, gotoGmail } from "../fixtures/extension";
import { waitForG2tButton } from "../helpers/wait-for-g2t";
import { openFirstThread } from "../helpers/open-first-thread";

test.describe("popup hydrates", () => {
  test("title field becomes non-empty within 5 seconds of opening the popup", async ({ context }) => {
    const page = await gotoGmail(context);

    await waitForG2tButton(page);
    await openFirstThread(page);

    const g2tButton = await waitForG2tButton(page);
    await g2tButton.click();

    await page.locator("#g2tPopup").waitFor({ state: "visible", timeout: 10_000 });

    const titleInput = page.locator("#g2tPopup #g2tTitle");
    await titleInput.waitFor({ state: "visible", timeout: 5_000 });

    await expect
      .poll(async () => (await titleInput.inputValue()).trim().length, { timeout: 5_000 })
      .toBeGreaterThan(0);
  });
});
