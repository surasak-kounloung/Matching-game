import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Settings } from '../../settings/settings';
import { TITLE_HOTSPOT } from '../layout';
import { PinPad } from './PinPad';
import { SettingsHotspot } from './SettingsHotspot';
import { SettingsPanel } from './SettingsPanel';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const press = (name: string, scope = screen) => fireEvent.click(scope.getByRole('button', { name }));

// ---------- the invisible area over the title ----------

const hotspot = () => screen.getByTestId('settings-hotspot');
const down = (button = 0) => fireEvent.pointerDown(hotspot(), { button, pointerType: 'touch' });

it('hotspot: opens after a 3 second hold', () => {
  const onOpen = vi.fn();
  render(<SettingsHotspot onOpen={onOpen} />);
  down();
  wait(2_999);
  expect(onOpen).not.toHaveBeenCalled();
  wait(1);
  expect(onOpen).toHaveBeenCalledTimes(1);
});
it('hotspot: does nothing when the finger lifts, slides off or is cancelled before 3 seconds', () => {
  for (const end of [fireEvent.pointerUp, fireEvent.pointerLeave, fireEvent.pointerCancel]) {
    const onOpen = vi.fn();
    const { unmount } = render(<SettingsHotspot onOpen={onOpen} />);
    down();
    wait(2_000);
    end(hotspot());
    wait(3_000);
    expect(onOpen).not.toHaveBeenCalled();
    unmount();
  }
});
it('hotspot: a hold after an abandoned one needs its own 3 seconds', () => {
  const onOpen = vi.fn();
  render(<SettingsHotspot onOpen={onOpen} />);
  down();
  wait(2_000);
  fireEvent.pointerUp(hotspot());
  down();
  wait(1_500);
  expect(onOpen).not.toHaveBeenCalled();
  wait(1_500);
  expect(onOpen).toHaveBeenCalledTimes(1);
});
// A touch keeps sending its events to the element it started on, even after the finger has
// left it: no pointerleave arrives until the finger lifts. So sliding off shows only as moves.
const placeHotspot = () =>
  vi.spyOn(hotspot(), 'getBoundingClientRect').mockReturnValue({
    x: 100, y: 50, left: 100, top: 50, right: 500, bottom: 130, width: 400, height: 80, toJSON: () => ({}),
  });
const finger = (id: number, x: number, y: number) => ({ button: 0, pointerType: 'touch', pointerId: id, clientX: x, clientY: y });

