import { expect, it } from 'vitest';
import { fitStage } from './fitStage';

it('is 1:1 at the design size', () => expect(fitStage(1497, 2664)).toEqual({ scale: 1, left: 0, top: 0 }));
it('fits a 1080×1920 portrait screen by height and centres horizontally', () => {
  const f = fitStage(1080, 1920);
  expect(f.scale).toBeCloseTo(0.72072, 4);
  expect(f.left).toBeCloseTo(0.54, 1);
  expect(f.top).toBeCloseTo(0, 6);
});
it('fits inside a 125%-scaled Windows desktop (864×1536)', () => {
  const f = fitStage(864, 1536);
  expect(1497 * f.scale).toBeLessThanOrEqual(864);
  expect(2664 * f.scale).toBeLessThanOrEqual(1536);
});
it('still fits whole and centred on a landscape screen', () => {
  const f = fitStage(1920, 1080);
  expect(f.scale).toBeCloseTo(0.40541, 4);
  expect(f.left).toBeCloseTo(656.55, 1);
  expect(f.top).toBeCloseTo(0, 6);
});
it('returns a zero scale for an empty viewport instead of NaN', () =>
  expect(fitStage(0, 0)).toEqual({ scale: 0, left: 0, top: 0 }));
