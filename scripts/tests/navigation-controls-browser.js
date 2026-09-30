// Run with playwright-cli run-code --filename after opening the local app.
async (page) => {
  const base = await page.evaluate(() => window.location.origin);
  const pressed = async (name, expected) => {
    const actual = await page.getByRole('button', { name, exact: true }).getAttribute('aria-pressed');
    if (actual !== String(expected)) throw new Error(`${name}: expected pressed=${expected}, got ${actual}`);
  };
  await page.goto(`${base}/timeline`);
  await page.getByRole('heading', { name: 'AI Timeline', exact: true }).waitFor();
  await pressed('All history', true);
  await pressed('1950-2005', false);
  await page.getByRole('button', { name: '1950-2005', exact: true }).click();
  await pressed('1950-2005', true);
  await pressed('All history', false);
  await pressed('Paper', false);
  await page.getByRole('button', { name: 'Paper', exact: true }).click();
  await pressed('Paper', true);
  await page.getByRole('button', { name: 'Paper', exact: true }).click();
  await pressed('Paper', false);
  await pressed('Timeline', true);
  await page.getByRole('button', { name: 'Matrix', exact: true }).click();
  await pressed('Matrix', true);
  await pressed('Timeline', false);
  await page.getByRole('table', { name: 'AI timeline event matrix' }).waitFor();
  await page.screenshot({ path: 'output/playwright/navigation-controls-timeline.png' });

  await page.goto(`${base}/tools`);
  const cell = page.getByRole('button', { name: /^Text to Text: \d+ tools$/ });
  await cell.hover();
  const preview = page.getByRole('button', { name: 'Close tool preview', exact: true });
  await preview.waitFor();
  if (await preview.getAttribute('type') !== 'button') throw new Error('Preview close must not submit');
  await preview.focus();
  await page.keyboard.press('Enter');
  await preview.waitFor({ state: 'hidden' });
  await cell.focus();
  await page.keyboard.press('Enter');
  const details = page.getByRole('button', { name: 'Close tool details', exact: true });
  await details.waitFor();
  if (await details.getAttribute('type') !== 'button') throw new Error('Details close must not submit');
  await page.screenshot({ path: 'output/playwright/navigation-controls-tools.png' });
  await details.focus();
  await page.keyboard.press('Enter');
  await details.waitFor({ state: 'hidden' });

  await page.goto(`${base}/model-watch`);
  await page.getByRole('heading', { name: 'Model Watch', exact: true }).waitFor();
  const count = await page.locator('.model-watch-stats > div').first().locator('span').textContent();
  if (count !== '104') throw new Error(`Expected normalized fixture count 104, got ${count}`);
  return { status: 'PASS', checks: ['range/category/view pressed transitions', 'named non-submit tool close buttons and keyboard dismissal', 'normalized model count 104'] };
}