it('hotspot: a finger that slides off the title while still pressed stops the hold', () => {
  const onOpen = vi.fn();
  render(<SettingsHotspot onOpen={onOpen} />);
  placeHotspot();
  fireEvent.pointerDown(hotspot(), finger(1, 300, 90));
  wait(1_000);
  fireEvent.pointerMove(hotspot(), finger(1, 300, 400));
  wait(3_000);
  expect(onOpen).not.toHaveBeenCalled();
  // sliding back onto the title does not resume it either
  fireEvent.pointerMove(hotspot(), finger(1, 300, 90));
  wait(3_000);
  expect(onOpen).not.toHaveBeenCalled();
});
it('hotspot: a finger that trembles but stays on the title keeps the hold', () => {
  const onOpen = vi.fn();
  render(<SettingsHotspot onOpen={onOpen} />);
  placeHotspot();
  fireEvent.pointerDown(hotspot(), finger(1, 300, 90));
  wait(1_000);
  fireEvent.pointerMove(hotspot(), finger(1, 306, 94));
  wait(1_000);
  fireEvent.pointerMove(hotspot(), finger(1, 100, 50)); // the very corner still counts
  fireEvent.pointerMove(hotspot(), finger(1, 500, 130));
  wait(999);
  expect(onOpen).not.toHaveBeenCalled();
  wait(1);
  expect(onOpen).toHaveBeenCalledTimes(1);
});
it('hotspot: another finger touching anywhere on the screen stops the hold', () => {
  const onOpen = vi.fn();
  render(
    <>
      <SettingsHotspot onOpen={onOpen} />
      <button type="button">elsewhere</button>
    </>,
  );
  fireEvent.pointerDown(hotspot(), finger(1, 300, 90));
  wait(1_000);
  fireEvent.pointerDown(screen.getByRole('button', { name: 'elsewhere' }), finger(2, 900, 900));
  wait(3_000);
  expect(onOpen).not.toHaveBeenCalled();
  // with every finger lifted, a fresh hold works again
  fireEvent.pointerUp(hotspot(), finger(1, 300, 90));
  fireEvent.pointerDown(hotspot(), finger(1, 300, 90));
  wait(3_000);
  expect(onOpen).toHaveBeenCalledTimes(1);
});
it('hotspot: stops watching the rest of the screen when the hold ends', () => {
  const added = vi.spyOn(document, 'addEventListener');
  const removed = vi.spyOn(document, 'removeEventListener');
  const watching = () =>
    added.mock.calls.filter(([type]) => type === 'pointerdown').length -
    removed.mock.calls.filter(([type]) => type === 'pointerdown').length;
  const { unmount } = render(<SettingsHotspot onOpen={() => {}} />);
  const before = watching();
  fireEvent.pointerDown(hotspot(), finger(1, 300, 90));
  expect(watching()).toBe(before + 1);
  fireEvent.pointerUp(hotspot(), finger(1, 300, 90));
  expect(watching()).toBe(before);
  fireEvent.pointerDown(hotspot(), finger(1, 300, 90));
  wait(3_000); // the hold completes
  expect(watching()).toBe(before);
  fireEvent.pointerDown(hotspot(), finger(1, 300, 90));
  unmount();
  expect(watching()).toBe(before);
});
it('hotspot: ignores other mouse buttons', () => {
  const onOpen = vi.fn();
  render(<SettingsHotspot onOpen={onOpen} />);
  down(2);
  wait(3_000);
  expect(onOpen).not.toHaveBeenCalled();
});
it('hotspot: stops waiting when it is removed', () => {
  const onOpen = vi.fn();
  const { unmount } = render(<SettingsHotspot onOpen={onOpen} />);
  down();
  wait(1_000);
  unmount();
  wait(3_000);
  expect(onOpen).not.toHaveBeenCalled();
});
it('hotspot: sits over the title and shows nothing', () => {
  render(<SettingsHotspot onOpen={() => {}} />);
  expect(hotspot().style).toMatchObject({
    left: `${TITLE_HOTSPOT.left}px`,
    top: `${TITLE_HOTSPOT.top}px`,
    width: `${TITLE_HOTSPOT.width}px`,
    height: `${TITLE_HOTSPOT.height}px`,
  });
  expect(hotspot()).toBeEmptyDOMElement();
  expect(hotspot().getAttribute('aria-hidden')).toBe('true');
});

// ---------- the PIN pad ----------

const filled = () => screen.getByTestId('pin-dots').dataset.filled;

