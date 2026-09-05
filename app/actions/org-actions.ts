"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { transporter } from "@/lib/mailer";
import { limitAction } from "@/lib/rate-limit";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Server actions are public HTTP endpoints, so every one that reads directory
 * data must confirm a session first — otherwise anyone can enumerate
 * organizations and probe which emails are registered.
 */
async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

/**
 * Searches for organizations by name.
 */
export async function searchOrganizations(query: string) {
  const session = await requireSession();
  // Typeahead: fires per keystroke, so this only catches scripted abuse.
  limitAction("searchOrganizations", session.user.id, 120, 60 * 1000);
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
    throw new Error("Only owners and admins can invite.");
  }

  // Every invite sends mail from our domain — throttle to protect deliverability.
  limitAction("inviteUserToOrg", session.user.id, 10, 60 * 60 * 1000);

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { name: true }
  });

  // Check if already invited or member
  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingUser?.orgId === session.user.orgId) {
    throw new Error("They're already in your organization.");
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
    from: `"SecureShare" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `${session.user.name} invited you to ${organization?.name}`,
    html: `
      <div style="font-family: sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #0ea5e9; font-size: 24px; font-weight: 800; margin-bottom: 16px;">SecureShare</h2>
          <p style="font-size: 16px; line-height: 24px;"><strong>${session.user.name}</strong> invited you to join <strong>${organization?.name}</strong> as ${role === "ADMIN" ? "an admin" : "a member"}.</p>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 32px;">Sign in with this email address to accept. It takes a couple of minutes to set up.</p>
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
    throw new Error("That invitation doesn't exist.");
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
    throw new Error("They're not in your organization.");
  }

  // Guard: Only OWNER or ADMIN can update roles
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Guard: Admin cannot update other Admins
  if (session.user.role === "ADMIN" && targetUser.role === "ADMIN") {
    throw new Error("Admins can't change other admins.");
  }

  // Guard: Cannot demote OWNER
  if (targetUser.role === "OWNER") {
    throw new Error("You can't change the owner's role.");
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
    throw new Error("They're not in your organization.");
  }

  // Guard: Only OWNER or ADMIN can remove
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  // Guard: Admin cannot remove other Admins
  if (session.user.role === "ADMIN" && targetUser.role === "ADMIN") {
    throw new Error("Admins can't remove other admins.");
  }
  
  // Guard: Cannot remove OWNER
  if (targetUser.role === "OWNER") {
    throw new Error("You can't remove the owner.");
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
    throw new Error("That name is taken.");
  }

  await prisma.organization.update({
    where: { id: session.user.orgId },
    data: { name: newName },
  });

  return { success: true };
}

/**
 * Looks up an invitation by ID for the accept page.
 * Intentionally unauthenticated: the accept page renders this for signed-out
 * invitees. The cuid invitation ID is the bearer token, and it only reveals
 * details the link holder already has.
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
    return { success: false, needsLogin: true, error: "Sign in to accept." };
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { organization: { select: { name: true } } },
  });

  if (!invitation) return { success: false, error: "That invitation doesn't exist." };
  if (invitation.status !== "PENDING") return { success: false, error: "This invitation is no longer valid." };
  if (invitation.expiresAt < new Date()) return { success: false, error: "This invitation has expired." };
  if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return { success: false, error: "This invitation was sent to a different address." };
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
  const session = await requireSession();
  limitAction("getRecipientOrg", session.user.id, 120, 60 * 1000);

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
  iterations: number;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.orgId) throw new Error("Unauthorized");
  if (session.user.role !== "OWNER") throw new Error("Only the owner can do this.");

  await prisma.organization.update({
    where: { id: session.user.orgId },
    data: {
      publicKey: data.publicKey,
      encryptedPrivateKey: data.encryptedPrivateKey,
      privateKeySalt: data.salt,
      privateKeyIV: data.iv,
      kdfIterations: data.iterations,
    },
  });

  return { success: true };
}

/**
 * Returns the org's public key by org ID (used during message composition).
 */
