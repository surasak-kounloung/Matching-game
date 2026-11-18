import type { Page } from '@playwright/test';
import { gameConfig } from '../src/config/gameConfig';

export const STAGE_VIEWPORT = { width: 1497, height: 2664 } as const;

const START_TIME = new Date('2026-01-01T00:00:00Z');

/** Freezes the page clock a moment ahead of "now"; time then moves only on `page.clock.fastForward()`. */
export async function pauseClock(page: Page): Promise<void> {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(new Date(now + 1_000));
}

/** Installs Playwright's fake clock, opens the game, waits for fonts and the start button, then pauses time. */
export async function openGame(page: Page): Promise<void> {
  await page.clock.install({ time: START_TIME });
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: 'เริ่มเกม', exact: true }).waitFor({ state: 'visible' });
  await pauseClock(page);
}

/** Presses "เริ่มเกม" and moves time past the countdown, until the dark screen is gone and the round is running. */
export async function startRound(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'เริ่มเกม', exact: true }).click();
  const lead = gameConfig.countdownMs + gameConfig.startCueMs;
  if (lead > 0) await page.clock.fastForward(lead);
  await page.getByTestId('countdown').waitFor({ state: 'detached' });
}

async function downCards(page: Page): Promise<{ id: string; value: string }[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-card][data-face="down"]')].map((el) => ({
      id: el.dataset.card ?? '',
      value: el.querySelector('.card__front')?.textContent?.trim() ?? '',
    })),
  );
}

async function tap(page: Page, id: string): Promise<void> {
  await page.locator(`[data-card="${id}"]`).dispatchEvent('pointerdown', { button: 0, pointerType: 'touch' });
}

/** Taps face-down 48 cards two at a time until `n` pairs are matched. */
export async function matchPairs(page: Page, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    const targets = (await downCards(page)).filter((c) => c.value === '48');
    const [a, b] = targets;
    if (!a || !b) throw new Error('fewer than two face-down 48 cards left');
    await tap(page, a.id);
    await tap(page, b.id);
  }
}

/** Taps one face-down 48 and one decoy, leaving a mismatched pair open. */
export async function openMismatch(page: Page): Promise<void> {
  const cards = await downCards(page);
  const target = cards.find((c) => c.value === '48');
  const decoy = cards.find((c) => c.value !== '48');
  if (!target || !decoy) throw new Error('no 48 card and decoy available');
  await tap(page, target.id);
  await tap(page, decoy.id);
}
