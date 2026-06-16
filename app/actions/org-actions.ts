"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { transporter } from "@/lib/mailer";

/**
 * Searches for organizations by name.
 */
export async function searchOrganizations(query: string) {
  if (!query || query.length < 2) return [];
  
  return await prisma.organization.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
    },
    take: 5,
  });
}

/**
 * Invites a user to the organization.
 */
export async function inviteUserToOrg(email: string, role: "ADMIN" | "USER") {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user.orgId) throw new Error("Unauthorized");
  
  // Guard: Only OWNER or ADMIN can invite
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Only owners and admins can invite users.");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { name: true }
  });

  // Check if already invited or member
  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingUser?.orgId === session.user.orgId) {
    throw new Error("User is already a member of this organization.");
  }

  // Upsert invitation
  const invitation = await prisma.invitation.upsert({
    where: {
      email_orgId: {
        email: email.toLowerCase(),
        orgId: session.user.orgId,
      }
    },
    update: {
      role,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    create: {
      email: email.toLowerCase(),
      orgId: session.user.orgId,
      role,
      inviterId: session.user.id,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Send invitation email
  await transporter.sendMail({
    from: `"SecureMail" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Invitation to join ${organization?.name} on SecureMail`,
    html: `
      <div style="font-family: sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #0ea5e9; font-size: 24px; font-weight: 800; margin-bottom: 16px;">SecureMail Invitation</h2>
          <p style="font-size: 16px; line-height: 24px;">${session.user.name} has invited you to join <strong>${organization?.name}</strong> as a <strong>${role}</strong>.</p>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 32px;">Please log in or sign up with this email address to accept your invitation and join the secure vault.</p>
          <a href="${process.env.BETTER_AUTH_URL}/invite/${invitation.id}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px;">Accept Invitation</a>
        </div>
      </div>
    `,
  });

  return { success: true };
}

/**
 * Revokes a pending invitation.
 */
export async function revokeInvitation(invitationId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user.orgId) throw new Error("Unauthorized");
  
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId }
  });

  if (!invitation || invitation.orgId !== session.user.orgId) {
    throw new Error("Invitation not found.");
  }

  // Guard: Only OWNER or ADMIN can revoke
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" }
  });

  return { success: true };
}

/**
 * Updates a member's role.
 */
export async function updateMemberRole(userId: string, newRole: "ADMIN" | "USER") {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user.orgId) throw new Error("Unauthorized");
  
  const targetUser = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!targetUser || targetUser.orgId !== session.user.orgId) {
    throw new Error("User not found in organization.");
  }

  // Guard: Only OWNER or ADMIN can update roles
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Guard: Admin cannot update other Admins
  if (session.user.role === "ADMIN" && targetUser.role === "ADMIN") {
    throw new Error("Admins cannot change roles of other admins.");
  }

  // Guard: Cannot demote OWNER
  if (targetUser.role === "OWNER") {
    throw new Error("The organization owner's role cannot be changed.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole }
  });

  return { success: true };
}

/**
 * Removes a member from the organization.
 */
export async function removeMember(userId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user.orgId) throw new Error("Unauthorized");

  const targetUser = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!targetUser || targetUser.orgId !== session.user.orgId) {
    throw new Error("User not found in organization.");
  }

  // Guard: Only OWNER or ADMIN can remove
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Guard: Admin cannot remove other Admins
  if (session.user.role === "ADMIN" && targetUser.role === "ADMIN") {
    throw new Error("Admins cannot remove other admins.");
  }
  
  // Guard: Cannot remove OWNER
  if (targetUser.role === "OWNER") {
    throw new Error("The owner cannot be removed from the organization.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { orgId: null, role: "USER" }
  });

  return { success: true };
}

/**
 * Updates user profile information.
 */
export async function updateProfile(data: { name: string; username?: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      username: data.username,
      displayUsername: data.username,
    },
  });

  return { success: true };
}

/**
 * Updates organization details.
 */
export async function updateOrganization(data: { name: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user.orgId) throw new Error("Unauthorized");

  // Guard: Only OWNER or ADMIN can update org
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const newName = data.name.trim();

  // Check uniqueness if name changed
  const existing = await prisma.organization.findUnique({
    where: { name: newName }
  });

  if (existing && existing.id !== session.user.orgId) {
    throw new Error("Organization name already exists.");
  }

  await prisma.organization.update({
    where: { id: session.user.orgId },
    data: { name: newName },
  });

  return { success: true };
}

