"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Message } from "./DashboardUI";
import { cn } from "@/lib/utils";
import { Paperclip, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface MessageListProps {
  messages: Message[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  view: "inbox" | "sent";
}

export default function MessageList({ messages, selectedId, onSelect, view }: MessageListProps) {
  const [displayCount, setDisplayCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < messages.length) {
          setDisplayCount(prev => prev + 20);
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [messages.length, displayCount]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700 mb-4">
          <Loader2 className="h-8 w-8 animate-spin opacity-20" />
        </div>
        <p className="text-slate-400 font-medium">No messages found</p>
        <p className="text-slate-600 text-xs mt-1">Your secure inbox is clear.</p>
      </div>
    );
  }

  const visibleMessages = messages.slice(0, displayCount);

  return (
    <div className="flex flex-col">
      {visibleMessages.map((message, index) => (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03, duration: 0.3 }}
          key={message.id}
          onClick={() => onSelect(message.id)}
          className={cn(
            "flex flex-col gap-1.5 px-6 py-5 text-left transition-all relative border-b border-slate-800/40 group",
            selectedId === message.id 
              ? "bg-sky-500/5" 
              : "hover:bg-slate-900/30"
          )}
        >
          {selectedId === message.id && (
            <motion.div 
              layoutId="list-indicator"
              className="absolute left-0 top-0 h-full w-1 bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]" 
            />
          )}
          
          <div className="flex items-center justify-between w-full mb-0.5">
            <span className={cn(
              "text-sm font-semibold truncate transition-colors",
              selectedId === message.id ? "text-sky-400" : "text-slate-200 group-hover:text-white"
            )}>
              {view === "inbox" 
                ? message.sender.name || "Unknown" 
                : message.recipients?.filter(r => r.role === "TO").map(r => r.user.name).join(", ") || "Recipient"}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
              {format(new Date(message.createdAt), "HH:mm")}
            </span>
          </div>
          
          <h3 className={cn(
            "text-[13px] font-medium truncate leading-snug mb-1",
            selectedId === message.id ? "text-slate-100" : "text-slate-400 group-hover:text-slate-300"
          )}>
            {message.subject || "(No Subject)"}
          </h3>
          
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-600 truncate flex-1 font-normal italic">
              Encrypted secure payload...
            </p>
            <div className="flex items-center gap-2">
              {message.recipients?.some(r => r.role === "CC") && (
                <div className="text-[9px] font-black bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-widest border border-slate-700/50">
                  CC
                </div>
              )}
              {message.documents.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-800/30 px-1.5 py-0.5 rounded border border-slate-700/30">
                  <Paperclip className="h-3 w-3" />
                  {message.documents.length}
                </div>
              )}
            </div>
          </div>
        </motion.button>
      ))}

      {displayCount < messages.length && (
        <div ref={loadMoreRef} className="p-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-sky-500/50" />
        </div>
      )}
    </div>
  );
}
