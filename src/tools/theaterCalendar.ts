import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { FandangoClient } from "../fandango/client.js";
import { dateSchema, READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { runTool } from "./response.js";

export function registerTheaterCalendarTool(server: McpServer, client: FandangoClient): void {
  server.registerTool(
    "fandango_theater_calendar",
    {
      title: "Read Theater Calendar",
      description:
        "Read Fandango's showtime calendar for one theater, including which dates currently have showtimes.",
      inputSchema: {
        theaterId: z.string().trim().min(1).describe("Fandango theater id, for example AANEM."),
        startDate: dateSchema.optional().describe("Optional start date in YYYY-MM-DD."),
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) =>
      runTool(async () => {
        const result = await client.theaterCalendar(args);
        return {
          fetchedAt: result.fetchedAt,
          query: result.query,
          calendar: result.data,
          datesWithShowtimes: result.data.dates.filter((date) => date.hasShowtime),
        };
      }),
  );
}
