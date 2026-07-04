import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { FandangoClient } from "../fandango/client.js";
import { dateSchema, READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { runTool } from "./response.js";

export function registerMovieShowtimesTool(server: McpServer, client: FandangoClient): void {
  server.registerTool(
    "fandango_movie_showtimes",
    {
      title: "Find Movie Showtimes",
      description:
        "Find read-only Fandango showtimes for one movie across nearby theaters on one date. Requires either zip or lat/long; lat/long is preferred when both are present.",
      inputSchema: {
        movieId: z.number().int().positive().describe("Fandango movie id, for example 241283."),
        date: dateSchema.describe("Show date in YYYY-MM-DD."),
        zip: z.string().trim().min(1).optional().describe("Search ZIP code."),
        lat: z.number().optional().describe("Search latitude."),
        long: z.number().optional().describe("Search longitude."),
        format: z.string().trim().min(1).optional().describe("Optional format filter, e.g. IMAX 70MM."),
        chainCode: z.string().trim().min(1).optional().describe("Optional theater chain code."),
        page: z.number().int().positive().optional().describe("Optional Fandango result page."),
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) =>
      runTool(async () => {
        const result = await client.movieShowtimes(args);
        return {
          fetchedAt: result.fetchedAt,
          query: result.query,
          hasShowtimes: result.data.hasShowtimes,
          count: result.data.theaters.length,
          theaters: result.data.theaters,
        };
      }),
  );
}
