import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { FandangoClient } from "../fandango/client.js";
import { READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { runTool } from "./response.js";

export function registerSeatAvailabilityTool(server: McpServer, client: FandangoClient): void {
  server.registerTool(
    "fandango_seat_availability",
    {
      title: "Read Seat Availability",
      description:
        "Read the Fandango seat map for one showtimeHashCode and return normalized open/taken seat counts and coordinates. This never enters ticketing or checkout.",
      inputSchema: {
        showtimeHashCode: z.string().trim().min(1).describe("Fandango showtimeHashCode from a showtime result."),
        referer: z.string().url().optional().describe("Optional browser page referer from captured traffic."),
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) =>
      runTool(async () => {
        const result = await client.seatAvailability(args.showtimeHashCode, args.referer);
        return {
          fetchedAt: result.fetchedAt,
          query: result.query,
          seatMap: result.data,
        };
      }),
  );
}
