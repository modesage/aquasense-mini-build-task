type Props = {
    label: string;
    value: string;
    hint: string;
    danger?: boolean;
    percent?: number; // optional level bar
  };
  
  export function MetricCard({ label, value, hint, danger = false, percent }: Props) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p
          className={`mt-2 text-4xl font-semibold tabular-nums ${
            danger ? "text-red-600" : "text-slate-900"
          }`}
        >
          {value}
        </p>
        <p className="mt-1 text-sm text-slate-500">{hint}</p>
        {percent !== undefined && (
          <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className={`h-full rounded-full ${danger ? "bg-red-500" : "bg-sky-500"}`}
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
        )}
      </div>
    );
  }