/**
 * Looks up an invitation by ID for the accept page.
 */
export async function getInvitationById(invitationId: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { organization: { select: { name: true } } },
  });
  if (!invitation) return null;
  return {
    id: invitation.id,
    email: invitation.email,
    orgName: invitation.organization.name,
    orgId: invitation.orgId,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
  };
}

/**
 * Accepts a pending invitation for the currently signed-in user.
 */
export async function acceptInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string; needsLogin?: boolean; orgName?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, needsLogin: true, error: "You must be signed in to accept an invitation." };
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { organization: { select: { name: true } } },
  });

  if (!invitation) return { success: false, error: "Invitation not found." };
  if (invitation.status !== "PENDING") return { success: false, error: "This invitation is no longer valid." };
  if (invitation.expiresAt < new Date()) return { success: false, error: "This invitation has expired." };
  if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return { success: false, error: "This invitation was sent to a different email address." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { orgId: invitation.orgId, role: invitation.role },
    }),
    prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "ACCEPTED" },
    }),
  ]);

  return { success: true, orgName: invitation.organization.name };
}

/**
 * Gets a user's organization name by their email.
 */
export async function getRecipientOrg(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      orgId: true,
      organization: {
        select: { id: true, name: true },
      },
    },
  });

  return user?.organization || null;
}

/**
 * Saves the organization's RSA key pair (owner only).
 */
export async function saveOrgKeys(data: {
  publicKey: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.orgId) throw new Error("Unauthorized");
  if (session.user.role !== "OWNER") throw new Error("Only the org owner can generate org keys.");

  await prisma.organization.update({
    where: { id: session.user.orgId },
    data: {
      publicKey: data.publicKey,
      encryptedPrivateKey: data.encryptedPrivateKey,
      privateKeySalt: data.salt,
      privateKeyIV: data.iv,
    },
  });

  return { success: true };
}

/**
 * Returns the org's public key by org ID (used during message composition).
 */
export async function getOrgPublicKey(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { publicKey: true },
  });
  return org?.publicKey || null;
}

/**
 * Returns the org's encrypted private key for admin decryption.
 */
export async function getOrgKeySyncInfo() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.orgId) throw new Error("Unauthorized");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Only org admins can access org vault keys.");
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { encryptedPrivateKey: true, privateKeySalt: true, privateKeyIV: true },
  });

  if (!org?.encryptedPrivateKey) throw new Error("Org vault keys not configured.");

  return {
    encryptedPrivateKey: org.encryptedPrivateKey,
    salt: org.privateKeySalt!,
    iv: org.privateKeyIV!,
  };
}

/**
 * Returns whether the current org has vault keys configured.
 */
export async function getOrgKeyStatus() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.orgId) return { hasKeys: false };

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { publicKey: true },
  });
  return { hasKeys: !!org?.publicKey };
}

/**
 * Gets organizations for multiple emails.
 */
export async function getRecipientsOrgs(emails: string[]) {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: emails.map(e => e.toLowerCase()),
      }
    },
    select: {
      email: true,
      organization: {
        select: { name: true }
      }
    }
  });

  return users.map(u => ({ email: u.email, orgName: u.organization?.name }));
}

/**
 * Returns paginated audit logs for admins (scoped to their org).
 */
export async function getAuditLogs(params: { cursor?: string; limit?: number } = {}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.orgId) throw new Error("Unauthorized");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Only org admins can view audit logs.");
  }

  const limit = params.limit ?? 50;

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { initiatorOrgId: session.user.orgId },
        { targetOrgId: session.user.orgId },
        { userId: session.user.id },
      ],
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { timestamp: "desc" },
    take: limit,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
  });

  return logs.map((l) => ({
    id: l.id,
    actionType: l.actionType,
    timestamp: l.timestamp,
    ipAddress: l.ipAddress,
    metadata: l.metadata,
    initiatorOrgId: l.initiatorOrgId,
    targetOrgId: l.targetOrgId,
    user: l.user,
  }));
}
