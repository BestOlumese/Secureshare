"use client";

import { useState } from "react";
import { acceptInvitation } from "@/app/actions/org-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Loader2, ShieldCheck } from "lucide-react";

interface InviteAcceptClientProps {
  invitation: {
    id: string;
    email: string;
    orgName: string;
    role: string;
  };
}

export default function InviteAcceptClient({ invitation }: InviteAcceptClientProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const router = useRouter();

  async function handleAccept() {
    setIsAccepting(true);
    try {
      const result = await acceptInvitation(invitation.id);

      if (!result.success) {
        if (result.needsLogin) {
          router.push(`/login?redirect=/invite/${invitation.id}`);
          return;
        }
        toast.error(result.error || "Failed to accept invitation.");
        setIsAccepting(false);
        return;
      }

      toast.success(`You've joined ${result.orgName || invitation.orgName}!`);
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsAccepting(false);
    }
  }

  return (
    <div className="text-center">
      <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
        <Building2 className="h-7 w-7 text-blue-600" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re Invited</h1>
      <p className="text-gray-500 text-sm mb-8 leading-relaxed">
        You&apos;ve been invited to join{" "}
        <span className="font-bold text-gray-800">{invitation.orgName}</span> as a{" "}
        <span className="font-bold text-gray-800">{invitation.role}</span> on SecureShare.
      </p>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-8 text-left space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400 font-medium">Organization</span>
          <span className="font-bold text-gray-800">{invitation.orgName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400 font-medium">Your email</span>
          <span className="font-bold text-gray-800">{invitation.email}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400 font-medium">Role</span>
          <span className="inline-flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs border border-blue-200 uppercase tracking-widest">
            <ShieldCheck className="h-3 w-3" />
            {invitation.role}
          </span>
        </div>
      </div>

      <button
        onClick={handleAccept}
        disabled={isAccepting}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {isAccepting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Joining...
          </>
        ) : (
          `Accept & Join ${invitation.orgName}`
        )}
      </button>

      <p className="text-xs text-gray-400 mt-4">
        You must be signed in with <strong>{invitation.email}</strong> to accept.
      </p>
    </div>
  );
}
