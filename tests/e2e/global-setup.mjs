import { chromium } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_SERVER_URL = 'https://rss.example.com';
const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'testpass';

const storageStatePath = fileURLToPath(new URL('./.auth/user.json', import.meta.url));

export default async function globalSetup(config) {
  const baseURL = config.projects?.[0]?.use?.baseURL ?? config.use?.baseURL;
  if (!baseURL) {
    throw new Error('baseURL is required to run the global login setup.');
  }

  await fs.mkdir(path.dirname(storageStatePath), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseURL);

  const credentials = Buffer.from(`${TEST_USERNAME}:${TEST_PASSWORD}`).toString('base64');

  await page.evaluate(
    ({ baseUrl, username, credentials: encoded }) => {
      localStorage.setItem(
        'newsboxzero:session',
        JSON.stringify({
          baseUrl,
          username,
          credentials: encoded,
          rememberDevice: true,
        }),
      );
    },
    { baseUrl: TEST_SERVER_URL, username: TEST_USERNAME, credentials },
  );

  await context.storageState({ path: storageStatePath });
  await browser.close();
}
