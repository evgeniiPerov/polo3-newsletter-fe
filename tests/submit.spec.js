import { test, expect } from '@playwright/test';
import { PAGE, expectNoAxeViolations, fillValid } from './helpers.js';

const SERVER_ERROR = 'Přihlášení se nepodařilo kvůli chybě serveru. Vaše údaje zůstaly ve formuláři, zkuste to prosím znovu.';
const SUCCESS = 'Novinky budeme posílat na adresu jan@example.cz.';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

const submitButton = (page) => page.locator('.js-submit');

test('server error keeps values and allows retry', async ({ page }) => {
  // Fake timers freeze submitMock's 500 ms delay, so the in-flight state can be asserted deterministically.
  await page.clock.install();
  await page.goto(PAGE);
  await fillValid(page, 'x@error.test');
  await page.locator('#name').fill('Jan');
  await page.getByLabel('Nábytek').check();
  await submitButton(page).click();

  await expect(submitButton(page)).toBeDisabled();
  await expect(submitButton(page)).toHaveText('Odesílám…');
  await expect(page.locator('.js-status')).toHaveText('Odesílám…');
  await page.clock.runFor(500);

  const serverError = page.locator('.js-server-error');
  await expect(serverError).toBeVisible();
  await expect(serverError).toHaveText(SERVER_ERROR);
  // The disabled button dropped focus; it comes back to the re-enabled button, the alert announces itself.
  await expect(submitButton(page)).toBeFocused();
  await expect(submitButton(page)).toBeEnabled();
  await expect(submitButton(page)).toHaveText('Odeslat');
  await expect(page.locator('#email')).toHaveValue('x@error.test');
  await expect(page.locator('#name')).toHaveValue('Jan');
  await expect(page.getByLabel('Nábytek')).toBeChecked();
  await expect(page.locator('#consent')).toBeChecked();
  await expect(page.locator('.js-status')).toBeEmpty();
  await expectNoAxeViolations(page);

  await page.locator('#email').fill('jan@example.cz');
  await submitButton(page).click();
  await page.clock.runFor(500);
  await expect(serverError).toBeHidden();
  await expect(page.locator('.js-success')).toBeVisible();
});

// Puts the page into the server-error state with fake timers (no real 500 ms wait).
async function causeServerError(page) {
  await page.clock.install();
  await page.goto(PAGE);
  await fillValid(page, 'x@error.test');
  await submitButton(page).click();
  await page.clock.runFor(500);
  await expect(page.locator('.js-server-error')).toBeVisible();
}

// A user who moved on to a field while the request was in flight keeps their place.
test('server error does not pull focus away from a field', async ({ page }) => {
  await page.clock.install();
  await page.goto(PAGE);
  await fillValid(page, 'x@error.test');
  await submitButton(page).click();
  await page.locator('#name').focus();
  await page.clock.runFor(500);
  await expect(page.locator('.js-server-error')).toBeVisible();
  await expect(page.locator('#name')).toBeFocused();
});

const EDITS = {
  email: (page) => page.locator('#email').pressSequentially('x'),
  name: (page) => page.locator('#name').pressSequentially('J'),
  interest: (page) => page.getByLabel('Drogerie').check(),
};
for (const [field, edit] of Object.entries(EDITS)) {
  test(`server error hides on the next edit: ${field}`, async ({ page }) => {
    await causeServerError(page);
    await edit(page);
    await expect(page.locator('.js-server-error')).toBeHidden();
  });
}

test('server error, then an invalid email: the field error replaces the alert', async ({ page }) => {
  await causeServerError(page);
  // No input event: the submit itself has to hide the alert, not the first-edit listener.
  await page.locator('#email').evaluate((el) => { el.value = 'abc@'; });
  await submitButton(page).click();
  await expect(page.locator('.js-server-error')).toBeHidden();
  await expect(page.locator('#email-error')).toHaveText('Zadejte e-mail ve tvaru jan@firma.cz.');
  await expect(page.locator('#email')).toBeFocused();
});

