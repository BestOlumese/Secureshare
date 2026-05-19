import { protectPage } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import DashboardUI from "@/components/dashboard/DashboardUI";
import ErrorBoundary from "@/components/ErrorBoundary";

const PAGE_SIZE = 50;

const MESSAGE_INCLUDE = {
  sender: true,
  recipients: { include: { user: true } },
  documents: true,
} as const;

export default async function DashboardPage() {
  const session = await protectPage();
  const isAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";
  const userId = session.user.id;

  const [receivedMessages, sentMessages, archivedMessages, orgVaultMessages] = await Promise.all([
    prisma.message.findMany({
      where: {
        recipients: { some: { userId, deletedAt: null, archivedAt: null } },
        senderId: { not: userId },
      },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.message.findMany({
      where: { senderId: userId },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.message.findMany({
      where: {
        recipients: { some: { userId, archivedAt: { not: null }, deletedAt: null } },
      },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    isAdmin && session.user.orgId
      ? prisma.message.findMany({
          where: { orgShares: { some: { orgId: session.user.orgId } } },
          include: MESSAGE_INCLUDE,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="h-screen bg-gray-50 overflow-hidden">
      <ErrorBoundary>
        <DashboardUI
          user={session.user}
          initialReceived={receivedMessages}
          initialSent={sentMessages}
          initialArchived={archivedMessages}
          initialOrgVault={orgVaultMessages}
        />
      </ErrorBoundary>
    </main>
  );
}
