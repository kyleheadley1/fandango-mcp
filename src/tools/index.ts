import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { FandangoClient } from "../fandango/client.js";
import { registerMovieShowtimesTool } from "./movieShowtimes.js";
import { registerRenderSeatMapTool } from "./renderSeatMap.js";
import { registerScanMovieAvailabilityTool } from "./scanMovieAvailability.js";
import { registerSeatAvailabilityTool } from "./seatAvailability.js";
import { registerTheaterCalendarTool } from "./theaterCalendar.js";
import { registerTheaterShowtimesTool } from "./theaterShowtimes.js";

export function registerTools(server: McpServer, client: FandangoClient): void {
  registerMovieShowtimesTool(server, client);
  registerTheaterShowtimesTool(server, client);
  registerTheaterCalendarTool(server, client);
  registerSeatAvailabilityTool(server, client);
  registerScanMovieAvailabilityTool(server, client);
  registerRenderSeatMapTool(server, client);
}
