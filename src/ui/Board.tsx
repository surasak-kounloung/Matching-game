import type { CardView } from '../game/view';
import { Card } from './Card';

interface BoardProps {
  cards: readonly CardView[];
  disabled: boolean;
  /** No card shows its number face or turns while this is set (the board before a round). */
  concealed: boolean;
  onFlip: (id: number) => void;
}

export function Board({ cards, disabled, concealed, onFlip }: BoardProps) {
  return (
    <div className="board" data-concealed={concealed ? 'true' : 'false'}>
      {cards.map((card) => (
        <Card key={card.id} card={card} disabled={disabled} onFlip={onFlip} />
      ))}
    </div>
  );
}
