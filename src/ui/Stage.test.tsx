import { act, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Stage } from './Stage';

// Component sets 'translate(0px, 0px) scale(n)'; jsdom's CSS serializer drops the trailing "0px" of the pair.
const JSDOM_ZERO_TRANSLATE = 'translate(0px)';

const resizeTo = (w: number, h: number) =>
  act(() => {
    Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
    window.dispatchEvent(new Event('resize'));
  });

it('scales to the window and refits when the window is resized', () => {
  render(<Stage><span>child</span></Stage>);
  resizeTo(1497, 2664);
  expect(screen.getByTestId('stage').style.transform).toBe(JSDOM_ZERO_TRANSLATE + ' scale(1)');
  resizeTo(2994, 5328);
  expect(screen.getByTestId('stage').style.transform).toBe(JSDOM_ZERO_TRANSLATE + ' scale(2)');
  expect(screen.getByText('child')).toBeInTheDocument();
});
