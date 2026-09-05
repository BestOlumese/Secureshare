/**
 * One avatar treatment for the whole app.
 *
 * Previously the message view drew gradient circles with a shadow while the
 * list drew flat ones — the same person looked different depending on where
 * you saw them. These are flat and muted, with the initial in a darker shade
 * of the same hue rather than white on a saturated fill.
 */
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
];

/** Stable colour for a person, derived from their email or name. */
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function avatarInitial(...candidates: (string | null | undefined)[]): string {
  const source = candidates.find((c) => c && c.trim().length > 0);
  return (source ?? "?").trim().charAt(0).toUpperCase();
}
