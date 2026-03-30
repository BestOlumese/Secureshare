"use client";

import { useState } from "react";
import { 
  Inbox, 
  Send, 
  User, 
  Shield, 
  Search, 
  Plus, 
  Menu,
  ChevronRight,
  Archive,
  Star,
  Settings,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MessageList from "./MessageList";
import MessageView from "./MessageView";
import Sidebar from "./Sidebar";
import ComposeModal from "./ComposeModal";

export type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  subject: string | null;
  content: string | null;
  createdAt: Date;
  sender: { email: string; name: string };
  receiver?: { email: string; name: string };
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
    initialReceived.length > 0 ? initialReceived[0].id : null
  );
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const messages = view === "inbox" ? initialReceived : initialSent;
  const selectedMessage = messages.find(m => m.id === selectedMessageId) || null;

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden">
      {/* Sidebar (Column 1) */}
      <Sidebar 
        currentView={view} 
        setView={(v) => { setView(v); setSelectedMessageId(null); }} 
        user={user}
      />

      {/* Message List (Column 2) */}
      <div className="flex w-80 flex-col border-r border-slate-800 bg-[#020617]">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white capitalize">{view}</h1>
            <button 
              onClick={() => setIsComposeOpen(true)}
              className="p-2 rounded-lg bg-sky-500 text-white hover:bg-sky-400 transition-colors shadow-lg shadow-sky-500/20"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input 
              placeholder="Search messages..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <MessageList 
            messages={messages} 
            selectedId={selectedMessageId} 
            onSelect={setSelectedMessageId}
            view={view}
          />
        </div>
      </div>

      {/* Message View (Column 3) */}
      <div className="flex-1 bg-[#020617] overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {selectedMessage ? (
            <MessageView key={selectedMessage.id} message={selectedMessage} />
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full items-center justify-center text-slate-500"
            >
              <div className="text-center">
                <Mail className="mx-auto mb-4 h-12 w-12 opacity-20" />
                <p>Select a message to read</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

function Mail(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
