import { expect, test, type Page } from '@playwright/test';
import { gameConfig } from '../src/config/gameConfig';
import { openGame, openMismatch, startRound } from './helpers';

/**
 * One look at all 42 cards, from computed styles:
 * - `shown`: number faces (`.card__front`) whose visibility is not `hidden`
 * - `turned`: cards whose `.card__inner` transform is not the identity, i.e. turned or turning
 * - `facing`: number faces that are shown and point at the viewer (the inner turn is past 90°)
 * - `flipping`: cards with a flip transition running on `.card__inner`
 * The fake clock stops requestAnimationFrame, so the test samples from its own side;
 * CSS transitions still run in real time.
 */
function look(page: Page) {
  return page.evaluate(() => {
    const counts = { cards: 0, shown: 0, turned: 0, facing: 0, flipping: 0 };
    for (const card of document.querySelectorAll('[data-card]')) {
      const inner = card.querySelector('.card__inner')!;
      const front = card.querySelector('.card__front')!;
      const transform = getComputedStyle(inner).transform;
      const turn = transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform);
      const shown = getComputedStyle(front).visibility !== 'hidden';
      counts.cards++;
      if (shown) counts.shown++;
      if (!turn.isIdentity) counts.turned++;
      if (shown && turn.m11 < 0) counts.facing++;
      if (inner.getAnimations().length > 0) counts.flipping++;
    }
    return counts;
  });
}

test('pressing เริ่มเกมใหม่ after a round never shows or turns a card face before the next round', async ({ page }) => {
  await openGame(page);
  await startRound(page);
  await page.clock.fastForward(gameConfig.timeLimitMs);
  const dialog = page.getByRole('dialog', { name: 'หมดเวลาแล้ว!' });
  await expect(dialog).toBeVisible();
  // the end-of-round reveal has finished: every number faces the viewer and nothing is moving
  await expect.poll(() => look(page)).toMatchObject({ cards: 42, facing: 42, flipping: 0 });

  await page.clock.fastForward(gameConfig.restartLockMs);
  await dialog.getByRole('button', { name: 'เริ่มเกมใหม่' }).click();

  const samples: (Awaited<ReturnType<typeof look>> & { ms: number })[] = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 500) samples.push({ ms: Date.now() - t0, ...(await look(page)) });

  await expect(page.getByRole('button', { name: 'เริ่มเกม', exact: true })).toBeVisible();
  expect(samples.length).toBeGreaterThan(10);
  const bad = samples.filter((s) => s.cards !== 42 || s.shown > 0 || s.turned > 0 || s.flipping > 0);
  expect(bad, 'samples in which a card face was shown or a card was turning').toEqual([]);
});

test('cards still turn with their animation during play, on a missed pair and at the end of a round', async ({ page }) => {
  const settled = () => expect.poll(async () => (await look(page)).flipping).toBe(0);
  await openGame(page);
  await startRound(page);

  await openMismatch(page);
  expect((await look(page)).flipping).toBe(2);
  await settled();

  // the game applies the flip-back on its first 50 ms tick at or after mismatchMs
  await page.clock.fastForward(gameConfig.mismatchMs + 50);
  await expect(page.locator('[data-card][data-face="up"]')).toHaveCount(0);
  expect((await look(page)).flipping).toBe(2);
  await settled();

  await page.clock.fastForward(gameConfig.timeLimitMs);
  await expect(page.getByRole('dialog', { name: 'หมดเวลาแล้ว!' })).toBeVisible();
  expect((await look(page)).flipping).toBe(42);
});
