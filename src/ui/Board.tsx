import type { CardView } from '../game/view';
import { Card } from './Card';

interface BoardProps {
  cards: readonly CardView[];
  disabled: boolean;
  onFlip: (id: number) => void;
}

export function Board({ cards, disabled, onFlip }: BoardProps) {
  return (
    <>
      {cards.map((card) => (
        <Card key={card.id} card={card} disabled={disabled} onFlip={onFlip} />
      ))}
    </>
  );
}
