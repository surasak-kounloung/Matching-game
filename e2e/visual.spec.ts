import { expect, test, type Page } from '@playwright/test';
import { gameConfig } from '../src/config/gameConfig';
import { matchPairs, openGame, openMismatch, STAGE_VIEWPORT } from './helpers';

/**
 * Screenshots for tools/compare_screens.py, saved to e2e/screens/ (git-ignored).
 * The page clock stays paused after openGame, so a mismatched pair stays open
 * until time is moved on; `animations: 'disabled'` captures the end state of
 * every flip, pop and fade.
 */
async function shoot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${test.info().project.testDir}/screens/${name}.png`, animations: 'disabled' });
}

async function start(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'เริ่มเกม', exact: true }).click();
}

test.use({ viewport: STAGE_VIEWPORT });

test('ready', async ({ page }) => {
  await openGame(page);
  await shoot(page, 'ready');
});

test('playing with a mismatched pair open', async ({ page }) => {
  await openGame(page);
  await start(page);
  await openMismatch(page);
  await expect(page.locator('[data-card][data-face="up"]')).toHaveCount(2);
  await shoot(page, 'playing');
});

test('time up: popup, then the revealed board', async ({ page }) => {
  await openGame(page);
  await start(page);
  await matchPairs(page, 4);
  await expect(page.getByTestId('counter-value')).toHaveText('4/7');
  await page.clock.fastForward(gameConfig.timeLimitMs);
  await expect(page.getByRole('dialog', { name: 'หมดเวลาแล้ว!' })).toBeVisible();
  await shoot(page, 'timeup-popup');

  await page.addStyleTag({ content: '[data-popup]{visibility:hidden}' });
  await shoot(page, 'timeup-board');
});

test('won', async ({ page }) => {
  await openGame(page);
  await start(page);
  await matchPairs(page, 7);
  await expect(page.getByRole('dialog', { name: 'ยินดีด้วย!' })).toBeVisible();
  await shoot(page, 'won-popup');
});
