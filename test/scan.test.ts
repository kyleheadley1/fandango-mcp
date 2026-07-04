import assert from "node:assert/strict";
import test from "node:test";

import { scanMovieAvailability, type ScanFandangoClient } from "../src/fandango/scan.js";
import { normalizeSeatMap, type NormalizedSeatMap } from "../src/fandango/types.js";

class FakeScanClient implements ScanFandangoClient {
  readonly seatCalls: string[] = [];

  async movieShowtimes(query: { movieId: number; date: string }): Promise<{
    fetchedAt: string;
    query: object;
    data: {
      date: string;
      movieId: number;
      hasShowtimes: boolean;
      theaters: Array<{
        id: string;
        name: string;
        showtimes: Array<{
          date: string;
          showDate: string;
          status: string;
          isAvailable: boolean;
          expired: boolean;
          formats: string[];
          showtimeHashCode: string;
          startsAtLocal: string;
        }>;
      }>;
    };
  }> {
    return {
      fetchedAt: `${query.date}T00:00:00.000Z`,
      query,
      data: {
        date: query.date,
        movieId: query.movieId,
        hasShowtimes: true,
        theaters: [
          {
            id: "AANEM",
            name: "AMC Metreon 16",
            showtimes: [
              showtime(query.date, "19:00", `${query.date}-evening`),
              showtime(query.date, "23:00", `${query.date}-late`),
            ],
          },
        ],
      },
    };
  }

  async seatAvailability(showtimeHashCode: string): Promise<{
    fetchedAt: string;
    query: object;
    data: NormalizedSeatMap;
  }> {
    this.seatCalls.push(showtimeHashCode);
    return {
      fetchedAt: "2026-07-18T00:00:00.000Z",
      query: { showtimeHashCode },
      data: normalizeSeatMap({
        theaterName: "AMC Metreon 16",
        seats:
          showtimeHashCode.endsWith("late")
            ? [
                { id: "B5", row: "B", column: 5, status: "A", type: "seat" },
                { id: "B6", row: "B", column: 6, status: "A", type: "seat" },
                { id: "B7", row: "B", column: 7, status: "A", type: "seat" },
                { id: "B8", row: "B", column: 8, status: "R", type: "seat" },
              ]
            : [
                { id: "A1", row: "A", column: 1, status: "A", type: "seat" },
                { id: "A2", row: "A", column: 2, status: "A", type: "seat" },
                { id: "A3", row: "A", column: 3, status: "R", type: "seat" },
              ],
      }),
    };
  }
}

test("scanMovieAvailability can include full seat details and a best availability summary", async () => {
  const client = new FakeScanClient();

  const result = await scanMovieAvailability(client, {
    movieId: 241283,
    startDate: "2026-07-18",
    days: 1,
    lat: 37.7845,
    long: -122.404,
    format: "IMAX 70MM",
    includeSeatDetails: true,
    maxSeatMapFetches: 10,
  });

  const showtimes = result.dates[0]?.theaters[0]?.showtimes ?? [];
  assert.equal(client.seatCalls.length, 2);
  assert.equal(result.seatMapFetchCount, 2);
  assert.equal(result.seatCountsTruncated, false);
  assert.equal(showtimes.length, 2);
  assert.equal(showtimes[0]?.seatMap?.seats.length, 3);
  assert.equal(showtimes[1]?.openGroups?.[0]?.label, "row B cols 5-7");
  assert.equal(result.bestAvailability[0]?.showtimeHashCode, "2026-07-18-late");
  assert.equal(result.bestAvailability[0]?.bestOpenGroup?.size, 3);
});

test("scanMovieAvailability caps seat-map fetches while preserving all showtimes", async () => {
  const client = new FakeScanClient();

  const result = await scanMovieAvailability(client, {
    movieId: 241283,
    startDate: "2026-07-18",
    days: 2,
    zip: "94103",
    includeSeatCounts: true,
    maxSeatMapFetches: 2,
  });

  const allShowtimes = result.dates.flatMap((date) =>
    date.theaters.flatMap((theater) => theater.showtimes),
  );
  assert.equal(client.seatCalls.length, 2);
  assert.equal(result.seatMapFetchCount, 2);
  assert.equal(result.seatCountsTruncated, true);
  assert.equal(allShowtimes.length, 4);
  assert.equal(allShowtimes.filter((showtime) => showtime.seats !== undefined).length, 2);
  assert.equal(allShowtimes.filter((showtime) => showtime.seats === undefined).length, 2);
});

function showtime(showDate: string, time: string, showtimeHashCode: string) {
  return {
    date: time,
    showDate,
    status: "available",
    isAvailable: true,
    expired: false,
    formats: ["IMAX 70MM"],
    showtimeHashCode,
    startsAtLocal: `${showDate}T${time}`,
  };
}
