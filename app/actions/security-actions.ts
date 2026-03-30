"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function resetMasterPassword(data: {
  encryptedPrivateKey: string;
  privateKeySalt: string;
  privateKeyIV: string;
  recoveryEncryptedPrivateKey: string;
  recoverySalt: string;
  recoveryIV: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Update the user's security fields with the new ones derived from the new password and new recovery key
  await prisma.user.update({
    where: { id: userId },
    data: {
      encryptedPrivateKey: data.encryptedPrivateKey,
      privateKeySalt: data.privateKeySalt,
      privateKeyIV: data.privateKeyIV,
      recoveryEncryptedPrivateKey: data.recoveryEncryptedPrivateKey,
      recoverySalt: data.recoverySalt,
      recoveryIV: data.recoveryIV,
    },
  });

  // Log the action for audit
  await prisma.auditLog.create({
    data: {
      userId,
      action: "Master_Password_Reset",
      ipAddress: (await headers()).get("x-forwarded-for") || "unknown",
    },
  });

  revalidatePath("/profile");
  return { success: true };
}
