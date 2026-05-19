"use client";

import { Message } from "./DashboardUI";
import { format } from "date-fns";
import {
  Paperclip, ShieldCheck, ChevronLeft, Lock, X,
  Trash2, Archive, Loader2, Building2, FileText,
  CornerUpLeft, CornerUpRight, Image, Video, Music, FileArchive,
  FileSpreadsheet, FileCode, File, Eye, EyeOff, CheckCircle2, Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import DecryptButton from "./DecryptButton";
import DecryptMessageText from "./DecryptMessageText";
import { deleteMessageForUser, toggleArchiveMessage } from "@/app/actions/documents";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MessageViewProps {
  message: Message;
  onClose?: () => void;
  onDeleted?: (messageId: string) => void;
  onArchived?: (messageId: string) => void;
  onUnarchived?: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  isVaultView?: boolean;
  isArchivedView?: boolean;
  isSentView?: boolean;
}

const AVATAR_PALETTE = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-700",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-700",
  "from-cyan-500 to-blue-600",
];
function getGradient(str: string) {
  return AVATAR_PALETTE[str.charCodeAt(0) % AVATAR_PALETTE.length];
}

function fileIcon(contentType: string | null) {
  const t = contentType || "";
  if (t.startsWith("image/")) return <Image className="h-4 w-4 sm:h-5 sm:w-5" />;
  if (t.startsWith("video/")) return <Video className="h-4 w-4 sm:h-5 sm:w-5" />;
  if (t.startsWith("audio/")) return <Music className="h-4 w-4 sm:h-5 sm:w-5" />;
  if (t === "application/pdf") return <FileText className="h-4 w-4 sm:h-5 sm:w-5" />;
  if (t.includes("zip") || t.includes("tar") || t.includes("rar") || t.includes("7z"))
    return <FileArchive className="h-4 w-4 sm:h-5 sm:w-5" />;
  if (t.includes("spreadsheet") || t.includes("excel") || t.includes("csv"))
    return <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />;
  if (t.startsWith("text/") || t.includes("json") || t.includes("xml") || t.includes("javascript"))
    return <FileCode className="h-4 w-4 sm:h-5 sm:w-5" />;
  if (t.includes("word") || t.includes("document"))
    return <FileText className="h-4 w-4 sm:h-5 sm:w-5" />;
  return <File className="h-4 w-4 sm:h-5 sm:w-5" />;
}

