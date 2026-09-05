"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { transporter } from "@/lib/mailer";
import { notExpired, MESSAGE_SELECT } from "@/lib/message-filters";
import { limitAction } from "@/lib/rate-limit";

/**
 * Fetches the public keys of multiple users by their emails.
 * Requires a session — otherwise this doubles as an account-enumeration oracle.
 */
export async function getPublicKeys(emails: string[]) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  limitAction("getPublicKeys", session.user.id, 60, 60 * 1000);

  // Emails are stored lowercase everywhere else, so normalise before matching.
  const normalized = emails.map((e) => e.trim().toLowerCase());

  const users = await prisma.user.findMany({
    where: { email: { in: normalized } },
    select: { email: true, publicKey: true, id: true },
  });

  const missingKeys = users.filter((u) => !u.publicKey);
  if (missingKeys.length > 0) {
    throw new Error(
      `${missingKeys.map((u) => u.email).join(", ")} hasn't finished signing up.`
    );
  }

  const notFound = normalized.filter((email) => !users.find((u) => u.email.toLowerCase() === email));
  if (notFound.length > 0) {
    // Encryption needs their public key, so there is nothing to send to until
    // they have an account. The sender only needs to know that much.
    const list = notFound.join(", ");
    throw new Error(
      notFound.length === 1
        ? `${list} doesn't have an account yet.`
        : `No account yet for ${list}.`
    );
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
    throw new Error("Finish setting up your keys first.");
  }

  return { publicKey: user.publicKey, id: user.id };
}

/**
 * Sends a secure message with multiple encrypted attachments.
 */
