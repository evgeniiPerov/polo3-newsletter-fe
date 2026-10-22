import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const PAGE = '/index.html';

// Default axe run: WCAG rules plus best-practice rules.
export async function expectNoAxeViolations(page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
}

// Fills the email and checks consent: the minimum for a submit that passes validation.
export async function fillValid(page, email) {
  await page.locator('#email').fill(email);
  await page.locator('#consent').check();
}
