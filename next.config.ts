import type { NextConfig } from "next";

/**
 * Security headers. The app decrypts in the browser, so the page itself is
 * part of the trust boundary: framing or injected script would expose
 * plaintext and the private key held in IndexedDB.
 *
 * No CSP here — the app needs one, but it has to be built and tested against
 * Next's inline runtime scripts and the UploadThing endpoints rather than
 * guessed at, or it will silently break the dashboard.
 */
const securityHeaders = [
  // Defence in depth against clickjacking, alongside frame-ancestors in a CSP.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No page here needs camera, mic or geolocation.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework version.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
