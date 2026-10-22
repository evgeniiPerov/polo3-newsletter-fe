import { test, expect } from '@playwright/test';
import { PAGE, fillValid } from './helpers.js';

// Tabs once and asserts the newly focused element shows a visible outline.
async function tab(page) {
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).not.toBe('0px');
  expect(['rgba(0, 0, 0, 0)', 'transparent']).not.toContain(outline.color);
}

const noHorizontalScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('keyboard-only signup', async ({ page }) => {
  await page.goto(PAGE);

  // The heading is not focusable, so the theme toggle after it is the first Tab stop.
  await tab(page);
  await expect(page.locator('.js-theme-toggle')).toBeFocused();

  await tab(page);
  await expect(page.locator('#email')).toBeFocused();
  await page.keyboard.type('jan@example.cz');

  await tab(page);
  await expect(page.locator('#name')).toBeFocused();

  const interests = page.locator('input[name="interests"]');
  for (let i = 0; i < 3; i += 1) {
    await tab(page);
    await expect(interests.nth(i)).toBeFocused();
    if (i === 1) await page.keyboard.press('Space');
  }
  await expect(interests.nth(1)).toBeChecked();

  await tab(page);
  await expect(page.locator('#consent')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#consent')).toBeChecked();

  await tab(page);
  await expect(page.locator('a[href="podminky.html"]')).toBeFocused();

  await tab(page);
  await expect(page.locator('.js-submit')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.js-success')).toBeVisible();

  await tab(page);
  await expect(page.locator('.js-reset')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#email')).toBeFocused();
});

test('enter in email field submits', async ({ page }) => {
  await page.goto(PAGE);
  await page.locator('#email').focus();
  await page.keyboard.type('neplatny-email');
  await page.keyboard.press('Enter');
  await expect(page.locator('#email-error')).not.toBeEmpty();
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#email')).toBeFocused();
  await expect(page.locator('.js-success')).toBeHidden();
});

// REQ-F3 "formulář max. 640 px široký, vycentrovaný": the `.page` sheet is the visible box holding the form.
for (const width of [320, 360, 768, 1280]) {
  test(`widths: ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PAGE);
    expect(await noHorizontalScroll(page)).toBe(true);
    if (width < 768) return;

    const box = await page.locator('.page').boundingBox();
    expect(box.width).toBeLessThanOrEqual(640);
    const right = width - (box.x + box.width);
    expect(Math.abs(box.x - right)).toBeLessThanOrEqual(1);
  });
}

test('long email at 360', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto(PAGE);
  await fillValid(page, `${'a'.repeat(80)}@example.cz`);
  await page.locator('.js-submit').click();
  await expect(page.locator('.js-success')).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
});

// Interest tiles: one column on phones, one row from md.
const tileBoxes = async (page) => {
  const boxes = [];
  for (const tile of await page.locator('.checkbox-tile').all()) boxes.push(await tile.boundingBox());
  return boxes;
};

test('interest tiles stack at 360', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto(PAGE);
  const boxes = await tileBoxes(page);
  expect(boxes).toHaveLength(3);
  for (let i = 1; i < boxes.length; i += 1) {
    expect(boxes[i].x).toBe(boxes[0].x);
    expect(boxes[i].y).toBeGreaterThan(boxes[i - 1].y);
  }
});

test('interest tiles share a row at 768', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(PAGE);
  const boxes = await tileBoxes(page);
  expect(boxes).toHaveLength(3);
  for (const box of boxes) expect(box.y).toBe(boxes[0].y);
});