it('pad: reports the PIN on the fourth digit and clears itself', () => {
  const onComplete = vi.fn();
  render(<PinPad title="ใส่รหัส PIN" onComplete={onComplete} onCancel={() => {}} />);
  expect(filled()).toBe('0');
  for (const digit of '482') press(digit);
  expect(filled()).toBe('3');
  expect(onComplete).not.toHaveBeenCalled();
  press('1');
  expect(onComplete).toHaveBeenCalledTimes(1);
  expect(onComplete).toHaveBeenCalledWith('4821');
  expect(filled()).toBe('0');
});
it('pad: keeps leading zeros', () => {
  const onComplete = vi.fn();
  render(<PinPad title="ใส่รหัส PIN" onComplete={onComplete} onCancel={() => {}} />);
  for (const digit of '0007') press(digit);
  expect(onComplete).toHaveBeenCalledWith('0007');
});
it('pad: ลบ removes the last digit, and does nothing on an empty pad', () => {
  const onComplete = vi.fn();
  render(<PinPad title="ใส่รหัส PIN" onComplete={onComplete} onCancel={() => {}} />);
  press('ลบ');
  expect(filled()).toBe('0');
  press('1');
  press('2');
  press('ลบ');
  expect(filled()).toBe('1');
  for (const digit of '345') press(digit);
  expect(onComplete).toHaveBeenCalledWith('1345');
});
it('pad: shows the title, and the message only when there is one', () => {
  const { rerender } = render(<PinPad title="ตั้งรหัส PIN 4 หลัก" onComplete={() => {}} onCancel={() => {}} />);
  expect(screen.getByRole('heading', { name: 'ตั้งรหัส PIN 4 หลัก' })).toBeInTheDocument();
  expect(screen.getByTestId('pin-message')).toBeEmptyDOMElement();
  rerender(<PinPad title="ใส่รหัส PIN" message="รหัสไม่ถูกต้อง" onComplete={() => {}} onCancel={() => {}} />);
  expect(screen.getByRole('heading', { name: 'ใส่รหัส PIN' })).toBeInTheDocument();
  expect(screen.getByTestId('pin-message')).toHaveTextContent('รหัสไม่ถูกต้อง');
});
it('pad: ยกเลิก calls onCancel', () => {
  const onCancel = vi.fn();
  render(<PinPad title="ใส่รหัส PIN" onComplete={() => {}} onCancel={onCancel} />);
  press('ยกเลิก');
  expect(onCancel).toHaveBeenCalledTimes(1);
});

// ---------- the settings panel ----------

const defaults: Settings = { timeLimitMs: 25_000, countdownMs: 3_000, startCueMs: 700, mismatchMs: 500 };
const MINUS = '−';

function renderPanel(draft: Settings = defaults, extra: { persistent?: boolean; notice?: string } = {}) {
  const handlers = { onChange: vi.fn(), onChangePin: vi.fn(), onCancel: vi.fn(), onSave: vi.fn() };
  render(<SettingsPanel draft={draft} defaults={defaults} persistent {...extra} {...handlers} />);
  const row = (label: string) => within(screen.getByRole('group', { name: label }));
  const button = (label: string, name: string) => row(label).getByRole<HTMLButtonElement>('button', { name });
  return { ...handlers, row, button };
}

