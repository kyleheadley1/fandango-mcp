import type { FandangoConfig } from "../config.js";
import { FANDANGO_ORIGIN } from "../meta.js";
import { FandangoError } from "./errors.js";
import {
  normalizeMovieShowtimeGroupings,
  normalizeSeatMap,
  normalizeTheaterCalendar,
  normalizeTheaterShowtimes,
  type MovieGroupingFilters,
  type NormalizedMovieGroupings,
  type NormalizedSeatMap,
  type NormalizedTheaterCalendar,
  type NormalizedTheaterShowtimes,
  type ShowtimeFilters,
} from "./types.js";

export type QueryValue = string | number | boolean | undefined;

export interface MovieShowtimesQuery extends MovieGroupingFilters {
  zip?: string | undefined;
  lat?: number | undefined;
  long?: number | undefined;
  chainCode?: string | undefined;
  page?: number | undefined;
}

export interface TheaterShowtimesQuery extends ShowtimeFilters {
  theaterId: string;
  date: string;
  chainCode?: string | undefined;
}

export interface TheaterCalendarQuery {
  theaterId: string;
  startDate?: string | undefined;
}

export interface FandangoClientResult<T> {
  fetchedAt: string;
  query: object;
  data: T;
}

type FetchLike = (input: URL, init?: RequestInit) => Promise<Response>;

const ALLOWED_PATH_PREFIXES = [
  "/napi/theaterShowtimeGroupings/",
  "/napi/theaterMovieShowtimes/",
  "/napi/theaterCalendar/",
  "/napi/seatMap/",
] as const;

const FORBIDDEN_HOSTS = new Set(["tickets.fandango.com"]);
const FORBIDDEN_PATH_PARTS = [
  "/account",
  "/cart",
  "/checkout",
  "/favorite",
  "/payment",
  "/purchase",
  "/ticketing",
  "/tickets",
  "/validate",
];

export function buildFandangoUrl(
  baseUrl: string,
  path: string,
  query: Record<string, QueryValue> = {},
): URL {
  const url = path.startsWith("http://") || path.startsWith("https://") ? new URL(path) : new URL(path, baseUrl);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  return url;
}

export function assertAllowedFandangoRequest(method: string, url: URL): void {
  if (method.toUpperCase() !== "GET") {
    throw new FandangoError("FORBIDDEN_ENDPOINT", "Fandango MCP only permits GET requests", {
      method,
      url: url.toString(),
    });
  }

  if (url.protocol !== "https:") {
    throw new FandangoError("FORBIDDEN_ENDPOINT", "Fandango MCP only permits HTTPS requests", {
      url: url.toString(),
    });
  }

  if (FORBIDDEN_HOSTS.has(url.hostname) || url.hostname !== new URL(FANDANGO_ORIGIN).hostname) {
    throw new FandangoError("FORBIDDEN_ENDPOINT", "Fandango MCP refuses non-read-only Fandango hosts", {
      host: url.hostname,
    });
  }

  const path = url.pathname.toLowerCase();
  if (FORBIDDEN_PATH_PARTS.some((part) => path.includes(part))) {
    throw new FandangoError("FORBIDDEN_ENDPOINT", "Fandango MCP refuses ticketing, cart, account, or checkout paths", {
      path: url.pathname,
    });
  }

  if (!ALLOWED_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    throw new FandangoError("FORBIDDEN_ENDPOINT", "Fandango MCP only permits observed read-only napi endpoints", {
      path: url.pathname,
    });
  }
}

export class FandangoClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => Date;

  constructor(config: FandangoConfig, fetchImpl: FetchLike = fetch, now: () => Date = () => new Date()) {
    this.baseUrl = config.baseUrl;
    this.userAgent = config.userAgent;
    this.timeoutMs = config.request.timeoutMs;
    this.fetchImpl = fetchImpl;
    this.now = now;
  }

  async movieShowtimes(query: MovieShowtimesQuery): Promise<FandangoClientResult<NormalizedMovieGroupings>> {
    if (!query.zip && (query.lat === undefined || query.long === undefined)) {
      throw new FandangoError("NO_LOCATION", "movie showtime lookup requires zip or both lat and long");
    }

    const locationQuery =
      query.lat !== undefined && query.long !== undefined
        ? { lat: query.lat, long: query.long }
        : { zip: query.zip };

    const raw = await this.fetchJson(`/napi/theaterShowtimeGroupings/${query.movieId}/${query.date}`, {
      ...locationQuery,
      isdesktop: true,
      isDesktopMOP: true,
      chainCode: query.chainCode,
      page: query.page,
    });

    return {
      fetchedAt: this.now().toISOString(),
      query: {
        movieId: query.movieId,
        date: query.date,
        format: query.format,
        chainCode: query.chainCode,
        page: query.page,
        ...locationQuery,
      },
      data: normalizeMovieShowtimeGroupings(raw, query),
    };
  }

  async theaterShowtimes(query: TheaterShowtimesQuery): Promise<FandangoClientResult<NormalizedTheaterShowtimes>> {
    const raw = await this.fetchJson(`/napi/theaterMovieShowtimes/${encodeURIComponent(query.theaterId)}`, {
      chainCode: query.chainCode,
      startDate: query.date,
      isdesktop: true,
      partnerRestrictedTicketing: "",
    });

    return {
      fetchedAt: this.now().toISOString(),
      query,
      data: normalizeTheaterShowtimes(raw, query),
    };
  }

  async theaterCalendar(query: TheaterCalendarQuery): Promise<FandangoClientResult<NormalizedTheaterCalendar>> {
    const raw = await this.fetchJson(`/napi/theaterCalendar/${encodeURIComponent(query.theaterId)}`, {
      startDate: query.startDate,
    });

    return {
      fetchedAt: this.now().toISOString(),
      query,
      data: normalizeTheaterCalendar(raw),
    };
  }

  async seatAvailability(showtimeHashCode: string, referer?: string): Promise<FandangoClientResult<NormalizedSeatMap>> {
    const raw = await this.fetchJson(`/napi/seatMap/${encodeURIComponent(showtimeHashCode)}`, {}, referer);

    return {
      fetchedAt: this.now().toISOString(),
      query: { showtimeHashCode },
      data: normalizeSeatMap(raw),
    };
  }

  private async fetchJson(
    path: string,
    query: Record<string, QueryValue> = {},
    referer?: string,
  ): Promise<unknown> {
    const url = buildFandangoUrl(this.baseUrl, path, query);
    assertAllowedFandangoRequest("GET", url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: referer ?? this.baseUrl,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": this.userAgent,
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new FandangoError("UPSTREAM_HTTP_ERROR", `Fandango returned HTTP ${response.status}`, {
          status: response.status,
          url: url.toString(),
        });
      }

      try {
        return await response.json();
      } catch (error) {
        throw new FandangoError("UPSTREAM_PARSE_ERROR", "Fandango response was not valid JSON", {
          url: url.toString(),
          cause: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      if (error instanceof FandangoError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new FandangoError("REQUEST_TIMEOUT", "Timed out waiting for Fandango", {
          timeoutMs: this.timeoutMs,
          url: url.toString(),
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
