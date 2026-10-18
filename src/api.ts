// Minimal Messages API client using fetch. Works in the browser and in Node 18+.

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export interface MessagesRequest {
  model?: string;
  max_tokens: number;
  system?: string;
  messages: unknown[];
  tools?: unknown[];
  output_config?: unknown;
}

export async function callClaude(apiKey: string, req: MessagesRequest) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Required when calling from a browser. It means: I accept that this key is visible to the page.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: DEFAULT_MODEL, ...req }),
  });

  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message ?? res.statusText;
    throw new Error(`API error ${res.status}: ${msg}`);
  }
  return body;
}
