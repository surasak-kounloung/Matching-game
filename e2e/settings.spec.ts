import { expect, test, type Page } from '@playwright/test';
import { gameConfig } from '../src/config/gameConfig';
import { PIN_KEY, SETTINGS_KEY } from '../src/settings/settingsStore';
import { openGame, pauseClock, startRound } from './helpers';

const two = (seconds: number) => String(seconds).padStart(2, '0');
const DEFAULT_SECONDS = gameConfig.timeLimitMs / 1_000;
// move the round time by 5 seconds, in whichever direction stays inside 5 to 99
const UP = DEFAULT_SECONDS + 5 <= 99;
const CHANGED_SECONDS = UP ? DEFAULT_SECONDS + 5 : DEFAULT_SECONDS - 5;
const FIVE = UP ? '+5' : '−5';

const centre = (box: { x: number; y: number; width: number; height: number }) =>
  [box.x + box.width / 2, box.y + box.height / 2] as const;
const covered = (page: Page, x: number, y: number) =>
  page.evaluate(([px, py]) => !!document.elementFromPoint(px!, py!)?.closest('[data-testid="admin"]'), [x, y]);

/** Presses the mouse at a point, lets the given time pass, and releases. */
async function holdAt(page: Page, [x, y]: readonly [number, number], ms = 3_000): Promise<void> {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.clock.fastForward(ms);
  await page.mouse.up();
}
const titlePoint = async (page: Page) => centre((await page.getByTestId('settings-hotspot').boundingBox())!);

async function typePin(page: Page, pin: string): Promise<void> {
  for (const digit of pin) await page.getByTestId('admin').getByRole('button', { name: digit, exact: true }).click();
}

test('staff hold the title, set a PIN, change the round time, and the value survives a reload', async ({ page }) => {
  await openGame(page);
  const admin = page.getByTestId('admin');
  const heading = admin.getByRole('heading');
  const timer = page.getByTestId('timer-value');
  const title = await titlePoint(page);

  await holdAt(page, title, 2_500); // not long enough
  await expect(admin).toHaveCount(0);

  await holdAt(page, title);
  await expect(heading).toHaveText('ตั้งรหัส PIN 4 หลัก');
  await typePin(page, '2468');
  await expect(heading).toHaveText('ใส่รหัส PIN อีกครั้ง');
  await typePin(page, '2468');
  await expect(heading).toHaveText('ตั้งค่าเกม');
  await expect(admin.getByTestId('settings-warning')).toHaveCount(0);

  await admin.getByRole('group', { name: 'เวลาเล่นต่อรอบ' }).getByRole('button', { name: FIVE, exact: true }).click();
  await expect(admin.getByTestId('setting-timeLimitMs')).toHaveText(String(CHANGED_SECONDS));
  await expect(timer).toHaveText(two(DEFAULT_SECONDS)); // not applied before it is saved
  await admin.getByRole('button', { name: 'บันทึก' }).click();
  await expect(admin).toHaveCount(0);
  await expect(timer).toHaveText(two(CHANGED_SECONDS));

  // the value and the PIN are still there after the page is loaded again
  await page.clock.resume();
  await page.reload();
  await page.getByRole('button', { name: 'เริ่มเกม', exact: true }).waitFor({ state: 'visible' });
  await pauseClock(page);
  await expect(timer).toHaveText(two(CHANGED_SECONDS));

  // and the next round really lasts that long
  await startRound(page);
  await page.clock.fastForward(CHANGED_SECONDS * 1_000 - 1_000);
  await expect(timer).toHaveText('01');
  await expect(page.locator('[data-popup]')).toHaveCount(0);
  await page.clock.fastForward(1_000);
  await expect(page.locator('[data-popup]')).toBeVisible();
  await page.clock.fastForward(gameConfig.restartLockMs);
  await page.locator('[data-popup]').getByRole('button', { name: 'เริ่มเกมใหม่' }).click();
  await expect(page.getByTestId('settings-hotspot')).toHaveCount(1);

  // now the PIN is asked for: a wrong one is refused, the right one opens the saved value
  await holdAt(page, title);
  await expect(heading).toHaveText('ใส่รหัส PIN');
  await typePin(page, '0000');
  await expect(admin.getByTestId('pin-message')).toContainText('รหัสไม่ถูกต้อง');
  await expect(heading).toHaveText('ใส่รหัส PIN');
  await typePin(page, '2468');
  await expect(admin.getByTestId('setting-timeLimitMs')).toHaveText(String(CHANGED_SECONDS));

  // back to the build's values
  await admin.getByRole('button', { name: 'คืนค่าเริ่มต้น' }).click();
  await admin.getByRole('button', { name: 'บันทึก' }).click();
  await expect(timer).toHaveText(two(DEFAULT_SECONDS));
  expect(await page.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY)).toBeNull();
  expect(await page.evaluate((key) => localStorage.getItem(key), PIN_KEY)).toBe('2468');
});

