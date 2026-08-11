import "dotenv/config";

import { createTransport } from "nodemailer";

const FAKE_TEXT = [
  "🎬 AMC Metreon 16",
  "📅 2026-08-16 6:00p",
  "💺 [PREMIUM] row 7 cols 20-21",
  "🔗 https://www.fandango.com",
  "",
  "⚠️ This is a TEST notification from poll-odyssey.",
].join("\n");

function log(msg: string): void {
  process.stdout.write(`[${new Date().toLocaleTimeString()}] ${msg}\n`);
}

async function testEmail(): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.ALERT_EMAIL_TO;
  if (!user || !pass || !to) {
    log(`Email SKIP — missing env vars (GMAIL_USER=${!!user}, GMAIL_APP_PASSWORD=${!!pass}, ALERT_EMAIL_TO=${!!to})`);
    return;
  }
  log(`Sending test email from ${user} to ${to}…`);
  const transporter = createTransport({ service: "gmail", auth: { user, pass } });
  await transporter.sendMail({
    from: user,
    to,
    subject: "🎬 Odyssey Poller — TEST notification",
    text: FAKE_TEXT,
  });
  log("Email OK ✓");
}

async function testSms(): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const smsTo = process.env.SMS_TO;
  if (!user || !pass) {
    log("SMS SKIP — GMAIL_USER or GMAIL_APP_PASSWORD not set");
    return;
  }
  if (!smsTo) {
    log("SMS SKIP — SMS_TO not set (should be like 1234567890@tmomail.net)");
    return;
  }
  log(`Sending test SMS via ${smsTo}…`);
  const transporter = createTransport({ service: "gmail", auth: { user, pass } });
  await transporter.sendMail({
    from: user,
    to: smsTo,
    subject: "",
    text: "🎬 Odyssey poller TEST — if you got this, SMS alerts work!",
  });
  log("SMS OK ✓");
}

async function main(): Promise<void> {
  log("Testing notifications…\n");

  try { await testEmail(); } catch (err) {
    log(`Email FAIL ✗ — ${err instanceof Error ? err.message : String(err)}`);
  }

  try { await testSms(); } catch (err) {
    log(`SMS FAIL ✗ — ${err instanceof Error ? err.message : String(err)}`);
  }

  log("\nDone.");
}

main();
