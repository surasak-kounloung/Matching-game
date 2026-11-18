import { expect, it } from 'vitest';
import { testConfig } from '../test/testConfig';
import {
  PIN_LENGTH,
  SETTING_FIELDS,
  isPin,
  readSettings,
  sameSettings,
  secondsText,
  settingsOf,
  stepSetting,
  type SettingKey,
  type Settings,
} from './settings';

const defaults: Settings = { timeLimitMs: 20_000, countdownMs: 3_000, startCueMs: 700, mismatchMs: 500 };
const field = (key: SettingKey) => SETTING_FIELDS.find((f) => f.key === key)!;

it('settingsOf picks the four adjustable values', () => {
  expect(settingsOf(testConfig)).toEqual({ timeLimitMs: 20_000, countdownMs: 0, startCueMs: 0, mismatchMs: 500 });
});

it('the fields are listed in screen order with their ranges', () => {
  expect(SETTING_FIELDS).toEqual([
    { key: 'timeLimitMs', label: 'เวลาเล่นต่อรอบ', hint: '5 ถึง 99 วินาที', min: 5_000, max: 99_000, step: 1_000, bigStep: 5_000 },
    { key: 'countdownMs', label: 'นับถอยหลังก่อนเริ่ม', hint: '0 คือไม่นับถอยหลัง', min: 0, max: 9_000, step: 1_000 },
    { key: 'startCueMs', label: 'คำว่า "เริ่ม!" ค้าง', hint: '0 คือไม่แสดง', min: 0, max: 2_000, step: 100 },
    { key: 'mismatchMs', label: 'คู่ผิดเปิดค้าง', hint: 'ก่อนคว่ำกลับ', min: 200, max: 2_000, step: 100 },
  ]);
});

it('stepSetting moves by one step and stays inside the range', () => {
  const time = field('timeLimitMs');
  expect(stepSetting(time, 25_000, 1_000)).toBe(26_000);
  expect(stepSetting(time, 25_000, -5_000)).toBe(20_000);
  expect(stepSetting(time, 5_000, -1_000)).toBe(5_000);
  expect(stepSetting(time, 99_000, 5_000)).toBe(99_000);
  expect(stepSetting(time, 7_000, -5_000)).toBe(5_000);
  expect(stepSetting(time, 97_000, 5_000)).toBe(99_000);
  expect(stepSetting(field('startCueMs'), 700, 100)).toBe(800);
  expect(stepSetting(field('startCueMs'), 0, -100)).toBe(0);
  expect(stepSetting(field('countdownMs'), 9_000, 1_000)).toBe(9_000);
  expect(stepSetting(field('mismatchMs'), 200, -100)).toBe(200);
});

it('stepSetting snaps a value that is off the grid', () => {
  expect(stepSetting(field('mismatchMs'), 450, 100)).toBe(600);
  expect(stepSetting(field('mismatchMs'), 450, -100)).toBe(400);
});

it('readSettings keeps good fields and replaces each bad one with its default', () => {
  expect(readSettings({ timeLimitMs: 30_000, countdownMs: 5_000, startCueMs: 0, mismatchMs: 1_200 }, defaults)).toEqual({
    timeLimitMs: 30_000,
    countdownMs: 5_000,
    startCueMs: 0,
    mismatchMs: 1_200,
  });
  // a string, a number far too large and a fraction each fall back alone
  expect(readSettings({ timeLimitMs: 30_000, countdownMs: '3', startCueMs: 1e9, mismatchMs: 0.5 }, defaults)).toEqual({
    ...defaults,
    timeLimitMs: 30_000,
  });
  expect(readSettings({ timeLimitMs: -1, countdownMs: -1_000, startCueMs: -100, mismatchMs: 100 }, defaults)).toEqual(defaults);
  expect(readSettings({ timeLimitMs: 4_000, countdownMs: 10_000, startCueMs: 2_100, mismatchMs: 2_100 }, defaults)).toEqual(defaults);
  expect(readSettings({ timeLimitMs: Number.NaN, countdownMs: Infinity, startCueMs: null, mismatchMs: true }, defaults)).toEqual(defaults);
});

it('readSettings gives the defaults for anything that is not a plain object', () => {
  for (const raw of [null, undefined, [], [30_000], 'x', 42, true]) {
    expect(readSettings(raw, defaults)).toEqual(defaults);
  }
});

it('readSettings drops keys it does not know and fills the ones that are missing', () => {
  const read = readSettings({ timeLimitMs: 40_000, targetPairs: 1, rows: 99 }, defaults);
  expect(read).toEqual({ ...defaults, timeLimitMs: 40_000 });
  expect(Object.keys(read).sort()).toEqual(['countdownMs', 'mismatchMs', 'startCueMs', 'timeLimitMs']);
});

it('sameSettings compares all four values', () => {
  expect(sameSettings(defaults, { ...defaults })).toBe(true);
  for (const key of SETTING_FIELDS.map((f) => f.key)) {
    expect(sameSettings(defaults, { ...defaults, [key]: defaults[key] + 100 })).toBe(false);
  }
});

it('secondsText writes milliseconds as seconds', () => {
  expect(secondsText(25_000)).toBe('25');
  expect(secondsText(700)).toBe('0.7');
  expect(secondsText(1_000)).toBe('1');
  expect(secondsText(0)).toBe('0');
  expect(secondsText(1_500)).toBe('1.5');
});

it('isPin accepts exactly four digits', () => {
  expect(PIN_LENGTH).toBe(4);
  expect(isPin('0000')).toBe(true);
  expect(isPin('4821')).toBe(true);
  for (const bad of ['123', '12345', '12a4', ' 123', '', 1234, null, undefined]) {
    expect(isPin(bad)).toBe(false);
  }
});
