import { expect, it } from 'vitest';
import { CARD_LEFTS, CARD_TOPS, PRIZE1_ACTIVE, STAGE, TITLE_HOTSPOT, cardPosition } from './layout';

it('places 7 columns and 6 rows at the positions measured in the PSD', () => {
  expect(CARD_LEFTS).toEqual([78, 273, 469, 664, 859, 1055, 1248]);
  expect(CARD_TOPS).toEqual([1363, 1558, 1754, 1951, 2146, 2342]);
});
it('cardPosition returns the outer corner, 3 px outside the fill', () => {
  expect(cardPosition(0)).toEqual({ left: 75, top: 1360 });
  expect(cardPosition(8)).toEqual({ left: 270, top: 1555 });
  expect(cardPosition(41)).toEqual({ left: 1245, top: 2339 });
});
it('the settings hotspot contains the title text and stays clear of the prize boxes', () => {
  // "V Square Clinic" in the PSD: (405,147) 688×81
  const right = TITLE_HOTSPOT.left + TITLE_HOTSPOT.width;
  const bottom = TITLE_HOTSPOT.top + TITLE_HOTSPOT.height;
  expect(TITLE_HOTSPOT.left).toBeLessThanOrEqual(405);
  expect(TITLE_HOTSPOT.top).toBeLessThanOrEqual(147);
  expect(right).toBeGreaterThanOrEqual(405 + 688);
  expect(bottom).toBeGreaterThanOrEqual(147 + 81);
  expect(TITLE_HOTSPOT.left).toBeGreaterThanOrEqual(0);
  expect(TITLE_HOTSPOT.top).toBeGreaterThanOrEqual(0);
  expect(right).toBeLessThanOrEqual(STAGE.width);
  expect(bottom).toBeLessThan(PRIZE1_ACTIVE.top);
});
