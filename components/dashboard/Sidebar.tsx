"use client";

import { 
  Inbox, 
  Send, 
  User, 
  Shield, 
  Settings,
  Archive,
  Star,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SidebarProps {
  currentView: "inbox" | "sent";
  setView: (v: "inbox" | "sent") => void;
  user: any;
}

export default function Sidebar({ currentView, setView, user }: SidebarProps) {
  const navItems = [
    { id: "inbox", label: "Inbox", icon: Inbox },
    { id: "sent", label: "Sent", icon: Send },
    { id: "archive", label: "Archive", icon: Archive },
    { id: "trash", label: "Trash", icon: Trash2 },
  ];

  return (
    <div className="flex w-[80px] flex-col items-center border-r border-slate-800/60 bg-[#020617] py-8 z-10 shrink-0">
      {/* App Logo */}
      <Link href="/dashboard" className="mb-12 group relative">
        <div className="absolute inset-0 bg-sky-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/20 transition-transform group-hover:scale-105 active:scale-95">
          <Shield className="h-6 w-6" />
        </div>
      </Link>

      {/* Main Nav */}
      <nav className="flex flex-1 flex-col gap-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === "inbox" || item.id === "sent") {
                setView(item.id as any);
              }
            }}
            className={cn(
              "group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300",
              currentView === item.id 
                ? "bg-slate-800 text-sky-400 shadow-inner" 
                : "text-slate-500 hover:text-slate-200 hover:bg-slate-900/50"
            )}
          >
            <item.icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", currentView === item.id && "scale-110")} />
            
            {/* Tooltip */}
            <div className="absolute left-[70px] invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 z-50 pointer-events-none">
              <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap shadow-2xl">
                {item.label}
              </div>
            </div>

            {currentView === item.id && (
              <motion.div 
                layoutId="active-nav"
                className="absolute right-[-1px] top-1/2 -translate-y-1/2 w-1 h-6 bg-sky-500 rounded-l-full shadow-[0_0_10px_rgba(14,165,233,0.5)]"
              />
            )}
          </button>
        ))}
      </nav>

      {/* Footer Nav */}
      <div className="flex flex-col gap-4 mt-auto">
        <Link 
          href="/profile"
          className="group relative flex h-12 w-12 items-center justify-center rounded-2xl text-slate-500 hover:text-slate-200 hover:bg-slate-900/50 transition-all duration-300"
        >
          <Settings className="h-5 w-5 transition-transform duration-300 group-hover:rotate-45" />
          <div className="absolute left-[70px] invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 z-50 pointer-events-none">
            <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap shadow-2xl">
              Settings
            </div>
          </div>
        </Link>
        
        <button className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 p-0.5 overflow-hidden transition-all hover:border-sky-500/50 group">
          <div className="h-full w-full rounded-[14px] bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:text-sky-400 transition-colors capitalize">
            {user.name?.charAt(0) || "U"}
          </div>
        </button>
      </div>
    </div>
  );
}
