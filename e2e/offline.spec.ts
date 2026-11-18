import { expect, test } from '@playwright/test';
import { gameConfig } from '../src/config/gameConfig';
import { matchPairs, openGame, pauseClock, startRound } from './helpers';

test('plays a full round with the network off after one online visit', async ({ page, context }) => {
  await openGame(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // let the service worker control the page
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await pauseClock(page);

  await expect(page.getByRole('button', { name: 'เริ่มเกม', exact: true })).toBeVisible();
  // document.fonts.check() returns true when no font by that name exists, so inspect FontFace status directly
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')));
  expect(loaded).toContain('Gotham');
  expect(loaded).toContain('IBM Plex Sans Thai');
  const stageBg = await page.getByTestId('stage').evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(await page.evaluate(async (css) => {
    const url = css.slice(5, -2);
    return (await fetch(url)).ok;
  }, stageBg)).toBe(true);

  await startRound(page);
  await matchPairs(page, 4);
  await expect(page.getByTestId('counter-value')).toHaveText('4/7');
  await expect(page.getByTestId('prize1-active')).toBeVisible();

  await page.clock.fastForward(gameConfig.timeLimitMs);
  const dialog = page.getByRole('dialog', { name: 'หมดเวลาแล้ว!' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId('popup-result')).toHaveText(/คุณจับคู่ได้\s*4\s*คู่/);

  await page.clock.fastForward(gameConfig.restartLockMs);
  await dialog.getByRole('button', { name: 'เริ่มเกมใหม่' }).click();
  await expect(page.getByRole('button', { name: 'เริ่มเกม', exact: true })).toBeVisible();
  await expect(page.getByTestId('counter-value')).toHaveText('0/7');
});

test('makes no request to any other host', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173')) foreign.push(r.url()); });
  await openGame(page);
  await startRound(page);
  await page.clock.fastForward(gameConfig.timeLimitMs + gameConfig.restartLockMs);
  expect(foreign).toEqual([]);
});
