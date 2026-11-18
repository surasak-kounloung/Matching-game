import { useState } from 'react';
import { PIN_LENGTH } from '../../settings/settings';

const TOP_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

interface PinPadProps {
  title: string;
  /** A line under the dots, such as why the last entry was refused. */
  message?: string;
  /** Called with the digits as soon as the last one is pressed; the pad then clears itself. */
  onComplete: (pin: string) => void;
  onCancel: () => void;
}

/** A number pad for a touch screen. The digits typed are shown only as filled dots. */
export function PinPad({ title, message, onComplete, onCancel }: PinPadProps) {
  const [digits, setDigits] = useState('');

  const add = (digit: string) => {
    const next = digits + digit;
    if (next.length < PIN_LENGTH) {
      setDigits(next);
    } else {
      setDigits('');
      onComplete(next);
    }
  };
  const key = (digit: string) => (
    <button key={digit} type="button" className="admin-key" onClick={() => add(digit)}>
      {digit}
    </button>
  );

  return (
    <div className="admin__card pin-pad">
      <h2 className="admin__title">{title}</h2>
      <div className="pin-pad__dots" data-testid="pin-dots" data-filled={digits.length}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className="pin-pad__dot" data-on={i < digits.length} />
        ))}
      </div>
      <p className="pin-pad__message" data-testid="pin-message" role="status">
        {message}
      </p>
      <div className="pin-pad__keys">
        {TOP_KEYS.map(key)}
        <button type="button" className="admin-key admin-key--word" onClick={onCancel}>
          ยกเลิก
        </button>
        {key('0')}
        <button type="button" className="admin-key admin-key--word" onClick={() => setDigits(digits.slice(0, -1))}>
          ลบ
        </button>
      </div>
    </div>
  );
}
