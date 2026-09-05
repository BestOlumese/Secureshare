"use client";

import { Message } from "./DashboardUI";
import { format } from "date-fns";
import {
  ArrowLeft, Lock, Trash2, Archive, Loader2, Building2, FileText,
  CornerUpLeft, CornerUpRight, Image as ImageIcon, Video, Music, FileArchive,
  FileSpreadsheet, FileCode, File,
} from "lucide-react";
import { motion } from "framer-motion";
import DecryptButton from "./DecryptButton";
import DecryptMessageText from "./DecryptMessageText";
import { deleteMessageForUser, toggleArchiveMessage } from "@/app/actions/documents";
import { tryDecryptString } from "@/lib/crypto-client";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { avatarColor, avatarInitial } from "@/lib/avatar";
import { getErrorMessage } from "@/lib/utils";

interface MessageViewProps {
  message: Message;
  onClose?: () => void;
  onDeleted?: (messageId: string) => void;
  onArchived?: (messageId: string) => void;
  onUnarchived?: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onSubjectDecrypted?: (subject: string) => void;
  isVaultView?: boolean;
  isArchivedView?: boolean;
  isSentView?: boolean;
}

function fileIcon(contentType: string | null) {
  const t = contentType || "";
  if (t.startsWith("image/")) return <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />;
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

export default function MessageView({ message, onClose, onDeleted, onArchived, onUnarchived, onReply, onForward, onSubjectDecrypted, isVaultView = false, isArchivedView = false, isSentView = false }: MessageViewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [decryptedSubject, setDecryptedSubject] = useState<string | null>(null);
  // Message AES key, set once the body is decrypted. Attachment names stay
  // hidden until then — they are stored encrypted just like the body.
  const [messageAesKey, setMessageAesKey] = useState<CryptoKey | null>(null);
  const [decryptedFileNames, setDecryptedFileNames] = useState<Record<string, string>>({});

  const archiveDialogRef = useModalA11y<HTMLDivElement>(showArchiveConfirm, () => setShowArchiveConfirm(false));
  const deleteDialogRef = useModalA11y<HTMLDivElement>(showDeleteConfirm, () => setShowDeleteConfirm(false));

  useEffect(() => {
    // Reset the unlocked state whenever a different message is opened.
    setDecryptedSubject(null);
    setMessageAesKey(null);
    setDecryptedFileNames({});
  }, [message.id]);

  useEffect(() => {
    if (!messageAesKey || message.documents.length === 0) return;
    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        message.documents.map(async (doc) => {
          // Legacy documents stored the name in plaintext — fall back to it.
          const name = (await tryDecryptString(doc.fileName, messageAesKey)) || doc.fileName || "Secure File";
          return [doc.id, name] as const;
        })
      );
      if (!cancelled) setDecryptedFileNames(Object.fromEntries(entries));
    })();

    return () => { cancelled = true; };
  }, [messageAesKey, message.documents]);

  async function handleDelete() {
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    try {
      await deleteMessageForUser(message.id);
      toast.success("Deleted");
      onDeleted?.(message.id);
      onClose?.();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Couldn't delete."));
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
        toast.success("Archived");
        onArchived?.(message.id);
      } else {
        toast.success("Moved to inbox");
        onUnarchived?.(message.id);
      }
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Couldn't archive."));
    } finally {
      setIsArchiving(false);
    }
  }

  const senderInitial = avatarInitial(message.sender?.name, message.sender?.email);
  const senderColor = avatarColor(message.sender?.email || "");

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex flex-col w-full h-full overflow-hidden bg-white"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 sm:px-4 h-14 border-b border-gray-100 shrink-0">
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Back to list"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        {isVaultView ? (
          <span className="ml-2 flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
            <Building2 className="h-3 w-3" />
            Org vault
          </span>
        ) : (
          <div className="ml-auto flex items-center gap-1">
            {onReply && (
              <button
                onClick={() => onReply(message)}
                title="Reply"
                aria-label="Reply to message"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <CornerUpLeft className="h-4 w-4" />
              </button>
            )}
            {onForward && (
              <button
                onClick={() => onForward(message)}
                title="Forward"
                aria-label="Forward message"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <CornerUpRight className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setShowArchiveConfirm(true)}
              disabled={isArchiving}
              title={isArchivedView ? "Move to inbox" : "Archive"}
              aria-label={isArchivedView ? "Move message to inbox" : "Archive message"}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              title="Delete"
              aria-label="Delete message"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Message */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6">

          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-snug">
            {decryptedSubject ?? (
              <span className="flex items-center gap-2 text-gray-400">
                <Lock className="h-4 w-4 shrink-0" />
                Encrypted subject
              </span>
            )}
          </h1>

          {/* Sender line — flat, the way a mail client shows it */}
          <div className="flex items-start gap-3 mt-5 pb-5 border-b border-gray-100">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
              senderColor
            )}>
              {senderInitial}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {message.sender?.name || message.sender?.email}
                </p>
                <time
                  dateTime={new Date(message.createdAt).toISOString()}
                  title={format(new Date(message.createdAt), "PPpp")}
                  className="text-sm text-gray-400 shrink-0"
                >
                  {format(new Date(message.createdAt), "MMM d, HH:mm")}
                </time>
              </div>

              <p className="text-sm text-gray-500 truncate">
                to {message.recipients?.filter((r) => r.role === "TO").map((r) => r.user.email).join(", ") || "—"}
              </p>
              {message.recipients?.some((r) => r.role === "CC") && (
                <p className="text-sm text-gray-400 truncate">
                  cc {message.recipients.filter((r) => r.role === "CC").map((r) => r.user.email).join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Read receipts — only meaningful on a message you sent */}
          {isSentView && message.recipients && message.recipients.length > 0 && (
            <div className="py-5 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Read by</h2>
              <div className="space-y-2">
                {message.recipients
                  .filter((r) => r.role === "TO" || r.role === "CC")
                  .map((r, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="flex-1 min-w-0 truncate text-gray-700">
                        {r.user.name || r.user.email}
                        {r.role === "CC" && <span className="text-gray-400"> · cc</span>}
                      </span>
                      {r.readAt ? (
                        <span className="shrink-0 text-emerald-700">
                          {format(new Date(r.readAt), "MMM d, HH:mm")}
                        </span>
                      ) : (
                        <span className="shrink-0 text-gray-400">Not yet</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="py-6">
            <DecryptMessageText
              key={message.id}
              messageId={message.id}
              onSubjectDecrypted={(s) => {
                setDecryptedSubject(s);
                onSubjectDecrypted?.(s);
              }}
              onAesKey={setMessageAesKey}
            />
          </div>

          {/* Attachments */}
          {message.documents.length > 0 && (
            <div className="pt-5 border-t border-gray-100">
              <h2 className="text-sm font-medium text-gray-900 mb-3">
                {message.documents.length} {message.documents.length === 1 ? "attachment" : "attachments"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {message.documents.map((doc) => {
                  const revealedName = decryptedFileNames[doc.id];
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        revealedName ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"
                      )}>
                        {revealedName ? fileIcon(doc.contentType) : <Lock className="h-4 w-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "text-sm truncate",
                          revealedName ? "text-gray-900" : "text-gray-400"
                        )}>
                          {revealedName ?? "Encrypted name"}
                        </p>
                        <p className="text-sm text-gray-400">
                          {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : "Encrypted"}
                        </p>
                      </div>

                      <DecryptButton
                        docId={doc.id}
                        aesKey={messageAesKey}
                        onFileNameDecrypted={(name) =>
                          setDecryptedFileNames((prev) => ({ ...prev, [doc.id]: name }))
                        }
                      />
                    </div>
                  );
                })}
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
            ref={archiveDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-dialog-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 mx-4 max-w-sm w-full outline-none"
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 mx-auto mb-4">
              <Archive className="h-5 w-5 text-blue-500" />
            </div>
            <h3 id="archive-dialog-title" className="text-base font-bold text-gray-900 text-center mb-1">
              {isArchivedView ? "Move to inbox?" : "Archive message?"}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {isArchivedView ? "It goes back to your inbox." : "You can restore it anytime."}
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
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 mx-4 max-w-sm w-full outline-none"
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-red-50 border border-red-100 mx-auto mb-4">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h3 id="delete-dialog-title" className="text-base font-bold text-gray-900 text-center mb-1">Delete this message?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Removes it from your inbox. Can&apos;t be undone.
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
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
