"use client";

import { authClient } from "@/lib/auth-client";
import { LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/login";
          },
        },
      });
    } catch {
      toast.error("Couldn't sign you out.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 py-3 text-sm font-semibold text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          Logout Account
        </>
      )}
    </button>
  );
}
