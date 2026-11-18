import { expect, test, type Page } from '@playwright/test';
import { gameConfig } from '../src/config/gameConfig';
import { matchPairs, openGame, startRound } from './helpers';

// Colours come from CSS, which only a real browser computes.
const RED = 'rgb(182, 16, 16)'; // #b61010, the time-up headline in the artwork
const GREEN = 'rgb(77, 116, 0)'; // #4d7400, the artwork's green for matched numbers

const headlineColour = (page: Page) =>
  page.locator('[data-popup] .popup__headline-text').evaluate((el) => getComputedStyle(el).color);

test('the time-up headline หมดเวลาแล้ว! is red', async ({ page }) => {
  await openGame(page);
  await startRound(page);
  await page.clock.fastForward(gameConfig.timeLimitMs);
  await expect(page.getByRole('dialog', { name: 'หมดเวลาแล้ว!' })).toBeVisible();
  expect(await headlineColour(page)).toBe(RED);
});

test('the win headline ยินดีด้วย! is green', async ({ page }) => {
  await openGame(page);
  await startRound(page);
  await matchPairs(page, gameConfig.targetPairs);
  await expect(page.getByRole('dialog', { name: 'ยินดีด้วย!' })).toBeVisible();
  expect(await headlineColour(page)).toBe(GREEN);
});
