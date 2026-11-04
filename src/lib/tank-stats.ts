import { LOW_LEVEL_THRESHOLD } from "./config";

export interface Reading {
  timestamp: string; // "YYYY-MM-DDTHH:mm:ss", no timezone offset
  level_percent: number;
}

export interface TankStats {
  date: string; // "YYYY-MM-DD" of the latest reading
  readings: Reading[]; // that day's readings, chronological
  current: Reading;
  min: Reading;
  max: Reading;
  breaches: Reading[]; // that day's readings below threshold
  isActiveAlert: boolean; // latest reading is below threshold
}

// Timestamps are naive local times. Slice instead of using Date so the
// result never shifts with the machine's timezone.
export const dateOf = (ts: string): string => ts.slice(0, 10);
export const timeOf = (ts: string): string => ts.slice(11, 16);

/**
 * "Today" is the date of the latest reading, not the system clock,
 * so the dashboard stays correct for historical/mock data.
 * Pure: never mutates its input.
 */
export function computeTankStats(
  input: readonly Reading[],
  threshold: number = LOW_LEVEL_THRESHOLD,
): TankStats | null {
  if (input.length === 0) return null;

  // Copy before sorting. ISO-8601 strings with a fixed format sort lexicographically.
  const sorted = [...input].sort((a, b) =>
    a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
  );

  const current = sorted[sorted.length - 1];
  const date = dateOf(current.timestamp);
  const readings = sorted.filter((r) => dateOf(r.timestamp) === date);

  const min = readings.reduce((m, r) => (r.level_percent < m.level_percent ? r : m));
  const max = readings.reduce((m, r) => (r.level_percent > m.level_percent ? r : m));
  const breaches = readings.filter((r) => r.level_percent < threshold);

  return {
    date,
    readings,
    current,
    min,
    max,
    breaches,
    isActiveAlert: current.level_percent < threshold,
  };
}