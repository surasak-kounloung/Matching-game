import { formatSeconds } from '../game/view';
import { TIMER_BOX } from './layout';

export function Timer({ seconds, expired }: { seconds: number; expired: boolean }) {
  return (
    <div
      className="hud-box timer"
      data-testid="timer"
      data-expired={expired ? 'true' : 'false'}
      style={TIMER_BOX}
    >
      <span className="hud-label timer__label">เหลือเวลา</span>
      <span className="timer__row">
        <span className="hud-number timer__value" data-testid="timer-value">
          {formatSeconds(seconds)}
        </span>
        <span className="timer__unit">วินาที</span>
      </span>
    </div>
  );
}
