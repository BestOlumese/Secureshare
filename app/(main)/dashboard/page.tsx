import { protectPage } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import DashboardUI from "@/components/dashboard/DashboardUI";

export default async function DashboardPage() {
  const session = await protectPage();

  const receivedMessages = await prisma.message.findMany({
    where: { 
      recipients: {
        some: { userId: session.user.id }
      },
      senderId: { not: session.user.id } // Filter out sent messages from inbox
    },
    include: { 
      sender: true,
      recipients: {
        include: { user: true }
      },
      documents: true 
    },
    orderBy: { createdAt: "desc" },
  });

  const sentMessages = await prisma.message.findMany({
    where: { senderId: session.user.id },
    include: { 
      sender: true,
      recipients: {
        include: { user: true }
      },
      documents: true 
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="h-screen bg-slate-950 text-slate-50 overflow-hidden">
      <DashboardUI 
        user={session.user}
        initialReceived={receivedMessages}
        initialSent={sentMessages}
      />
    </main>
  );
}
