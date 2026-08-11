import "dotenv/config";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createTransport } from "nodemailer";

import { loadConfig } from "../src/config.js";
import { FandangoClient } from "../src/fandango/client.js";
import type {
  NormalizedSeatMap,
  NormalizedShowtime,
  OpenSeatGroup,
} from "../src/fandango/types.js";
import { summarizeOpenSeatGroups } from "../src/fandango/types.js";

/** Return a copy of the seat map with wheelchair seats excluded. */
function excludeWheelchairSeats(seatMap: NormalizedSeatMap): NormalizedSeatMap {
  const filtered = seatMap.seats.filter((s) => !s.isWheelchair);
  return {
    ...seatMap,
    seats: filtered,
    totalSeatCount: filtered.length,
    availableSeatCount: filtered.filter((s) => s.isAvailable).length,
    takenSeatCount: filtered.filter((s) => !s.isAvailable).length,
  };
}

// ── Config ──────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3 * 60 * 1000;
const SEAT_FETCH_DELAY_MS = 500;
const STATE_FILE = "data/poll-state.json";
const FANDANGO_ORIGIN = "https://www.fandango.com";

interface TheaterConfig {
  id: string;
  name: string;
  chainCode: string;
  // Rows from mid-house back — anything here beats your current row-3 front seats
  acceptableRows: string[];
  // Subset of acceptableRows that are the sweet spot (mid-back)
  premiumRows: string[];
  // Column range considered "central" for premium tagging
  centralMinCol: number;
  centralMaxCol: number;
  minGroupSize: number;
}

const THEATERS: TheaterConfig[] = [
  {
    id: "AANEM",
    name: "AMC Metreon 16",
    chainCode: "AMC",
    // 13 rows total (1=front). Rows 4–12 all beat row 3.
    acceptableRows: ["4", "5", "6", "7", "8", "9", "10", "11", "12"],
    premiumRows: ["6", "7", "8", "9", "10"],
    // Cols 6–41, center ~23. Central band = 15–32.
    centralMinCol: 15,
    centralMaxCol: 32,
    minGroupSize: 2,
  },
  {
    id: "AAOPK",
    name: "Regal Hacienda Crossings",
    chainCode: "REGL",
    // 9 rows total (1=front). Current seats are row 3 cols 28-29.
    // Rows 4–8 all beat that. Row 9 is wheelchair/back wall, skip it.
    acceptableRows: ["4", "5", "6", "7", "8"],
    premiumRows: ["5", "6", "7"],
    // Cols 5–36, center ~20. Central band = 13–28.
    centralMinCol: 13,
    centralMaxCol: 28,
    minGroupSize: 2,
  },
];

// Aug 14–26 2026 (the days you're actually in SF, excluding travel days 13 and 27)
const ELIGIBLE_DATES = [
  "2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17",
  "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21",
  "2026-08-22", "2026-08-23", "2026-08-24", "2026-08-25",
  "2026-08-26",
];

const FORMAT_FILTER = "imax 70mm";

// ── Schedule helpers ────────────────────────────────────────────────────

