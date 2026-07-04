import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { FandangoClient } from "../fandango/client.js";
import { scanMovieAvailability } from "../fandango/scan.js";
import { dateSchema, READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { runTool } from "./response.js";

export function registerScanMovieAvailabilityTool(server: McpServer, client: FandangoClient): void {
  server.registerTool(
    "fandango_scan_movie_availability",
    {
      title: "Scan Movie Availability",
      description:
        "Scan one movie across a date range and nearby theaters. Optionally attaches seat counts for available showtimes. This is read-only and capped at 31 days.",
      inputSchema: {
        movieId: z.number().int().positive().describe("Fandango movie id, for example 241283."),
        startDate: dateSchema.describe("First show date in YYYY-MM-DD."),
        days: z.number().int().positive().max(31).describe("Number of dates to scan, capped at 31."),
        zip: z.string().trim().min(1).optional().describe("Search ZIP code."),
        lat: z.number().optional().describe("Search latitude."),
        long: z.number().optional().describe("Search longitude."),
        format: z.string().trim().min(1).optional().describe("Optional format filter, e.g. IMAX 70MM."),
        includeSeatCounts: z
          .boolean()
          .optional()
          .describe("When true, fetch seat-map counts for available showtimes with showtimeHashCode."),
        includeSeatDetails: z
          .boolean()
          .optional()
          .describe("When true, fetch and include full normalized seat maps plus best open-seat groups."),
        maxSeatMapFetches: z
          .number()
          .int()
          .positive()
          .max(250)
          .optional()
          .describe("Maximum seat-map requests when includeSeatCounts/includeSeatDetails is true. Default: 100."),
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) =>
      runTool(async () => {
        const result = await scanMovieAvailability(client, args);
        return { ...result };
      }),
  );
}
