import { timeOf, type TankStats } from "@/lib/tank-stats";

export function AlertBanner({ stats, threshold }: { stats: TankStats; threshold: number }) {
  if (stats.isActiveAlert) {
    return (
      <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
        <p className="font-semibold">
          <span aria-hidden="true">⚠ </span>Low water alert
        </p>
        <p className="mt-1 text-sm">
          Tank is at {stats.current.level_percent}%, below the {threshold}% threshold (as of{" "}
          {timeOf(stats.current.timestamp)}).
        </p>
      </div>
    );
  }

  if (stats.breaches.length > 0) {
    const list = stats.breaches
      .map((b) => `${b.level_percent}% at ${timeOf(b.timestamp)}`)
      .join(", ");
    return (
      <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <p className="font-semibold">
          <span aria-hidden="true">⚠ </span>Level dropped below {threshold}% earlier today
        </p>
        <p className="mt-1 text-sm">
          {list}. Current level has recovered to {stats.current.level_percent}%.
        </p>
      </div>
    );
  }

  return (
    <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
      <p className="text-sm font-medium">Level normal. No readings below {threshold}% today.</p>
    </div>
  );
}