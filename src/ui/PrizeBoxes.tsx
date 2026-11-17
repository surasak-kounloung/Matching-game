import box1Active from '../assets/img/box1-active.webp';
import box2Active from '../assets/img/box2-active.webp';
import { PRIZE1_ACTIVE, PRIZE2_ACTIVE, type Rect } from './layout';

function place({ left, top, width, height }: Rect) {
  return { left, top, width, height };
}

export function PrizeBoxes({ prize1, prize2 }: { prize1: boolean; prize2: boolean }) {
  return (
    <>
      {prize1 && (
        <img
          className="prize-active"
          data-testid="prize1-active"
          src={box1Active}
          alt=""
          draggable={false}
          style={place(PRIZE1_ACTIVE)}
        />
      )}
      {prize2 && (
        <img
          className="prize-active"
          data-testid="prize2-active"
          src={box2Active}
          alt=""
          draggable={false}
          style={place(PRIZE2_ACTIVE)}
        />
      )}
    </>
  );
}
