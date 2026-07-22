import { describe, expect, it } from "vitest";
import { collectDurations, computeErrorRate, computeLatencyPercentiles } from "./aggregate.js";
import type { RecordedCount, RecordedDuration } from "./metrics.js";

describe("computeLatencyPercentiles", () => {
  it("returns all zeros with count 0 for an empty sample", () => {
    expect(computeLatencyPercentiles([])).toEqual({ count: 0, p50: 0, p95: 0, p99: 0 });
  });

  it("computes exact nearest-rank percentiles for a known 10-value sample", () => {
    // 1..10: p50 rank = ceil(0.5*10)=5 -> sorted[4]=5; p95 rank=ceil(9.5)=10 -> sorted[9]=10;
    // p99 rank=ceil(9.9)=10 -> sorted[9]=10.
    const durations = [10, 2, 8, 4, 6, 1, 3, 7, 5, 9];
    expect(computeLatencyPercentiles(durations)).toEqual({ count: 10, p50: 5, p95: 10, p99: 10 });
  });

  it("is not affected by input order (sorts internally, doesn't mutate the input)", () => {
    const durations = [100, 1, 50];
    const copy = [...durations];
    const result = computeLatencyPercentiles(durations);
    expect(durations).toEqual(copy);
    expect(result.p50).toBe(50);
  });

  it("handles a single-value sample (every percentile equals that value)", () => {
    expect(computeLatencyPercentiles([42])).toEqual({ count: 1, p50: 42, p95: 42, p99: 42 });
  });
});

describe("collectDurations", () => {
  const entries: RecordedDuration[] = [
    { name: "http.request.duration_ms", tags: { path: "/a" }, durations: [1, 2] },
    { name: "http.request.duration_ms", tags: { path: "/b" }, durations: [3] },
    { name: "repository.duration_ms", tags: { operation: "leads.save" }, durations: [99] },
  ];

  it("flattens every entry matching the given name across tag combinations", () => {
    expect(collectDurations(entries, "http.request.duration_ms")).toEqual([1, 2, 3]);
  });

  it("returns an empty array when no entry matches", () => {
    expect(collectDurations(entries, "nonexistent.metric")).toEqual([]);
  });

  it("does not mix in entries from a different metric name", () => {
    expect(collectDurations(entries, "repository.duration_ms")).toEqual([99]);
  });
});

describe("computeErrorRate", () => {
  it("returns all zeros when no entry matches the given name", () => {
    expect(computeErrorRate([], "http.request")).toEqual({
      total: 0,
      serverErrors: 0,
      clientErrors: 0,
      serverErrorRate: 0,
      clientErrorRate: 0,
    });
  });

  it("computes a real 5xx/4xx split across mixed statuses", () => {
    const counts: RecordedCount[] = [
      { name: "http.request", tags: { status: "200" }, count: 90 },
      { name: "http.request", tags: { status: "404" }, count: 5 },
      { name: "http.request", tags: { status: "500" }, count: 5 },
    ];
    expect(computeErrorRate(counts)).toEqual({
      total: 100,
      serverErrors: 5,
      clientErrors: 5,
      serverErrorRate: 0.05,
      clientErrorRate: 0.05,
    });
  });

  it("counts a non-numeric status tag toward total but not either error bucket", () => {
    const counts: RecordedCount[] = [
      { name: "http.request", tags: { status: "200" }, count: 10 },
      { name: "http.request", tags: {}, count: 3 },
    ];
    const result = computeErrorRate(counts);
    expect(result.total).toBe(13);
    expect(result.serverErrors).toBe(0);
    expect(result.clientErrors).toBe(0);
  });

  it("ignores entries with a different metric name", () => {
    const counts: RecordedCount[] = [
      { name: "some.other.counter", tags: { status: "500" }, count: 999 },
      { name: "http.request", tags: { status: "200" }, count: 1 },
    ];
    expect(computeErrorRate(counts)).toMatchObject({ total: 1, serverErrors: 0 });
  });

  it("supports a custom metric name", () => {
    const counts: RecordedCount[] = [{ name: "custom.counter", tags: { status: "503" }, count: 2 }];
    expect(computeErrorRate(counts, "custom.counter")).toMatchObject({
      total: 2,
      serverErrors: 2,
      serverErrorRate: 1,
    });
  });
});
