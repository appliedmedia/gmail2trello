import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const extensionPath = path.join(repoRoot, "chrome_manifest_v3");
const userDataDir = path.resolve(__dirname, "..", "user-data");
const authDir = path.resolve(__dirname, "..", "auth");
const storageStatePath = path.join(authDir, "storage-state.json");

function waitForEnter(prompt: string): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  console.log("Launching headed Chromium with the unpacked extension...");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
    viewport: { width: 1280, height: 900 },
  });

  const gmail = context.pages()[0];
  await gmail.goto("https://mail.google.com/", { waitUntil: "domcontentloaded" });

  const trello = await context.newPage();
  await trello.goto("https://trello.com/login", { waitUntil: "domcontentloaded" });

  console.log("");
  console.log("Two tabs are open: Gmail and Trello.");
  console.log("Sign in to BOTH services in the headed browser window.");
  console.log("After both sessions are authenticated, return here and press Enter.");
  console.log("");

  await waitForEnter("Press Enter to capture storage state... ");

  await context.storageState({ path: storageStatePath });
  console.log(`Wrote storage state to ${storageStatePath}`);

  await context.close();
  console.log("Bootstrap complete. Future runs of `npm run test:e2e` will reuse this state.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
