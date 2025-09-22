import { test, expect } from '@playwright/test';

test('cache lab core flows', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Cache Learning Lab' })).toBeVisible();

  // Mapping explorer
  await page.getByRole('textbox', { name: 'Addresses to map' }).fill('0x00 0x08 0x10 0x00');
  await page.getByRole('button', { name: 'Map Addresses' }).click();
  await expect(page.getByRole('cell', { name: 'Hit ✅' })).toBeVisible();

  // Replacement simulator
  await page.getByRole('tab', { name: 'Replacement Simulator' }).click();
  await expect(page.getByRole('columnheader', { name: 'Hit Ratio' })).toBeVisible();

  // Parameter playground
  await page.getByRole('tab', { name: 'Parameter Playground' }).click();
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();

  // Miss classifier
  await page.getByRole('tab', { name: 'Miss Classifier' }).click();
  await expect(page.getByRole('table')).toBeVisible();

  // Hierarchy and pipeline quick check
  await page.getByRole('tab', { name: 'Hierarchy Explorer' }).click();
  await expect(page.getByText('Current AMAT')).toBeVisible();
  await page.getByRole('tab', { name: 'Pipeline Impact' }).click();
  await expect(page.getByText('Estimated CPI')).toBeVisible();

  // Trace loader
  await page.getByRole('tab', { name: 'Trace Loader' }).click();
  await page.getByRole('button', { name: 'Sequential 0..255' }).click();
  await expect(page.getByText('Loaded sample')).toBeVisible();

  // Dashboard tab navigation
  await page.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Performance Dashboard' })).toBeVisible();
});
