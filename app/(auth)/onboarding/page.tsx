import { protectPage } from "@/lib/auth-utils";
import OnboardingForm from "@/components/auth/OnboardingForm";
import { Shield } from "lucide-react";
import { prisma } from "@/lib/db";

export default async function OnboardingPage() {
  const session = await protectPage(true);

  // Check for pending invitation
  const invitation = await prisma.invitation.findFirst({
    where: {
      email: session.user.email.toLowerCase(),
      status: "PENDING",
      expiresAt: { gt: new Date() }
    },
    include: {
      organization: {
        select: { name: true }
      }
    }
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-full bg-[radial-gradient(circle_at_top,#0ea5e915_0%,transparent_70%)]" />
      </div>

      <div className="mb-12 flex items-center gap-2 text-2xl font-black uppercase tracking-tighter text-white">
        <Shield className="h-8 w-8 text-sky-500" />
        SecureMail
      </div>

      <OnboardingForm 
        userEmail={session.user.email} 
        invitation={invitation ? { 
          id: invitation.id, 
          orgName: invitation.organization.name,
          role: invitation.role 
        } : undefined} 
      />
    </main>
  );
}
