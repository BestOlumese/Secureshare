"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/**
 * The landing page's call-to-action links.
 *
 * Session is read in the browser so the page stays prerendered and instant.
 * The trade-off is one frame where we don't know yet: rather than flashing
 * "Get started" at someone who is already signed in, the label is held back
 * until the session resolves, which reads as the button simply arriving.
 */
export function AuthCta({
  className,
  signedOutLabel = "Get started",
  signedInLabel = "Go to dashboard",
  showArrow = true,
}: {
  className?: string;
  signedOutLabel?: string;
  signedInLabel?: string;
  showArrow?: boolean;
}) {
  const { data: session, isPending } = useSession();
  const href = session ? "/dashboard" : "/login";

  // Show the signed-out label while resolving rather than blanking the button.
  // It's the right answer for anyone who isn't signed in, and for anyone who
  // is, the link already points to /login, which forwards them on.
  const label = isPending ? signedOutLabel : session ? signedInLabel : signedOutLabel;

  return (
    <Link href={href} className={cn("group", className)}>
      <span className="inline-flex items-center gap-2">
        {label}
        {showArrow && (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        )}
      </span>
    </Link>
  );
}

/**
 * The navbar pair: two links when signed out, one when signed in.
 */
export function AuthNav() {
  const { data: session } = useSession();

  if (session) {
    return (
      <Link
        href="/dashboard"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5"
      >
        Log in
      </Link>
      <Link
        href="/login"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Get started
      </Link>
    </>
  );
}

/** Plain text link, for the footer. */
export function AuthTextLink({ className }: { className?: string }) {
  const { data: session } = useSession();
  return (
    <Link href={session ? "/dashboard" : "/login"} className={className}>
      {session ? "Dashboard" : "Log in"}
    </Link>
  );
}
