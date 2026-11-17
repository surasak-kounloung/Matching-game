import type { CSSProperties } from 'react';
import { gameConfig } from '../config/gameConfig';
import clockImg from '../assets/img/popup-clock.png';
import breadImg from '../assets/img/popup-bread.png';
import peachImg from '../assets/img/popup-peach.png';
import { POPUP, POPUP_BREAD, POPUP_BUTTON, POPUP_CLOCK, POPUP_PEACH, type Rect } from './layout';

const POPUP_BORDER = 11;

/** Absolute children are placed from the popup's padding box, inside its border. */
const inPopup = (r: Rect): CSSProperties => ({
  left: r.left - POPUP.left - POPUP_BORDER,
  top: r.top - POPUP.top - POPUP_BORDER,
  width: r.width,
  height: r.height,
});

interface Props {
  variant: 'timeUp' | 'won';
  pairs: number;
  onRestart: () => void;
}

export function ResultPopup({ variant, pairs, onRestart }: Props) {
  const won = variant === 'won';
  const headline = won ? 'ยินดีด้วย!' : 'หมดเวลาแล้ว!';
  return (
    <div
      className="popup"
      role="dialog"
      aria-label={headline}
      data-popup
      style={{ left: POPUP.left, top: POPUP.top, width: POPUP.width, height: POPUP.height }}
    >
      <div className="popup__headline">
        <img className="popup__clock" src={clockImg} alt="" draggable={false} style={{ width: POPUP_CLOCK.width, height: POPUP_CLOCK.height }} />
        <span className="popup__headline-text">{headline}</span>
      </div>
      <div className="popup__result" data-testid="popup-result">
        <span className="popup__result-text">{won ? 'คุณจับคู่ได้ครบ' : 'คุณจับคู่ได้'}</span>
        <span className="popup__result-number">{won ? gameConfig.targetPairs : pairs}</span>
        <span className="popup__result-text">คู่</span>
      </div>
      <img className="popup__mascot" src={breadImg} alt="" draggable={false} style={inPopup(POPUP_BREAD)} />
      <img className="popup__mascot" src={peachImg} alt="" draggable={false} style={inPopup(POPUP_PEACH)} />
      <button
        type="button"
        className="action-button popup-button"
        style={inPopup(POPUP_BUTTON)}
        aria-label="เริ่มเกมใหม่"
        onClick={onRestart}
      >
        <span className="action-button__icon" aria-hidden="true" />
        <span className="action-button__label" aria-hidden="true">
          <span className="action-button__line">เริ่มเกมใหม่</span>
        </span>
      </button>
    </div>
  );
}