export default function MessageView({ message, onClose, onDeleted, onArchived, onUnarchived, onReply, onForward, isVaultView = false, isArchivedView = false, isSentView = false }: MessageViewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    try {
      await deleteMessageForUser(message.id);
      toast.success("Message removed from your inbox.");
      onDeleted?.(message.id);
      onClose?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete message.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleArchive() {
    setIsArchiving(true);
    setShowArchiveConfirm(false);
    try {
      const result = await toggleArchiveMessage(message.id);
      if (result.archived) {
        toast.success("Message archived.");
        onArchived?.(message.id);
      } else {
        toast.success("Message moved back to inbox.");
        onUnarchived?.(message.id);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to archive message.");
    } finally {
      setIsArchiving(false);
    }
  }

  const senderInitial = (message.sender?.name || message.sender?.email || "U").charAt(0).toUpperCase();
  const gradient = getGradient(message.sender?.email || "U");

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative flex flex-col w-full h-full overflow-hidden bg-white"
    >
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <ChevronLeft className="h-4 w-4 md:hidden" />
              <X className="h-4 w-4 hidden md:block" />
            </button>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck className="h-3 w-3" />
            <span>Secure Channel</span>
          </div>
        </div>

        {isVaultView ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase tracking-widest">
            <Building2 className="h-3 w-3" />
            Org Vault
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {onReply && (
              <button
                title="Reply"
                onClick={() => onReply(message)}
                className="flex items-center gap-1.5 h-8 rounded-lg px-2.5 text-xs font-semibold text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <CornerUpLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Reply</span>
              </button>
            )}
            {onForward && (
              <button
                title="Forward"
                onClick={() => onForward(message)}
                className="flex items-center gap-1.5 h-8 rounded-lg px-2.5 text-xs font-semibold text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <CornerUpRight className="h-4 w-4" />
                <span className="hidden sm:inline">Forward</span>
              </button>
            )}
            <button
              title={isArchivedView ? "Move to Inbox" : "Archive"}
              onClick={() => setShowArchiveConfirm(true)}
              disabled={isArchiving}
              className={cn(
                "flex items-center gap-1.5 h-8 rounded-lg px-2.5 text-xs font-semibold transition-colors disabled:opacity-50",
                isArchivedView
                  ? "text-blue-600 hover:bg-blue-50 border border-blue-200"
                  : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
              )}
            >
              {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              {isArchivedView && <span>Move to Inbox</span>}
            </button>
            <button
              title="Delete"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-gray-50/50">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Subject + Date */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight mb-1">
              {message.subject || "(No Subject)"}
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              {format(new Date(message.createdAt), "EEEE, MMMM do yyyy 'at' HH:mm")}
            </p>
          </div>

          {/* Sender / Recipients Card */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-200">
            <div className={cn(
              "h-10 w-10 rounded-xl bg-linear-to-br flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md",
              gradient
            )}>
              {senderInitial}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="font-bold text-gray-900 text-sm truncate">{message.sender?.name || message.sender?.email}</span>
                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-widest shrink-0">
                  Sender
                </span>
              </div>

              <div className="space-y-1 text-xs">
                {(message.recipients?.filter((r) => r.role === "TO").length ?? 0) > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px] shrink-0 pt-0.5 w-5">To</span>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {message.recipients?.filter((r) => r.role === "TO").map((r, i) => (
                        <span key={i} className="text-gray-700 font-medium">{r.user.email}</span>
                      ))}
                    </div>
                  </div>
                )}
                {message.recipients?.some((r) => r.role === "CC") && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px] shrink-0 pt-0.5 w-5">Cc</span>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {message.recipients?.filter((r) => r.role === "CC").map((r, i) => (
                        <span key={i} className="text-gray-500 font-medium">{r.user.email}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Read Receipts — shown in Sent view */}
          {isSentView && message.recipients && message.recipients.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Read Receipts</h4>
              <div className="space-y-2">
                {message.recipients.filter((r) => r.role === "TO" || r.role === "CC").map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                      r.readAt ? "bg-emerald-50 text-emerald-500" : "bg-gray-100 text-gray-400"
                    )}>
                      {r.readAt ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{r.user.name || r.user.email}</p>
                      {r.role === "CC" && (
                        <span className="text-[9px] font-bold text-gray-400 uppercase">CC</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {r.readAt ? (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-[10px] font-bold">
                            {format(new Date(r.readAt), "MMM d, HH:mm")}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span className="text-[10px] font-medium">Not yet read</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Body */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 relative">
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-[10px] font-bold text-gray-500">
              <Lock className="h-2.5 w-2.5" />
              E2EE
            </div>
            <div className="prose prose-slate max-w-none pt-2">
              <DecryptMessageText messageId={message.id} />
            </div>
          </div>

          {/* Attachments */}
          {message.documents.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
                  Attachments
                </h4>
                <div className="h-px flex-1 bg-gray-200" />
                <span className="flex items-center gap-1 text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                  <Paperclip className="h-2.5 w-2.5" />
                  {message.documents.length}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {message.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 p-4 rounded-xl bg-white border border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {fileIcon(doc.contentType)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate group-hover:text-gray-900 transition-colors">
                          {doc.fileName || "Secure File"}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                          {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "Encrypted"}
                        </p>
                      </div>
                    </div>
                    <DecryptButton docId={doc.id} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </motion.div>

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 mx-4 max-w-sm w-full"
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 mx-auto mb-4">
              <Archive className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">
              {isArchivedView ? "Move to inbox?" : "Archive message?"}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {isArchivedView
                ? "This message will be moved back to your inbox."
                : "This message will be moved to your archive. You can restore it anytime."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={isArchiving}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isArchivedView ? "Move to Inbox" : "Archive"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal — fixed so it covers the full page */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 mx-4 max-w-sm w-full"
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-red-50 border border-red-100 mx-auto mb-4">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Delete message?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will remove the message from your inbox. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
