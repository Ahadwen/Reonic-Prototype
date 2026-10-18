// Minimal Messages API client using fetch. Works in the browser and in Node 18+.
// With an API key it calls Anthropic directly; without one it goes through the claude-proxy
// Edge Function, which holds the demo's key so visitors don't need their own.

import { CLAUDE_PROXY_URL, SUPABASE_ANON_KEY } from "./config.ts";

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export interface MessagesRequest {
  model?: string;
  max_tokens: number;
  system?: string;
  messages: unknown[];
  tools?: unknown[];
  output_config?: unknown;
}

export async function callClaude(apiKey: string | null, req: MessagesRequest) {
  const url = apiKey ? "https://api.anthropic.com/v1/messages" : CLAUDE_PROXY_URL;
  const headers: Record<string, string> = apiKey
    ? {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Required when calling from a browser. It means: I accept that this key is visible to the page.
      "anthropic-dangerous-direct-browser-access": "true",
    }
    : { authorization: `Bearer ${SUPABASE_ANON_KEY}` };

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ model: DEFAULT_MODEL, ...req }),
  });

  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message ?? res.statusText;
    throw new Error(`API error ${res.status}: ${msg}`);
  }
  return body;
}
