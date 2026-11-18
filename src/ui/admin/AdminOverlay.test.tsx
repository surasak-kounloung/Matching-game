import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Settings } from '../../settings/settings';
import { AdminOverlay, IDLE_CLOSE_MS, MAX_PIN_TRIES, type AdminOverlayProps } from './AdminOverlay';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const defaults: Settings = { timeLimitMs: 25_000, countdownMs: 3_000, startCueMs: 700, mismatchMs: 500 };
const current: Settings = { ...defaults, timeLimitMs: 30_000 };

function setup(props: Partial<AdminOverlayProps> = {}) {
  const handlers = { onSavePin: vi.fn(), onSaveSettings: vi.fn(), onClose: vi.fn() };
  render(<AdminOverlay pin="1234" settings={current} defaults={defaults} persistent {...handlers} {...props} />);
  return handlers;
}
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const type = (pin: string) => {
  for (const digit of pin) press(digit);
};
const heading = () => screen.getByRole('heading').textContent;
const timeRow = () => within(screen.getByRole('group', { name: 'เวลาเล่นต่อรอบ' }));
const shownTime = () => screen.getByTestId('setting-timeLimitMs').textContent;

it('is a dialog named after the settings', () => {
  setup();
  expect(screen.getByRole('dialog', { name: 'ตั้งค่าเกม' })).toBe(screen.getByTestId('admin'));
});

it('first use: sets a PIN after it is typed twice, then shows the panel', () => {
  const { onSavePin, onClose } = setup({ pin: null });
  expect(heading()).toBe('ตั้งรหัส PIN 4 หลัก');
  type('1357');
  expect(onSavePin).not.toHaveBeenCalled();
  expect(heading()).toBe('ใส่รหัส PIN อีกครั้ง');
  type('1357');
  expect(onSavePin).toHaveBeenCalledTimes(1);
  expect(onSavePin).toHaveBeenCalledWith('1357');
  expect(heading()).toBe('ตั้งค่าเกม');
  expect(shownTime()).toBe('30');
  expect(onClose).not.toHaveBeenCalled();
});

it('a different second entry starts the PIN over with a message', () => {
  const { onSavePin } = setup({ pin: null });
  type('1357');
  type('1358');
  expect(onSavePin).not.toHaveBeenCalled();
  expect(heading()).toBe('ตั้งรหัส PIN 4 หลัก');
  expect(screen.getByTestId('pin-message')).toHaveTextContent('รหัสสองครั้งไม่ตรงกัน ตั้งใหม่อีกครั้ง');
  type('2468');
  expect(screen.getByTestId('pin-message')).toBeEmptyDOMElement();
  type('2468');
  expect(onSavePin).toHaveBeenCalledWith('2468');
  expect(heading()).toBe('ตั้งค่าเกม');
});

it('the right PIN opens the panel', () => {
  const { onSavePin } = setup();
  expect(heading()).toBe('ใส่รหัส PIN');
  type('1234');
  expect(heading()).toBe('ตั้งค่าเกม');
  expect(onSavePin).not.toHaveBeenCalled();
});

it('a wrong PIN shows how many tries are left, and the third closes the screen', () => {
  expect(MAX_PIN_TRIES).toBe(3);
  const { onClose } = setup();
  type('0000');
  expect(heading()).toBe('ใส่รหัส PIN');
  expect(screen.getByTestId('pin-message')).toHaveTextContent('รหัสไม่ถูกต้อง เหลืออีก 2 ครั้ง');
  type('1111');
  expect(screen.getByTestId('pin-message')).toHaveTextContent('รหัสไม่ถูกต้อง เหลืออีก 1 ครั้ง');
  expect(onClose).not.toHaveBeenCalled();
  type('2222');
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('heading', { name: 'ตั้งค่าเกม' })).toBeNull();
});

it('the right PIN after a wrong one still opens the panel', () => {
  const { onClose } = setup();
  type('0000');
  type('1234');
  expect(heading()).toBe('ตั้งค่าเกม');
  expect(onClose).not.toHaveBeenCalled();
});

