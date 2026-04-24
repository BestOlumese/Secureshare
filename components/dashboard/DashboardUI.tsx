"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Search, 
  Plus, 
  User,
  Mail,
  ChevronLeft,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MessageList from "./MessageList";
import MessageView from "./MessageView";
import Sidebar from "./Sidebar";
import ComposeModal from "./ComposeModal";
import Link from "next/link";

export type Message = {
  id: string;
  senderId: string;
  subject: string | null;
  content: string | null;
  createdAt: Date;
  sender: { email: string; name: string };
  recipients?: Array<{ user: { email: string; name: string }, role: string }>;
  documents: Array<{
    id: string;
    fileName: string | null;
    fileUrl: string | null;
    fileSize: number | null;
    contentType: string | null;
  }>;
};

interface DashboardUIProps {
  user: any;
  initialReceived: any[];
  initialSent: any[];
}

export default function DashboardUI({ user, initialReceived, initialSent }: DashboardUIProps) {
  const [view, setView] = useState<"inbox" | "sent">("inbox");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null // Default to null on mobile to show list first
  );
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const messages = view === "inbox" ? initialReceived : initialSent;
  const filteredMessages = messages.filter(m => 
    (m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     m.sender.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     m.sender.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const selectedMessage = messages.find(m => m.id === selectedMessageId) || null;

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans selection:bg-sky-500/30">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (Desktop Only) */}
        <div className="hidden md:flex">
          <Sidebar 
            currentView={view} 
            setView={(v) => { setView(v); setSelectedMessageId(null); }} 
            user={user}
          />
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Message List */}
          <div className={cn(
            "flex w-full md:w-[320px] lg:w-[400px] flex-col border-r border-slate-800/60 bg-[#020617] shrink-0 transition-all duration-300",
            selectedMessageId ? "hidden md:flex" : "flex"
          )}>
            <div className="px-4 py-6 sm:px-6 sm:py-8">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight capitalize">{view}</h1>
                <button 
                  onClick={() => setIsComposeOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white hover:bg-sky-400 transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:scale-105 active:scale-95"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-0 bg-sky-500/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex items-center">
                  <Search className="absolute left-4 h-4 w-4 text-slate-500 group-focus-within:text-sky-500 transition-colors" />
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in mail..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/40 py-3 pl-11 pr-4 text-sm transition-all focus:border-sky-500/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <MessageList 
                messages={filteredMessages} 
                selectedId={selectedMessageId} 
                onSelect={setSelectedMessageId}
                view={view}
              />
            </div>
          </div>

          {/* Message View */}
          <div className={cn(
            "flex-1 bg-[#020617]/50 overflow-hidden relative transition-all duration-300",
            selectedMessageId ? "flex" : "hidden md:flex"
          )}>
            <AnimatePresence mode="wait">
              {selectedMessage ? (
                <MessageView 
                  key={selectedMessage.id} 
                  message={selectedMessage} 
                  onClose={() => setSelectedMessageId(null)}
                />
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hidden md:flex h-full w-full items-center justify-center"
                >
                  <div className="text-center max-w-sm px-6">
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 bg-sky-500/20 blur-3xl rounded-full" />
                      <div className="relative h-20 w-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700">
                        <Mail className="h-10 w-10 opacity-40" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Your inbox is ready</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Select a secure message from the list to decrypt and read its contents.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden flex items-center justify-around py-3 px-6 border-t border-slate-800/60 bg-[#020617] shrink-0">
        <button 
          onClick={() => { setView("inbox"); setSelectedMessageId(null); }}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            view === "inbox" ? "text-sky-500" : "text-slate-500"
          )}
        >
          <Mail className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Inbox</span>
        </button>
        <button 
          onClick={() => { setView("sent"); setSelectedMessageId(null); }}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            view === "sent" ? "text-sky-500" : "text-slate-500"
          )}
        >
          <Send className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Sent</span>
        </button>
        <Link 
          href="/profile"
          className="flex flex-col items-center gap-1 text-slate-500"
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Profile</span>
        </Link>
      </div>

      {/* Compose Modal */}
      <ComposeModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
        user={user}
      />
    </div>
  );
}
