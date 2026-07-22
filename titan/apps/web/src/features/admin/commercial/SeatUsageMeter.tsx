import "./SeatUsageMeter.css";

export interface SeatUsageMeterProps {
  seatsUsed: number;
  seatLimit: number;
}

/** COM-1: real seat usage — `seatsUsed` is always the live count of an
 * organization's own `user_profiles` rows (`router.ts`'s
 * `getPortalCommercialSummary`), never a separately tracked counter that
 * could drift. Two real consumers: the Customer Portal's own Subscription
 * page and the admin Commercial Detail page. A real `progressbar` role,
 * not just a colored `<div>` — the same "don't fabricate a visual without
 * real assistive-technology semantics" discipline `TrendSparkline` (EAP-8)
 * already established for its own non-trivial visual. */
export function SeatUsageMeter({ seatsUsed, seatLimit }: SeatUsageMeterProps) {
  const percent = seatLimit > 0 ? Math.min(100, Math.round((seatsUsed / seatLimit) * 100)) : 0;
  const isOver = seatsUsed > seatLimit;

  return (
    <div className="titan-seat-usage-meter">
      <div className="titan-seat-usage-meter__label">
        <span>Seats used</span>
        <span>
          {seatsUsed} / {seatLimit}
        </span>
      </div>
      <div
        className="titan-seat-usage-meter__track"
        role="progressbar"
        aria-valuenow={seatsUsed}
        aria-valuemin={0}
        aria-valuemax={seatLimit}
        aria-label={`${seatsUsed} of ${seatLimit} seats used`}
      >
        <div
          className={`titan-seat-usage-meter__fill${isOver ? " titan-seat-usage-meter__fill--over" : ""}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
