import { protectPage } from "@/lib/auth-utils";
import OnboardingForm from "@/components/auth/OnboardingForm";
import { prisma } from "@/lib/db";
import Link from "next/link";
import Logo from "@/components/Logo";

export default async function OnboardingPage() {
  const session = await protectPage(true);

  const invitation = await prisma.invitation.findFirst({
    where: {
      email: session.user.email.toLowerCase(),
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: { organization: { select: { name: true } } },
  });

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-gray-900 mb-10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Logo className="h-4 w-4" />
        </div>
        SecureShare
      </Link>

      <OnboardingForm
        userEmail={session.user.email}
        invitation={
          invitation
            ? { id: invitation.id, orgName: invitation.organization.name, role: invitation.role }
            : undefined
        }
      />
    </main>
  );
}
