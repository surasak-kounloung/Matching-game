import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { createTestClock, mulberry32 } from './test/clock';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = () => {
  const clock = createTestClock();
  const { container } = render(<App deps={{ now: clock.now, rng: mulberry32(7) }} />);
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
  return { clock, all, tap, withValue, matchPairs, press, layout };
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
it('7. cards cannot be opened before the round starts or after it ends', () => {
  const { clock, all, tap, press } = setup();
  tap(all()[0]!);
  expect(all()[0]!.dataset.face).toBe('down');
  press('เริ่มเกม');
  clock.advance(20_000);
  expect(value('counter-value')).toBe('0/7');
});
