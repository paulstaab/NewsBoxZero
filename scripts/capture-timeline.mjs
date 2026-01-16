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

const appBaseUrl =
  process.env.APP_BASE_URL ?? envFile.APP_BASE_URL ?? 'http://127.0.0.1:3000';
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

await page.goto(`${appBaseUrl}/login/`, { waitUntil: 'domcontentloaded' });
await page.getByLabel(/server url/i).fill(serverUrl);
await page.getByRole('button', { name: /^continue$/i }).click();

await page.getByLabel(/username/i).waitFor({ state: 'visible' });
await page.getByLabel(/username/i).fill(username);
await page.getByLabel(/password/i).fill(password);
await page.getByRole('button', { name: /log.*in|sign.*in/i }).click();

await page.waitForURL(/\/timeline/);
await page.getByRole('heading', { name: /newsboxzero/i }).waitFor();
await page.waitForLoadState('networkidle');

const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
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
