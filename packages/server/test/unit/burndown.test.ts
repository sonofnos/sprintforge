import { describe, expect, it } from "vitest";
import { computeBurndownSeries } from "../../src/modules/sprints/burndown.js";

describe("computeBurndownSeries", () => {
  const days = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"];

  it("ideal line steps down linearly across the sprint", () => {
    const series = computeBurndownSeries(days, 20, new Map());
    expect(series.map((p) => p.idealRemaining)).toEqual([20, 15, 10, 5, 0]);
  });

  it("actual line only drops when points are completed that day", () => {
    const completed = new Map([
      ["2026-01-02", 5],
      ["2026-01-04", 8],
    ]);
    const series = computeBurndownSeries(days, 20, completed);
    expect(series.map((p) => p.actualRemaining)).toEqual([20, 15, 15, 7, 7]);
  });

  it("never reports negative remaining even if more points complete than exist", () => {
    const completed = new Map([["2026-01-01", 999]]);
    const series = computeBurndownSeries(days, 20, completed);
    expect(series.every((p) => p.actualRemaining >= 0)).toBe(true);
  });

  it("handles a single-day sprint without dividing by zero", () => {
    const series = computeBurndownSeries(["2026-01-01"], 10, new Map());
    expect(series).toEqual([{ day: "2026-01-01", idealRemaining: 10, actualRemaining: 10 }]);
  });
});
