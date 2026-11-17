export interface Rect { left: number; top: number; width: number; height: number }

export const STAGE = { width: 1497, height: 2664 } as const;

export const CARD_FILL = { width: 181, height: 180, radius: 32 } as const;
export const CARD_STROKE = 3;
export const CARD_OUTER = { width: 187, height: 186, radius: 35 } as const;
export const CARD_LEFTS: readonly number[] = [78, 273, 469, 664, 859, 1055, 1248];
export const CARD_TOPS: readonly number[] = [1363, 1558, 1754, 1951, 2146, 2342];

export const CLOSED_SHEET: Rect = { left: 75, top: 1360, width: 1356, height: 1165 };
export const COUNTER_BOX: Rect = { left: 252, top: 1006, width: 317, height: 186 };
export const TIMER_BOX: Rect = { left: 596, top: 1006, width: 361, height: 186 };
export const ACTION_BUTTON: Rect = { left: 983, top: 1019, width: 261, height: 151 };
export const PRIZE1_ACTIVE: Rect = { left: 90, top: 630, width: 662, height: 302 };
export const PRIZE2_ACTIVE: Rect = { left: 745, top: 630, width: 745, height: 362 };
export const POPUP: Rect = { left: 192, top: 1638, width: 1116, height: 612 };
export const POPUP_BUTTON: Rect = { left: 537, top: 2073, width: 426, height: 103 };
/** Rectangle of the image popup-clock.png (includes its 6 px white border). */
export const POPUP_CLOCK: Rect = { left: 332, top: 1696, width: 191, height: 193 };
export const POPUP_BREAD: Rect = { left: 230, top: 2028, width: 192, height: 169 };
export const POPUP_PEACH: Rect = { left: 1058, top: 2036, width: 192, height: 161 };

/** Top-left of the card's outer edge (stroke included) for position index 0-41. */
export function cardPosition(index: number): { left: number; top: number } {
  const col = CARD_LEFTS[index % 7] ?? 0;
  const row = CARD_TOPS[Math.floor(index / 7)] ?? 0;
  return { left: col - CARD_STROKE, top: row - CARD_STROKE };
}
