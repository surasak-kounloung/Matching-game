import { SETTING_FIELDS, secondsText, stepSetting, type SettingField, type Settings } from '../../settings/settings';

const MINUS = '−';

interface SettingsPanelProps {
  /** The values being edited; the panel does not keep them itself. */
  draft: Settings;
  defaults: Settings;
  /** False when this machine's browser will not keep values after the game closes. */
  persistent: boolean;
  /** A line confirming something that just happened, such as a changed PIN. */
  notice?: string;
  onChange: (next: Settings) => void;
  onChangePin: () => void;
  onCancel: () => void;
  onSave: () => void;
}

/** The list of adjustable values, each with large − and + buttons for a touch screen. */
export function SettingsPanel({ draft, defaults, persistent, notice, onChange, onChangePin, onCancel, onSave }: SettingsPanelProps) {
  return (
    <div className="admin__card settings-panel">
      <h2 className="admin__title">ตั้งค่าเกม</h2>
      <p className="settings-panel__lead">ค่าที่บันทึกจะใช้ตั้งแต่รอบถัดไป</p>
      {!persistent && (
        <p className="settings-panel__line settings-panel__line--warning" data-testid="settings-warning" role="alert">
          เครื่องนี้เก็บค่าไม่ได้ ค่าที่ตั้งจะหายเมื่อปิดเกม
        </p>
      )}
      {notice && (
        <p className="settings-panel__line settings-panel__line--notice" data-testid="settings-notice" role="status">
          {notice}
        </p>
      )}
      <div className="settings-panel__rows">
        {SETTING_FIELDS.map((field) => (
          <SettingRow
            key={field.key}
            field={field}
            value={draft[field.key]}
            onValue={(value) => onChange({ ...draft, [field.key]: value })}
          />
        ))}
      </div>
      <div className="settings-panel__buttons">
        <button type="button" className="admin-button admin-button--quiet" onClick={() => onChange(defaults)}>
          คืนค่าเริ่มต้น
        </button>
        <button type="button" className="admin-button admin-button--quiet" onClick={onChangePin}>
          เปลี่ยนรหัส PIN
        </button>
      </div>
      <div className="settings-panel__buttons">
        <button type="button" className="admin-button admin-button--plain" onClick={onCancel}>
          ยกเลิก
        </button>
        <button type="button" className="admin-button admin-button--primary" onClick={onSave}>
          บันทึก
        </button>
      </div>
    </div>
  );
}

function SettingRow({ field, value, onValue }: { field: SettingField; value: number; onValue: (value: number) => void }) {
  /** A button that moves the value by delta; disabled when the press would change nothing. */
  const button = (delta: number, text: string, big = false) => {
    const next = stepSetting(field, value, delta);
    return (
      <button
        type="button"
        className={big ? 'admin-step admin-step--big' : 'admin-step'}
        disabled={next === value}
        onClick={() => onValue(next)}
      >
        {text}
      </button>
    );
  };
  const big = field.bigStep;

  return (
    <div className="setting" role="group" aria-label={field.label}>
      <div className="setting__text">
        <span className="setting__label">{field.label}</span>
        <span className="setting__hint">{field.hint}</span>
      </div>
      {/* five columns in every row, so the − value + of each row line up */}
      <div className="setting__stepper">
        {big ? button(-big, `${MINUS}${big / 1_000}`, true) : <span />}
        {button(-field.step, MINUS)}
        <span className="setting__value">
          <span className="setting__number" data-testid={`setting-${field.key}`}>
            {secondsText(value)}
          </span>
          <span className="setting__unit">วินาที</span>
        </span>
        {button(field.step, '+')}
        {big ? button(big, `+${big / 1_000}`, true) : <span />}
      </div>
    </div>
  );
}
