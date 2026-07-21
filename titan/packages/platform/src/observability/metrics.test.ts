import { describe, expect, it } from "vitest";
import { createInMemoryMetrics } from "./metrics.js";

describe("createInMemoryMetrics", () => {
  it("returns no counts or durations before anything is recorded", () => {
    const metrics = createInMemoryMetrics();
    expect(metrics.getCounts()).toEqual([]);
    expect(metrics.getDurations()).toEqual([]);
  });

  it("accumulates repeated increments of the same name/tags into one count", () => {
    const metrics = createInMemoryMetrics();
    metrics.increment("http.request", { method: "GET" });
    metrics.increment("http.request", { method: "GET" });
    metrics.increment("http.request", { method: "POST" });

    const counts = metrics.getCounts();
    expect(counts).toHaveLength(2);
    expect(counts.find((c) => c.tags.method === "GET")?.count).toBe(2);
    expect(counts.find((c) => c.tags.method === "POST")?.count).toBe(1);
  });

  it("accumulates repeated durations of the same name/tags into one series", () => {
    const metrics = createInMemoryMetrics();
    metrics.recordDuration("repository.duration_ms", 5, { operation: "leads.search" });
    metrics.recordDuration("repository.duration_ms", 12, { operation: "leads.search" });

    const durations = metrics.getDurations();
    expect(durations).toHaveLength(1);
    expect(durations[0]?.durations).toEqual([5, 12]);
  });

  it("keeps distinct tag sets as separate series", () => {
    const metrics = createInMemoryMetrics();
    metrics.recordDuration("repository.duration_ms", 5, { operation: "leads.search" });
    metrics.recordDuration("repository.duration_ms", 7, { operation: "audit.search" });

    expect(metrics.getDurations()).toHaveLength(2);
  });
});
