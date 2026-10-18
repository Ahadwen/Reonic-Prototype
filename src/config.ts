// Public project settings. The anon key is meant to be shipped to browsers; what it can reach
// is limited by row level security, and the Claude key lives only in the Edge Function.

export const SUPABASE_PROJECT_REF = "vefbvrgnobfapzosivag";
export const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZmJ2cmdub2JmYXB6b3NpdmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODYzMzMsImV4cCI6MjA5NDQ2MjMzM30.oc213yAZjzYKOM-Bqg7aJUZae6T9Ax3MuoRQBIEz-gQ";

export const CLAUDE_PROXY_URL = `${SUPABASE_URL}/functions/v1/claude-proxy`;
