import { getInvitationById } from "@/app/actions/org-actions";
import InviteAcceptClient from "./InviteAcceptClient";
import { Shield } from "lucide-react";
import Link from "next/link";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getInvitationById(token);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-10 text-blue-600 font-black text-xl tracking-tight">
        <Shield className="h-6 w-6" />
        SecureShare
      </Link>

      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        {!invitation ? (
          <div className="text-center">
            <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-7 w-7 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-gray-500 text-sm mb-6">
              This invitation link is invalid or has already been used.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        ) : invitation.status !== "PENDING" ? (
          <div className="text-center">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation No Longer Valid</h1>
            <p className="text-gray-500 text-sm mb-6">
              This invitation has already been {invitation.status.toLowerCase()}.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : new Date(invitation.expiresAt) < new Date() ? (
          <div className="text-center">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Expired</h1>
            <p className="text-gray-500 text-sm mb-6">
              This invitation expired. Ask your organization admin to send a new one.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <InviteAcceptClient invitation={invitation} />
        )}
      </div>
    </div>
  );
}
