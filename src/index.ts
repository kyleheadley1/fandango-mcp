import "dotenv/config";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { FandangoClient } from "./fandango/client.js";
import { APP_NAME } from "./meta.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new FandangoClient(config);
  const server = createServer(client);
  await server.connect(new StdioServerTransport());
  console.error(`${APP_NAME} server is running on stdio`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`[${APP_NAME}] Fatal: ${message}`);
  process.exit(1);
});
