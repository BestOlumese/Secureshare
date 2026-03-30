"use client";

import { format } from "date-fns";
import { Message } from "./DashboardUI";
import { cn } from "@/lib/utils";
import { Paperclip, ShieldAlert } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  view: "inbox" | "sent";
}

export default function MessageList({ messages, selectedId, onSelect, view }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="text-sm">No messages found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-slate-800/50">
      {messages.map((message) => (
        <button
          key={message.id}
          onClick={() => onSelect(message.id)}
          className={cn(
            "flex flex-col gap-1 p-4 text-left transition-all hover:bg-slate-900/40 relative group",
            selectedId === message.id ? "bg-slate-900/60" : "bg-transparent"
          )}
        >
          {selectedId === message.id && (
            <div className="absolute left-0 top-0 h-full w-1 bg-sky-500" />
          )}
          
          <div className="flex items-center justify-between w-full">
            <span className={cn(
              "text-sm font-bold truncate pr-2",
              selectedId === message.id ? "text-sky-400" : "text-slate-200"
            )}>
              {view === "inbox" ? message.sender.name || "Unknown" : message.receiver?.name || "Recipient"}
            </span>
            <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap uppercase">
              {format(new Date(message.createdAt), "MMM d")}
            </span>
          </div>
          
          <h3 className={cn(
            "text-[13px] font-semibold truncate leading-tight mb-0.5",
            selectedId === message.id ? "text-white" : "text-slate-300"
          )}>
            {message.subject || "(No Subject)"}
          </h3>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 truncate max-w-[180px]">
              {message.content || "Encrypted message content..."}
            </p>
            {message.documents.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-slate-600 font-bold bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50 group-hover:text-sky-500 transition-colors">
                <Paperclip className="h-3 w-3" />
                {message.documents.length}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
