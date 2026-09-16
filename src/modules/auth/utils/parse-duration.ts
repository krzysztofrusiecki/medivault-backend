const DURATION_UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 1000 * 60,
  h: 1000 * 60 * 60,
  d: 1000 * 60 * 60 * 24,
  w: 1000 * 60 * 60 * 24 * 7,
};

// Parses a short duration string (e.g. "15m", "30d") into milliseconds.
export function parseDurationMs(duration: string): number {
  const match = /^(\d+)(ms|s|m|h|d|w)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${duration}"`);
  }

  const [, amount, unit] = match;
  return Number(amount) * DURATION_UNIT_MS[unit];
}
