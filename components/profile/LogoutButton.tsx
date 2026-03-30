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
    } catch (error) {
      toast.error("Failed to log out");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/5 py-4 text-sm font-black text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/10 hover:border-red-500 shadow-lg shadow-red-500/0 hover:shadow-red-500/10 uppercase tracking-widest"
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
