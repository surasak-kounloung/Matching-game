import { useEffect, useState } from 'react';
import type { Settings } from '../../settings/settings';
import { PinPad } from './PinPad';
import { SettingsPanel } from './SettingsPanel';

/** The settings close by themselves after this long without a touch, so they never block the game. */
export const IDLE_CLOSE_MS = 30_000;
/** Wrong PIN entries allowed each time the screen is opened; the last one closes it. */
export const MAX_PIN_TRIES = 3;

export interface AdminOverlayProps {
  /** The PIN kept on this machine, or null when none has been set yet. */
  pin: string | null;
  /** The values in use now; editing starts from them. */
  settings: Settings;
  defaults: Settings;
  persistent: boolean;
  onSavePin: (pin: string) => void;
  onSaveSettings: (next: Settings) => void;
  /** Must keep the same identity between renders: the idle timer restarts when it changes. */
  onClose: () => void;
}

/** enter: type the PIN to get in. create and confirm: type a new PIN twice. panel: the values. */
type Step = 'enter' | 'create' | 'confirm' | 'panel';

const PAD_TITLES = { enter: 'ใส่รหัส PIN', create: 'ตั้งรหัส PIN 4 หลัก', confirm: 'ใส่รหัส PIN อีกครั้ง' } as const;

/** The dark screen holding the PIN pad and then the settings panel. Covers the whole game. */
export function AdminOverlay({ pin, settings, defaults, persistent, onSavePin, onSaveSettings, onClose }: AdminOverlayProps) {
  const [step, setStep] = useState<Step>(pin === null ? 'create' : 'enter');
  const [draft, setDraft] = useState(settings);
  const [candidate, setCandidate] = useState('');
  const [triesLeft, setTriesLeft] = useState(MAX_PIN_TRIES);
  /** True while the PIN pads were opened from the panel, to change an existing PIN. */
  const [changingPin, setChangingPin] = useState(false);
  const [message, setMessage] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [touches, setTouches] = useState(0);

  useEffect(() => {
    const id = setTimeout(onClose, IDLE_CLOSE_MS);
    return () => clearTimeout(id);
  }, [touches, onClose]);
  const touched = () => setTouches((n) => n + 1);

  const typed = (digits: string) => {
    if (step === 'enter') {
      if (digits === pin) {
        setMessage(undefined);
        setStep('panel');
      } else if (triesLeft <= 1) {
        onClose();
      } else {
        setTriesLeft(triesLeft - 1);
        setMessage(`รหัสไม่ถูกต้อง เหลืออีก ${triesLeft - 1} ครั้ง`);
      }
    } else if (step === 'create') {
      setCandidate(digits);
      setMessage(undefined);
      setStep('confirm');
    } else if (digits !== candidate) {
      setMessage('รหัสสองครั้งไม่ตรงกัน ตั้งใหม่อีกครั้ง');
      setStep('create');
    } else {
      onSavePin(digits);
      if (changingPin) setNotice('เปลี่ยนรหัส PIN แล้ว');
      setChangingPin(false);
      setStep('panel');
    }
  };

  const leavePad = () => {
    if (!changingPin) return onClose();
    setChangingPin(false);
    setMessage(undefined);
    setStep('panel');
  };

  return (
    <div
      className="admin"
      data-testid="admin"
      role="dialog"
      aria-modal="true"
      aria-label="ตั้งค่าเกม"
      onPointerDownCapture={touched}
      onKeyDownCapture={touched}
    >
      {step === 'panel' ? (
        <SettingsPanel
          draft={draft}
          defaults={defaults}
          persistent={persistent}
          notice={notice}
          onChange={setDraft}
          onChangePin={() => {
            setChangingPin(true);
            setNotice(undefined);
            setStep('create');
          }}
          onCancel={onClose}
          onSave={() => {
            onSaveSettings(draft);
            onClose();
          }}
        />
      ) : (
        <PinPad key={step} title={PAD_TITLES[step]} message={message} onComplete={typed} onCancel={leavePad} />
      )}
    </div>
  );
}
