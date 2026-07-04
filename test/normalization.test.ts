import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeMovieShowtimeGroupings,
  normalizeSeatMap,
  normalizeTheaterShowtimes,
} from "../src/fandango/types.js";

test("normalizeTheaterShowtimes keeps movie, format, and seat-map ids from theater view models", () => {
  const result = normalizeTheaterShowtimes(
    {
      viewModel: {
        date: "2026-07-18",
        theater: {
          details: {
            id: "AANEM",
            name: "AMC Metreon 16",
            address1: "135 4th St Suite #3000",
            city: "San Francisco",
            state: "CA",
            zip: "94103",
          },
        },
        movies: [
          {
            id: 241283,
            title: "The Odyssey",
            variants: [
              {
                filmFormatHeader: "IMAX 70MM",
                amenityGroups: [
                  {
                    amenityString: "IMAX 70MM",
                    showtimes: [
                      {
                        date: "2026-07-18T11:30:00",
                        expired: false,
                        type: "available",
                        showtimeHashCode: "open-hash",
                        ticketingDate: "2026-07-18T11:30:00",
                        filmFormat: [{ filterName: "IMAX 70MM" }],
                        ticketingJumpPageURL: "/ticketing/redirect",
                      },
                      {
                        date: "2026-07-18T15:45:00",
                        expired: false,
                        type: "soldout",
                        showtimeHashCode: "sold-hash",
                        filmFormat: [{ filterName: "IMAX 70MM" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 123,
            title: "Other Movie",
            variants: [],
          },
        ],
      },
    },
    { movieId: 241283, format: "imax 70mm" },
  );

  assert.equal(result.theater.id, "AANEM");
  assert.equal(result.movies.length, 1);
  assert.equal(result.movies[0]?.showtimes.length, 2);
  assert.equal(result.movies[0]?.showtimes[0]?.isAvailable, true);
  assert.equal(result.movies[0]?.showtimes[1]?.isAvailable, false);
  assert.equal(result.movies[0]?.showtimes[0]?.showtimeHashCode, "open-hash");
});

test("normalizeMovieShowtimeGroupings returns nearby theaters with filtered showtimes", () => {
  const result = normalizeMovieShowtimeGroupings(
    {
      hasShowtimes: true,
      theaterShowtimes: {
        theaters: [
          {
            id: "AANEM",
            name: "AMC Metreon 16",
            distance: 0.4,
            address1: "135 4th St Suite #3000",
            city: "San Francisco",
            state: "CA",
            variants: [
              {
                filmFormatHeader: "IMAX 70MM",
                amenityGroups: [
                  {
                    amenityString: "IMAX 70MM",
                    showtimes: [
                      {
                        date: "2026-07-18T11:30:00",
                        expired: false,
                        type: "available",
                        showtimeHashCode: "metreon-hash",
                        filmFormat: [{ filterName: "IMAX 70MM" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: "OTHER",
            name: "Other Theater",
            variants: [
              {
                filmFormatHeader: "Digital",
                amenityGroups: [
                  {
                    amenityString: "Digital",
                    showtimes: [
                      {
                        date: "2026-07-18T12:00:00",
                        expired: false,
                        type: "available",
                        showtimeHashCode: "digital-hash",
                        filmFormat: [{ filterName: "Digital" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    { movieId: 241283, date: "2026-07-18", format: "imax 70mm" },
  );

  assert.equal(result.hasShowtimes, true);
  assert.equal(result.theaters.length, 1);
  assert.equal(result.theaters[0]?.id, "AANEM");
  assert.equal(result.theaters[0]?.showtimes[0]?.showtimeHashCode, "metreon-hash");
});

test("normalizeMovieShowtimeGroupings sorts by ticketingDate and preserves late-night actual start date", () => {
  const result = normalizeMovieShowtimeGroupings(
    {
      hasShowtimes: true,
      theaterShowtimes: {
        theaters: [
          {
            id: "AANEM",
            name: "AMC Metreon 16",
            variants: [
              {
                filmFormatHeader: "IMAX 70MM",
                amenityGroups: [
                  {
                    amenityString: "IMAX 70MM",
                    showtimes: [
                      {
                        date: "11:00p",
                        expired: false,
                        type: "available",
                        showtimeHashCode: "late",
                        ticketingDate: "2026-07-18+23:00",
                        filmFormat: [{ filterName: "IMAX 70MM" }],
                      },
                      {
                        date: "3:00a",
                        expired: false,
                        type: "available",
                        showtimeHashCode: "after-midnight",
                        ticketingDate: "2026-07-19+03:00",
                        filmFormat: [{ filterName: "IMAX 70MM" }],
                      },
                      {
                        date: "7:00p",
                        expired: false,
                        type: "available",
                        showtimeHashCode: "evening",
                        ticketingDate: "2026-07-18+19:00",
                        filmFormat: [{ filterName: "IMAX 70MM" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    { movieId: 241283, date: "2026-07-18", format: "imax 70mm" },
  );

  const showtimes = result.theaters[0]?.showtimes ?? [];
  assert.deepEqual(
    showtimes.map((showtime) => showtime.showtimeHashCode),
    ["evening", "late", "after-midnight"],
  );
  assert.deepEqual(
    showtimes.map((showtime) => showtime.showDate),
    ["2026-07-18", "2026-07-18", "2026-07-18"],
  );
  assert.deepEqual(
    showtimes.map((showtime) => showtime.startsAtLocal),
    ["2026-07-18T19:00", "2026-07-18T23:00", "2026-07-19T03:00"],
  );
});

test("normalizeSeatMap counts availability and preserves seat coordinates", () => {
  const result = normalizeSeatMap({
    theaterId: "AANEM",
    theaterName: "AMC Metreon 16",
    showtimeId: "123",
    totalAvailableSeatCount: 2,
    totalSeatCount: 4,
    seats: [
      { id: "A1", row: "A", column: 1, status: "A", type: "seat", x: 10, y: 10 },
      { id: "A2", row: "A", column: 2, status: "R", type: "seat", x: 20, y: 10 },
      { id: "B1", row: "B", column: 1, status: "A", type: "wheelchair", x: 10, y: 20 },
      { id: "B2", row: "B", column: 2, status: "R", type: "wheelchair", x: 20, y: 20 },
    ],
  });

  assert.equal(result.totalSeatCount, 4);
  assert.equal(result.availableSeatCount, 2);
  assert.equal(result.takenSeatCount, 2);
  assert.deepEqual(
    result.seats.map((seat) => [seat.id, seat.row, seat.column, seat.status, seat.isAvailable, seat.isWheelchair]),
    [
      ["A1", "A", 1, "A", true, false],
      ["A2", "A", 2, "R", false, false],
      ["B1", "B", 1, "A", true, true],
      ["B2", "B", 2, "R", false, true],
    ],
  );
});
