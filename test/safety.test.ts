import assert from "node:assert/strict";
import test from "node:test";

import { assertAllowedFandangoRequest, buildFandangoUrl } from "../src/fandango/client.js";

test("buildFandangoUrl preserves the read-only Fandango API host and query params", () => {
  const url = buildFandangoUrl("https://www.fandango.com", "/napi/seatMap/123abc", {
    isdesktop: true,
    refererHint: undefined,
  });

  assert.equal(url.toString(), "https://www.fandango.com/napi/seatMap/123abc?isdesktop=true");
});

test("assertAllowedFandangoRequest allows observed read-only napi endpoints", () => {
  const url = new URL("https://www.fandango.com/napi/theaterMovieShowtimes/AANEM?startDate=2026-07-18");

  assert.doesNotThrow(() => assertAllowedFandangoRequest("GET", url));
});

test("assertAllowedFandangoRequest rejects ticketing and non-GET requests", () => {
  assert.throws(
    () => assertAllowedFandangoRequest("GET", new URL("https://tickets.fandango.com/checkout")),
    /FORBIDDEN_ENDPOINT/,
  );
  assert.throws(
    () => assertAllowedFandangoRequest("POST", new URL("https://www.fandango.com/napi/seatMap/abc")),
    /FORBIDDEN_ENDPOINT/,
  );
  assert.throws(
    () => assertAllowedFandangoRequest("GET", new URL("https://www.fandango.com/napi/cart/add")),
    /FORBIDDEN_ENDPOINT/,
  );
});
