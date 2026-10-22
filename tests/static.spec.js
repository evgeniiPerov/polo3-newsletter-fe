import { test, expect } from '@playwright/test';
import { PAGE, expectNoAxeViolations } from './helpers.js';

const PAGE_BG = { light: 'rgb(236 240 244)', dark: 'rgb(16 18 22)' };
const BODY_BG = { light: 'rgb(236, 240, 244)', dark: 'rgb(16, 18, 22)' };

test('default state is clean', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('form')).toHaveAttribute('novalidate', '');
  // POST, so a page whose script failed never puts the email into the URL.
  await expect(page.locator('form')).toHaveAttribute('method', 'post');
  await expect(page.locator('[aria-invalid]')).toHaveCount(0);
  await expect(page.locator('.js-server-error')).toBeHidden();
  await expect(page.locator('.js-success')).toBeHidden();
  const errors = page.locator('[id$="-error"]');
  await expect(errors).toHaveCount(3);
  for (const error of await errors.all()) await expect(error).toBeEmpty();
  await expectNoAxeViolations(page);
});

test('every control has a visible label', async ({ page }) => {
  await page.goto(PAGE);
  const labels = {
    '#email': 'E-mail',
    '#name': 'Jméno',
    '#interest-office-supplies': 'Kancelářské potřeby',
    '#interest-furniture': 'Nábytek',
    '#interest-drugstore': 'Drogerie',
    '#consent': 'Souhlasím',
  };
  for (const [selector, text] of Object.entries(labels)) {
    const control = page.getByLabel(text);
    await expect(control).toBeVisible();
    await expect(control).toHaveId(selector.slice(1));
  }
});

test('consent label click toggles the checkbox, link stays a link', async ({ page }) => {
  await page.goto(PAGE);
  await page.locator('label[for="consent"]').click({ position: { x: 2, y: 2 } });
  await expect(page.locator('#consent')).toBeChecked();
  await expect(page.locator('label[for="consent"] a')).toHaveAttribute('href', 'podminky.html');
});

test('theme switches colours', async ({ page }, testInfo) => {
  await page.goto(PAGE);
  const tokens = await page.evaluate(() => ({
    token: getComputedStyle(document.documentElement).getPropertyValue('--color-page').trim(),
    body: getComputedStyle(document.body).backgroundColor,
  }));
  expect(tokens.token).toBe(PAGE_BG[testInfo.project.name]);
  expect(tokens.body).toBe(BODY_BG[testInfo.project.name]);
});

test('terms page default state is clean', async ({ page }) => {
  await page.goto('/podminky.html');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('a[href="index.html"]')).toBeVisible();
  await expectNoAxeViolations(page);
});

// A form missing one of its hooks is left unwired (native POST) instead of throwing during init.
test('form with a missing hook is left unwired and does not throw', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.route('**/index.html', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace('js-success"', '"');
    await route.fulfill({ response, body });
  });
  await page.goto(PAGE);
  await expect(page.locator('h1')).toBeVisible();
  expect(errors).toEqual([]);
  // Unwired: an empty submit is a native POST, and no script marks a field invalid.
  await Promise.all([page.waitForRequest((request) => request.method() === 'POST', { timeout: 5_000 }), page.click('.js-submit')]);
});
