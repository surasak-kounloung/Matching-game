import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { StartCountdown } from './StartCountdown';

it('shows the label and marks numbers and the cue differently', () => {
  const { rerender } = render(<StartCountdown label="3" />);
  expect(screen.getByTestId('countdown')).toHaveTextContent('3');
  expect(screen.getByText('3').dataset.kind).toBe('number');
  rerender(<StartCountdown label="เริ่ม!" />);
  expect(screen.getByTestId('countdown')).toHaveTextContent('เริ่ม!');
  expect(screen.getByText('เริ่ม!').dataset.kind).toBe('cue');
});
