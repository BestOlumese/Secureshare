"use client";

import { useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { Message } from "./DashboardUI";
import { cn } from "@/lib/utils";
import { Paperclip, Check, Lock, Archive, Trash2 } from "lucide-react";
import { loadMoreMessages } from "@/app/actions/documents";
import { avatarColor, avatarInitial } from "@/lib/avatar";

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
  /** Subjects decrypted during this session, keyed by message id. */
  decryptedSubjects?: Record<string, string>;
  onLoadMore?: (newMessages: Message[]) => void;
  hasMore?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function MessageList({
  messages,
  selectedId,
  onSelect,
  view,
  unreadIds = new Set(),
  decryptedSubjects = {},
  onLoadMore,
  hasMore = false,
  selectedIds = new Set(),
  onToggleSelect,
  onArchive,
  onDelete,
}: MessageListProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    setIsLoadingMore(true);
    try {
      const cursor = messages[messages.length - 1].id;
      const more = await loadMoreMessages({ view, cursor });
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

  return (
    <div className="flex flex-col">
      {messages.map((message) => {
        const isSelected = selectedId === message.id;
        const isUnread = unreadIds.has(message.id);
        const isBulkSelected = selectedIds.has(message.id);

        const displayName =
          view === "sent"
            ? message.recipients
                ?.filter((r) => r.role === "TO")
                .map((r) => r.user.name || r.user.email)
                .join(", ") || "Recipient"
            : message.sender.name || message.sender.email;

        // Only ever a subject this session decrypted — never read from the DB.
        const subject = decryptedSubjects[message.id];
        const fileCount = message.documents.length;
        const ccCount = message.recipients?.filter((r) => r.role === "CC").length ?? 0;

        return (
          <div
            key={message.id}
            className={cn(
              "group relative flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-gray-100 transition-colors cursor-pointer",
              isSelected ? "bg-blue-50"
                : isBulkSelected ? "bg-blue-50/50"
                : isUnread ? "bg-white hover:bg-gray-50"
                : "bg-gray-50/40 hover:bg-gray-50"
            )}
            onClick={() => onSelect(message.id)}
          >
            {/* Selection checkbox */}
            {onToggleSelect && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSelect(message.id); }}
                aria-label={isBulkSelected ? "Deselect message" : "Select message"}
                className={cn(
                  "h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-all",
                  isBulkSelected
                    ? "bg-blue-600 border-blue-600"
                    : "border-gray-300 hover:border-blue-400"
                )}
              >
                {isBulkSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </button>
            )}

            <div
              className={cn(
                "h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-medium",
                avatarColor(displayName)
              )}
            >
              {avatarInitial(displayName)}
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn("text-sm truncate", isUnread ? "font-semibold text-gray-900" : "text-gray-700")}>
                {displayName}
              </p>

              {/* No subject to show until it's decrypted, so this line carries
                  what we actually know rather than the word "Encrypted" twice. */}
              <div className="flex items-center gap-2 text-sm text-gray-500 min-w-0">
                {subject ? (
                  <span className="truncate">{subject}</span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-400 shrink-0">
                    <Lock className="h-3 w-3" />
                    Locked
                  </span>
                )}
                {fileCount > 0 && (
                  <span className="flex items-center gap-1 shrink-0 text-gray-400">
                    <Paperclip className="h-3 w-3" />
                    {fileCount}
                  </span>
                )}
                {ccCount > 0 && (
                  <span className="shrink-0 text-gray-400">Cc {ccCount}</span>
                )}
              </div>
            </div>

            {/* Date, swapped for actions on hover. Always shown on touch, where
                there is no hover to reveal them. */}
            <div className="shrink-0 relative flex items-center">
              <span
                className={cn(
                  "text-sm tabular-nums transition-opacity",
                  isUnread ? "text-gray-900 font-medium" : "text-gray-400",
                  (onArchive || onDelete) && "sm:group-hover:opacity-0"
                )}
              >
                {formatTime(new Date(message.createdAt))}
              </span>

              {(onArchive || onDelete) && (
                <div className="absolute right-0 hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onArchive && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onArchive(message.id); }}
                      title="Archive"
                      aria-label="Archive message"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-900 transition-colors"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(message.id); }}
                      title="Delete"
                      aria-label="Delete message"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {hasMore && (
        <div ref={loadMoreRef} className="py-4 text-center">
          <span className="text-sm text-gray-400">
            {isLoadingMore ? "Loading..." : " "}
          </span>
        </div>
      )}
    </div>
  );
}
