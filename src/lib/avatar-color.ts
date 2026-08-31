// Deterministic per-user avatar colors derived from a stable seed (user id / name).
function hash(seed: string): number {
  // FNV-1a 32-bit — good avalanche so similar ids land far apart.
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function avatarStyle(seed?: string | null): React.CSSProperties {
  const s = (seed ?? "").trim() || "anon";
  const h = hash(s);
  // Golden-ratio hue spread across the full wheel for maximal separation.
  const hue = ((h % 4096) * 0.61803398875 * 360) % 360;
  const chroma = 0.11 + ((h >>> 12) % 5) * 0.012;
  const light = 0.68 + ((h >>> 16) % 4) * 0.025;
  return {
    background: `oklch(${light.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`,
    color: "oklch(0.18 0.02 250)",
  };
}

