import type { Usage } from "./types.ts";

// USD per million tokens. Check https://platform.claude.com/docs/en/about-claude/pricing before quoting.
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
};

export function costUsd(model: string, usage: Usage): number | null {
  const key = Object.keys(PRICES).find((k) => model.startsWith(k));
  if (!key) return null;
  const p = PRICES[key];
  return (usage.input_tokens * p.input + usage.output_tokens * p.output) / 1_000_000;
}
