import { NextResponse, type NextRequest } from "next/server";

/**
 * Content Security Policy.
 *
 * This app decrypts in the browser, so injected script is not just a defacement
 * risk — it can read plaintext and exfiltrate the private key held in
 * IndexedDB. The policy is nonce-based rather than an allowlist: Next emits a
 * fresh nonce per request, and `strict-dynamic` lets its bootstrap load the
 * chunk files without enumerating them.
 *
 * Set per-request in middleware rather than in next.config.ts because the
 * nonce has to change on every response.
 */
function buildCsp(nonce: string | null, isDev: boolean): string {
  // Next stamps the nonce onto the inline RSC scripts it renders, but only for
  // routes rendered per request. A prerendered page is built before any nonce
  // exists, and because a policy containing a nonce makes browsers ignore
  // 'unsafe-inline', a strict policy would block its inline scripts outright
  // and leave the page unhydrated. Those pages get the weaker form instead.
  const scriptSrc = nonce
    ? [
        "'self'",
        `'nonce-${nonce}'`,
        // Trusts whatever the nonced bootstrap loads, so the chunk URLs need
        // no entry of their own.
        "'strict-dynamic'",
      ]
    : ["'self'", "'unsafe-inline'"];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],

    // Dev additionally needs eval for React Refresh.
    "script-src": [...scriptSrc, ...(isDev ? ["'unsafe-eval'"] : [])],

    // framer-motion animates via inline style attributes on elements, which
    // style-src governs. Nonces can't cover attributes, so this has to stay
    // permissive — far lower risk than the equivalent for script.
    "style-src": ["'self'", "'unsafe-inline'"],

    // blob: is how decrypted attachments are previewed and downloaded.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "media-src": ["'self'", "blob:"],

    // Uploads go straight to UploadThing, and DecryptButton fetches the
    // encrypted blob back from their CDN.
    "connect-src": [
      "'self'",
      "https://*.uploadthing.com",
      "https://*.ufs.sh",
      "https://utfs.io",
      "https://uploadthing.com",
      ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
    ],

    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    // The header equivalent of X-Frame-Options, and the one modern browsers use.
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");

  // Only meaningful over HTTPS, and it breaks a plain-http dev server.
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}

/**
 * Routes rendered per request, which are therefore able to carry a nonce.
 * Every route that touches plaintext, decryption keys or account data is here;
 * what is left is the public marketing page and 404s, both prerendered.
 *
 * Listed as an allowlist rather than the inverse on purpose. An unrecognised
 * path — any 404 — falls through to the weaker policy and still renders. Were
 * this inverted, an unlisted prerendered route would get a nonce policy that
 * blocks its own inline scripts and leaves the page dead.
 *
 * A new page missing from this list degrades to the weaker policy rather than
 * breaking, so keep it current but a slip is not fatal.
 */
const NONCED_PREFIXES = [
  "/login",
  "/onboarding",
  "/dashboard",
  "/profile",
  "/audit",
  "/invite",
];

export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const { pathname } = request.nextUrl;
  const canUseNonce = NONCED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const nonce = canUseNonce
    ? Buffer.from(crypto.randomUUID()).toString("base64")
    : null;
  const csp = buildCsp(nonce, isDev);

  // Next reads the nonce back out of the request's own CSP header to stamp it
  // onto the scripts it renders, so it must be set on both request and
  // response.
  const requestHeaders = new Headers(request.headers);
  if (nonce) requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Every path except Next's own static output and the favicon — those are
     * immutable assets that carry no inline script, and hashing a nonce into
     * them would defeat their caching.
     */
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