export async function sendSecureMessage(data: {
  subject?: string;
  content?: string;
  expiryDate?: Date;
  messageKeyShares: Array<{ userId: string; encryptedAesKey: string; role?: string }>;
  orgKeyShares?: Array<{ orgId: string; encryptedAesKey: string }>;
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

  // Each send fans out to SMTP and holds uploaded blobs, so cap the rate.
  limitAction("sendSecureMessage", userId, 20, 60 * 1000);

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
        expiryDate: data.expiryDate,
        orgId: sender?.orgId,
        recipients: {
          create: data.messageKeyShares.map((share) => ({
            userId: share.userId,
            encryptedAesKey: share.encryptedAesKey,
            role: share.role || "TO",
          })),
        },
        orgShares: data.orgKeyShares?.length
          ? {
              create: data.orgKeyShares.map((share) => ({
                orgId: share.orgId,
                encryptedAesKey: share.encryptedAesKey,
              })),
            }
          : undefined,
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
            // Attachments inherit the message expiry, otherwise an expired
            // message's files stay downloadable forever.
            expiryDate: data.expiryDate,
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
  const recipientOrgs = await prisma.user.findMany({
    where: { id: { in: recipientUserIds } },
    select: { orgId: true },
  });
  
  const targetOrgIds = Array.from(new Set(recipientOrgs.map(u => u.orgId).filter(Boolean))) as string[];

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

  // Send email notifications to recipients
  const senderUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const recipientUsers = await prisma.user.findMany({
    where: { id: { in: data.messageKeyShares.map((s) => s.userId).filter((id) => id !== userId) } },
    select: { email: true, name: true },
  });

  if (recipientUsers.length > 0) {
    const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const attachmentNote = data.attachments.length > 0
      ? `<p style="color:#64748b;font-size:14px;">With <strong>${data.attachments.length} attachment${data.attachments.length > 1 ? "s" : ""}</strong>.</p>`
      : "";

    // Verify SMTP connection before sending
    try {
      await transporter.verify();
    } catch (err) {
      console.error("[mailer] SMTP connection failed:", err);
    }

    const emailResults = await Promise.allSettled(
      recipientUsers.map((r) =>
        transporter.sendMail({
          from: `"SecureShare" <${process.env.SMTP_USER}>`,
          to: r.email,
          subject: `${senderUser?.name || senderUser?.email} sent you a message`,
          html: `
            <div style="font-family:sans-serif;padding:40px;color:#1e293b;background:#f8fafc;">
              <div style="max-width:560px;margin:0 auto;background:white;padding:40px;border-radius:20px;border:1px solid #e2e8f0;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
                  <div style="background:#2563eb;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                    <span style="color:white;font-size:18px;font-weight:900;">S</span>
                  </div>
                  <span style="font-size:16px;font-weight:800;color:#1e293b;">SecureShare</span>
                </div>
                <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin:0 0 8px;">You have a new message</h2>
                <p style="color:#64748b;font-size:14px;margin:0 0 16px;">
                  From <strong style="color:#1e293b;">${senderUser?.name || senderUser?.email}</strong>.
                </p>
                ${attachmentNote}
                <p style="color:#94a3b8;font-size:12px;margin:0 0 24px;">We can&apos;t read it. Sign in and it unlocks with your master password.</p>
                <a href="${appUrl}/dashboard" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;">
                  Open inbox
                </a>
              </div>
            </div>
          `,
        })
      )
    );

    emailResults.forEach((res, i) => {
      if (res.status === "rejected") {
        console.error(`[mailer] Failed to send to ${recipientUsers[i].email}:`, res.reason);
      } else {
        console.log(`[mailer] Sent to ${recipientUsers[i].email}: messageId=${res.value.messageId}`);
      }
    });
  }

  return { success: true, messageId: result.message.id };
}

/**
 * Soft-deletes a message for the current user only.
 */
export async function deleteMessageForUser(messageId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const recipient = await prisma.messageRecipient.findUnique({
    where: { messageId_userId: { messageId, userId: session.user.id } },
  });
  if (!recipient) throw new Error("That message doesn't exist.");

  await prisma.messageRecipient.update({
    where: { messageId_userId: { messageId, userId: session.user.id } },
    data: { deletedAt: new Date() },
  });

  return { success: true };
}

/**
 * Archives or un-archives a message for the current user.
 */
export async function toggleArchiveMessage(messageId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const recipient = await prisma.messageRecipient.findUnique({
    where: { messageId_userId: { messageId, userId: session.user.id } },
  });
  if (!recipient) throw new Error("That message doesn't exist.");

  await prisma.messageRecipient.update({
    where: { messageId_userId: { messageId, userId: session.user.id } },
    data: { archivedAt: recipient.archivedAt ? null : new Date() },
  });

  return { success: true, archived: !recipient.archivedAt };
}

/**
 * Retrieves the encrypted document details for decryption.
 */
export async function getDocumentMetadata(docId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized");

  const isAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: {
      recipients: { where: { userId: session.user.id } },
      message: isAdmin && session.user.orgId
        ? { include: { orgShares: { where: { orgId: session.user.orgId } } } }
        : { select: { expiryDate: true } },
    },
  });

  if (!doc) throw new Error("That file doesn't exist.");

  // Enforce expiry — the document's own date, and the parent message's, since
  // documents created before this field was populated have a null expiryDate.
  const now = new Date();
  // The `message` include is conditional on isAdmin, so its type is a union.
  // Narrow it once here rather than casting at each use.
  const docMessage = (doc as unknown as {
    message?: {
      expiryDate?: Date | null;
      orgShares?: Array<{ encryptedAesKey: string }>;
    } | null;
  }).message;
  const messageExpiry = docMessage?.expiryDate;
  const isExpired =
    (doc.expiryDate && doc.expiryDate < now) || (messageExpiry && messageExpiry < now);

  if (isExpired && doc.status !== "Expired") {
    await prisma.document.update({ where: { id: docId }, data: { status: "Expired" } });
  }
  if (isExpired || doc.status === "Expired") {
    throw new Error("This file has expired.");
  }

  const userShare = doc.recipients[0];
  const orgShare = docMessage?.orgShares?.[0];

  if (!userShare && !orgShare) {
    throw new Error("You don't have access to this file.");
  }

  if (!userShare && orgShare) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        actionType: "ORG_VAULT_FILE_DECRYPTED",
        initiatorOrgId: session.user.orgId,
        targetOrgId: doc.orgId,
        ipAddress: (await headers()).get("x-forwarded-for") || "unknown",
        metadata: { docId, messageId: doc.messageId },
      },
    });
  }

  if (doc.orgId && doc.orgId !== session.user.orgId) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        actionType: "CROSS_ORG_DOC_VIEWED",
        initiatorOrgId: session.user.orgId,
        targetOrgId: doc.orgId,
        ipAddress: (await headers()).get("x-forwarded-for") || "unknown",
        // No fileName: it's ciphertext now, so storing it would only keep
        // unreadable base64 that no reader of this log could use.
        metadata: { docId, messageId: doc.messageId },
      },
    });
  }

  return {
    fileUrl: doc.fileUrl,
    encryptedAesKey: userShare?.encryptedAesKey ?? null,
    orgEncryptedAesKey: orgShare?.encryptedAesKey ?? null,
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

  const isAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      recipients: {
        where: { userId: session.user.id },
      },
      orgShares: isAdmin && session.user.orgId
        ? { where: { orgId: session.user.orgId } }
        : false,
      documents: {
        include: {
          recipients: {
            where: { userId: session.user.id },
          },
        },
      },
    },
  });

  if (!message) throw new Error("That message doesn't exist.");

  if (message.expiryDate && message.expiryDate < new Date()) {
    throw new Error("This message has expired.");
  }

  const userShare = message.recipients[0];
  const orgShare = (message as unknown as {
    orgShares?: Array<{ encryptedAesKey: string }>;
  }).orgShares?.[0];

  if (!userShare && !orgShare) {
    throw new Error("You don't have access to this.");
  }

  // An admin reading a message they were never a recipient of is a vault
  // access, not a normal read — it must leave a trail.
  if (!userShare && orgShare) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        actionType: "ORG_VAULT_MESSAGE_DECRYPTED",
        initiatorOrgId: session.user.orgId,
        targetOrgId: message.orgId,
        ipAddress: (await headers()).get("x-forwarded-for") || "unknown",
        metadata: {
          messageId: message.id,
          senderId: message.senderId,
        },
      },
    });
  }

  return {
    subject: message.subject,
    content: message.content,
    encryptedAesKey: userShare?.encryptedAesKey ?? null,
    orgEncryptedAesKey: orgShare?.encryptedAesKey ?? null,
    documents: message.documents.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      contentType: d.contentType,
      encryptedAesKey: d.recipients[0]?.encryptedAesKey ?? null,
    })),
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
      kdfIterations: true,
    },
  });

  if (!user || !user.encryptedPrivateKey) {
    throw new Error("No saved key on this account.");
  }

  return {
    encryptedPrivateKey: user.encryptedPrivateKey,
    salt: user.privateKeySalt!,
    iv: user.privateKeyIV!,
    recoveryEncryptedPrivateKey: user.recoveryEncryptedPrivateKey,
    recoverySalt: user.recoverySalt,
    recoveryIV: user.recoveryIV,
    // Null for keys written before the count was recorded; the client falls
    // back to the legacy 100k in that case.
    kdfIterations: user.kdfIterations,
  };
}

