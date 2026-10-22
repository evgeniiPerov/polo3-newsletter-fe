// Full-page screenshots for the assignment: 3 widths × light/dark, saved to screenshots/<width>-<scheme>.png.
// Each shot uses a fresh browser context (no stored theme choice), so the page follows the emulated colorScheme.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { PORT, startServer } from './serve.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'screenshots');
const WIDTHS = [360, 768, 1280];
const SCHEMES = ['light', 'dark'];
const HEIGHT = 900;

const server = await startServer();
const browser = await chromium.launch();
try {
  await mkdir(OUT_DIR, { recursive: true });
  for (const width of WIDTHS) {
    for (const colorScheme of SCHEMES) {
      const context = await browser.newContext({ viewport: { width, height: HEIGHT }, colorScheme });
      const page = await context.newPage();
      const url = `http://localhost:${PORT}/index.html`;
      const response = await page.goto(url);
      if (!response?.ok()) throw new Error(`${url} answered ${response?.status()}`);
      // The visually hidden status region is position: absolute only when css/main.css has applied.
      const status = page.locator('.js-status');
      const position = await status.evaluate((el) => el.ownerDocument.defaultView.getComputedStyle(el).position);
      if (position !== 'absolute') throw new Error('css/main.css did not apply');
      const file = path.join(OUT_DIR, `${width}-${colorScheme}.png`);
      await page.screenshot({ path: file, fullPage: true });
      await context.close();
      process.stdout.write(`${path.relative(ROOT, file)}\n`);
    }
  }
} finally {
  await browser.close();
  server.close();
}