test('the settings cover the whole game, close when left alone, and close after three wrong PINs', async ({ page }) => {
  await page.addInitScript(([key, pin]) => localStorage.setItem(key!, pin!), [PIN_KEY, '1357']);
  await openGame(page);
  const admin = page.getByTestId('admin');
  const startButton = page.getByRole('button', { name: 'เริ่มเกม', exact: true });
  const title = await titlePoint(page);
  const start = centre((await startButton.boundingBox())!);
  const card = centre((await page.locator('[data-card="20"]').boundingBox())!);

  await holdAt(page, title);
  await expect(admin.getByRole('heading')).toHaveText('ใส่รหัส PIN');
  // the dark screen is the top-most element over the start button, a card and the title
  for (const [x, y] of [start, card, title]) expect(await covered(page, x, y)).toBe(true);
  // the keys fit on the screen
  const viewport = page.viewportSize()!;
  for (const name of ['1', '3', '0', 'ลบ', 'ยกเลิก']) {
    const box = (await admin.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(box.x, name).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, name).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height, name).toBeLessThanOrEqual(viewport.height);
  }

  // left alone for 30 seconds, it goes away and the game can be played
  await page.clock.fastForward(30_000);
  await expect(admin).toHaveCount(0);
  await expect(startButton).toBeVisible();

  await holdAt(page, title);
  await typePin(page, '0000');
  await typePin(page, '1111');
  await expect(admin).toHaveCount(1);
  await typePin(page, '2222');
  await expect(admin).toHaveCount(0);
  await expect(page.getByTestId('timer-value')).toHaveText(two(DEFAULT_SECONDS));
});

test('the settings reach the edges of a screen that is wider than 9:16, and the panel fits on it', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1920 });
  await page.addInitScript(([key, pin]) => localStorage.setItem(key!, pin!), [PIN_KEY, '1357']);
  await openGame(page);
  const admin = page.getByTestId('admin');
  await holdAt(page, await titlePoint(page));
  await expect(admin).toBeVisible();
  for (const [x, y] of [[5, 5], [5, 960], [1395, 960], [1395, 1915]] as const) {
    expect(await covered(page, x, y), `point ${x},${y}`).toBe(true);
  }
  await typePin(page, '1357');
  await expect(admin.getByRole('heading')).toHaveText('ตั้งค่าเกม');
  for (const name of ['คืนค่าเริ่มต้น', 'เปลี่ยนรหัส PIN', 'ยกเลิก', 'บันทึก']) {
    const box = (await admin.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(box.x, name).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, name).toBeLessThanOrEqual(1400);
    expect(box.y, name).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, name).toBeLessThanOrEqual(1920);
  }
});

test('the title does nothing during a round', async ({ page }) => {
  await openGame(page);
  const title = await titlePoint(page);
  await startRound(page);
  await expect(page.getByTestId('settings-hotspot')).toHaveCount(0);
  await holdAt(page, title);
  await expect(page.getByTestId('admin')).toHaveCount(0);
  await expect(page.getByTestId('timer-value')).toHaveText(two(DEFAULT_SECONDS - 3));
});
