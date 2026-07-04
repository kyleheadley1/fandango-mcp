import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSeatMap, renderSeatMap } from "../src/fandango/types.js";

test("renderSeatMap uses aligned Unicode boxes and row labels", () => {
  const seatMap = normalizeSeatMap({
    theaterName: "AMC Metreon 16",
    totalAvailableSeatCount: 2,
    totalSeatCount: 4,
    seats: [
      { id: "A1", row: "A", column: 1, status: "A", type: "seat", x: 10, y: 10 },
      { id: "A2", row: "A", column: 2, status: "R", type: "seat", x: 20, y: 10 },
      { id: "A4", row: "A", column: 4, status: "A", type: "wheelchair", x: 40, y: 10 },
      { id: "B1", row: "B", column: 1, status: "R", type: "wheelchair", x: 10, y: 20 },
    ],
  });

  const rendered = renderSeatMap(seatMap, "spaced");

  assert.match(rendered, /AMC Metreon 16/);
  assert.match(rendered, /□ open/);
  assert.match(rendered, /☒ taken/);
  assert.match(rendered, /▣ open wheelchair/);
  assert.match(rendered, /▦ taken wheelchair/);
  assert.match(rendered, /^A\s+□ ☒\s\s▣/m);
  assert.match(rendered, /^B\s+▦/m);
});

test("renderSeatMap can include a screen marker, column labels, and best open groups", () => {
  const seatMap = normalizeSeatMap({
    theaterName: "AMC Metreon 16",
    seats: [
      { id: "A1", row: "A", column: 1, status: "A", type: "seat", x: 10, y: 10 },
      { id: "A2", row: "A", column: 2, status: "A", type: "seat", x: 20, y: 10 },
      { id: "A3", row: "A", column: 3, status: "R", type: "seat", x: 30, y: 10 },
      { id: "B5", row: "B", column: 5, status: "A", type: "seat", x: 50, y: 30 },
      { id: "B6", row: "B", column: 6, status: "A", type: "seat", x: 60, y: 30 },
      { id: "B7", row: "B", column: 7, status: "A", type: "seat", x: 70, y: 30 },
    ],
  });

  const rendered = renderSeatMap(seatMap, {
    style: "spaced",
    includeColumnLabels: true,
    includeOpenGroups: true,
    maxOpenGroups: 2,
  });

  assert.match(rendered, /^SCREEN\s+-+$/m);
  assert.match(rendered, /^Open groups: row B cols 5-7 \(3\), row A cols 1-2 \(2\)$/m);
  assert.match(rendered, /^cols\s+1 2 3 4\s\s5 6 7$/m);
});

test("renderSeatMap compact mode removes inter-seat padding", () => {
  const seatMap = normalizeSeatMap({
    theaterName: "AMC Metreon 16",
    seats: [
      { id: "A1", row: "A", column: 1, status: "A", type: "seat" },
      { id: "A2", row: "A", column: 2, status: "R", type: "seat" },
    ],
  });

  const rendered = renderSeatMap(seatMap, "compact");

  assert.match(rendered, /^A\s+□☒$/m);
});
