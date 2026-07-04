import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { FandangoClient } from "../fandango/client.js";
import { dateSchema, READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { runTool } from "./response.js";

export function registerTheaterShowtimesTool(server: McpServer, client: FandangoClient): void {
  server.registerTool(
    "fandango_theater_showtimes",
    {
      title: "Find Theater Showtimes",
      description:
        "Find read-only Fandango showtimes for one theater on one date. Optionally filter to a movie id and format.",
      inputSchema: {
        theaterId: z.string().trim().min(1).describe("Fandango theater id, for example AANEM."),
        date: dateSchema.describe("Show date in YYYY-MM-DD."),
        chainCode: z.string().trim().min(1).optional().describe("Optional chain code, for example AMC."),
        movieId: z.number().int().positive().optional().describe("Optional Fandango movie id filter."),
        format: z.string().trim().min(1).optional().describe("Optional format filter, e.g. IMAX 70MM."),
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) =>
      runTool(async () => {
        const result = await client.theaterShowtimes(args);
        return {
          fetchedAt: result.fetchedAt,
          query: result.query,
          theater: result.data.theater,
          count: result.data.movies.reduce((sum, movie) => sum + movie.showtimes.length, 0),
          movies: result.data.movies,
        };
      }),
  );
}
