import type { CSSProperties } from 'react';
import type { CardView } from '../game/view';
import { CLOSED_SHEET, cardPosition } from './layout';

interface CardProps {
  card: CardView;
  disabled: boolean;
  onFlip: (id: number) => void;
}

export function Card({ card, disabled, onFlip }: CardProps) {
  const { left, top } = cardPosition(card.id);
  const style = {
    left,
    top,
    '--sprite-x': `${-(left - CLOSED_SHEET.left)}px`,
    '--sprite-y': `${-(top - CLOSED_SHEET.top)}px`,
  } as CSSProperties;

  return (
    <button
      type="button"
      className="card"
      data-card={card.id}
      data-face={card.face}
      style={style}
      tabIndex={-1}
      onPointerDown={(event) => {
        if (!disabled && card.face === 'down' && event.button === 0) onFlip(card.id);
      }}
    >
      <span className="card__inner">
        <span className="card__back" />
        <span className="card__front">{card.value}</span>
      </span>
    </button>
  );
}
