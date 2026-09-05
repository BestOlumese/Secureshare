import { prisma } from "@/lib/db";
import { UTApi } from "uploadthing/server";

let utapiInstance: UTApi | null = null;

/**
 * Constructed on first use, not at import. `new UTApi()` throws unless it is
 * running server-side, so building it eagerly would make merely importing this
 * module fail anywhere else.
 */
function utapi(): UTApi {
  utapiInstance ??= new UTApi();
  return utapiInstance;
}

/**
 * UploadThing file keys are the last path segment of the stored URL
 * (e.g. https://<app>.ufs.sh/f/<key>).
 */
export function fileKeyFromUrl(fileUrl: string | null): string | null {
  if (!fileUrl) return null;
  try {
    const segments = new URL(fileUrl).pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || null;
  } catch {
    return null;
  }
}

/**
 * Deletes the given documents' blobs from storage and clears their file
 * pointers. Pointers are only cleared for blobs that were actually removed, so
 * a failed delete is retried on the next run instead of being orphaned.
 */
async function purgeDocuments(
  documents: Array<{ id: string; fileUrl: string | null }>,
  status: string
) {
  const keys = documents
    .map((d) => ({ id: d.id, key: fileKeyFromUrl(d.fileUrl) }))
    .filter((d): d is { id: string; key: string } => d.key !== null);

  if (keys.length === 0) {
    return { deleted: 0, failed: 0 };
  }

  try {
    await utapi().deleteFiles(keys.map((k) => k.key));
  } catch (err) {
    console.error("[cleanup] Failed to delete blobs from storage:", err);
    return { deleted: 0, failed: keys.length };
  }

  await prisma.document.updateMany({
    where: { id: { in: keys.map((k) => k.id) } },
    data: { fileUrl: null, status },
  });

  return { deleted: keys.length, failed: 0 };
}

/**
 * Purges attachments whose expiry has passed.
 *
 * Ciphertext left in object storage outlives the app's own access checks, so
 * expiry is only real once the bytes are gone.
 */
export async function purgeExpiredAttachments(now = new Date()) {
  const expired = await prisma.document.findMany({
    where: {
      fileUrl: { not: null },
      OR: [
        { expiryDate: { lt: now } },
        { message: { expiryDate: { lt: now } } },
      ],
    },
    select: { id: true, fileUrl: true },
  });

  const { deleted, failed } = await purgeDocuments(expired, "Expired");
  return { scanned: expired.length, deleted, failed };
}

/**
 * Purges attachments belonging to messages every recipient has deleted.
 *
 * Deletion is per-recipient and soft, so the blob has to outlive the first
 * delete — but once nobody can reach the message, keeping the ciphertext just
 * accrues storage cost and makes deletion requests impossible to honour.
 */
export async function purgeFullyDeletedAttachments() {
  const orphaned = await prisma.document.findMany({
    where: {
      fileUrl: { not: null },
      message: {
        // Every recipient row has been soft-deleted...
        recipients: { none: { deletedAt: null } },
        // ...and there is at least one, so a message mid-creation (which
        // briefly has no recipients) is never caught by `none`.
        AND: { recipients: { some: {} } },
      },
    },
    select: { id: true, fileUrl: true },
  });

  const { deleted, failed } = await purgeDocuments(orphaned, "Expired");
  return { scanned: orphaned.length, deleted, failed };
}
