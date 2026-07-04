import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { APP_NAME, APP_VERSION } from "./meta.js";
import type { FandangoClient } from "./fandango/client.js";
import { registerTools } from "./tools/index.js";

const INSTRUCTIONS = `Read-only Fandango movie showtimes and seat availability from observed web traffic.

Typical flow:
1. Use fandango_movie_showtimes to search one movie across nearby theaters for a date, using zip or lat/long.
2. Use fandango_theater_showtimes when you already know the theater id and want all movie showtimes for a date.
3. Use fandango_seat_availability or fandango_render_seat_map with a showtimeHashCode to inspect open/taken seats.
4. Use fandango_scan_movie_availability for a bounded multi-day movie scan across nearby theaters.

This server cannot buy, hold, reserve, favorite, or validate tickets. It only performs GET requests to observed read-only /napi endpoints on www.fandango.com and refuses tickets.fandango.com, cart, checkout, account, payment, and ticketing paths. ticketingJumpPageURL values may be returned as metadata but must not be fetched by this MCP.`;

export function createServer(client: FandangoClient): McpServer {
  const server = new McpServer({ name: APP_NAME, version: APP_VERSION }, { instructions: INSTRUCTIONS });
  registerTools(server, client);
  return server;
}
