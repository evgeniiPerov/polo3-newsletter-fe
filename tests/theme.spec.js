import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PAGE, expectNoAxeViolations } from './helpers.js';

// --color-bg per theme, copied from settings/_tokens.scss on purpose: a token change should fail this test.
const BG = { light: 'rgb(255 255 255)', dark: 'rgb(18 18 18)' };
const OPPOSITE = { light: 'dark', dark: 'light' };

const colorBg = (page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim());
const dataTheme = (page) => page.evaluate(() => document.documentElement.dataset.theme ?? null);
// The toggle names the mode it switches to: light theme offers dark, dark theme offers light.
const LABEL = { light: 'Přepnout na tmavý režim', dark: 'Přepnout na světlý režim' };
const toggleFor = (page, theme) => page.getByRole('button', { name: LABEL[theme], exact: true });

test('no stored choice follows the system scheme', async ({ page }, testInfo) => {
  const scheme = testInfo.project.name;
  await page.goto(PAGE);
  expect(await dataTheme(page)).toBeNull();
  expect(await colorBg(page)).toBe(BG[scheme]);
  await expect(toggleFor(page, scheme)).toBeVisible();
  await expect(toggleFor(page, OPPOSITE[scheme])).toHaveCount(0);
});

test('click switches to the opposite theme', async ({ page }, testInfo) => {
  const opposite = OPPOSITE[testInfo.project.name];
  await page.goto(PAGE);
  await page.locator('.js-theme-toggle').click();
  expect(await dataTheme(page)).toBe(opposite);
  expect(await colorBg(page)).toBe(BG[opposite]);
  await expect(toggleFor(page, opposite)).toBeVisible();
  await expectNoAxeViolations(page);
});

test('choice persists across reloads and pages', async ({ page }, testInfo) => {
  const opposite = OPPOSITE[testInfo.project.name];
  await page.goto(PAGE);
  await page.locator('.js-theme-toggle').click();
  await page.reload();
  expect(await dataTheme(page)).toBe(opposite);
  expect(await colorBg(page)).toBe(BG[opposite]);
  await expect(toggleFor(page, opposite)).toBeVisible();

  await page.goto('/podminky.html');
  expect(await dataTheme(page)).toBe(opposite);
  expect(await colorBg(page)).toBe(BG[opposite]);
});

test('keyboard: first Tab stop, Space toggles, outline visible', async ({ page }, testInfo) => {
  const opposite = OPPOSITE[testInfo.project.name];
  await page.goto(PAGE);
  await page.keyboard.press('Tab');
  const toggle = page.locator('.js-theme-toggle');
  await expect(toggle).toBeFocused();
  const outline = await toggle.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
  await page.keyboard.press('Space');
  expect(await dataTheme(page)).toBe(opposite);
  await expect(toggleFor(page, opposite)).toBeFocused();
});

test('blocked storage: no page errors, toggle still works', async ({ page }, testInfo) => {
  const opposite = OPPOSITE[testInfo.project.name];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException('Storage blocked', 'SecurityError');
    };
    Storage.prototype.getItem = blocked;
    Storage.prototype.setItem = blocked;
  });
  await page.goto(PAGE);
  await page.locator('.js-theme-toggle').click();
  expect(await dataTheme(page)).toBe(opposite);
  expect(await colorBg(page)).toBe(BG[opposite]);
  await expect(toggleFor(page, opposite)).toBeVisible();
  expect(errors).toEqual([]);
});

test('target size is at least 44 x 44', async ({ page }) => {
  await page.goto(PAGE);
  const box = await page.locator('.js-theme-toggle').boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test('system change is followed until a choice is stored', async ({ page }, testInfo) => {
  const scheme = testInfo.project.name;
  const opposite = OPPOSITE[scheme];
  const toggle = page.locator('.js-theme-toggle');
  await page.goto(PAGE);

  await page.emulateMedia({ colorScheme: opposite });
  await expect(toggleFor(page, opposite)).toBeVisible();
  expect(await colorBg(page)).toBe(BG[opposite]);

  // Effective theme is now `opposite`, so the click stores `scheme`.
  await toggle.click();
  expect(await dataTheme(page)).toBe(scheme);
  await expect(toggleFor(page, scheme)).toBeVisible();

  await page.emulateMedia({ colorScheme: scheme });
  await page.emulateMedia({ colorScheme: opposite });
  expect(await dataTheme(page)).toBe(scheme);
  await expect(toggleFor(page, scheme)).toBeVisible();
  expect(await colorBg(page)).toBe(BG[scheme]);
});

// Colours switch instantly on a theme flip: a transition would leave mid-way colours with too little contrast.
test('no contrast dip right after a theme flip', async ({ page }) => {
  await page.goto(PAGE);
  // Axe alone can race a short transition, so also check that the flip starts no animation at all.
  const running = await page.evaluate(() => {
    document.querySelector('.js-theme-toggle').click();
    return document.getAnimations().length;
  });
  expect(running).toBe(0);
  const { violations } = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  expect(violations).toEqual([]);
});
