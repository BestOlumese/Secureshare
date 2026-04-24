"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function completeOnboarding(data: {
  name: string;
  organizationName: string;
  publicKey: string;
  encryptedPrivateKey?: string;
  privateKeySalt?: string;
  privateKeyIV?: string;
  recoveryEncryptedPrivateKey?: string;
  recoverySalt?: string;
  recoveryIV?: string;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const organizationName = data.organizationName.trim();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check for valid invitation
      const invitation = await tx.invitation.findFirst({
        where: {
          email: session.user.email.toLowerCase(),
          status: "PENDING",
          expiresAt: { gt: new Date() }
        }
      });

      let orgId: string;
      let role: string;

      if (invitation) {
        orgId = invitation.orgId;
        role = invitation.role;
        
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED" }
        });
      } else {
        let organization = await tx.organization.findUnique({
          where: { name: organizationName },
        });

        if (organization) {
          throw new Error(`The organization "${organizationName}" already exists.`);
        }

        organization = await tx.organization.create({
          data: { name: organizationName },
        });
        orgId = organization.id;
        role = "OWNER";
      }

      // 2. Update the user
      await tx.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          orgId,
          role,
          publicKey: data.publicKey,
          encryptedPrivateKey: data.encryptedPrivateKey,
          privateKeySalt: data.privateKeySalt,
          privateKeyIV: data.privateKeyIV,
          recoveryEncryptedPrivateKey: data.recoveryEncryptedPrivateKey,
          recoverySalt: data.recoverySalt,
          recoveryIV: data.recoveryIV,
          onboarded: true,
        },
      });

      // 3. Log the action
      const headersList = await headers();
      const ipAddress = headersList.get("x-forwarded-for") || "unknown";

      await tx.auditLog.create({
        data: {
          userId,
          actionType: "ONBOARDING_COMPLETED",
          initiatorOrgId: orgId,
          ipAddress,
        },
      });

      return { success: true };
    }, {
      timeout: 15000, // Increase timeout to 15s to prevent flakiness during heavy load
    });

    return result;
  } catch (err: any) {
    console.error("Onboarding Error:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}
