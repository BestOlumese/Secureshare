import { protectPage } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { ArrowLeft, Shield } from "lucide-react";
import ProfileUI from "@/components/profile/ProfileUI";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await protectPage();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });

  if (!user) return null;

  // Fetch members and invitations if user is admin/owner
  let members: any[] = [];
  let invitations: any[] = [];

  if (user.orgId && (user.role === "OWNER" || user.role === "ADMIN")) {
    members = await prisma.user.findMany({
      where: { orgId: user.orgId },
      orderBy: { name: "asc" }
    });
    invitations = await prisma.invitation.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: "desc" }
    });
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all group shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Inbox
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <h1 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Profile & Vault</h1>
          </div>
        </header>

        <ProfileUI user={user} members={members} invitations={invitations} />
      </div>
    </main>
  );
}
