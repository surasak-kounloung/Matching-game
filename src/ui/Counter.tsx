import { COUNTER_BOX } from './layout';

export function Counter({ pairs, total }: { pairs: number; total: number }) {
  return (
    <div className="hud-box counter" data-testid="counter" style={COUNTER_BOX}>
      <span className="hud-label counter__label">จับคู่ได้</span>
      <span className="hud-number counter__value" data-testid="counter-value">
        {pairs}/{total}
      </span>
    </div>
  );
}
