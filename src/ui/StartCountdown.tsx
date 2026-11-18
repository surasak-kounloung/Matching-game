interface StartCountdownProps {
  /** What to show: '3', '2', '1', then the start cue. */
  label: string;
}

/** The dark screen that covers the whole game while the countdown before a round runs. */
export function StartCountdown({ label }: StartCountdownProps) {
  const kind = /^\d+$/.test(label) ? 'number' : 'cue';
  return (
    <div className="start-countdown" data-testid="countdown" role="status">
      {/* keyed by its text so the pop animation plays again each time the text changes */}
      <span key={label} className="start-countdown__label" data-kind={kind}>
        {label}
      </span>
    </div>
  );
}
