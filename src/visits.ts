// Counts a visit to the demo: one per page load, as a per-day total in Supabase (reonic_visits).
// Nothing about the visitor is sent or stored. Local development isn't counted.

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.ts";

export function countVisit() {
  if (["localhost", "127.0.0.1"].includes(location.hostname)) return;
  fetch(`${SUPABASE_URL}/rest/v1/rpc/reonic_count_visit`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${SUPABASE_ANON_KEY}`, "content-type": "application/json" },
    body: "{}",
    keepalive: true,
  }).catch(() => { /* a missed count doesn't matter */ });
}