test('success state with the theme toggled has no axe violations', async ({ page }) => {
  await page.locator('.js-theme-toggle').click();
  await fillValid(page, 'jan@example.cz');
  await submitButton(page).click();
  await expect(page.locator('.js-success')).toBeVisible();
  await expectNoAxeViolations(page);
});

test('success replaces the form', async ({ page }) => {
  await fillValid(page, 'jan@example.cz');
  await submitButton(page).click();
  await expect(page.locator('.js-success')).toBeVisible();
  await expect(page.locator('#newsletter-form')).toBeHidden();
  await expect(page.locator('.js-success-message')).toHaveText(SUCCESS);
  await expect(page.locator('#success-title')).toBeFocused();
  await expectNoAxeViolations(page);
});

// The payload shape is checked by code review: submitMock stays verbatim inside the IIFE, so a test cannot see its
// argument. What it can see: the trimmed email echoed in the success text.
// The platform already sanitises type=email values (strips surrounding spaces); readData() trims anyway.
test('email with surrounding spaces is accepted', async ({ page }) => {
  await fillValid(page, '  jan@example.cz ');
  await submitButton(page).click();
  await expect(page.locator('.js-success-message')).toHaveText(SUCCESS);
});

test('name of spaces only is accepted', async ({ page }) => {
  await fillValid(page, 'jan@example.cz');
  await page.locator('#name').fill('  ');
  await submitButton(page).click();
  await expect(page.locator('.js-success')).toBeVisible();
  await expect(page.locator('#name-error')).toBeEmpty();
  await expect(page.locator('#name')).not.toHaveAttribute('aria-invalid');
});

test('name is trimmed before the length check', async ({ page }) => {
  await fillValid(page, 'jan@example.cz');
  // maxlength blocks typing past 100, so set the value directly: 100 characters plus surrounding spaces.
  await page.locator('#name').evaluate((el) => { el.value = `  ${'a'.repeat(100)}  `; });
  await submitButton(page).click();
  await expect(page.locator('.js-success')).toBeVisible();
  await expect(page.locator('#name-error')).toBeEmpty();
});

test('double submit sends once', async ({ page }) => {
  await page.clock.install();
  await page.goto(PAGE);
  await fillValid(page, 'jan@example.cz');
  // Count writes to the success message: a second request would rewrite it a second time.
  await page.locator('.js-success-message').evaluate((el) => {
    el.dataset.writes = '0';
    new MutationObserver(() => { el.dataset.writes = String(Number(el.dataset.writes) + 1); })
      .observe(el, { childList: true, characterData: true, subtree: true });
  });
  await page.$eval('#newsletter-form', (form) => { form.requestSubmit(); form.requestSubmit(); });
  await expect(submitButton(page)).toBeDisabled();
  await page.clock.runFor(500);
  await expect(page.locator('.js-success')).toBeVisible();
  await expect(page.locator('.js-success-message')).toHaveAttribute('data-writes', '1');
  await expect(page.locator('.js-status')).toBeEmpty();
});

test('reset returns to a clean form', async ({ page }) => {
  await fillValid(page, 'jan@example.cz');
  await page.locator('#name').fill('Jan');
  await page.getByLabel('Drogerie').check();
  await submitButton(page).click();
  await expect(page.locator('.js-success')).toBeVisible();

  await page.locator('.js-reset').click();
  await expect(page.locator('#newsletter-form')).toBeVisible();
  await expect(page.locator('.js-success')).toBeHidden();
  await expect(page.locator('#email')).toHaveValue('');
  await expect(page.locator('#name')).toHaveValue('');
  for (const box of await page.locator('input[type="checkbox"]').all()) await expect(box).not.toBeChecked();
  await expect(page.locator('[aria-invalid]')).toHaveCount(0);
  await expect(page.locator('.js-server-error')).toBeHidden();
  await expect(page.locator('#email')).toBeFocused();
});

test('uppercase error domain', async ({ page }) => {
  await fillValid(page, 'X@ERROR.TEST');
  await submitButton(page).click();
  await expect(page.locator('.js-server-error')).toBeVisible();
  await expect(page.locator('.js-success')).toBeHidden();
});
