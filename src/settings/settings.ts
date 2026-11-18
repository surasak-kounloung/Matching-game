import type { GameConfig } from '../config/gameConfig';

/** The values booth staff can change on the machine. All are milliseconds. */
export type Settings = Pick<GameConfig, 'timeLimitMs' | 'countdownMs' | 'startCueMs' | 'mismatchMs'>;
export type SettingKey = keyof Settings;

export interface SettingField {
  key: SettingKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  /** What one press of − or + changes. */
  step: number;
  /** What one press of the larger − or + changes, when the field has those buttons. */
  bigStep?: number;
}

/**
 * The adjustable values in the order the settings screen lists them. The round lasts at
 * least 5 seconds so the tap guards and the mismatch delay always stay shorter than it,
 * and at most 99 because the timer shows two digits.
 */
export const SETTING_FIELDS: readonly SettingField[] = [
  { key: 'timeLimitMs', label: 'เวลาเล่นต่อรอบ', hint: '5 ถึง 99 วินาที', min: 5_000, max: 99_000, step: 1_000, bigStep: 5_000 },
  { key: 'countdownMs', label: 'นับถอยหลังก่อนเริ่ม', hint: '0 คือไม่นับถอยหลัง', min: 0, max: 9_000, step: 1_000 },
  { key: 'startCueMs', label: 'คำว่า "เริ่ม!" ค้าง', hint: '0 คือไม่แสดง', min: 0, max: 2_000, step: 100 },
  { key: 'mismatchMs', label: 'คู่ผิดเปิดค้าง', hint: 'ก่อนคว่ำกลับ', min: 200, max: 2_000, step: 100 },
];

export const PIN_LENGTH = 4;

export function settingsOf(config: GameConfig): Settings {
  return {
    timeLimitMs: config.timeLimitMs,
    countdownMs: config.countdownMs,
    startCueMs: config.startCueMs,
    mismatchMs: config.mismatchMs,
  };
}

/** The value after a press: moved by delta, put on the field's grid, kept inside its range. */
export function stepSetting(field: SettingField, value: number, delta: number): number {
  const onGrid = Math.round((value + delta) / field.step) * field.step;
  return Math.min(field.max, Math.max(field.min, onGrid));
}

/**
 * Settings out of data that cannot be trusted (it comes back from the browser's storage).
 * A field is used only when it is a whole number inside its range; any other field takes
 * its default, so damaged data can never stop the game from opening.
 */
export function readSettings(raw: unknown, defaults: Settings): Settings {
  const result = { ...defaults };
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return result;
  const stored = raw as Record<string, unknown>;
  for (const field of SETTING_FIELDS) {
    const value = stored[field.key];
    if (typeof value === 'number' && Number.isInteger(value) && value >= field.min && value <= field.max) {
      result[field.key] = value;
    }
  }
  return result;
}

export function sameSettings(a: Settings, b: Settings): boolean {
  return SETTING_FIELDS.every((field) => a[field.key] === b[field.key]);
}

/** Milliseconds written as seconds: 25000 → "25", 700 → "0.7". */
export function secondsText(ms: number): string {
  return String(ms / 1_000);
}

export function isPin(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}$/.test(value);
}