const PAGE_SIZE = 50;

export async function loadMoreMessages(params: {
  view: "inbox" | "sent" | "archived" | "vault";
  cursor: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const { view, cursor } = params;
  const userId = session.user.id;
  const isAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";

  const shared = {
    select: MESSAGE_SELECT,
    orderBy: { createdAt: "desc" as const },
    take: PAGE_SIZE,
    skip: 1,
    cursor: { id: cursor },
  };

  if (view === "inbox") {
    return prisma.message.findMany({
      where: {
        recipients: { some: { userId, deletedAt: null, archivedAt: null } },
        senderId: { not: userId },
        ...notExpired(),
      },
      ...shared,
    });
  }
  if (view === "sent") {
    return prisma.message.findMany({
      where: { senderId: userId, ...notExpired() },
      ...shared,
    });
  }
  if (view === "archived") {
    return prisma.message.findMany({
      where: {
        recipients: { some: { userId, archivedAt: { not: null }, deletedAt: null } },
        ...notExpired(),
      },
      ...shared,
    });
  }
  if (view === "vault" && isAdmin && session.user.orgId) {
    return prisma.message.findMany({
      where: { orgShares: { some: { orgId: session.user.orgId } }, ...notExpired() },
      ...shared,
    });
  }
  return [];
}

export async function markMessageRead(messageId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  await prisma.messageRecipient.updateMany({
    where: { messageId, userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { success: true };
}

export async function fetchNewMessages(params: {
  view: "inbox" | "sent" | "archived" | "vault";
  after: string; // ISO date string of the latest message we already have
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;
  const isAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";
  const afterDate = new Date(params.after);

  const shared = {
    select: MESSAGE_SELECT,
    orderBy: { createdAt: "desc" as const },
  };

  if (params.view === "inbox") {
    return prisma.message.findMany({
      where: {
        createdAt: { gt: afterDate },
        recipients: { some: { userId, deletedAt: null, archivedAt: null } },
        senderId: { not: userId },
        ...notExpired(),
      },
      ...shared,
    });
  }
  if (params.view === "sent") {
    return prisma.message.findMany({
      where: { createdAt: { gt: afterDate }, senderId: userId, ...notExpired() },
      ...shared,
    });
  }
  if (params.view === "archived") {
    return prisma.message.findMany({
      where: {
        createdAt: { gt: afterDate },
        recipients: { some: { userId, archivedAt: { not: null }, deletedAt: null } },
        ...notExpired(),
      },
      ...shared,
    });
  }
  if (params.view === "vault" && isAdmin && session.user.orgId) {
    return prisma.message.findMany({
      where: {
        createdAt: { gt: afterDate },
        orgShares: { some: { orgId: session.user.orgId } },
        ...notExpired(),
      },
      ...shared,
    });
  }
  return [];
}

export async function getSessions() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return sessions.map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    isCurrent: s.id === session.session.id,
  }));
}

export async function revokeSession(sessionId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  await prisma.session.deleteMany({
    where: { id: sessionId, userId: session.user.id },
  });

  return { success: true };
}

export async function markAllMessagesRead() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  await prisma.messageRecipient.updateMany({
    where: { userId: session.user.id, readAt: null, deletedAt: null },
    data: { readAt: new Date() },
  });

  return { success: true };
}