it('panel: shows each value in seconds under its label', () => {
  const { row } = renderPanel();
  expect(screen.getByRole('heading', { name: 'ตั้งค่าเกม' })).toBeInTheDocument();
  expect(row('เวลาเล่นต่อรอบ').getByTestId('setting-timeLimitMs')).toHaveTextContent('25');
  expect(row('นับถอยหลังก่อนเริ่ม').getByTestId('setting-countdownMs')).toHaveTextContent('3');
  expect(row('คำว่า "เริ่ม!" ค้าง').getByTestId('setting-startCueMs')).toHaveTextContent('0.7');
  expect(row('คู่ผิดเปิดค้าง').getByTestId('setting-mismatchMs')).toHaveTextContent('0.5');
  expect(screen.getAllByRole('group')).toHaveLength(4);
});
it('panel: + and − move a value by one step', () => {
  const { onChange, button } = renderPanel();
  fireEvent.click(button('เวลาเล่นต่อรอบ', '+'));
  expect(onChange).toHaveBeenLastCalledWith({ ...defaults, timeLimitMs: 26_000 });
  fireEvent.click(button('นับถอยหลังก่อนเริ่ม', MINUS));
  expect(onChange).toHaveBeenLastCalledWith({ ...defaults, countdownMs: 2_000 });
  fireEvent.click(button('คำว่า "เริ่ม!" ค้าง', '+'));
  expect(onChange).toHaveBeenLastCalledWith({ ...defaults, startCueMs: 800 });
  fireEvent.click(button('คู่ผิดเปิดค้าง', MINUS));
  expect(onChange).toHaveBeenLastCalledWith({ ...defaults, mismatchMs: 400 });
});
it('panel: −5 and +5 move the round time by five seconds, and only the round time has them', () => {
  const { onChange, button, row } = renderPanel();
  fireEvent.click(button('เวลาเล่นต่อรอบ', '+5'));
  expect(onChange).toHaveBeenLastCalledWith({ ...defaults, timeLimitMs: 30_000 });
  fireEvent.click(button('เวลาเล่นต่อรอบ', `${MINUS}5`));
  expect(onChange).toHaveBeenLastCalledWith({ ...defaults, timeLimitMs: 20_000 });
  expect(row('นับถอยหลังก่อนเริ่ม').queryByRole('button', { name: '+5' })).toBeNull();
  expect(row('นับถอยหลังก่อนเริ่ม').getAllByRole('button')).toHaveLength(2);
});
it('panel: a button that cannot move the value is disabled, and no press leaves the range', () => {
  const low = renderPanel({ ...defaults, timeLimitMs: 5_000, countdownMs: 0, startCueMs: 0, mismatchMs: 200 });
  for (const label of ['เวลาเล่นต่อรอบ', 'นับถอยหลังก่อนเริ่ม', 'คำว่า "เริ่ม!" ค้าง', 'คู่ผิดเปิดค้าง']) {
    expect(low.button(label, MINUS).disabled, label).toBe(true);
    expect(low.button(label, '+').disabled, label).toBe(false);
  }
  expect(low.button('เวลาเล่นต่อรอบ', `${MINUS}5`).disabled).toBe(true);
  fireEvent.click(low.button('เวลาเล่นต่อรอบ', MINUS));
  expect(low.onChange).not.toHaveBeenCalled();
  cleanup();

  const near = renderPanel({ ...defaults, timeLimitMs: 7_000 });
  expect(near.button('เวลาเล่นต่อรอบ', `${MINUS}5`).disabled).toBe(false);
  fireEvent.click(near.button('เวลาเล่นต่อรอบ', `${MINUS}5`));
  expect(near.onChange).toHaveBeenLastCalledWith({ ...defaults, timeLimitMs: 5_000 });
  cleanup();

  const high = renderPanel({ timeLimitMs: 99_000, countdownMs: 9_000, startCueMs: 2_000, mismatchMs: 2_000 });
  for (const label of ['เวลาเล่นต่อรอบ', 'นับถอยหลังก่อนเริ่ม', 'คำว่า "เริ่ม!" ค้าง', 'คู่ผิดเปิดค้าง']) {
    expect(high.button(label, '+').disabled, label).toBe(true);
    expect(high.button(label, MINUS).disabled, label).toBe(false);
  }
  expect(high.button('เวลาเล่นต่อรอบ', '+5').disabled).toBe(true);
});
it('panel: คืนค่าเริ่มต้น hands back the defaults', () => {
  const { onChange } = renderPanel({ timeLimitMs: 60_000, countdownMs: 0, startCueMs: 0, mismatchMs: 1_000 });
  press('คืนค่าเริ่มต้น');
  expect(onChange).toHaveBeenLastCalledWith(defaults);
});
it('panel: บันทึก, ยกเลิก and เปลี่ยนรหัส PIN call their handlers', () => {
  const { onSave, onCancel, onChangePin, onChange } = renderPanel();
  press('บันทึก');
  press('ยกเลิก');
  press('เปลี่ยนรหัส PIN');
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onChangePin).toHaveBeenCalledTimes(1);
  expect(onChange).not.toHaveBeenCalled();
});
it('panel: warns only when the machine cannot keep values', () => {
  renderPanel();
  expect(screen.queryByTestId('settings-warning')).toBeNull();
  cleanup();
  renderPanel(defaults, { persistent: false });
  expect(screen.getByTestId('settings-warning')).toHaveTextContent('เครื่องนี้เก็บค่าไม่ได้ ค่าที่ตั้งจะหายเมื่อปิดเกม');
});
it('panel: shows a notice when it is given one', () => {
  renderPanel();
  expect(screen.queryByTestId('settings-notice')).toBeNull();
  cleanup();
  renderPanel(defaults, { notice: 'เปลี่ยนรหัส PIN แล้ว' });
  expect(screen.getByTestId('settings-notice')).toHaveTextContent('เปลี่ยนรหัส PIN แล้ว');
});
