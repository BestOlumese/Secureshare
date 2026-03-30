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
          <a href="${process.env.BETTER_AUTH_URL}/login" style="display: inline-block; background: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px;">Join Organization</a>
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
 * Gets a user's organization name by their email.
 */
export async function getRecipientOrg(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      orgId: true,
      organization: {
        select: { name: true }
      }
    }
  });

  return user?.organization || null;
}
