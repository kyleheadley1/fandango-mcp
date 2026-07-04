import assert from "node:assert/strict";
import test from "node:test";

import type { FandangoConfig } from "../src/config.js";
import { FandangoClient } from "../src/fandango/client.js";
import { FandangoError } from "../src/fandango/errors.js";

const config: FandangoConfig = {
  baseUrl: "https://www.fandango.com",
  userAgent: "FandangoClientTest/1.0",
  request: { timeoutMs: 50 },
};

function minimalMovieGroupingBody(): unknown {
  return {
    hasShowtimes: true,
    theaterShowtimes: {
      theaters: [
        {
          id: "AANEM",
          name: "AMC Metreon 16",
          distance: 0.4,
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
      ],
    },
  };
}

async function assertFandangoError(
  action: () => Promise<unknown>,
  code: FandangoError["code"],
): Promise<FandangoError> {
  try {
    await action();
  } catch (error) {
    assert.ok(error instanceof FandangoError);
    assert.equal(error.code, code);
    return error;
  }

  assert.fail(`Expected FandangoError ${code}`);
}

test("movieShowtimes sends the expected path, query params, and browser-like headers", async () => {
  const requests: Array<{ input: URL; init: RequestInit | undefined }> = [];
  const fetchImpl = async (input: URL, init?: RequestInit): Promise<Response> => {
    requests.push({ input, init });
    return Response.json(minimalMovieGroupingBody());
  };
  const client = new FandangoClient(config, fetchImpl, () => new Date("2026-07-04T18:00:00.000Z"));

  const result = await client.movieShowtimes({
    movieId: 241283,
    date: "2026-07-18",
    zip: "94103",
    format: "imax 70mm",
    chainCode: "AMC",
    page: 2,
  });

  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.ok(request);
  assert.equal(request.input.origin, "https://www.fandango.com");
  assert.equal(request.input.pathname, "/napi/theaterShowtimeGroupings/241283/2026-07-18");
  assert.equal(request.input.searchParams.get("zip"), "94103");
  assert.equal(request.input.searchParams.get("isdesktop"), "true");
  assert.equal(request.input.searchParams.get("isDesktopMOP"), "true");
  assert.equal(request.input.searchParams.get("chainCode"), "AMC");
  assert.equal(request.input.searchParams.get("page"), "2");
  assert.equal(request.init?.method, "GET");
  assert.equal(request.init?.headers?.["Accept"], "application/json, text/javascript, */*; q=0.01");
  assert.equal(request.init?.headers?.["Accept-Language"], "en-US,en;q=0.9");
  assert.equal(request.init?.headers?.["Referer"], "https://www.fandango.com");
  assert.equal(request.init?.headers?.["Sec-Fetch-Dest"], "empty");
  assert.equal(request.init?.headers?.["Sec-Fetch-Mode"], "cors");
  assert.equal(request.init?.headers?.["Sec-Fetch-Site"], "same-origin");
  assert.equal(request.init?.headers?.["User-Agent"], "FandangoClientTest/1.0");
  assert.equal(request.init?.headers?.["X-Requested-With"], "XMLHttpRequest");
  assert.equal(result.fetchedAt, "2026-07-04T18:00:00.000Z");
  assert.equal(result.data.theaters[0]?.showtimes[0]?.showtimeHashCode, "metreon-hash");
});

test("movieShowtimes rejects requests without zip or lat/long before fetching", async () => {
  let fetchCalls = 0;
  const fetchImpl = async (): Promise<Response> => {
    fetchCalls += 1;
    return Response.json(minimalMovieGroupingBody());
  };
  const client = new FandangoClient(config, fetchImpl);

  await assertFandangoError(
    () => client.movieShowtimes({ movieId: 241283, date: "2026-07-18" }),
    "NO_LOCATION",
  );

  assert.equal(fetchCalls, 0);
});

test("upstream non-2xx responses become UPSTREAM_HTTP_ERROR", async () => {
  const client = new FandangoClient(config, async () => new Response("not found", { status: 503 }));

  const error = await assertFandangoError(
    () => client.movieShowtimes({ movieId: 241283, date: "2026-07-18", zip: "94103" }),
    "UPSTREAM_HTTP_ERROR",
  );

  assert.equal(error.details?.["status"], 503);
});

test("invalid upstream JSON becomes UPSTREAM_PARSE_ERROR", async () => {
  const client = new FandangoClient(
    config,
    async () => new Response("{", { headers: { "content-type": "application/json" } }),
  );

  await assertFandangoError(
    () => client.movieShowtimes({ movieId: 241283, date: "2026-07-18", zip: "94103" }),
    "UPSTREAM_PARSE_ERROR",
  );
});

test("aborted fetch becomes REQUEST_TIMEOUT without waiting for the timer", async () => {
  const fetchImpl = async (_input: URL, init?: RequestInit): Promise<Response> => {
    init?.signal?.throwIfAborted();
    throw new DOMException("The operation was aborted.", "AbortError");
  };
  const client = new FandangoClient(config, fetchImpl);

  await assertFandangoError(
    () => client.movieShowtimes({ movieId: 241283, date: "2026-07-18", zip: "94103" }),
    "REQUEST_TIMEOUT",
  );
});
