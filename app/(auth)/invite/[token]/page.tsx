import { getInvitationById } from "@/app/actions/org-actions";
import InviteAcceptClient from "./InviteAcceptClient";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Logo from "@/components/Logo";
import { CircleX, CircleAlert, LogIn } from "lucide-react";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invitation, session] = await Promise.all([
    getInvitationById(token),
    auth.api.getSession({ headers: await headers() }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-10 text-blue-600 font-semibold text-xl tracking-tight">
        <Logo className="h-6 w-6" />
        SecureShare
      </Link>

      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-8">
        {!invitation ? (
          <div className="text-center">
            <div className="h-14 w-14 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <CircleX className="h-7 w-7 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation not valid</h1>
            <p className="text-gray-500 text-sm mb-6">
              This link doesn&apos;t work any more.
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
            <div className="h-14 w-14 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <CircleAlert className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Already used</h1>
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
            <div className="h-14 w-14 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <CircleAlert className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Expired</h1>
            <p className="text-gray-500 text-sm mb-6">
              This invitation expired. Ask an admin for a new one.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        ) : !session ? (
          <div className="text-center">
            <div className="h-14 w-14 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <LogIn className="h-7 w-7 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in to accept</h1>
            <p className="text-gray-500 text-sm mb-6">
              You&apos;ve been invited to join <strong>{invitation.orgName}</strong>. Sign in with{" "}
              <strong>{invitation.email}</strong> to accept.
            </p>
            <Link
              href={`/login?redirect=/invite/${token}`}
              className="inline-flex items-center justify-center w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <InviteAcceptClient invitation={invitation} />
        )}
      </div>
    </div>
  );
}
