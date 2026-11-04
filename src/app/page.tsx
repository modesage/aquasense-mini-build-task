import readings from "@/data/readings.json";
import { AlertBanner } from "@/components/AlertBanner";
import { LevelChart } from "@/components/LevelChart";
import { MetricCard } from "@/components/MetricCard";
import { LOW_LEVEL_THRESHOLD } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { computeTankStats, timeOf } from "@/lib/tank-stats";

export default function Page() {
  const stats = computeTankStats(readings);

  if (!stats) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Tank Level Dashboard</h1>
        <p className="mt-4 text-slate-600">No readings available.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Tank Level Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Readings for {formatDate(stats.date)} · last updated {timeOf(stats.current.timestamp)}
        </p>
      </header>

      <AlertBanner stats={stats} threshold={LOW_LEVEL_THRESHOLD} />

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Summary">
        <MetricCard
          label="Current level"
          value={`${stats.current.level_percent}%`}
          hint={`as of ${timeOf(stats.current.timestamp)}`}
          percent={stats.current.level_percent}
          danger={stats.isActiveAlert}
        />
        <MetricCard
          label="Today's minimum"
          value={`${stats.min.level_percent}%`}
          hint={`at ${timeOf(stats.min.timestamp)}`}
          danger={stats.min.level_percent < LOW_LEVEL_THRESHOLD}
        />
        <MetricCard
          label="Today's maximum"
          value={`${stats.max.level_percent}%`}
          hint={`at ${timeOf(stats.max.timestamp)}`}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-slate-500">Level over time</h2>
        <LevelChart
          readings={stats.readings}
          breaches={stats.breaches}
          threshold={LOW_LEVEL_THRESHOLD}
        />
      </section>
    </main>
  );
}