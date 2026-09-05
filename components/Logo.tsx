/**
 * The SecureShare mark: an envelope whose flap closes into a keyhole.
 *
 * Drawn rather than picked from an icon set, so it says both halves of what
 * the product is and doesn't turn up in anyone else's interface. Strokes use
 * `currentColor` and scale with the box, so one file covers 14px in a footer
 * and 28px on a sign-in page.
 */
export default function Logo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Envelope body */}
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      {/* The flap, stopping short of the middle so the keyhole reads clearly */}
      <path d="M3.5 6.5 9.2 11" />
      <path d="M20.5 6.5 14.8 11" />
      {/* Keyhole where the flap would meet */}
      <circle cx="12" cy="12" r="2" />
      <path d="M12 14v2.5" />
    </svg>
  );
}
