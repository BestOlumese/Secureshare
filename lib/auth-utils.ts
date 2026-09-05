import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { rateLimit } from "./rate-limit";

export async function protectPage(allowOnboarding = false) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";

  // Apply Rate Limiting (30 requests per minute per IP for sensitive pages)
  const limiter = rateLimit(`page:${ip}`, 30, 60 * 1000);
  if (!limiter.success) {
    throw new Error("Slow down a moment.");
  }

  const session = await auth.api.getSession({
    headers: headersList,
  });

  // 1. Check if the user is authenticated
  if (!session) {
    redirect("/login");
  }

  // 2. Check if the user has completed onboarding
  if (!session.user.onboarded && !allowOnboarding) {
    redirect("/onboarding");
  }

  if (session.user.onboarded && allowOnboarding) {
    redirect("/dashboard");
  }

  return session;
}

export async function protectAuthPage() {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";

  // Apply Rate Limiting (20 requests per minute per IP for auth pages)
  const limiter = rateLimit(`auth_page:${ip}`, 20, 60 * 1000);
  if (!limiter.success) {
    throw new Error("Slow down a moment.");
  }

  const session = await auth.api.getSession({
    headers: headersList,
  });

  // 1. Check if the user is authenticated
  if (session) {
    redirect("/dashboard");
  }
}
