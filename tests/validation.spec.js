import { test, expect } from '@playwright/test';
import { PAGE, expectNoAxeViolations } from './helpers.js';

const EMAIL_REQUIRED = 'Vyplňte e-mail.';
const NAME_HINT = '(nepovinné, max. 100 znaků)';
const NAME_TOO_LONG = 'Jméno může mít nejvýše 100 znaků.';
const EMAIL_INVALID = 'Zadejte e-mail ve tvaru jan@firma.cz.';
const CONSENT_REQUIRED = 'Pro přihlášení potvrďte souhlas se zpracováním údajů.';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

const submit = (page) => page.getByRole('button', { name: 'Odeslat' }).click();

test('empty submit shows errors and focuses email', async ({ page }) => {
  // Fake timers: run past submitMock's 500 ms to prove nothing was sent, without a real wait.
  await page.clock.install();
  await page.goto(PAGE);
  await submit(page);
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#email-error')).toHaveText(EMAIL_REQUIRED);
  await expect(page.locator('#consent-error')).toHaveText(CONSENT_REQUIRED);
  await expect(page.locator('#name')).not.toHaveAttribute('aria-invalid');
  await expect(page.locator('#email')).toBeFocused();
  await page.clock.runFor(800);
  await expect(page.locator('.js-success')).toBeHidden();
  await expect(page.locator('.js-submit')).toHaveText('Odeslat');
  await expectNoAxeViolations(page);
});

test('invalid email message', async ({ page }) => {
  await page.locator('#email').fill('abc@');
  await submit(page);
  await expect(page.locator('#email-error')).toHaveText(EMAIL_INVALID);
});

for (const address of ['a+b@sub.example.cz', 'jan.novak@mail.example.co.uk']) {
  test(`valid address accepted on submit: ${address}`, async ({ page }) => {
    await page.locator('#email').fill(address);
    await page.locator('#consent').check();
    await submit(page);
    await expect(page).toHaveURL(/index\.html$/);
    await expect(page.locator('.js-success')).toBeVisible();
    await expect(page.locator('#email')).not.toHaveAttribute('aria-invalid');
    await expect(page.locator('#email-error')).toBeEmpty();
  });
}

for (const address of ['a@b', 'a b@c.cz', '@c.cz']) {
  test(`rejects ${address}`, async ({ page }) => {
    await page.locator('#email').fill(address);
    await page.locator('#email').blur();
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#email-error')).toHaveText(EMAIL_INVALID);
  });
}

test('blur on empty untouched field shows nothing', async ({ page }) => {
  await page.locator('#email').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#email')).not.toHaveAttribute('aria-invalid');
  await expect(page.locator('#email-error')).toBeEmpty();
});

test('error clears when fixed', async ({ page }) => {
  await submit(page);
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#consent')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#email').fill('jan@example.cz');
  await expect(page.locator('#email')).not.toHaveAttribute('aria-invalid');
  await expect(page.locator('#email-error')).toBeEmpty();
  await expect(page.locator('.js-field').filter({ has: page.locator('#email') })).not.toHaveClass(/is-invalid/);
  await page.locator('#consent').check();
  await expect(page.locator('#consent-error')).toBeEmpty();
  await expect(page.locator('#consent')).not.toHaveAttribute('aria-invalid');
});

test('unchanged error text is not rewritten while typing', async ({ page }) => {
  await page.locator('#email').fill('a');
  await submit(page);
  await expect(page.locator('#email-error')).toHaveText(EMAIL_INVALID);
  await page.locator('#email-error').evaluate((el) => {
    el.dataset.writes = '0';
    new MutationObserver(() => { el.dataset.writes = String(Number(el.dataset.writes) + 1); })
      .observe(el, { childList: true, characterData: true, subtree: true });
  });
  await page.locator('#email').pressSequentially('bc');
  await page.locator('#email').blur();
  await expect(page.locator('#email-error')).toHaveText(EMAIL_INVALID);
  await expect(page.locator('#email-error')).toHaveAttribute('data-writes', '0');
});

test('name over 100 chars', async ({ page }) => {
  const name = page.locator('#name');
  await name.evaluate((el) => { el.value = 'a'.repeat(101); });
  await submit(page);
  await expect(page.locator('#name-error')).toHaveText(NAME_TOO_LONG);
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await name.evaluate((el) => { el.value = 'a'.repeat(100); });
  await submit(page);
  await expect(page.locator('#name-error')).toBeEmpty();
  await expect(name).not.toHaveAttribute('aria-invalid');
});

test('focus goes to first invalid in DOM order', async ({ page }) => {
  await page.locator('#email').fill('jan@example.cz');
  await submit(page);
  await expect(page.locator('#consent')).toBeFocused();
  await expect(page.locator('#email')).not.toHaveAttribute('aria-invalid');
});

// Errors reach a screen reader through aria-describedby, whatever the live regions do.
const containing = (text) => new RegExp(text.replace(/[.()]/g, '\\$&'));

test('errors are part of the accessible description', async ({ page }) => {
  const name = page.locator('#name');
  await expect(name).toHaveAccessibleDescription(NAME_HINT);
  await name.evaluate((el) => { el.value = 'a'.repeat(101); });
  await submit(page);
  await expect(page.locator('#email')).toHaveAccessibleDescription(containing(EMAIL_REQUIRED));
  await expect(page.locator('#consent')).toHaveAccessibleDescription(containing(CONSENT_REQUIRED));
  await expect(name).toHaveAccessibleDescription(containing(NAME_HINT));
  await expect(name).toHaveAccessibleDescription(containing(NAME_TOO_LONG));
});

// maxlength does not limit scripted or autofilled values, so the length rule still runs on blur.
test('over-long name shows the error on blur', async ({ page }) => {
  const name = page.locator('#name');
  await name.focus();
  await name.evaluate((el) => {
    el.value = 'a'.repeat(101);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.keyboard.press('Tab');
  await expect(page.locator('#name-error')).toHaveText(NAME_TOO_LONG);
  await expect(name).toHaveAttribute('aria-invalid', 'true');
});

// The evaluators' scenario: type a bad address, then click. The blur shows an error, and that must not move the
// control under the pointer, or the first click is lost.
test('first click on Odeslat after a bad email is handled', async ({ page }) => {
  await page.locator('#email').pressSequentially('abc@');
  await page.click('.js-submit');
  await expect(page.locator('#email-error')).toHaveText(EMAIL_INVALID);
  // Only a handled submit validates consent and moves focus back to the email.
  await expect(page.locator('#consent-error')).toHaveText(CONSENT_REQUIRED);
  await expect(page.locator('#email')).toBeFocused();
});

test('first click on the consent checkbox after a bad email lands', async ({ page }) => {
  await page.locator('#email').pressSequentially('abc@');
  await page.click('#consent');
  await expect(page.locator('#consent')).toBeChecked();
});

// At 320 px the errors triggered on blur fit on one line, so the checkbox does not move mid-click. The consent error wraps, but it only appears on submit.
test('first click on the consent checkbox after a bad email lands at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.locator('#email').pressSequentially('abc@');
  await page.click('#consent');
  await expect(page.locator('#consent')).toBeChecked();
});

// Focus moving to the submit button leaves validation to the submit handler: no error appears before the submit.
test('moving focus to Odeslat shows no blur error', async ({ page }) => {
  await page.locator('#email').pressSequentially('abc@');
  await page.focus('.js-submit');
  await expect(page.locator('.js-submit')).toBeFocused();
  await expect(page.locator('#email-error')).toBeEmpty();
  await expect(page.locator('#email')).not.toHaveAttribute('aria-invalid');
});
