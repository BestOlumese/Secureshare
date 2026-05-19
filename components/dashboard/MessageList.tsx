"use client";

import { useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { Message } from "./DashboardUI";
import { cn } from "@/lib/utils";
import { Paperclip, Inbox, Check } from "lucide-react";
import { motion } from "framer-motion";
import { loadMoreMessages } from "@/app/actions/documents";

const AVATAR_PALETTE = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
];

function getAvatarColor(str: string): string {
  return AVATAR_PALETTE[str.toLowerCase().charCodeAt(0) % AVATAR_PALETTE.length];
}

function formatTime(date: Date): string {
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date)) return format(date, "EEE");
  return format(date, "MMM d");
}

interface MessageListProps {
  messages: Message[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  view: "inbox" | "sent" | "archived" | "vault";
  unreadIds?: Set<string>;
  onLoadMore?: (newMessages: Message[]) => void;
  hasMore?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function MessageList({
  messages,
  selectedId,
  onSelect,
  view,
  unreadIds = new Set(),
  onLoadMore,
  hasMore = false,
  selectedIds = new Set(),
  onToggleSelect,
}: MessageListProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    setIsLoadingMore(true);
    try {
      const cursor = messages[messages.length - 1].id;
      const more = await loadMoreMessages({ view: view as any, cursor });
      onLoadMore?.(more as Message[]);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) handleLoadMore(); },
      { threshold: 1.0 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, hasMore, isLoadingMore]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Inbox className="h-6 w-6 text-gray-300" />
        </div>
        <p className="text-gray-500 font-medium text-sm">No messages</p>
        <p className="text-gray-400 text-xs mt-1">Your secure inbox is empty.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {messages.map((message, index) => {
        const isSelected = selectedId === message.id;
        const isUnread = unreadIds.has(message.id);

        const displayName =
          view === "inbox" || view === "vault" || view === "archived"
            ? message.sender.name || message.sender.email
            : message.recipients
                ?.filter((r) => r.role === "TO")
                .map((r) => r.user.name || r.user.email)
                .join(", ") || "Recipient";

        const initial = displayName.charAt(0).toUpperCase();
        const avatarColor = getAvatarColor(displayName);
        const fileCount = message.documents.length;
        const hasCc = message.recipients?.some((r) => r.role === "CC");

        const isBulkSelected = selectedIds.has(message.id);

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.015, duration: 0.18 }}
            key={message.id}
            className={cn(
              "flex items-start gap-3.5 px-4 py-4 transition-colors w-full relative group",
              isSelected ? "bg-blue-50" : isBulkSelected ? "bg-blue-50/60" : "hover:bg-gray-50/80"
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="list-indicator"
                className="absolute left-0 top-0 h-full w-[3px] bg-blue-600 rounded-r-full"
              />
            )}

            {/* Checkbox (shown on hover or when any selection exists) */}
            {onToggleSelect && (
              <div
                className={cn(
                  "absolute left-2 top-1/2 -translate-y-1/2 z-10 transition-opacity",
                  isBulkSelected || selectedIds.size > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => { e.stopPropagation(); onToggleSelect(message.id); }}
              >
                <div className={cn(
                  "h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all",
                  isBulkSelected ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white hover:border-blue-400"
                )}>
                  {isBulkSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>
              </div>
            )}

            {/* Clickable area */}
            <button
              onClick={() => onSelect(message.id)}
              className="flex items-start gap-3.5 flex-1 text-left min-w-0"
            >

            {/* Avatar with unread indicator */}
            <div className="relative shrink-0 mt-0.5">
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white",
                  avatarColor
                )}
              >
                {initial}
              </div>
              {isUnread && (
                <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-600 border-2 border-white" />
              )}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span
                  className={cn(
                    "text-sm font-semibold truncate",
                    isSelected ? "text-blue-700" : "text-gray-900"
                  )}
                >
                  {displayName}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                  {formatTime(new Date(message.createdAt))}
                </span>
              </div>

              <p
                className={cn(
                  "text-xs truncate mb-1.5",
                  isSelected ? "text-blue-600 font-medium" : isUnread ? "text-gray-900 font-bold" : "text-gray-700 font-medium"
                )}
              >
                {message.subject || "(No Subject)"}
              </p>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-gray-400 truncate italic">
                  Encrypted payload
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  {hasCc && (
                    <span className="text-[9px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider border border-gray-200">
                      CC
                    </span>
                  )}
                  {fileCount > 0 && (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
                        isSelected
                          ? "bg-blue-100 text-blue-600 border-blue-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      )}
                    >
                      <Paperclip className="h-2.5 w-2.5" />
                      {fileCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
            </button>
          </motion.div>
        );
      })}

      {hasMore && (
        <div ref={loadMoreRef} className="p-6 flex justify-center">
          {isLoadingMore
            ? <div className="h-1 w-8 rounded-full bg-blue-300 animate-pulse" />
            : <div className="h-1 w-8 rounded-full bg-gray-200" />}
        </div>
      )}
    </div>
  );
}
