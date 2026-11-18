import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { PIN_KEY, SETTINGS_KEY, type KeyValueStore } from './settings/settingsStore';
import { createTestClock, mulberry32 } from './test/clock';
import { brokenStore, memoryStore } from './test/memoryStore';
import { countdownTestConfig, testConfig } from './test/testConfig';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// Every test gets its own store in memory; none touches the browser's real localStorage.
const setup = (config = testConfig, storage: KeyValueStore | null = memoryStore()) => {
  const clock = createTestClock();
  const { container } = render(<App config={config} deps={{ now: clock.now, rng: mulberry32(7) }} storage={storage} />);
  const all = () => Array.from(container.querySelectorAll<HTMLElement>('[data-card]'));
  const withValue = (v: string) => all().filter((el) => el.querySelector('.card__front')?.textContent === v);
  const tap = (el: HTMLElement) => fireEvent.pointerDown(el, { button: 0, pointerType: 'touch' });
  const matchPairs = (n: number) => {
    const targets = withValue('48').filter((el) => el.dataset.face === 'down');
    for (let i = 0; i < n * 2; i++) tap(targets[i]!);
  };
  const press = (name: string, scope: HTMLElement = container) =>
    fireEvent.click(within(scope).getByRole('button', { name }));
  const layout = () => all().map((el) => el.querySelector('.card__front')?.textContent);
  const concealed = () => container.querySelector<HTMLElement>('[data-concealed="true"]');
  const hotspot = () => screen.queryByTestId('settings-hotspot');
  const touchTitle = () => fireEvent.pointerDown(hotspot()!, { button: 0, pointerType: 'touch' });
  /** Presses the title and keeps the finger there for 3 seconds. */
  const hold = () => {
    touchTitle();
    clock.advance(3_000);
  };
  const typePin = (pin: string) => {
    for (const digit of pin) press(digit);
  };
  const timeButton = (name: string) =>
    fireEvent.click(within(screen.getByRole('group', { name: 'เวลาเล่นต่อรอบ' })).getByRole('button', { name }));
  return { clock, all, tap, withValue, matchPairs, press, layout, concealed, hotspot, touchTitle, hold, typePin, timeButton };
};
const value = (id: string) => screen.getByTestId(id).textContent;

