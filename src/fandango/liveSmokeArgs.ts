import { parseArgs } from "node:util";

import type { SeatMapRenderStyle } from "./types.js";

export type LiveSmokeMode = "movie" | "theater" | "calendar" | "seat" | "render" | "scan";

interface BaseLiveSmokeArgs {
  mode: LiveSmokeMode;
}

export type LiveSmokeArgs =
  | (BaseLiveSmokeArgs & {
      mode: "movie";
      movieId: number;
      date: string;
      zip?: string;
      lat?: number;
      long?: number;
      format?: string;
      chainCode?: string;
      page?: number;
    })
  | (BaseLiveSmokeArgs & {
      mode: "theater";
      theaterId: string;
      date: string;
      chainCode?: string;
      movieId?: number;
      format?: string;
    })
  | (BaseLiveSmokeArgs & {
      mode: "calendar";
      theaterId: string;
      startDate?: string;
    })
  | (BaseLiveSmokeArgs & {
      mode: "seat";
      showtimeHashCode: string;
      referer?: string;
    })
  | (BaseLiveSmokeArgs & {
      mode: "render";
      showtimeHashCode: string;
      style?: SeatMapRenderStyle;
      referer?: string;
    })
  | (BaseLiveSmokeArgs & {
      mode: "scan";
      movieId: number;
      startDate: string;
      days: number;
      zip?: string;
      lat?: number;
      long?: number;
      format?: string;
      includeSeatCounts?: boolean;
      includeSeatDetails?: boolean;
      maxSeatMapFetches?: number;
    });

export function parseLiveSmokeArgs(argv: string[]): LiveSmokeArgs {
  const { values } = parseArgs({
    args: argv,
    options: {
      mode: { type: "string" },
      movieId: { type: "string" },
      theaterId: { type: "string" },
      showtimeHashCode: { type: "string" },
      date: { type: "string" },
      startDate: { type: "string" },
      days: { type: "string" },
      zip: { type: "string" },
      lat: { type: "string" },
      long: { type: "string" },
      format: { type: "string" },
      chainCode: { type: "string" },
      page: { type: "string" },
      style: { type: "string" },
      referer: { type: "string" },
      includeSeatCounts: { type: "boolean" },
      includeSeatDetails: { type: "boolean" },
      maxSeatMapFetches: { type: "string" },
    },
  });

  const mode = parseMode(values.mode);

  switch (mode) {
    case "movie":
      return {
        mode,
        movieId: requiredNumber(values.movieId, "--movieId"),
        date: requiredString(values.date, "--date"),
        ...optionalLocation(values.zip, values.lat, values.long),
        ...optionalString("format", values.format),
        ...optionalString("chainCode", values.chainCode),
        ...optionalNumber("page", values.page),
      };
    case "theater":
      return {
        mode,
        theaterId: requiredString(values.theaterId, "--theaterId"),
        date: requiredString(values.date, "--date"),
        ...optionalString("chainCode", values.chainCode),
        ...optionalNumber("movieId", values.movieId),
        ...optionalString("format", values.format),
      };
    case "calendar":
      return {
        mode,
        theaterId: requiredString(values.theaterId, "--theaterId"),
        ...optionalString("startDate", values.startDate),
      };
    case "seat":
      return {
        mode,
        showtimeHashCode: requiredString(values.showtimeHashCode, "--showtimeHashCode"),
        ...optionalString("referer", values.referer),
      };
    case "render":
      return {
        mode,
        showtimeHashCode: requiredString(values.showtimeHashCode, "--showtimeHashCode"),
        ...optionalStyle(values.style),
        ...optionalString("referer", values.referer),
      };
    case "scan":
      return {
        mode,
        movieId: requiredNumber(values.movieId, "--movieId"),
        startDate: requiredString(values.startDate, "--startDate"),
        days: requiredNumber(values.days, "--days"),
        ...optionalLocation(values.zip, values.lat, values.long),
        ...optionalString("format", values.format),
        ...(values.includeSeatCounts === undefined ? {} : { includeSeatCounts: values.includeSeatCounts }),
        ...(values.includeSeatDetails === undefined ? {} : { includeSeatDetails: values.includeSeatDetails }),
        ...optionalNumber("maxSeatMapFetches", values.maxSeatMapFetches),
      };
  }
}

function parseMode(value: string | undefined): LiveSmokeMode {
  const mode = value ?? "movie";
  if (["movie", "theater", "calendar", "seat", "render", "scan"].includes(mode)) {
    return mode as LiveSmokeMode;
  }
  throw new Error(`Unsupported --mode ${mode}`);
}

function requiredString(value: string | undefined, option: string): string {
  if (value === undefined || value.trim() === "") throw new Error(`live-smoke requires ${option}`);
  return value;
}

function requiredNumber(value: string | undefined, option: string): number {
  const parsed = optionalNumberValue(value);
  if (parsed === undefined) throw new Error(`live-smoke requires ${option}`);
  return parsed;
}

function optionalNumberValue(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Expected numeric value, got ${value}`);
  return parsed;
}

function optionalString<Key extends string>(key: Key, value: string | undefined): Record<Key, string> | object {
  if (value === undefined) return {};
  return { [key]: value } as Record<Key, string>;
}

function optionalNumber<Key extends string>(key: Key, value: string | undefined): Record<Key, number> | object {
  const parsed = optionalNumberValue(value);
  if (parsed === undefined) return {};
  return { [key]: parsed } as Record<Key, number>;
}

function optionalLocation(zip: string | undefined, lat: string | undefined, long: string | undefined): object {
  return {
    ...optionalString("zip", zip),
    ...optionalNumber("lat", lat),
    ...optionalNumber("long", long),
  };
}

function optionalStyle(style: string | undefined): { style?: SeatMapRenderStyle } {
  if (style === undefined) return {};
  if (style !== "spaced" && style !== "compact") throw new Error("--style must be spaced or compact");
  return { style };
}
