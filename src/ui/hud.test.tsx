import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ActionButton } from './ActionButton';
import { Counter } from './Counter';
import { PrizeBoxes } from './PrizeBoxes';
import { Timer } from './Timer';

it('PrizeBoxes shows no overlay until a prize is unlocked', () => {
  const { rerender } = render(<PrizeBoxes prize1={false} prize2={false} />);
  expect(screen.queryByTestId('prize1-active')).toBeNull();
  expect(screen.queryByTestId('prize2-active')).toBeNull();
  rerender(<PrizeBoxes prize1 prize2={false} />);
  expect(screen.getByTestId('prize1-active')).toBeInTheDocument();
  expect(screen.queryByTestId('prize2-active')).toBeNull();
  rerender(<PrizeBoxes prize1 prize2 />);
  expect(screen.getByTestId('prize2-active')).toBeInTheDocument();
});
it('Counter shows the label and pairs out of total', () => {
  render(<Counter pairs={3} total={7} />);
  expect(screen.getByTestId('counter')).toHaveTextContent('จับคู่ได้');
  expect(screen.getByTestId('counter-value')).toHaveTextContent('3/7');
});
it('Timer shows two digits and the unit, and marks itself expired', () => {
  const { rerender } = render(<Timer seconds={7} expired={false} />);
  expect(screen.getByTestId('timer')).toHaveTextContent('เหลือเวลา');
  expect(screen.getByTestId('timer')).toHaveTextContent('วินาที');
  expect(screen.getByTestId('timer-value')).toHaveTextContent('07');
  expect(screen.getByTestId('timer').dataset.expired).toBe('false');
  rerender(<Timer seconds={0} expired />);
  expect(screen.getByTestId('timer-value')).toHaveTextContent('00');
  expect(screen.getByTestId('timer').dataset.expired).toBe('true');
});
it('ActionButton is labelled by mode and reports a press', () => {
  const onPress = vi.fn();
  const { rerender } = render(<ActionButton mode="start" onPress={onPress} />);
  fireEvent.click(screen.getByRole('button', { name: 'เริ่มเกม' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  rerender(<ActionButton mode="restart" onPress={onPress} />);
  expect(screen.getByRole('button', { name: 'เริ่มเกมใหม่' })).toBeInTheDocument();
});
it('ActionButton shows one line and no icon to start, two lines and the icon to restart', () => {
  const { container, rerender } = render(<ActionButton mode="start" onPress={() => {}} />);
  const lines = () =>
    Array.from(container.querySelectorAll('.action-button__line')).map((el) => el.textContent);
  expect(lines()).toEqual(['เริ่มเกม']);
  expect(container.querySelector('.action-button__icon')).toBeNull();
  rerender(<ActionButton mode="restart" onPress={() => {}} />);
  expect(lines()).toEqual(['เริ่มเกม', 'ใหม่']);
  expect(container.querySelector('.action-button__icon')).not.toBeNull();
});
