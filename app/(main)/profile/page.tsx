import { protectPage } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import ProfileUI from "@/components/profile/ProfileUI";
import Link from "next/link";
import type { OrgMember, OrgInvitation } from "@/lib/types";

export default async function ProfilePage() {
  const session = await protectPage();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });

  if (!user) return null;

  // Fetch members and invitations if user is admin/owner
  let members: OrgMember[] = [];
  let invitations: OrgInvitation[] = [];

  if (user.orgId && (user.role === "OWNER" || user.role === "ADMIN")) {
    // Select explicitly. A bare findMany returns every scalar column, which
    // would ship each member's encryptedPrivateKey, salts and IVs into the
    // admin's browser — enough to brute-force their master password offline.
    members = await prisma.user.findMany({
      where: { orgId: user.orgId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" }
    });
    invitations = await prisma.invitation.findMany({
      where: { orgId: user.orgId },
      select: { id: true, email: true, role: true, status: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" }
    });
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to inbox
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
        </header>

        <ProfileUI user={user} members={members} invitations={invitations} />
      </div>
    </main>
  );
}
