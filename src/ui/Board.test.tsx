import { fireEvent, render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { CardView } from '../game/view';
import { Board } from './Board';

const cards = (faces: Partial<Record<number, CardView['face']>> = {}): CardView[] =>
  Array.from({ length: 42 }, (_, id) => ({ id, value: id < 14 ? '48' : '84', face: faces[id] ?? 'down' }));
const setup = (list = cards(), disabled = false) => {
  const onFlip = vi.fn();
  const { container } = render(<Board cards={list} disabled={disabled} onFlip={onFlip} />);
  const card = (id: number) => container.querySelector<HTMLElement>(`[data-card="${id}"]`)!;
  return { onFlip, card, container };
};
const touch = (el: HTMLElement, init: PointerEventInit = {}) =>
  fireEvent.pointerDown(el, { button: 0, pointerType: 'touch', ...init });

it('renders 42 cards at their stage positions', () => {
  const { container, card } = setup();
  expect(container.querySelectorAll('[data-card]')).toHaveLength(42);
  expect(card(0).style.left).toBe('75px');
  expect(card(0).style.top).toBe('1360px');
  expect(card(41).style.left).toBe('1245px');
  expect(card(41).style.top).toBe('2339px');
});
it('shows the face and the number of each card', () => {
  const { card } = setup(cards({ 3: 'up', 5: 'matched' }));
  expect(card(0).dataset.face).toBe('down');
  expect(card(3).dataset.face).toBe('up');
  expect(card(5).dataset.face).toBe('matched');
  expect(card(3).querySelector('.card__front')).toHaveTextContent('48');
  expect(card(20).querySelector('.card__front')).toHaveTextContent('84');
});
it('flips a face-down card the moment it is touched', () => {
  const { onFlip, card } = setup();
  touch(card(7));
  expect(onFlip).toHaveBeenCalledExactlyOnceWith(7);
});
it('ignores touches on cards that are already up or matched', () => {
  const { onFlip, card } = setup(cards({ 3: 'up', 5: 'matched' }));
  touch(card(3)), touch(card(5));
  expect(onFlip).not.toHaveBeenCalled();
});
it('ignores every touch while the board is disabled', () => {
  const { onFlip, card } = setup(cards(), true);
  touch(card(7));
  expect(onFlip).not.toHaveBeenCalled();
});
it('non-primary button: a right or middle mouse button does not flip a card', () => {
  const { onFlip, card } = setup();
  touch(card(7), { button: 2, pointerType: 'mouse' });
  touch(card(7), { button: 1, pointerType: 'mouse' });
  expect(onFlip).not.toHaveBeenCalled();
});
