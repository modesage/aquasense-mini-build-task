import readings from "../src/data/readings.json";
import { computeTankStats, type Reading } from "../src/lib/tank-stats";

const r = (timestamp: string, level_percent: number): Reading => ({ timestamp, level_percent });

describe("computeTankStats", () => {
  it("computes current, min and max for the provided mock data", () => {
    const s = computeTankStats(readings)!;
    expect(s.date).toBe("2026-11-02");
    expect(s.current).toEqual(r("2026-11-02T20:00:00", 55));
    expect(s.min).toEqual(r("2026-11-02T16:00:00", 18));
    expect(s.max).toEqual(r("2026-11-02T06:00:00", 78));
  });

  it("records the 16:00 breach but no active alert (current is 55%)", () => {
    const s = computeTankStats(readings)!;
    expect(s.breaches).toEqual([r("2026-11-02T16:00:00", 18)]);
    expect(s.isActiveAlert).toBe(false);
  });

  it("is order-independent and does not mutate its input", () => {
    const shuffled = [...readings].reverse();
    const before = JSON.stringify(shuffled);
    const s = computeTankStats(shuffled)!;
    expect(s.current.level_percent).toBe(55);
    expect(s.readings.map((x) => x.timestamp)).toEqual(readings.map((x) => x.timestamp));
    expect(JSON.stringify(shuffled)).toBe(before);
  });

  it("uses a strict threshold: exactly 20% is not a breach", () => {
    const s = computeTankStats([r("2026-11-02T06:00:00", 20)])!;
    expect(s.breaches).toEqual([]);
    expect(s.isActiveAlert).toBe(false);
  });

  it("raises an active alert when the latest reading is below threshold", () => {
    const s = computeTankStats([r("2026-11-02T06:00:00", 60), r("2026-11-02T08:00:00", 12)])!;
    expect(s.isActiveAlert).toBe(true);
  });

  it("scopes min/max/breaches to the latest day only", () => {
    const s = computeTankStats([r("2026-11-01T10:00:00", 5), r("2026-11-02T10:00:00", 50)])!;
    expect(s.min.level_percent).toBe(50);
    expect(s.breaches).toEqual([]);
  });

  it("returns null for empty input", () => {
    expect(computeTankStats([])).toBeNull();
  });
});