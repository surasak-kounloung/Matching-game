import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ResultPopup } from './ResultPopup';

it('marks which result it shows, so each headline can have its own colour', () => {
  const { rerender } = render(<ResultPopup variant="timeUp" pairs={3} onRestart={() => {}} />);
  expect(screen.getByRole('dialog', { name: 'หมดเวลาแล้ว!' }).dataset.variant).toBe('timeUp');
  rerender(<ResultPopup variant="won" pairs={7} onRestart={() => {}} />);
  expect(screen.getByRole('dialog', { name: 'ยินดีด้วย!' }).dataset.variant).toBe('won');
});
