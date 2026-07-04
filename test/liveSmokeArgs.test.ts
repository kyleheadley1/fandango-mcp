import assert from "node:assert/strict";
import test from "node:test";

import { parseLiveSmokeArgs } from "../src/fandango/liveSmokeArgs.js";

test("parseLiveSmokeArgs defaults to movie mode", () => {
  const parsed = parseLiveSmokeArgs([
    "--movieId",
    "241283",
    "--date",
    "2026-07-18",
    "--lat",
    "37.7845",
    "--long=-122.404",
    "--format",
    "IMAX 70MM",
  ]);

  assert.deepEqual(parsed, {
    mode: "movie",
    movieId: 241283,
    date: "2026-07-18",
    lat: 37.7845,
    long: -122.404,
    format: "IMAX 70MM",
  });
});

test("parseLiveSmokeArgs supports calendar, theater, seat, render, and scan modes", () => {
  assert.deepEqual(parseLiveSmokeArgs(["--mode", "calendar", "--theaterId", "AANEM"]), {
    mode: "calendar",
    theaterId: "AANEM",
  });
  assert.deepEqual(parseLiveSmokeArgs(["--mode", "theater", "--theaterId", "AANEM", "--date", "2026-07-18"]), {
    mode: "theater",
    theaterId: "AANEM",
    date: "2026-07-18",
  });
  assert.deepEqual(parseLiveSmokeArgs(["--mode", "seat", "--showtimeHashCode", "abc"]), {
    mode: "seat",
    showtimeHashCode: "abc",
  });
  assert.deepEqual(parseLiveSmokeArgs(["--mode", "render", "--showtimeHashCode", "abc", "--style", "compact"]), {
    mode: "render",
    showtimeHashCode: "abc",
    style: "compact",
  });
  assert.deepEqual(
    parseLiveSmokeArgs([
      "--mode",
      "scan",
      "--movieId",
      "241283",
      "--startDate",
      "2026-07-18",
      "--days",
      "2",
      "--zip",
      "94103",
      "--includeSeatDetails",
      "--maxSeatMapFetches",
      "12",
    ]),
    {
      mode: "scan",
      movieId: 241283,
      startDate: "2026-07-18",
      days: 2,
      zip: "94103",
      includeSeatDetails: true,
      maxSeatMapFetches: 12,
    },
  );
});

test("parseLiveSmokeArgs rejects missing required options for the selected mode", () => {
  assert.throws(() => parseLiveSmokeArgs(["--mode", "render"]), /requires --showtimeHashCode/);
  assert.throws(() => parseLiveSmokeArgs(["--mode", "scan", "--movieId", "241283"]), /requires --startDate/);
});
