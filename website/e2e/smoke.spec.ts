import { expect, test } from '@playwright/test';

test('home page links into the curriculum', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: /Java Collections & Utilities Handbook/ })).toBeVisible();
  await page.getByRole('link', { name: /Browse the curriculum/ }).click();
  await expect(page).toHaveURL(/#\/learn$/);
  await expect(page.getByRole('heading', { name: 'Curriculum' })).toBeVisible();
  await expect(page.getByText('Coming soon').first()).toBeVisible();
});

test('a lesson renders all sections, an example and a visualization', async ({ page }) => {
  await page.goto('./#/learn/maps/hashmap-internals-collisions-and-resizing');
  await expect(page.locator('#lesson-body h2')).toHaveCount(18);
  await expect(page.getByText('package dev.handbook.m07;').first()).toBeVisible();
  await page.getByRole('button', { name: /collisions & treeify/ }).click();
  await page.getByRole('button', { name: /Finish/ }).click();
  await expect(page.getByLabel(/\(tree bin\)/)).toHaveCount(1);
});

test('search opens with the keyboard and navigates', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('/');
  await page.getByRole('combobox').fill('removeEldestEntry');
  await expect(page.getByRole('option').first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/linkedhashmap-and-lru-cache/);
});

test('progress survives a reload and theme toggles', async ({ page }) => {
  await page.goto('./#/learn/fundamentals/big-o-time-and-space');
  await page.getByRole('checkbox', { name: /Concept understood/ }).check();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: /Concept understood/ })).toBeChecked();
  const html = page.locator('html');
  const before = await html.getAttribute('class');
  await page.getByRole('button', { name: /Switch to (dark|light) theme/ }).click();
  await expect(html).not.toHaveAttribute('class', before ?? '');
});
