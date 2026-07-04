import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { FandangoClient } from "../fandango/client.js";
import { renderSeatMap, summarizeOpenSeatGroups } from "../fandango/types.js";
import { READ_ONLY_TOOL_ANNOTATIONS } from "./common.js";
import { runTool } from "./response.js";

export function registerRenderSeatMapTool(server: McpServer, client: FandangoClient): void {
  server.registerTool(
    "fandango_render_seat_map",
    {
      title: "Render Seat Map",
      description:
        "Read and render a Fandango seat map as terminal-friendly Unicode boxes. Uses □ for open seats and ☒ for taken seats.",
      inputSchema: {
        showtimeHashCode: z.string().trim().min(1).describe("Fandango showtimeHashCode from a showtime result."),
        style: z.enum(["spaced", "compact"]).optional().describe("Terminal render style. Default: spaced."),
        includeColumnLabels: z.boolean().optional().describe("Include a column-number ruler above the map. Default: true."),
        includeOpenGroups: z.boolean().optional().describe("Include best contiguous open-seat groups. Default: true."),
        maxOpenGroups: z.number().int().positive().max(25).optional().describe("Maximum open-seat groups to list."),
        referer: z.string().url().optional().describe("Optional browser page referer from captured traffic."),
      },
      annotations: READ_ONLY_TOOL_ANNOTATIONS,
    },
    async (args) =>
      runTool(async () => {
        const result = await client.seatAvailability(args.showtimeHashCode, args.referer);
        const style = args.style ?? "spaced";
        const includeOpenGroups = args.includeOpenGroups ?? true;
        const maxOpenGroups = args.maxOpenGroups ?? 8;
        return {
          fetchedAt: result.fetchedAt,
          query: {
            ...result.query,
            style,
            includeColumnLabels: args.includeColumnLabels ?? true,
            includeOpenGroups,
            maxOpenGroups,
          },
          legend: {
            "□": "open",
            "☒": "taken",
            "▣": "open wheelchair",
            "▦": "taken wheelchair",
          },
          openGroups: includeOpenGroups ? summarizeOpenSeatGroups(result.data, maxOpenGroups) : [],
          map: renderSeatMap(result.data, {
            style,
            includeColumnLabels: args.includeColumnLabels ?? true,
            includeOpenGroups,
            maxOpenGroups,
          }),
          seatMap: result.data,
        };
      }),
  );
}
