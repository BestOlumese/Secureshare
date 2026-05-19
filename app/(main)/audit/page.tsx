import { protectPage } from "@/lib/auth-utils";
import { getAuditLogs } from "@/app/actions/org-actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import AuditLogViewer from "@/components/audit/AuditLogViewer";
import { ArrowLeft, Shield } from "lucide-react";

export default async function AuditPage() {
  const session = await protectPage();

  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const logs = await getAuditLogs({ limit: 50 });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8 flex items-center gap-4">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all group shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Profile
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <h1 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Audit Log</h1>
          </div>
        </header>

        <AuditLogViewer initialLogs={logs} />
      </div>
    </main>
  );
}
