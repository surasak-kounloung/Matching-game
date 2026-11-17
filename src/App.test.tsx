import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from './App';

it('renders the stage root', () => {
  render(<App />);
  expect(screen.getByTestId('stage')).toBeInTheDocument();
});
