import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTheaterCalendar } from "../src/fandango/types.js";

test("normalizeTheaterCalendar returns a compact stable calendar shape", () => {
  const result = normalizeTheaterCalendar({
    selectedDate: "2026-07-18",
    firstShowtime: "2026-07-16",
    endDateFull: "2026-08-06",
    showtimeDates: ["2026-07-18", "2026-07-19"],
    calendar: [
      { full: "2026-07-18", hasShowtime: true, label: "Sat" },
      { full: "2026-07-20", hasShowtime: false, label: "Mon" },
    ],
  });

  assert.deepEqual(result, {
    selectedDate: "2026-07-18",
    firstShowtimeDate: "2026-07-16",
    endDate: "2026-08-06",
    showtimeDates: ["2026-07-18", "2026-07-19"],
    dates: [
      { date: "2026-07-18", hasShowtime: true },
      { date: "2026-07-20", hasShowtime: false },
    ],
  });
});
