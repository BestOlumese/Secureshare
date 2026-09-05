"use client";

import { Inbox, Send, Building2, Archive, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";

export type DashboardView = "inbox" | "sent" | "archived" | "vault";

interface SidebarProps {
  currentView: DashboardView;
  setView: (v: DashboardView) => void;
  user: SessionUser;
  unreadCount?: number;
  onCompose: () => void;
}

export default function Sidebar({
  currentView,
  setView,
  user,
  unreadCount = 0,
  onCompose,
}: SidebarProps) {
  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

  const navItems: { id: DashboardView; label: string; icon: React.ElementType }[] = [
    { id: "inbox", label: "Inbox", icon: Inbox },
    { id: "sent", label: "Sent", icon: Send },
    { id: "archived", label: "Archived", icon: Archive },
    ...(isAdmin ? [{ id: "vault" as DashboardView, label: "Org vault", icon: Building2 }] : []),
  ];

  return (
    <nav
      aria-label="Mailboxes"
      className="flex w-56 flex-col gap-1 border-r border-gray-200 bg-gray-50 px-3 py-4 shrink-0"
    >
      <button
        onClick={onCompose}
        className="mb-3 flex items-center gap-2.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        <PenLine className="h-4 w-4" />
        Compose
      </button>

      {navItems.map(({ id, label, icon: Icon }) => {
        const isActive = currentView === id;
        const showCount = id === "inbox" && unreadCount > 0;
        return (
          <button
            key={id}
            onClick={() => setView(id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-left",
              isActive
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={cn("flex-1", showCount && !isActive && "font-medium text-gray-900")}>
              {label}
            </span>
            {showCount && (
              <span className="text-sm tabular-nums text-gray-500">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
