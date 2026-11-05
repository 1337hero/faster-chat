import { describe, test, expect } from "bun:test";
import { runWithConcurrency } from "../lib/concurrency.js";

describe("runWithConcurrency", () => {
  test("keeps at most `limit` tasks in flight and resolves results in order", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const tasks = [1, 2, 3, 4].map((n) => async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10 * (5 - n)));
      inFlight -= 1;
      return n;
    });

    const results = await runWithConcurrency(tasks, 3);

    expect(results).toEqual([1, 2, 3, 4]);
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  test("returns an empty list for no tasks", async () => {
    await expect(runWithConcurrency([], 3)).resolves.toEqual([]);
  });
});
