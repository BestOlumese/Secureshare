"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Fetches the public keys of multiple users by their emails.
 */
export async function getPublicKeys(emails: string[]) {
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, publicKey: true, id: true },
  });

  const missingKeys = users.filter((u) => !u.publicKey);
  if (missingKeys.length > 0) {
    throw new Error(`Some users haven't completed security setup: ${missingKeys.map((u) => u.email).join(", ")}`);
  }

  const notFound = emails.filter((email) => !users.find((u) => u.email === email));
  if (notFound.length > 0) {
    throw new Error(`Recipients not found: ${notFound.join(", ")}`);
  }

  return users.map((u) => ({ id: u.id, email: u.email, publicKey: u.publicKey! }));
}

/**
 * Fetches the sender's own public key
 */
export async function getSenderPublicKey() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { publicKey: true, id: true },
  });

  if (!user || !user.publicKey) {
    throw new Error("You haven't completed security setup.");
  }

  return { publicKey: user.publicKey, id: user.id };
}

/**
 * Sends a secure message with multiple encrypted attachments.
 */
export async function sendSecureMessage(data: {
  subject?: string;
  content?: string; // encrypted content
  messageKeyShares: Array<{ userId: string; encryptedAesKey: string; role?: string }>;
  attachments: Array<{
    fileUrl: string;
    fileName: string;
    fileSize?: number;
    contentType?: string;
    documentKeyShares: Array<{ userId: string; encryptedAesKey: string; role?: string }>;
  }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized");
  const userId = session.user.id;

  // Fetch sender's organization
  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });

  // Use a transaction to ensure both message and attachments are saved
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create the Message "envelope"
    const message = await tx.message.create({
      data: {
        senderId: userId,
        subject: data.subject,
        content: data.content,
        orgId: sender?.orgId,
        recipients: {
          create: data.messageKeyShares.map((share) => ({
            userId: share.userId,
            encryptedAesKey: share.encryptedAesKey,
            role: share.role || "TO",
          })),
        },
      },
    });

    // 2. Create the Document records for attachments
    const documents = await Promise.all(
      data.attachments.map((att) =>
        tx.document.create({
          data: {
            messageId: message.id,
            senderId: userId,
            fileUrl: att.fileUrl,
            fileName: att.fileName,
            fileSize: att.fileSize,
            contentType: att.contentType,
            status: "Available",
            orgId: sender?.orgId,
            recipients: {
              create: att.documentKeyShares.map((share) => ({
                userId: share.userId,
                encryptedAesKey: share.encryptedAesKey,
                // Document recipients usually don't have roles, but we can store them if needed
              })),
            },
          },
        }),
      ),
    );

    return { message, documents };
  });

  // 3. Log the action (Cross-Org Tracking)
  // We identify target organizations by the recipients
  const recipientUserIds = data.messageKeyShares.map(s => s.userId);
  const recipientUsers = await prisma.user.findMany({
    where: { id: { in: recipientUserIds } },
    select: { orgId: true },
  });
  
  const targetOrgIds = Array.from(new Set(recipientUsers.map(u => u.orgId).filter(Boolean))) as string[];

  // Log for each target organization if it's different from sender's
  for (const targetOrgId of targetOrgIds) {
    if (targetOrgId !== sender?.orgId) {
      await prisma.auditLog.create({
        data: {
          userId,
          actionType: "CROSS_ORG_MESSAGE_SENT",
          initiatorOrgId: sender?.orgId,
          targetOrgId: targetOrgId,
          ipAddress: (await headers()).get("x-forwarded-for") || "unknown",
          metadata: {
            messageId: result.message.id,
            recipientCount: data.messageKeyShares.length,
          },
        },
      });
    }
  }

  // Always log the general send action
  await prisma.auditLog.create({
    data: {
      userId,
      actionType: "MESSAGE_SENT",
      initiatorOrgId: sender?.orgId,
      ipAddress: (await headers()).get("x-forwarded-for") || "unknown",
      metadata: {
        messageId: result.message.id,
      },
    },
  });

  return { success: true, messageId: result.message.id };
}

/**
 * Retrieves the encrypted document details for decryption.
 */
export async function getDocumentMetadata(docId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized");

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: {
      recipients: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!doc) throw new Error("Document not found.");

  // Access Control: Must be an explicit recipient (or sender, who is also a recipient now)
  const userShare = doc.recipients[0];
  
  if (!userShare) {
    // Admin paradox fixed: Admins can no longer bypass decryption!
    throw new Error("Access denied. You are not a recipient of this document.");
  }

  if (doc.orgId && doc.orgId !== session.user.orgId) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        actionType: "CROSS_ORG_DOC_VIEWED",
        initiatorOrgId: session.user.orgId,
        targetOrgId: doc.orgId,
        ipAddress: (await headers()).get("x-forwarded-for") || "unknown",
        metadata: { docId, fileName: doc.fileName },
      },
    });
  }

  return {
    fileUrl: doc.fileUrl,
    encryptedAesKey: userShare.encryptedAesKey,
    fileName: doc.fileName || `secure-file-${docId.slice(0, 8)}`,
    contentType: doc.contentType || "application/octet-stream",
  };
}

/**
 * Retrieves the encrypted message details for decryption.
 */
export async function getMessageMetadata(messageId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized");

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      recipients: {
        where: { userId: session.user.id },
      },
      documents: {
        include: {
          recipients: {
            where: { userId: session.user.id },
          }
        }
      }
    },
  });

  if (!message) throw new Error("Message not found.");

  const userShare = message.recipients[0];
  if (!userShare) {
    throw new Error("Access denied.");
  }

  return {
    subject: message.subject,
    content: message.content, // encrypted
    encryptedAesKey: userShare.encryptedAesKey,
    documents: message.documents.map(d => ({
      id: d.id,
      fileName: d.fileName,
      contentType: d.contentType,
      encryptedAesKey: d.recipients[0]?.encryptedAesKey,
    }))
  };
}

/**
 * Fetches the current user's encrypted private key sync info.
 */
export async function getUserKeySyncInfo() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      encryptedPrivateKey: true,
      privateKeySalt: true,
      privateKeyIV: true,
      recoveryEncryptedPrivateKey: true,
      recoverySalt: true,
      recoveryIV: true,
    },
  });

  if (!user || !user.encryptedPrivateKey) {
    throw new Error("Key sync not enabled for this account.");
  }

  return {
    encryptedPrivateKey: user.encryptedPrivateKey,
    salt: user.privateKeySalt!,
    iv: user.privateKeyIV!,
    recoveryEncryptedPrivateKey: user.recoveryEncryptedPrivateKey,
    recoverySalt: user.recoverySalt,
    recoveryIV: user.recoveryIV,
  };
}