it('cancelling at the PIN closes the screen', () => {
  const { onClose } = setup();
  press('ยกเลิก');
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('saving passes the changed values and closes', () => {
  const { onSaveSettings, onClose } = setup();
  type('1234');
  fireEvent.click(timeRow().getByRole('button', { name: '+5' }));
  fireEvent.click(timeRow().getByRole('button', { name: '+' }));
  expect(shownTime()).toBe('36');
  expect(onSaveSettings).not.toHaveBeenCalled();
  press('บันทึก');
  expect(onSaveSettings).toHaveBeenCalledTimes(1);
  expect(onSaveSettings).toHaveBeenCalledWith({ ...current, timeLimitMs: 36_000 });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('คืนค่าเริ่มต้น fills in the defaults, which are saved only by บันทึก', () => {
  const { onSaveSettings } = setup();
  type('1234');
  press('คืนค่าเริ่มต้น');
  expect(shownTime()).toBe('25');
  expect(onSaveSettings).not.toHaveBeenCalled();
  press('บันทึก');
  expect(onSaveSettings).toHaveBeenCalledWith(defaults);
});

it('cancel closes without saving', () => {
  const { onSaveSettings, onClose } = setup();
  type('1234');
  fireEvent.click(timeRow().getByRole('button', { name: '+' }));
  press('ยกเลิก');
  expect(onSaveSettings).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('changing the PIN from the panel keeps the edited values', () => {
  const { onSavePin, onSaveSettings, onClose } = setup();
  type('1234');
  fireEvent.click(timeRow().getByRole('button', { name: '+' }));
  press('เปลี่ยนรหัส PIN');
  expect(heading()).toBe('ตั้งรหัส PIN 4 หลัก');
  type('5678');
  expect(heading()).toBe('ใส่รหัส PIN อีกครั้ง');
  type('5678');
  expect(onSavePin).toHaveBeenCalledWith('5678');
  expect(heading()).toBe('ตั้งค่าเกม');
  expect(screen.getByTestId('settings-notice')).toHaveTextContent('เปลี่ยนรหัส PIN แล้ว');
  expect(shownTime()).toBe('31');
  expect(onClose).not.toHaveBeenCalled();
  press('บันทึก');
  expect(onSaveSettings).toHaveBeenCalledWith({ ...current, timeLimitMs: 31_000 });
});

it('cancelling a PIN change returns to the panel, at either step', () => {
  const { onSavePin, onClose } = setup();
  type('1234');
  press('เปลี่ยนรหัส PIN');
  press('ยกเลิก');
  expect(heading()).toBe('ตั้งค่าเกม');
  press('เปลี่ยนรหัส PIN');
  type('5678');
  press('ยกเลิก');
  expect(heading()).toBe('ตั้งค่าเกม');
  expect(screen.queryByTestId('settings-notice')).toBeNull();
  expect(onSavePin).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

it('closes by itself after 30 seconds without a touch, saving nothing', () => {
  expect(IDLE_CLOSE_MS).toBe(30_000);
  const { onClose, onSaveSettings } = setup();
  type('1234');
  fireEvent.click(timeRow().getByRole('button', { name: '+' }));
  wait(29_999);
  expect(onClose).not.toHaveBeenCalled();
  wait(1);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSaveSettings).not.toHaveBeenCalled();
});

it('closes by itself at the PIN pad too', () => {
  const { onClose } = setup({ pin: null });
  wait(30_000);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('a touch or a key restarts the 30 second wait', () => {
  const { onClose } = setup();
  wait(20_000);
  fireEvent.pointerDown(screen.getByRole('button', { name: '5' }));
  wait(20_000);
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByTestId('admin'), { key: 'Tab' });
  wait(29_999);
  expect(onClose).not.toHaveBeenCalled();
  wait(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('shows the warning when the machine cannot keep values', () => {
  setup({ persistent: false });
  type('1234');
  expect(screen.getByTestId('settings-warning')).toBeInTheDocument();
});
