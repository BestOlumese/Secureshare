"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  // 1. Check for valid invitation
  const invitation = await prisma.invitation.findFirst({
    where: {
      email: session.user.email.toLowerCase(),
      status: "PENDING",
      expiresAt: { gt: new Date() }
    }
  });

  let orgId: string;
  let role: string;

  if (invitation) {
    // 2a. HARDCODE from invitation (Strict)
    orgId = invitation.orgId;
    role = invitation.role;
    
    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" }
    });
  } else {
    // 2b. Organization Creation/Uniqueness Flow
    const organizationName = data.organizationName.trim();
    
    let organization = await prisma.organization.findUnique({
      where: { name: organizationName },
    });

    if (organization) {
      // If organization exists and user wasn't invited, PREVENT joining or duplication
      // We force users to create unique orgs or be invited.
      throw new Error(`The organization "${organizationName}" already exists. Please join via invitation or use a different name.`);
    }

    // Create new organization as OWNER
    organization = await prisma.organization.create({
      data: {
        name: organizationName,
      },
    });
    orgId = organization.id;
    role = "OWNER";
  }

  // 3. Update the user
  await prisma.user.update({
    where: { id: session.user.id },
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
  await prisma.auditLog.create({
    data: {
      userId,
      action: "Onboarding_Completed",
      ipAddress: (await headers()).get("x-forwarded-for") || "unknown",
    },
  });

  return { success: true };
}
