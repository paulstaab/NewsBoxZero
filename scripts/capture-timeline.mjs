import { chromium } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const stripQuotes = (value) => value.replace(/^["']|["']$/g, '');

const loadEnvFile = async (envPath) => {
  try {
    const raw = await fs.readFile(envPath, 'utf8');
    return raw.split('\n').reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return acc;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) return acc;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = stripQuotes(trimmed.slice(separatorIndex + 1).trim());
      if (key) acc[key] = value;
      return acc;
    }, {});
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
};

const envFile = await loadEnvFile(path.join(ROOT_DIR, '.env'));

const serverUrl = process.env.TEST_SERVER ?? envFile.TEST_SERVER;
const username = process.env.TEST_USER ?? envFile.TEST_USER;
const password = process.env.TEST_PASSWORD ?? envFile.TEST_PASSWORD;

if (!serverUrl || !username || !password) {
  throw new Error('Missing TEST_SERVER, TEST_USER, or TEST_PASSWORD in .env or environment.');
}

const appBaseUrl = process.env.APP_BASE_URL ?? envFile.APP_BASE_URL ?? 'http://127.0.0.1:3000';
const outputDir = path.join(ROOT_DIR, 'screenshots');
const outputs = {
  full: path.join(outputDir, 'timeline-full.png'),
  top: path.join(outputDir, 'timeline-top.png'),
  bottom: path.join(outputDir, 'timeline-bottom.png'),
  screen: path.join(outputDir, 'timeline-screen.png'),
};

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();

if (!serverUrl.startsWith('https://')) {
  throw new Error('TEST_SERVER must be an https:// URL to pass login validation.');
}

await page.goto(`${appBaseUrl}/login/?plain=1`, { waitUntil: 'domcontentloaded' });

const serverInput = page.getByLabel(/server url/i);
const usernameInput = page.getByLabel(/username/i);
const passwordInput = page.getByLabel(/password/i);
const errorBox = page.locator('.bg-red-50');

await Promise.race([
  serverInput.waitFor({ state: 'visible' }),
  errorBox.waitFor({ state: 'visible' }),
  page.waitForTimeout(15000),
]).catch(() => {});

if (await errorBox.isVisible()) {
  const errorText = await errorBox.innerText();
  throw new Error(`Login form error: ${errorText.trim()}`);
}

if (await serverInput.isVisible()) {
  await serverInput.fill(serverUrl);
  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /log.*in|sign.*in/i }).click();
} else {
  throw new Error('Login form did not render.');
}

try {
  await page.waitForFunction(
    (sessionKey) => {
      return window.localStorage.getItem(sessionKey) || window.sessionStorage.getItem(sessionKey);
    },
    'newsboxzero:session',
    { timeout: 20000 },
  );
} catch {
  throw new Error('Session storage not set after login. Check credentials or server.');
}

if (!/\/timeline/.test(page.url())) {
  await page.goto(`${appBaseUrl}/timeline/`, { waitUntil: 'domcontentloaded' });
}

try {
  await page.waitForURL(/\/timeline/, { timeout: 15000 });
} catch {
  throw new Error(
    `Failed to reach timeline. Current URL: ${page.url()}. Check TEST_SERVER/TEST_USER/TEST_PASSWORD.`,
  );
}

const serverInputVisible = await page
  .getByLabel(/server url/i)
  .isVisible()
  .catch(() => false);

if (serverInputVisible) {
  throw new Error('Redirected back to login; timeline requires authentication.');
}

let timelineReady = false;
try {
  await page
    .locator('[role="tablist"][aria-label="Unread folder queue"]')
    .waitFor({ state: 'visible', timeout: 15000 });
  timelineReady = true;
} catch {
  try {
    await page.locator('[role="article"]').first().waitFor({ state: 'visible', timeout: 15000 });
    timelineReady = true;
  } catch {
    timelineReady = false;
  }
}

if (!timelineReady) {
  throw new Error('Timeline did not render expected content.');
}
await page.waitForLoadState('networkidle');

const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
const topHeight = Math.min(600, viewport.height);

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await page.screenshot({ path: outputs.screen });

await page.screenshot({
  path: outputs.top,
  clip: { x: 0, y: 0, width: viewport.width, height: topHeight },
});

await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(200);
await page.screenshot({ path: outputs.bottom });

await page.screenshot({ path: outputs.full, fullPage: true });

await browser.close();

console.log('Saved timeline screenshots:');
console.log(outputs.full);
console.log(outputs.top);
console.log(outputs.bottom);
console.log(outputs.screen);
