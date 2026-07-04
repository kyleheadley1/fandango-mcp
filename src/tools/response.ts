import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { FandangoError } from "../fandango/errors.js";

export function textResponse(data: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function errorResponse(data: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    isError: true,
  };
}

export async function runTool(fn: () => Promise<Record<string, unknown>>): Promise<CallToolResult> {
  try {
    return textResponse(await fn());
  } catch (error) {
    if (error instanceof FandangoError) return errorResponse(error.toResult());
    return errorResponse({
      error: { code: "UNKNOWN", message: error instanceof Error ? error.message : String(error) },
    });
  }
}
