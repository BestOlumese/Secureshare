import { NextResponse } from "next/server";
import { purgeExpiredAttachments, purgeFullyDeletedAttachments } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

/**
 * Scheduled purge of attachments that are expired or fully deleted.
 * Protected by CRON_SECRET — set it in the environment and send it as
 * `Authorization: Bearer <secret>` (the header Vercel Cron sends).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expired = await purgeExpiredAttachments();
    const deleted = await purgeFullyDeletedAttachments();
    return NextResponse.json({ success: true, expired, deleted });
  } catch (err: unknown) {
    console.error("[cron/cleanup]", err);
    const message = err instanceof Error ? err.message : "Cleanup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
