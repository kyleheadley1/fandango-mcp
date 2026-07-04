import { z } from "zod";

import { DEFAULT_USER_AGENT, FANDANGO_ORIGIN } from "./meta.js";

const envSchema = z.object({
  FANDANGO_BASE_URL: z.string().url().default(FANDANGO_ORIGIN),
  FANDANGO_USER_AGENT: z.string().trim().min(1).default(DEFAULT_USER_AGENT),
  FANDANGO_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(15_000),
});

export interface FandangoConfig {
  baseUrl: string;
  userAgent: string;
  request: { timeoutMs: number };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): FandangoConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid Fandango MCP configuration: ${message}`);
  }

  return {
    baseUrl: parsed.data.FANDANGO_BASE_URL,
    userAgent: parsed.data.FANDANGO_USER_AGENT,
    request: { timeoutMs: parsed.data.FANDANGO_REQUEST_TIMEOUT_MS },
  };
}
