import { loadConfig } from "../src/config.js";
import { FandangoClient } from "../src/fandango/client.js";
import { parseLiveSmokeArgs } from "../src/fandango/liveSmokeArgs.js";
import { scanMovieAvailability } from "../src/fandango/scan.js";
import { renderSeatMap, summarizeOpenSeatGroups } from "../src/fandango/types.js";

async function main(): Promise<void> {
  const args = parseLiveSmokeArgs(process.argv.slice(2));
  const client = new FandangoClient(loadConfig());
  const result = await runSmoke(client, args);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function runSmoke(client: FandangoClient, args: ReturnType<typeof parseLiveSmokeArgs>): Promise<unknown> {
  switch (args.mode) {
    case "movie":
      return client.movieShowtimes(args);
    case "theater":
      return client.theaterShowtimes(args);
    case "calendar":
      return client.theaterCalendar(args);
    case "seat":
      return client.seatAvailability(args.showtimeHashCode, args.referer);
    case "render": {
      const seatResult = await client.seatAvailability(args.showtimeHashCode, args.referer);
      return {
        fetchedAt: seatResult.fetchedAt,
        query: { ...seatResult.query, style: args.style ?? "spaced" },
        openGroups: summarizeOpenSeatGroups(seatResult.data, 8),
        map: renderSeatMap(seatResult.data, {
          style: args.style ?? "spaced",
          includeColumnLabels: true,
          includeOpenGroups: true,
          maxOpenGroups: 8,
        }),
        seatMap: seatResult.data,
      };
    }
    case "scan": {
      return scanMovieAvailability(client, args);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
