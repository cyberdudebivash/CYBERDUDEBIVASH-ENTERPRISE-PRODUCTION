export interface ProgressBarProps {
  /** 1-based index of the question currently on screen. */
  current: number;
  total: number;
}

// Discovery (ARCHITECTURE.md) found the original's progress bar was purely visual
// — no role, no aria-valuenow. This one is a real progressbar, not just styled to
// look like one.
export function ProgressBar({ current, total }: ProgressBarProps) {
  const percent = total === 0 ? 0 : Math.round(((current - 1) / total) * 100);

  return (
    <div className="dpdp-progress">
      <div
        className="dpdp-progress__track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Assessment progress"
      >
        <div className="dpdp-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="dpdp-progress__text">
        <span>
          Question {current} of {total}
        </span>
        <span>{percent}%</span>
      </div>
    </div>
  );
}
