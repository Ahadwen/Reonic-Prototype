// Supabase housekeeping through the Management API, so no CLI install is needed.
//
//   npm run supabase -- migrate                 # apply new files in supabase/migrations, in name order
//   npm run supabase -- deploy claude-proxy     # deploy supabase/functions/<name>/index.ts
//   npm run supabase -- secret ANTHROPIC_API_KEY  # copy a value from .env to the Edge Function secrets
//   npm run supabase -- sql "select 1"
//
// Needs SUPABASE_ACCESS_TOKEN (a personal access token, sbp_...) in .env or the environment.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SUPABASE_PROJECT_REF } from "../src/config.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Set SUPABASE_ACCESS_TOKEN (environment variable or .env file).");
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}`;
const auth = { authorization: `Bearer ${token}` };

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(API + path, { ...init, headers: { ...auth, ...init.headers } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

export const sql = (query: string) =>
  call("/database/query", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });

async function migrate() {
  await sql(`create table if not exists public.reonic_schema_migrations (
    name text primary key, applied_at timestamptz not null default now());
    alter table public.reonic_schema_migrations enable row level security;`);
  const done = new Set((await sql("select name from public.reonic_schema_migrations") as { name: string }[]).map((r) => r.name));
  const files = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    process.stdout.write(`applying ${f} … `);
    const body = readFileSync(join("supabase/migrations", f), "utf8");
    // One request, so the migration and its bookkeeping row succeed or fail together.
    await sql(`begin;\n${body}\ninsert into public.reonic_schema_migrations (name) values ('${f.replace(/'/g, "''")}');\ncommit;`);
    console.log("done");
  }
  console.log(`${files.length} migration file(s), all applied.`);
}

async function deploy(name: string) {
  const dir = join("supabase/functions", name);
  const form = new FormData();
  form.append("metadata", JSON.stringify({ name, entrypoint_path: "index.ts", verify_jwt: true }));
  for (const f of readdirSync(dir)) form.append("file", new Blob([readFileSync(join(dir, f))]), f);
  const r = await call(`/functions/deploy?slug=${encodeURIComponent(name)}`, { method: "POST", body: form });
  console.log(`deployed ${r.slug} (version ${r.version}, ${r.status})`);
}

async function secret(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in .env or the environment`);
  await call("/secrets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify([{ name, value }]) });
  console.log(`secret ${name} set`);
}

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === "migrate") await migrate();
  else if (cmd === "deploy" && arg) await deploy(arg);
  else if (cmd === "secret" && arg) await secret(arg);
  else if (cmd === "sql" && arg) console.log(JSON.stringify(await sql(arg), null, 2));
  else {
    console.error("usage: npm run supabase -- migrate | deploy <function> | secret <NAME> | sql <query>");
    process.exitCode = 1;
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
}