it('1. opens on the ready screen', () => {
  const { all } = setup();
  expect(screen.getByRole('button', { name: 'เริ่มเกม' })).toBeInTheDocument();
  expect(all()).toHaveLength(42);
  expect(all().every((el) => el.dataset.face === 'down')).toBe(true);
  expect(value('counter-value')).toBe('0/7');
  expect(value('timer-value')).toBe('20');
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('2. plays a round to the time-up popup', () => {
  const { clock, all, matchPairs, press } = setup();
  press('เริ่มเกม');
  matchPairs(2);
  expect(value('counter-value')).toBe('2/7');
  clock.advance(20_000);
  const dialog = screen.getByRole('dialog', { name: 'หมดเวลาแล้ว!' });
  expect(within(dialog).getByTestId('popup-result')).toHaveTextContent(/คุณจับคู่ได้\s*2\s*คู่/);
  expect(value('timer-value')).toBe('00');
  expect(screen.getByTestId('timer').dataset.expired).toBe('true');
  expect(all().some((el) => el.dataset.face === 'down')).toBe(false);
  expect(screen.queryByTestId('prize1-active')).toBeNull();
});
it('3. unlocks the first prize as soon as the fourth pair is matched', () => {
  const { matchPairs, press } = setup();
  press('เริ่มเกม');
  matchPairs(3);
  expect(screen.queryByTestId('prize1-active')).toBeNull();
  matchPairs(1);
  expect(screen.getByTestId('prize1-active')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('4. shows the win popup and freezes the clock on the seventh pair', () => {
  const { clock, matchPairs, press } = setup();
  press('เริ่มเกม');
  clock.advance(7_500);
  matchPairs(7);
  const dialog = screen.getByRole('dialog', { name: 'ยินดีด้วย!' });
  expect(within(dialog).getByTestId('popup-result')).toHaveTextContent(/คุณจับคู่ได้ครบ\s*7\s*คู่/);
  expect(screen.getByTestId('prize2-active')).toBeInTheDocument();
  expect(value('timer-value')).toBe('13');
  clock.advance(5_000);
  expect(value('timer-value')).toBe('13');
  expect(screen.getByTestId('timer').dataset.expired).toBe('false');
});
it('5. ignores the popup restart button for one second, then resets with a new layout', () => {
  const { clock, all, press, layout } = setup();
  const before = layout();
  press('เริ่มเกม');
  clock.advance(20_000);
  press('เริ่มเกมใหม่', screen.getByRole('dialog'));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  clock.advance(1_000);
  press('เริ่มเกมใหม่', screen.getByRole('dialog'));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'เริ่มเกม' })).toBeInTheDocument();
  expect(value('counter-value')).toBe('0/7');
  expect(value('timer-value')).toBe('20');
  expect(all().every((el) => el.dataset.face === 'down')).toBe(true);
  expect(layout()).not.toEqual(before);
});
it('6. a double tap on restart does not start the next round', () => {
  const { clock, press } = setup();
  press('เริ่มเกม');
  clock.advance(3_000);
  fireEvent.click(screen.getAllByRole('button', { name: 'เริ่มเกมใหม่' })[0]!);
  press('เริ่มเกม');                 // แตะครั้งที่สองตกบนปุ่ม "เริ่มเกม" ทันที
  clock.advance(400);
  expect(screen.getByRole('button', { name: 'เริ่มเกม' })).toBeInTheDocument();
  expect(value('timer-value')).toBe('20');
  clock.advance(100);
  press('เริ่มเกม');
  expect(screen.getAllByRole('button', { name: 'เริ่มเกมใหม่' }).length).toBeGreaterThan(0);
});
it('7. cards cannot be opened before the round starts, and revealed cards cannot be matched after it ends', () => {
  const { clock, all, tap, withValue, press } = setup();
  tap(all()[0]!);
  expect(all()[0]!.dataset.face).toBe('down');
  press('เริ่มเกม');
  clock.advance(20_000);
  const [a, b] = withValue('48');
  tap(a!), tap(b!);
  expect(a!.dataset.face).toBe('up');
  expect(b!.dataset.face).toBe('up');
  expect(value('counter-value')).toBe('0/7');
});
it('8. conceals the whole board while ready: on first load and after a restart, never during or after a round', () => {
  const { clock, matchPairs, press, concealed } = setup();
  const coversAllCards = () => expect(concealed()?.querySelectorAll('[data-card]')).toHaveLength(42);
  coversAllCards();
  press('เริ่มเกม');
  expect(concealed()).toBeNull();
  clock.advance(20_000);
  expect(screen.getByRole('dialog', { name: 'หมดเวลาแล้ว!' })).toBeInTheDocument();
  expect(concealed()).toBeNull();
  clock.advance(1_000);
  press('เริ่มเกมใหม่', screen.getByRole('dialog'));
  coversAllCards();
  clock.advance(500);
  press('เริ่มเกม');
  expect(concealed()).toBeNull();
  matchPairs(7);
  expect(screen.getByRole('dialog', { name: 'ยินดีด้วย!' })).toBeInTheDocument();
  expect(concealed()).toBeNull();
  clock.advance(1_000);
  press('เริ่มเกมใหม่', screen.getByRole('dialog'));
  coversAllCards();
});
it('9. a double tap on start does not cancel the round it starts', () => {
  const { clock, press } = setup();
  press('เริ่มเกม');
  press('เริ่มเกมใหม่');            // แตะครั้งที่สองตกบนปุ่มเดิม ซึ่งตอนนี้เป็น "เริ่มเกมใหม่"
  clock.advance(1_000);
  expect(screen.queryByRole('button', { name: 'เริ่มเกม' })).toBeNull();
  expect(value('timer-value')).toBe('19');
  press('เริ่มเกมใหม่');            // หลัง 500 ms การกด "เริ่มเกมใหม่" รีเซ็ตได้ตามปกติ
  expect(screen.getByRole('button', { name: 'เริ่มเกม' })).toBeInTheDocument();
  expect(value('timer-value')).toBe('20');
});
it('10. pressing start shows the dark screen with 3, 2, 1, เริ่ม!, then the round begins', () => {
  const { clock, press, concealed } = setup(countdownTestConfig);
  expect(screen.queryByTestId('countdown')).toBeNull();
  press('เริ่มเกม');
  expect(screen.getByTestId('countdown')).toHaveTextContent('3');
  expect(value('timer-value')).toBe('20');
  expect(concealed()).not.toBeNull();
  clock.advance(1_000);
  expect(screen.getByTestId('countdown')).toHaveTextContent('2');
  clock.advance(1_000);
  expect(screen.getByTestId('countdown')).toHaveTextContent('1');
  clock.advance(1_000);
  expect(screen.getByTestId('countdown')).toHaveTextContent('เริ่ม!');
  clock.advance(700);
  expect(screen.queryByTestId('countdown')).toBeNull();
  expect(concealed()).toBeNull();
  expect(value('timer-value')).toBe('20');
  clock.advance(1_000);
  expect(value('timer-value')).toBe('19');
});
it('11. nothing can be played or cancelled during the countdown', () => {
  const { clock, all, tap, press } = setup(countdownTestConfig);
  press('เริ่มเกม');
  clock.advance(1_200);
  tap(all()[0]!);
  expect(all()[0]!.dataset.face).toBe('down');
  press('เริ่มเกมใหม่'); // the bar button sits under the dark screen; a mouse or keyboard could still reach it
  expect(screen.getByTestId('countdown')).toHaveTextContent('2');
  clock.advance(2_500);
  expect(screen.queryByTestId('countdown')).toBeNull();
  clock.advance(1_000);
  expect(value('timer-value')).toBe('19');
});
it('12. with the countdown turned off, the round starts at once and no dark screen appears', () => {
  const { clock, press } = setup();
  press('เริ่มเกม');
  expect(screen.queryByTestId('countdown')).toBeNull();
  clock.advance(1_000);
  expect(value('timer-value')).toBe('19');
});

// ---------- the settings screen for booth staff ----------

it('13. holding the title for 3 seconds on the ready screen asks for a new PIN; a shorter hold does nothing', () => {
  const { clock, hotspot, touchTitle, hold } = setup();
  touchTitle();
  clock.advance(2_900);
  fireEvent.pointerUp(hotspot()!);
  clock.advance(1_000);
  expect(screen.queryByTestId('admin')).toBeNull();
  hold();
  expect(screen.getByRole('dialog', { name: 'ตั้งค่าเกม' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'ตั้งรหัส PIN 4 หลัก' })).toBeInTheDocument();
  expect(hotspot()).toBeNull();
});
it('14. staff set a PIN, add 5 seconds and save: the timer shows 25 and the next round lasts 25 seconds', () => {
  const storage = memoryStore();
  const { clock, hold, typePin, timeButton, press } = setup(testConfig, storage);
  hold();
  typePin('1234');
  typePin('1234');
  timeButton('+5');
  expect(value('timer-value')).toBe('20'); // nothing changes until it is saved
  press('บันทึก');
  expect(screen.queryByTestId('admin')).toBeNull();
  expect(value('timer-value')).toBe('25');
  expect(storage.dump()[PIN_KEY]).toBe('1234');
  expect(JSON.parse(storage.dump()[SETTINGS_KEY]!)).toMatchObject({ timeLimitMs: 25_000 });
  press('เริ่มเกม');
  clock.advance(20_000);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(value('timer-value')).toBe('05');
  clock.advance(5_000);
  expect(screen.getByRole('dialog', { name: 'หมดเวลาแล้ว!' })).toBeInTheDocument();
});
it('15. values kept on the machine are used when the game opens, and damaged ones are ignored', () => {
  const kept = { timeLimitMs: 30_000, countdownMs: 3_000, startCueMs: 700, mismatchMs: 500 };
  const first = setup(testConfig, memoryStore({ [SETTINGS_KEY]: JSON.stringify(kept) }));
  expect(value('timer-value')).toBe('30');
  first.press('เริ่มเกม');
  expect(screen.getByTestId('countdown')).toHaveTextContent('3');
  cleanup();
  setup(testConfig, memoryStore({ [SETTINGS_KEY]: '{oops', [PIN_KEY]: 'x' }));
  expect(value('timer-value')).toBe('20');
  expect(screen.getByRole('button', { name: 'เริ่มเกม' })).toBeInTheDocument();
});
it('16. the title can be held only on the ready screen', () => {
  const { clock, press, hotspot } = setup(countdownTestConfig);
  expect(hotspot()).not.toBeNull();
  press('เริ่มเกม');
  expect(screen.getByTestId('countdown')).toBeInTheDocument();
  expect(hotspot()).toBeNull();
  clock.advance(3_700);
  expect(value('timer-value')).toBe('20');
  expect(hotspot()).toBeNull(); // the round is running
  clock.advance(20_000);
  expect(screen.getByRole('dialog', { name: 'หมดเวลาแล้ว!' })).toBeInTheDocument();
  expect(hotspot()).toBeNull();
  clock.advance(1_000);
  press('เริ่มเกมใหม่', screen.getByRole('dialog'));
  expect(hotspot()).not.toBeNull();
});
it('17. pressing เริ่มเกม during the hold cancels it', () => {
  const { clock, press, touchTitle } = setup();
  touchTitle();
  clock.advance(2_000);
  press('เริ่มเกม');
  clock.advance(3_000);
  expect(screen.queryByTestId('admin')).toBeNull();
  expect(value('timer-value')).toBe('17');
});
it('18. while the settings are open the start button under them does nothing, and cancel changes nothing', () => {
  const storage = memoryStore({ [PIN_KEY]: '4321' });
  const { clock, hold, typePin, timeButton, press } = setup(testConfig, storage);
  hold();
  expect(screen.getByRole('heading', { name: 'ใส่รหัส PIN' })).toBeInTheDocument();
  press('เริ่มเกม'); // under the dark screen; a mouse or keyboard could still reach it
  clock.advance(1_000);
  expect(value('timer-value')).toBe('20');
  expect(screen.getByRole('button', { name: 'เริ่มเกม' })).toBeInTheDocument();
  typePin('4321');
  timeButton('+');
  press('ยกเลิก');
  expect(screen.queryByTestId('admin')).toBeNull();
  expect(value('timer-value')).toBe('20');
  expect(storage.dump()).toEqual({ [PIN_KEY]: '4321' });
  press('เริ่มเกม');
  clock.advance(1_000);
  expect(value('timer-value')).toBe('19');
});
it('19. a machine that cannot keep values still opens the game and applies them until it closes', () => {
  const { hold, typePin, timeButton, press } = setup(testConfig, brokenStore());
  expect(value('timer-value')).toBe('20');
  hold();
  typePin('1234');
  typePin('1234');
  expect(screen.getByTestId('settings-warning')).toBeInTheDocument();
  timeButton('+');
  press('บันทึก');
  expect(value('timer-value')).toBe('21');
  hold(); // the PIN set a moment ago is asked for, although it could not be stored
  expect(screen.getByRole('heading', { name: 'ใส่รหัส PIN' })).toBeInTheDocument();
});
it('20. settings left open close by themselves, and the game is ready to play', () => {
  const { clock, hold, press, hotspot } = setup();
  hold();
  expect(screen.getByTestId('admin')).toBeInTheDocument();
  clock.advance(30_000);
  expect(screen.queryByTestId('admin')).toBeNull();
  expect(hotspot()).not.toBeNull();
  press('เริ่มเกม');
  clock.advance(1_000);
  expect(value('timer-value')).toBe('19');
});
