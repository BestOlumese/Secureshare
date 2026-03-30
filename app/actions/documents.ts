"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Fetches the public key of a user by their email.
 * This is used for asymmetric key wrapping during upload.
 */
export async function getReceiverPublicKey(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { publicKey: true, id: true },
  });

  if (!user || !user.publicKey) {
    throw new Error("Recipient not found or hasn't completed security setup.");
  }

  return { publicKey: user.publicKey, id: user.id };
}

/**
 * Sends a secure message with multiple encrypted attachments.
 */
export async function sendSecureMessage(data: {
  receiverId: string;
  subject?: string;
  content?: string;
  attachments: Array<{
    fileUrl: string;
    fileName: string;
    encryptedAesKey: string;
    fileSize?: number;
    contentType?: string;
  }>;
  targetOrgId?: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;
  const receiverId = data.receiverId;

  // 1. Verify recipient and Org Scoping
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { orgId: true },
  });

  if (!receiver) throw new Error("Recipient not found.");

  // If targetOrgId is specified, recipient MUST be in that org
  if (data.targetOrgId && receiver.orgId !== data.targetOrgId) {
    throw new Error("Recipient does not belong to the specified organization.");
  }

  // Use targetOrgId or fall back to receiver's orgId for scoping
  const finalOrgId = data.targetOrgId || receiver.orgId;
  if (!finalOrgId) throw new Error("Could not determine organization scoping.");

  // Use a transaction to ensure both message and attachments are saved
  const result = await prisma.$transaction(async (tx) => {
    // 2. Create the Message "envelope"
    const message = await tx.message.create({
      data: {
        senderId: userId,
        receiverId: data.receiverId,
        orgId: finalOrgId,
        subject: data.subject,
        content: data.content,
      },
    });

    // 3. Create the Document records for attachments
    const documents = await Promise.all(
      data.attachments.map((att) =>
        tx.document.create({
          data: {
            messageId: message.id,
            senderId: userId,
            receiverId: data.receiverId,
            orgId: finalOrgId,
            fileUrl: att.fileUrl,
            fileName: att.fileName,
            fileSize: att.fileSize,
            contentType: att.contentType,
            encryptedAesKey: att.encryptedAesKey,
            status: "Available",
          },
        }),
      ),
    );

    return { message, documents };
  });

  // 4. Log the action
  await prisma.auditLog.create({
    data: {
      userId,
      action: "Send_Message",
      ipAddress: (await headers()).get("x-forwarded-for") || "unknown",
    },
  });

  return { success: true, messageId: result.message.id };
}

/**
 * Saves document metadata to the database after successful upload.
 * @deprecated Use sendSecureMessage instead
 */
export async function saveDocumentMetadata(data: {
  receiverId: string;
  fileUrl: string;
  encryptedAesKey: string;
  expiryDate: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized");

  const doc = await prisma.document.create({
    data: {
      senderId: session.user.id,
      receiverId: data.receiverId,
      fileUrl: data.fileUrl,
      encryptedAesKey: data.encryptedAesKey,
      expiryDate: new Date(data.expiryDate),
      status: "Available",
    },
  });

  // Log the upload action
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "Upload_Document",
      ipAddress: (await headers()).get("x-forwarded-for") || "unknown",
    },
  });

  return { success: true, docId: doc.id };
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
    include: { receiver: true, sender: true },
  });

  if (!doc) throw new Error("Document not found.");

  // 1. Strict Org Scoping Check
  if (doc.orgId && doc.orgId !== session.user.orgId) {
    throw new Error("This document belongs to another organization.");
  }

  // 2. Access Control: Receiver, Sender, or Org Admin/Owner
  const isRecipient = doc.receiverId === session.user.id;
  const isSender = doc.senderId === session.user.id;
  const isOrgAuthority =
    session.user.role === "OWNER" || session.user.role === "ADMIN";

  if (!isRecipient && !isSender && !isOrgAuthority) {
    throw new Error("Access denied.");
  }

  return {
    fileUrl: doc.fileUrl,
    encryptedAesKey: doc.encryptedAesKey,
    fileName: doc.fileName || `secure-file-${docId.slice(0, 8)}`,
    contentType: doc.contentType || "application/octet-stream",
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
