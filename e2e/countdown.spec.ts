import { expect, test, type Page } from '@playwright/test';
import { gameConfig } from '../src/config/gameConfig';
import { openGame } from './helpers';

const LEAD = gameConfig.countdownMs + gameConfig.startCueMs;
test.skip(LEAD === 0, 'the countdown is turned off in gameConfig');

const two = (seconds: number) => String(seconds).padStart(2, '0');
const covered = (page: Page, x: number, y: number) =>
  page.evaluate(([px, py]) => !!document.elementFromPoint(px!, py!)?.closest('[data-testid="countdown"]'), [x, y]);
const centre = (box: { x: number; y: number; width: number; height: number }) =>
  [box.x + box.width / 2, box.y + box.height / 2] as const;

test('the countdown covers the game, blocks every touch, then the round starts with the full time', async ({ page }) => {
  await openGame(page);
  const startButton = page.getByRole('button', { name: 'เริ่มเกม', exact: true });
  const [bx, by] = centre((await startButton.boundingBox())!);
  const [cx, cy] = centre((await page.locator('[data-card="20"]').boundingBox())!);
  await startButton.click();

  const overlay = page.getByTestId('countdown');
  await expect(overlay).toBeVisible();
  if (gameConfig.countdownMs > 0) await expect(overlay).toHaveText(String(gameConfig.countdownMs / 1_000));

  // the dark screen is the top-most element over the bar button and over a card
  expect(await covered(page, bx, by)).toBe(true);
  expect(await covered(page, cx, cy)).toBe(true);

  // real pointer input goes nowhere
  await page.mouse.click(bx, by);
  await page.mouse.click(cx, cy);
  await expect(overlay).toBeVisible();
  await expect(page.locator('[data-card][data-face="down"]')).toHaveCount(42);
  // and no number face can be seen through it
  expect(await page.evaluate(() =>
    [...document.querySelectorAll('.card__front')].filter((el) => getComputedStyle(el).visibility !== 'hidden').length)).toBe(0);

  await page.clock.fastForward(gameConfig.countdownMs);
  if (gameConfig.startCueMs > 0) {
    await expect(overlay).toHaveText('เริ่ม!');
    await page.clock.fastForward(gameConfig.startCueMs);
  }
  await expect(overlay).toBeHidden();
  await expect(page.getByTestId('timer-value')).toHaveText(two(gameConfig.timeLimitMs / 1_000));
  await page.clock.fastForward(1_000);
  await expect(page.getByTestId('timer-value')).toHaveText(two(gameConfig.timeLimitMs / 1_000 - 1));
});

test('the dark screen reaches the edges of a screen that is wider than 9:16', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1920 });
  await openGame(page);
  await page.getByRole('button', { name: 'เริ่มเกม', exact: true }).click();
  await expect(page.getByTestId('countdown')).toBeVisible();
  for (const [x, y] of [[5, 5], [5, 960], [1395, 960], [1395, 1915]] as const) {
    expect(await covered(page, x, y), `point ${x},${y}`).toBe(true);
  }
});
