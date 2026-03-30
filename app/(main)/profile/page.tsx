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
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:border-slate-700 transition-all group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Inbox
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-sky-400" />
              <h1 className="text-2xl font-bold italic tracking-tight uppercase">Profile & Vault</h1>
            </div>
          </div>
        </header>

        <ProfileUI user={user} members={members} invitations={invitations} />
      </div>
    </main>
  );
}
