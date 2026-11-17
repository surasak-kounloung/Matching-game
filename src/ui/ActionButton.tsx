import { ACTION_BUTTON } from './layout';

export function ActionButton({ mode, onPress }: { mode: 'start' | 'restart'; onPress: () => void }) {
  const restart = mode === 'restart';
  return (
    <button
      type="button"
      className={`action-button action-button--${mode}`}
      style={ACTION_BUTTON}
      aria-label={restart ? 'เริ่มเกมใหม่' : 'เริ่มเกม'}
      onClick={onPress}
    >
      {restart && <span className="action-button__icon" aria-hidden="true" />}
      <span className="action-button__label" aria-hidden="true">
        {restart ? (
          <>
            เริ่มเกม
            <br />
            ใหม่
          </>
        ) : (
          'เริ่มเกม'
        )}
      </span>
    </button>
  );
}
