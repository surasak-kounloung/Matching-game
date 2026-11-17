import { expect, it } from 'vitest';
import { CARD_LEFTS, CARD_TOPS, cardPosition } from './layout';

it('places 7 columns and 6 rows at the positions measured in the PSD', () => {
  expect(CARD_LEFTS).toEqual([78, 273, 469, 664, 859, 1055, 1248]);
  expect(CARD_TOPS).toEqual([1363, 1558, 1754, 1951, 2146, 2342]);
});
it('cardPosition returns the outer corner, 3 px outside the fill', () => {
  expect(cardPosition(0)).toEqual({ left: 75, top: 1360 });
  expect(cardPosition(8)).toEqual({ left: 270, top: 1555 });
  expect(cardPosition(41)).toEqual({ left: 1245, top: 2339 });
});
