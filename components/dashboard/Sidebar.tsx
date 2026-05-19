"use client";

import { Inbox, Send, Shield, Settings, Building2, Archive } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type DashboardView = "inbox" | "sent" | "archived" | "vault";

interface SidebarProps {
  currentView: DashboardView;
  setView: (v: DashboardView) => void;
  user: any;
  unreadCount?: number;
}

export default function Sidebar({ currentView, setView, user, unreadCount = 0 }: SidebarProps) {
  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

  const navItems: { id: DashboardView; label: string; icon: React.ElementType }[] = [
    { id: "inbox", label: "Inbox", icon: Inbox },
    { id: "sent", label: "Sent", icon: Send },
    { id: "archived", label: "Archived", icon: Archive },
    ...(isAdmin ? [{ id: "vault" as DashboardView, label: "Org Vault", icon: Building2 }] : []),
  ];

  return (
    <div className="flex w-[72px] flex-col items-center border-r border-gray-200 bg-white py-6 z-10 shrink-0">
      {/* Logo */}
      <Link href="/dashboard" className="mb-10 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 transition-transform group-hover:scale-105 active:scale-95">
          <Shield className="h-5 w-5" />
        </div>
      </Link>

      {/* Main Nav */}
      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
              currentView === item.id
                ? "bg-blue-50 text-blue-600"
                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            )}
          >
            <item.icon className="h-5 w-5" />

            {/* Unread badge on Inbox */}
            {item.id === "inbox" && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-blue-600 text-[9px] font-black text-white flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}

            {/* Tooltip */}
            <div className="absolute left-[52px] invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none">
              <div className="rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white whitespace-nowrap shadow-xl">
                {item.label}
              </div>
            </div>

            {currentView === item.id && (
              <div className="absolute -right-px top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-600 rounded-l-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-2 mt-auto">
        <Link
          href="/profile"
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
        >
          <Settings className="h-5 w-5 transition-transform group-hover:rotate-45 duration-300" />
          <div className="absolute left-[52px] invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none">
            <div className="rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white whitespace-nowrap shadow-xl">
              Settings
            </div>
          </div>
        </Link>

        <div className="h-10 w-10 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-500 bg-gray-50 capitalize select-none">
          {user.name?.charAt(0) || "U"}
        </div>
      </div>
    </div>
  );
}
