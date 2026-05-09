import { defineConfig } from "@playwright/test";
import * as path from "path";

const repoRoot = path.resolve(__dirname, "..", "..");
const extensionPath = path.join(repoRoot, "chrome_manifest_v3");
const userDataDir = path.join(__dirname, "user-data");

export default defineConfig({
  testDir: "./specs",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    headless: false,
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-extension",
      use: {
        channel: "chromium",
        launchOptions: {
          headless: false,
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
          ],
        },
      },
      metadata: {
        userDataDir,
        extensionPath,
      },
    },
  ],
});
