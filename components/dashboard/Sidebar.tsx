"use client";

import { 
  Inbox, 
  Send, 
  User, 
  Shield, 
  Settings,
  Archive,
  Star,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentView: "inbox" | "sent";
  setView: (v: "inbox" | "sent") => void;
  user: any;
}

export default function Sidebar({ currentView, setView, user }: SidebarProps) {
  const navItems = [
    { id: "inbox", label: "Inbox", icon: Inbox },
    { id: "sent", label: "Sent", icon: Send },
  ];

  return (
    <div className="flex w-16 flex-col items-center border-r border-slate-800 bg-[#020617] py-6 gap-8">
      {/* App Logo */}
      <Link href="/dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
        <Shield className="h-6 w-6" />
      </Link>

      {/* Main Nav */}
      <nav className="flex flex-1 flex-col gap-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as any)}
            className={cn(
              "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
              currentView === item.id 
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" 
                : "text-slate-500 hover:bg-slate-900 hover:text-slate-300 border border-transparent hover:border-slate-800"
            )}
          >
            <item.icon className="h-5 w-5" />
            
            {/* Tooltip */}
            <div className="absolute left-14 hidden group-hover:block z-50">
              <div className="rounded-md bg-slate-900 border border-slate-800 px-2 py-1 text-xs font-semibold text-white whitespace-nowrap shadow-xl">
                {item.label}
              </div>
            </div>
          </button>
        ))}
        
        <div className="h-px w-6 bg-slate-800 my-2 mx-auto" />
        
        <button className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all">
          <Archive className="h-5 w-5" />
        </button>
      </nav>

      {/* Footer Nav */}
      <div className="flex flex-col gap-4">
        <Link 
          href="/profile"
          className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
        >
          <User className="h-5 w-5" />
          <div className="absolute left-14 hidden group-hover:block z-50">
            <div className="rounded-md bg-slate-900 border border-slate-800 px-2 py-1 text-xs font-semibold text-white whitespace-nowrap shadow-xl">
              Profile
            </div>
          </div>
        </Link>
        
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 border border-slate-800 overflow-hidden ring-2 ring-transparent hover:ring-sky-500/50 transition-all">
          <div className="h-full w-full bg-linear-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
            {user.name?.charAt(0) || "U"}
          </div>
        </button>
      </div>
    </div>
  );
}