export async function getOrgPublicKey(orgId: string) {
  await requireSession();

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
    throw new Error("Admins only.");
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: {
      encryptedPrivateKey: true,
      privateKeySalt: true,
      privateKeyIV: true,
      kdfIterations: true,
    },
  });

  if (!org?.encryptedPrivateKey) throw new Error("Your organization hasn't set up a key yet.");

  return {
    encryptedPrivateKey: org.encryptedPrivateKey,
    salt: org.privateKeySalt!,
    iv: org.privateKeyIV!,
    kdfIterations: org.kdfIterations,
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
  await requireSession();

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
 * Filters for the audit log. Applied in the database, not in the browser:
 * filtering a page of 50 rows and calling it a search gives a confidently
 * wrong answer, which is the one thing an audit tool must not do.
 */
export interface AuditLogFilters {
  cursor?: string;
  limit?: number;
  /** Matches user name, email, or action type. */
  search?: string;
  /** Exact action type, or undefined for all. */
  actionType?: string;
  /** Only events at or after this moment. */
  since?: Date;
}

/** Builds the shared `where` clause so listing, counting and export agree. */
function auditLogWhere(
  orgId: string,
  userId: string,
  filters: AuditLogFilters
): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [
    {
      OR: [
        { initiatorOrgId: orgId },
        { targetOrgId: orgId },
        { userId },
      ],
    },
  ];

  if (filters.actionType) {
    and.push({ actionType: filters.actionType });
  }
  if (filters.since) {
    and.push({ timestamp: { gte: filters.since } });
  }

  const search = filters.search?.trim();
  if (search) {
    and.push({
      OR: [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { actionType: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  return { AND: and };
}

async function requireAuditAccess() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.orgId) throw new Error("Unauthorized");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    throw new Error("Admins only.");
  }
  return { orgId: session.user.orgId, userId: session.user.id };
}

/**
 * Returns paginated audit logs for admins (scoped to their org), plus the
 * total number of matches so the UI can say how much it is actually showing.
 */
export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const { orgId, userId } = await requireAuditAccess();

  const limit = Math.min(filters.limit ?? 50, 100);
  const where = auditLogWhere(orgId, userId, filters);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: "desc" },
      take: limit,
      ...(filters.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    }),
    // Only counted on the first page — paging doesn't change the total.
    filters.cursor ? Promise.resolve(-1) : prisma.auditLog.count({ where }),
  ]);

  return {
    total,
    logs: logs.map((l) => ({
      id: l.id,
      actionType: l.actionType,
      timestamp: l.timestamp,
      ipAddress: l.ipAddress,
      metadata: l.metadata,
      initiatorOrgId: l.initiatorOrgId,
      targetOrgId: l.targetOrgId,
      user: l.user,
    })),
  };
}

/** Hard ceiling on an export, so one click can't pull an unbounded table. */
const AUDIT_EXPORT_LIMIT = 5000;

/**
 * Returns every row matching the current filters, for CSV download.
 */
export async function exportAuditLogs(filters: AuditLogFilters = {}) {
  const { orgId, userId } = await requireAuditAccess();
  limitAction("exportAuditLogs", userId, 5, 60 * 1000);

  const logs = await prisma.auditLog.findMany({
    where: auditLogWhere(orgId, userId, filters),
    include: { user: { select: { name: true, email: true } } },
    orderBy: { timestamp: "desc" },
    take: AUDIT_EXPORT_LIMIT,
  });

  return {
    truncated: logs.length === AUDIT_EXPORT_LIMIT,
    rows: logs.map((l) => ({
      timestamp: l.timestamp.toISOString(),
      actionType: l.actionType,
      userName: l.user?.name ?? "",
      userEmail: l.user?.email ?? "",
      ipAddress: l.ipAddress ?? "",
      crossOrg: !!l.targetOrgId && l.targetOrgId !== l.initiatorOrgId,
      metadata: l.metadata ? JSON.stringify(l.metadata) : "",
    })),
  };
}