function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00`).getDay(); // 0=Sun … 6=Sat
}

function isWeekend(date: string): boolean {
  const d = dayOfWeek(date);
  return d === 0 || d === 6;
}

/** On weekdays only the ~6pm and ~10pm slots are viable. */
function isAcceptableShowtime(date: string, showtime: NormalizedShowtime): boolean {
  if (isWeekend(date)) return true;

  const timeStr = showtime.startsAtLocal ?? showtime.date;
  const match = timeStr.match(/T(\d{2}):(\d{2})/);
  if (!match) return true; // can't parse → include it
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const minutesFromMidnight = hour * 60 + minute;
  // ~6pm slot = 17:30–19:00, ~10pm slot = 21:30–23:00
  return (
    (minutesFromMidnight >= 1050 && minutesFromMidnight <= 1140) ||
    (minutesFromMidnight >= 1290 && minutesFromMidnight <= 1380)
  );
}

// ── Seat filtering ──────────────────────────────────────────────────────

type SeatTier = "PREMIUM" | "GOOD";

interface TaggedGroup {
  group: OpenSeatGroup;
  tier: SeatTier;
}

function isCentral(g: OpenSeatGroup, theater: TheaterConfig): boolean {
  // At least part of the group overlaps the central column band
  return g.endColumn >= theater.centralMinCol && g.startColumn <= theater.centralMaxCol;
}

function acceptableGroups(
  seatMap: NormalizedSeatMap,
  theater: TheaterConfig,
): TaggedGroup[] {
  const allGroups = summarizeOpenSeatGroups(excludeWheelchairSeats(seatMap), 50);
  const result: TaggedGroup[] = [];
  for (const g of allGroups) {
    if (!theater.acceptableRows.includes(g.row)) continue;
    if (g.size < theater.minGroupSize) continue;
    const tier: SeatTier =
      theater.premiumRows.includes(g.row) && isCentral(g, theater) ? "PREMIUM" : "GOOD";
    result.push({ group: g, tier });
  }
  return result;
}

function groupKey(theaterId: string, hash: string, g: OpenSeatGroup): string {
  return `${theaterId}:${hash}:${g.row}:${g.startColumn}-${g.endColumn}`;
}

// ── State persistence ───────────────────────────────────────────────────

function loadState(): Set<string> {
  try {
    if (existsSync(STATE_FILE)) {
      const data = JSON.parse(readFileSync(STATE_FILE, "utf-8")) as string[];
      return new Set(data);
    }
  } catch { /* start fresh */ }
  return new Set();
}

function saveState(state: Set<string>): void {
  mkdirSync("data", { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify([...state], null, 2));
}

const ALERTS_LOG = "data/seat-alerts.json";

interface StoredAlert {
  timestamp: string;
  theaterName: string;
  date: string;
  displayTime: string;
  tier: SeatTier;
  seats: string;
  purchaseUrl: string;
}

function appendAlertLog(alerts: Alert[]): void {
  mkdirSync("data", { recursive: true });
  let existing: StoredAlert[] = [];
  try {
    if (existsSync(ALERTS_LOG)) {
      existing = JSON.parse(readFileSync(ALERTS_LOG, "utf-8")) as StoredAlert[];
    }
  } catch { /* start fresh */ }

  const now = new Date().toISOString();
  for (const a of alerts) {
    for (const t of a.tagged) {
      existing.push({
        timestamp: now,
        theaterName: a.theaterName,
        date: a.date,
        displayTime: a.displayTime,
        tier: t.tier,
        seats: t.group.label,
        purchaseUrl: a.purchaseUrl,
      });
    }
  }
  writeFileSync(ALERTS_LOG, JSON.stringify(existing, null, 2));
}

// ── Notifications ───────────────────────────────────────────────────────

interface Alert {
  theaterName: string;
  date: string;
  displayTime: string;
  tagged: TaggedGroup[];
  purchaseUrl: string;
}

function buildPurchaseUrl(showtime: NormalizedShowtime): string {
  if (showtime.ticketingJumpPageURL) {
    return showtime.ticketingJumpPageURL.startsWith("http")
      ? showtime.ticketingJumpPageURL
      : `${FANDANGO_ORIGIN}${showtime.ticketingJumpPageURL}`;
  }
  if (showtime.showtimeHashCode) {
    return `${FANDANGO_ORIGIN}/purchase/${showtime.showtimeHashCode}`;
  }
  return FANDANGO_ORIGIN;
}

function formatAlertText(alerts: Alert[]): string {
  return alerts
    .map((a) => {
      const seats = a.tagged
        .map((t) => `[${t.tier}] ${t.group.label}`)
        .join(", ");
      return `🎬 ${a.theaterName}\n📅 ${a.date} ${a.displayTime}\n💺 ${seats}\n🔗 ${a.purchaseUrl}`;
    })
    .join("\n\n");
}

async function sendEmail(alerts: Alert[]): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.ALERT_EMAIL_TO;
  if (!user || !pass || !to) {
    log("Email skipped — GMAIL_USER, GMAIL_APP_PASSWORD, or ALERT_EMAIL_TO not set");
    return;
  }

  const transporter = createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const text = formatAlertText(alerts);
  await transporter.sendMail({
    from: user,
    to,
    subject: `🎬 Odyssey IMAX 70mm — ${alerts.length} new seat opening${alerts.length > 1 ? "s" : ""}`,
    text,
  });
  log("Email sent");
}

async function sendSms(alerts: Alert[], transporter: ReturnType<typeof createTransport>): Promise<void> {
  const smsTo = process.env.SMS_TO;
  const from = process.env.GMAIL_USER;
  if (!smsTo || !from) {
    log("SMS skipped — SMS_TO or GMAIL_USER not set");
    return;
  }

  for (const a of alerts) {
    const tier = a.tagged[0]?.tier ?? "GOOD";
    const text = `[${tier}] ${a.theaterName} ${a.displayTime} ${a.date}\n${a.purchaseUrl}`;
    await transporter.sendMail({ from, to: smsTo, subject: "", text });
  }
  log(`SMS sent (${alerts.length} message${alerts.length > 1 ? "s" : ""})`);
}

/** Returns true if at least one channel delivered successfully. */
async function notify(alerts: Alert[]): Promise<boolean> {
  if (alerts.length === 0) return true;
  let delivered = false;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const transporter = user && pass
    ? createTransport({ service: "gmail", auth: { user, pass } })
    : null;

  try {
    await sendEmail(alerts);
    delivered = true;
  } catch (err) {
    log(`Email error: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (transporter) {
    try {
      await sendSms(alerts, transporter);
      delivered = true;
    } catch (err) {
      log(`SMS error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return delivered;
}

// ── Logging ─────────────────────────────────────────────────────────────

function log(msg: string): void {
  const ts = new Date().toLocaleTimeString();
  process.stdout.write(`[${ts}] ${msg}\n`);
}

// ── Main polling cycle ──────────────────────────────────────────────────

interface CycleResult {
  alerts: Alert[];
  pendingKeys: string[];
}

async function pollCycle(client: FandangoClient, state: Set<string>): Promise<CycleResult> {
  const alerts: Alert[] = [];
  const pendingKeys: string[] = [];

  for (const theater of THEATERS) {
    for (const date of ELIGIBLE_DATES) {
      try {
        const result = await client.theaterShowtimes({
          theaterId: theater.id,
          date,
          chainCode: theater.chainCode,
        });

        const odysseyMovies = result.data.movies.filter((m) =>
          m.title.toLowerCase().includes("odyssey"),
        );

        for (const movie of odysseyMovies) {
          const imax70Showtimes = movie.showtimes.filter(
            (s) =>
              s.isAvailable &&
              !s.expired &&
              s.showtimeHashCode &&
              s.formats.some((f) => f.toLowerCase().includes("imax 70mm")) &&
              isAcceptableShowtime(date, s),
          );

          for (const showtime of imax70Showtimes) {
            await new Promise((r) => setTimeout(r, SEAT_FETCH_DELAY_MS));

            try {
              const seatResult = await client.seatAvailability(showtime.showtimeHashCode!);
              const tagged = acceptableGroups(seatResult.data, theater);

              const newTagged = tagged.filter(
                (t) => !state.has(groupKey(theater.id, showtime.showtimeHashCode!, t.group)),
              );

              if (newTagged.length > 0) {
                const keys = newTagged.map((t) =>
                  groupKey(theater.id, showtime.showtimeHashCode!, t.group),
                );
                pendingKeys.push(...keys);
                alerts.push({
                  theaterName: theater.name,
                  date,
                  displayTime: showtime.date,
                  tagged: newTagged,
                  purchaseUrl: buildPurchaseUrl(showtime),
                });
              }
            } catch (err) {
              log(`  Seat fetch failed for ${showtime.showtimeHashCode}: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }
      } catch (err) {
        log(`  Showtimes failed for ${theater.name} on ${date}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return { alerts, pendingKeys };
}

// ── Entry point ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const client = new FandangoClient(loadConfig());
  const state = loadState();
  let running = true;

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      log(`Received ${sig}, shutting down…`);
      running = false;
    });
  }

  log(`Polling ${THEATERS.map((t) => t.name).join(" + ")} every ${POLL_INTERVAL_MS / 1000}s`);
  log(`Dates: ${ELIGIBLE_DATES[0]} → ${ELIGIBLE_DATES[ELIGIBLE_DATES.length - 1]}`);
  log(`State file: ${STATE_FILE} (${state.size} known keys)`);

  while (running) {
    log("── cycle start ──");
    try {
      const { alerts, pendingKeys } = await pollCycle(client, state);
      if (alerts.length > 0) {
        log(`Found ${alerts.length} new alert(s)!`);
        appendAlertLog(alerts);
        log(`Saved to ${ALERTS_LOG}`);
        const delivered = await notify(alerts);
        if (delivered) {
          for (const key of pendingKeys) state.add(key);
          saveState(state);
          log("State updated — won't re-alert these seats.");
        } else {
          log("Notification failed — will retry these seats next cycle.");
        }
      } else {
        log("No new availability.");
      }
    } catch (err) {
      log(`Cycle error: ${err instanceof Error ? err.message : String(err)}`);
    }
    log("── cycle end ──");

    if (!running) break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  log("Stopped.");
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
