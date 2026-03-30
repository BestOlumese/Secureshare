import { protectPage } from "@/lib/auth-utils";
import UploadForm from "@/components/upload/UploadForm";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function UploadPage() {
  await protectPage();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-12 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2 text-xl font-bold">
            <Shield className="h-6 w-6 text-sky-500" />
            SecureShare
          </div>
        </div>

        <div className="mb-12">
          <h1 className="mb-2 text-4xl font-extrabold tracking-tight">Send a Secure Document</h1>
          <p className="text-slate-400">
            Files are encrypted locally before being transmitted. Only the recipient with their matching private key can view the contents.
          </p>
        </div>

        <UploadForm />
      </div>
    </main>
  );
}
