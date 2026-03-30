import { protectPage } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import DashboardUI from "@/components/dashboard/DashboardUI";

export default async function DashboardPage() {
  const session = await protectPage();

  const receivedMessages = await prisma.message.findMany({
    where: { receiverId: session.user.id },
    include: { 
      sender: true,
      receiver: true,
      documents: true 
    },
    orderBy: { createdAt: "desc" },
  });

  const sentMessages = await prisma.message.findMany({
    where: { senderId: session.user.id },
    include: { 
      sender: true,
      receiver: true,
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
