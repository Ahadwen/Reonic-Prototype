// Forwards Messages API requests from the demo site to Anthropic, so the API key never reaches the browser.
//
// Guards, since the site is public:
//   - only the demo's own origins get CORS access
//   - only allowed models, and max_tokens is capped
//   - a daily call limit, counted in reonic_api_usage
//
// Secrets (set in the Supabase dashboard or via scripts/supabase.ts):
//   ANTHROPIC_API_KEY, plus SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY which Supabase provides.

const ALLOWED_ORIGINS = [
  "https://ahadwen.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
];
const ALLOWED_MODELS = ["claude-sonnet-5-5", "claude-haiku-5-5"];
const MAX_TOKENS = 8000;
const DAILY_CALL_LIMIT = Number(Deno.env.get("DAILY_CALL_LIMIT") ?? 300);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function cors(origin: string | null): Record<string, string> {
  return {
    "access-control-allow-origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "origin",
  };
}

const json = (status: number, body: unknown, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "content-type": "application/json" } });

const error = (status: number, message: string, headers: Record<string, string>) =>
  json(status, { type: "error", error: { type: "proxy_error", message } }, headers);

async function rpc(fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${fn} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return error(405, "POST only", headers);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return error(403, "Origin not allowed", headers);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return error(500, "Proxy has no ANTHROPIC_API_KEY", headers);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return error(400, "Body must be JSON", headers);
  }
  if (!ALLOWED_MODELS.includes(String(body.model))) return error(400, `Model must be one of ${ALLOWED_MODELS.join(", ")}`, headers);
  body.max_tokens = Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS);
  delete body.stream;

  if (!(await rpc("reonic_take_api_call", { p_daily_limit: DAILY_CALL_LIMIT }))) {
    return error(429, "The demo has reached today's usage limit. Paste your own API key to keep going.", headers);
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  const result = await upstream.json();

  if (upstream.ok && result.usage) {
    // Bookkeeping only; never fail the request over it.
    rpc("reonic_record_tokens", { p_input: result.usage.input_tokens, p_output: result.usage.output_tokens })
      .catch((e) => console.error(e));
  }
  return json(upstream.status, result, headers);
});
