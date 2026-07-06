"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Search, Plus, User, Mail, Send, Building2, ShieldCheck, Archive, RefreshCw, Trash2, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MessageList from "./MessageList";
import MessageView from "./MessageView";
import Sidebar, { DashboardView } from "./Sidebar";
import ComposeModal from "./ComposeModal";
import Link from "next/link";
import { markMessageRead, fetchNewMessages, deleteMessageForUser, toggleArchiveMessage, markAllMessagesRead } from "@/app/actions/documents";
import { toast } from "sonner";

export type Message = {
  id: string;
  senderId: string;
  subject: string | null;
  content: string | null;
  createdAt: Date;
  sender: { email: string; name: string };
  recipients?: Array<{ user: { email: string; name: string }; role: string; readAt?: Date | null }>;
  documents: Array<{
    id: string;
    fileName: string | null;
    fileUrl: string | null;
    fileSize: number | null;
    contentType: string | null;
  }>;
};

const PAGE_SIZE = 50;

const VIEW_LABELS: Record<DashboardView, string> = {
  inbox: "Inbox",
  sent: "Sent",
  archived: "Archived",
  vault: "Org Vault",
};

const VIEW_EMPTY: Record<DashboardView, { title: string; body: string }> = {
  inbox: { title: "Select a message", body: "Choose a secure message from the list to read its contents." },
  sent: { title: "Select a message", body: "View a message you sent to see its recipients and status." },
  archived: { title: "Nothing selected", body: "Select an archived message to view or restore it." },
  vault: { title: "Organization Vault", body: "Select a message to decrypt it using your Org Security Password." },
};

interface DashboardUIProps {
  user: any;
  initialReceived: any[];
  initialSent: any[];
  initialArchived: any[];
  initialOrgVault?: any[];
}

export default function DashboardUI({
  user,
  initialReceived,
  initialSent,
  initialArchived,
  initialOrgVault = [],
}: DashboardUIProps) {
  const [view, setView] = useState<DashboardView>("inbox");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [decryptedSubjects, setDecryptedSubjects] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<"delete" | "archive" | "unarchive" | null>(null);
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null);
  const [keyboardConfirm, setKeyboardConfirm] = useState<{ type: "delete" | "archive"; messageId: string } | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const lastRefreshRef = useRef<Date>(new Date());

  const [received, setReceived] = useState<Message[]>(initialReceived);
  const [sent, setSent] = useState<Message[]>(initialSent);
  const [archived, setArchived] = useState<Message[]>(initialArchived);
  const [orgVault] = useState<Message[]>(initialOrgVault);

  // Track which message IDs the current user has NOT read yet (only for inbox)
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    initialReceived.forEach((m: any) => {
      const rec = m.recipients?.find((r: any) => r.userId === user.id || r.user?.email === user.email);
      if (rec?.readAt) s.add(m.id);
    });
    return s;
  });

  // Track hasMore per view
  const [hasMore, setHasMore] = useState<Record<DashboardView, boolean>>({
    inbox: initialReceived.length === PAGE_SIZE,
    sent: initialSent.length === PAGE_SIZE,
    archived: initialArchived.length === PAGE_SIZE,
    vault: initialOrgVault.length === PAGE_SIZE,
  });

  const messages =
    view === "inbox" ? received :
    view === "sent" ? sent :
    view === "archived" ? archived :
    orgVault;

  const filteredMessages = messages.filter(
    (m) =>
      m.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sender.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sender.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadIds = new Set(
    received.filter((m) => !readIds.has(m.id)).map((m) => m.id)
  );
  const unreadCount = unreadIds.size;

  const selectedMessage = messages.find((m) => m.id === selectedMessageId) || null;
  const isVaultView = view === "vault";

  const handleSelect = useCallback(async (id: string) => {
    setSelectedMessageId(id);
    if (view === "inbox" && !readIds.has(id)) {
      setReadIds((prev) => new Set([...prev, id]));
      try { await markMessageRead(id); } catch {}
    }
  }, [view, readIds]);

  function handleDeleted(messageId: string) {
    setReceived((prev) => prev.filter((m) => m.id !== messageId));
    setSent((prev) => prev.filter((m) => m.id !== messageId));
    setArchived((prev) => prev.filter((m) => m.id !== messageId));
    setSelectedMessageId(null);
  }

  function handleArchived(messageId: string) {
    const msg = received.find((m) => m.id === messageId);
    setReceived((prev) => prev.filter((m) => m.id !== messageId));
    if (msg) setArchived((prev) => [msg, ...prev]);
    setSelectedMessageId(null);
  }

  function handleUnarchived(messageId: string) {
    const msg = archived.find((m) => m.id === messageId);
    setArchived((prev) => prev.filter((m) => m.id !== messageId));
    if (msg) setReceived((prev) => [msg, ...prev]);
    setSelectedMessageId(null);
  }

  function handleLoadMore(newMessages: Message[]) {
    if (view === "inbox") setReceived((prev) => [...prev, ...newMessages]);
    else if (view === "sent") setSent((prev) => [...prev, ...newMessages]);
    else if (view === "archived") setArchived((prev) => [...prev, ...newMessages]);
    setHasMore((prev) => ({ ...prev, [view]: newMessages.length === PAGE_SIZE }));
  }

  const changeView = (v: DashboardView) => {
    setView(v);
    setSelectedMessageId(null);
    setSearchQuery("");
    setBulkSelectedIds(new Set());
  };

  // Tab title with unread count
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) SecureShare` : "SecureShare";
    return () => { document.title = "SecureShare"; };
  }, [unreadCount]);

  // Poll for new messages every 30 seconds
  const refreshMessages = useCallback(async (silent = true) => {
    if (!silent) setIsRefreshing(true);
    try {
      const after = lastRefreshRef.current.toISOString();
      lastRefreshRef.current = new Date();
      const [newInbox, newSent] = await Promise.all([
        fetchNewMessages({ view: "inbox", after }),
        fetchNewMessages({ view: "sent", after }),
      ]);
      if (newInbox.length > 0) {
        setReceived((prev) => [...(newInbox as Message[]), ...prev]);
        if (silent) toast.info(`${newInbox.length} new message${newInbox.length > 1 ? "s" : ""}`);
      }
      if (newSent.length > 0) {
        setSent((prev) => [...(newSent as Message[]), ...prev]);
      }
    } catch {} finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => refreshMessages(true), 30_000);
    return () => clearInterval(interval);
  }, [refreshMessages]);

  // Keyboard shortcuts: j/k=navigate, c=compose, r=reply, e=archive, #=delete, Escape=close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || (e.target as HTMLElement).isContentEditable) return;
      if (isComposeOpen) return;

      const currentIdx = selectedMessageId
        ? filteredMessages.findIndex((m) => m.id === selectedMessageId)
        : -1;

      switch (e.key) {
        case "j": {
          e.preventDefault();
          const next = filteredMessages[currentIdx + 1];
          if (next) handleSelect(next.id);
          break;
        }
        case "k": {
          e.preventDefault();
          if (currentIdx > 0) handleSelect(filteredMessages[currentIdx - 1].id);
          break;
        }
        case "c":
          if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); setIsComposeOpen(true); }
          break;
        case "Escape":
          if (selectedMessageId) setSelectedMessageId(null);
          break;
        case "r":
          if (selectedMessage && view !== "vault" && view !== "sent") handleReply(selectedMessage);
          break;
        case "e":
          if (selectedMessageId && view !== "vault" && view !== "sent") {
            e.preventDefault();
            setKeyboardConfirm({ type: "archive", messageId: selectedMessageId });
          }
          break;
        case "#":
          if (selectedMessageId && view !== "vault") {
            setKeyboardConfirm({ type: "delete", messageId: selectedMessageId });
          }
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredMessages, selectedMessageId, selectedMessage, isComposeOpen, view, handleSelect]);

  function handleReply(message: Message) {
    setReplyTarget(message);
    setForwardTarget(null);
    setIsComposeOpen(true);
  }

  function handleForward(message: Message) {
    setForwardTarget(message);
    setReplyTarget(null);
    setIsComposeOpen(true);
  }

  async function handleMarkAllRead() {
    setIsMarkingAllRead(true);
    try {
      await markAllMessagesRead();
      setReadIds(new Set(received.map((m) => m.id)));
      toast.success("All messages marked as read.");
    } catch {
      toast.error("Failed to mark messages as read.");
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  async function handleKeyboardArchive(messageId: string) {
    setKeyboardConfirm(null);
    try {
      const result = await toggleArchiveMessage(messageId);
      if (result.archived) {
        handleArchived(messageId);
      } else {
        handleUnarchived(messageId);
      }
    } catch { toast.error("Failed to archive message."); }
  }

  async function handleKeyboardDelete(messageId: string) {
    setKeyboardConfirm(null);
    try {
      await deleteMessageForUser(messageId);
      handleDeleted(messageId);
      toast.success("Message deleted.");
    } catch { toast.error("Failed to delete message."); }
  }

  function handleToggleSelect(id: string) {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    if (bulkSelectedIds.size === filteredMessages.length) {
      setBulkSelectedIds(new Set());
    } else {
      setBulkSelectedIds(new Set(filteredMessages.map((m) => m.id)));
    }
  }

  async function handleBulkDelete() {
    setIsBulkActing(true);
    try {
      await Promise.allSettled([...bulkSelectedIds].map((id) => deleteMessageForUser(id)));
      const ids = bulkSelectedIds;
      setReceived((prev) => prev.filter((m) => !ids.has(m.id)));
      setSent((prev) => prev.filter((m) => !ids.has(m.id)));
      setArchived((prev) => prev.filter((m) => !ids.has(m.id)));
      if (selectedMessageId && ids.has(selectedMessageId)) setSelectedMessageId(null);
      setBulkSelectedIds(new Set());
      toast.success(`${ids.size} message${ids.size > 1 ? "s" : ""} deleted.`);
    } catch { toast.error("Some messages could not be deleted."); }
    finally { setIsBulkActing(false); }
  }

  async function handleBulkArchive() {
    setIsBulkActing(true);
    try {
      await Promise.allSettled([...bulkSelectedIds].map((id) => toggleArchiveMessage(id)));
      const ids = bulkSelectedIds;
      const toArchive = received.filter((m) => ids.has(m.id));
      setReceived((prev) => prev.filter((m) => !ids.has(m.id)));
      setArchived((prev) => [...toArchive, ...prev]);
      if (selectedMessageId && ids.has(selectedMessageId)) setSelectedMessageId(null);
      setBulkSelectedIds(new Set());
      toast.success(`${ids.size} message${ids.size > 1 ? "s" : ""} archived.`);
    } catch { toast.error("Some messages could not be archived."); }
    finally { setIsBulkActing(false); }
  }

  async function handleBulkUnarchive() {
    setIsBulkActing(true);
    try {
      await Promise.allSettled([...bulkSelectedIds].map((id) => toggleArchiveMessage(id)));
      const ids = bulkSelectedIds;
      const toInbox = archived.filter((m) => ids.has(m.id));
      setArchived((prev) => prev.filter((m) => !ids.has(m.id)));
      setReceived((prev) => [...toInbox, ...prev]);
      if (selectedMessageId && ids.has(selectedMessageId)) setSelectedMessageId(null);
      setBulkSelectedIds(new Set());
      toast.success(`${ids.size} message${ids.size > 1 ? "s" : ""} moved to inbox.`);
    } catch { toast.error("Some messages could not be moved."); }
    finally { setIsBulkActing(false); }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar (Desktop) */}
        <div className="hidden md:flex">
          <Sidebar
            currentView={view}
            setView={changeView}
            user={user}
            unreadCount={unreadCount}
          />
        </div>

        <div className="flex flex-1 overflow-hidden relative">

          {/* Message List Panel */}
          <div
            className={cn(
              "flex w-full md:w-[320px] lg:w-[380px] flex-col border-r border-gray-200 bg-white shrink-0",
              selectedMessageId ? "hidden md:flex" : "flex"
            )}
          >
            <div className="px-5 py-5 border-b border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <h1 className="text-xl font-bold text-gray-900">{VIEW_LABELS[view]}</h1>
                  {filteredMessages.length > 0 && (
                    <span className="text-xs font-bold text-gray-400 tabular-nums">
                      {filteredMessages.length}{hasMore[view] ? "+" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {view === "inbox" && unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={isMarkingAllRead}
                      title="Mark all as read"
                      className="flex h-9 items-center justify-center rounded-xl border border-gray-200 px-2.5 text-xs font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-40 gap-1.5"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">All read</span>
                    </button>
                  )}
                  <button
                    onClick={() => refreshMessages(false)}
                    disabled={isRefreshing}
                    title="Check for new messages"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-40"
                  >
                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  </button>
                  <button
                    onClick={() => setIsComposeOpen(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/30 hover:scale-105 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-400 transition-all"
                />
              </div>

              {/* Bulk action toolbar */}
              <AnimatePresence>
                {bulkSelectedIds.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-2"
                  >
                    <button onClick={handleSelectAll} className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                      <CheckSquare className="h-3.5 w-3.5" />
                      {bulkSelectedIds.size} selected
                    </button>
                    <div className="flex items-center gap-2">
                      {view === "archived" ? (
                        <button
                          onClick={() => setBulkConfirm("unarchive")}
                          disabled={isBulkActing}
                          className="flex items-center gap-1 rounded-lg bg-white border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          Move to Inbox
                        </button>
                      ) : view !== "sent" ? (
                        <button
                          onClick={() => setBulkConfirm("archive")}
                          disabled={isBulkActing}
                          className="flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          Archive
                        </button>
                      ) : null}
                      <button
                        onClick={() => setBulkConfirm("delete")}
                        disabled={isBulkActing}
                        className="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <MessageList
                messages={filteredMessages}
                selectedId={selectedMessageId}
                onSelect={handleSelect}
                view={view}
                unreadIds={view === "inbox" ? unreadIds : undefined}
                onLoadMore={handleLoadMore}
                hasMore={!searchQuery && hasMore[view]}
                selectedIds={bulkSelectedIds}
                onToggleSelect={view !== "vault" ? handleToggleSelect : undefined}
              />
            </div>
          </div>

          {/* Message Detail */}
          <div
            className={cn(
              "flex-1 overflow-hidden",
              selectedMessageId ? "flex" : "hidden md:flex"
            )}
          >
            <AnimatePresence mode="wait">
              {selectedMessage ? (
                <MessageView
                  key={selectedMessage.id}
                  message={selectedMessage}
                  onClose={() => setSelectedMessageId(null)}
                  onDeleted={handleDeleted}
                  onArchived={handleArchived}
                  onUnarchived={handleUnarchived}
                  onReply={view !== "vault" && view !== "sent" ? handleReply : undefined}
                  onForward={view !== "vault" ? handleForward : undefined}
                  onSubjectDecrypted={(s) => setDecryptedSubjects(prev => ({ ...prev, [selectedMessage.id]: s }))}
                  isSentView={view === "sent"}
                  isVaultView={isVaultView}
                  isArchivedView={view === "archived"}
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hidden md:flex h-full w-full flex-col items-center justify-center bg-gray-50/50"
                >
                  <div className="text-center max-w-xs px-6">
                    <div className="relative inline-block mb-5">
                      <div className="relative h-16 w-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm mx-auto">
                        {isVaultView ? <Building2 className="h-7 w-7 text-blue-300" />
                          : view === "archived" ? <Archive className="h-7 w-7 text-gray-300" />
                          : <Mail className="h-7 w-7 text-gray-300" />}
                      </div>
                    </div>
                    <h3 className="text-base font-semibold text-gray-700 mb-1.5">
                      {VIEW_EMPTY[view].title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {VIEW_EMPTY[view].body}
                    </p>
                    {view === "inbox" && (
                      <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                        <ShieldCheck className="h-3 w-3" />
                        All messages are end-to-end encrypted
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden flex items-center justify-around py-2.5 px-4 border-t border-gray-200 bg-white shrink-0">
        {([
          { id: "inbox", label: "Inbox", icon: Mail },
          { id: "sent", label: "Sent", icon: Send },
          { id: "archived", label: "Archive", icon: Archive },
          ...((user.role === "OWNER" || user.role === "ADMIN")
            ? [{ id: "vault", label: "Vault", icon: Building2 }]
            : []),
        ] as { id: DashboardView; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => changeView(id)}
            className={cn(
              "relative flex flex-col items-center gap-1 transition-colors",
              view === id ? "text-blue-600" : "text-gray-400"
            )}
          >
            <Icon className="h-5 w-5" />
            {id === "inbox" && unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 h-4 min-w-[16px] rounded-full bg-blue-600 text-[9px] font-black text-white flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
          </button>
        ))}
        <Link href="/profile" className="flex flex-col items-center gap-1 text-gray-400">
          <User className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Profile</span>
        </Link>
      </div>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => { setIsComposeOpen(false); setReplyTarget(null); setForwardTarget(null); }}
        user={user}
        replyTo={replyTarget ? {
          email: replyTarget.sender.email,
          org: null,
          subject: decryptedSubjects[replyTarget.id] || "(Encrypted Message)",
        } : undefined}
        forwardSubject={forwardTarget ? (decryptedSubjects[forwardTarget.id] || "(Encrypted Message)") : undefined}
      />

      {/* Keyboard shortcut confirmation modal */}
      <AnimatePresence>
        {keyboardConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 mx-4 max-w-sm w-full"
            >
              <div className={cn(
                "flex items-center justify-center h-12 w-12 rounded-2xl mx-auto mb-4",
                keyboardConfirm.type === "delete" ? "bg-red-50 border border-red-100" : "bg-blue-50 border border-blue-100"
              )}>
                {keyboardConfirm.type === "delete"
                  ? <Trash2 className="h-5 w-5 text-red-500" />
                  : <Archive className="h-5 w-5 text-blue-500" />}
              </div>
              <h3 className="text-base font-bold text-gray-900 text-center mb-1">
                {keyboardConfirm.type === "delete" ? "Delete message?" : view === "archived" ? "Move to inbox?" : "Archive message?"}
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                {keyboardConfirm.type === "delete"
                  ? "This will permanently remove the message from your inbox."
                  : view === "archived"
                  ? "This message will be moved back to your inbox."
                  : "This message will be moved to your archive."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setKeyboardConfirm(null)}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => keyboardConfirm.type === "delete"
                    ? handleKeyboardDelete(keyboardConfirm.messageId)
                    : handleKeyboardArchive(keyboardConfirm.messageId)}
                  className={cn(
                    "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors",
                    keyboardConfirm.type === "delete" ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {keyboardConfirm.type === "delete" ? "Delete" : view === "archived" ? "Move to Inbox" : "Archive"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk action confirmation modal */}
      <AnimatePresence>
        {bulkConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 mx-4 max-w-sm w-full"
            >
              <div className={cn(
                "flex items-center justify-center h-12 w-12 rounded-2xl mx-auto mb-4",
                bulkConfirm === "delete" ? "bg-red-50 border border-red-100" : "bg-blue-50 border border-blue-100"
              )}>
                {bulkConfirm === "delete"
                  ? <Trash2 className="h-5 w-5 text-red-500" />
                  : <Archive className="h-5 w-5 text-blue-500" />}
              </div>
              <h3 className="text-base font-bold text-gray-900 text-center mb-1">
                {bulkConfirm === "delete"
                  ? `Delete ${bulkSelectedIds.size} message${bulkSelectedIds.size > 1 ? "s" : ""}?`
                  : bulkConfirm === "unarchive"
                  ? `Move ${bulkSelectedIds.size} message${bulkSelectedIds.size > 1 ? "s" : ""} to inbox?`
                  : `Archive ${bulkSelectedIds.size} message${bulkSelectedIds.size > 1 ? "s" : ""}?`}
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                {bulkConfirm === "delete"
                  ? "This will permanently remove these messages from your inbox."
                  : bulkConfirm === "unarchive"
                  ? "These messages will be moved back to your inbox."
                  : "These messages will be moved to your archive."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setBulkConfirm(null)}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const action = bulkConfirm;
                    setBulkConfirm(null);
                    if (action === "delete") handleBulkDelete();
                    else if (action === "unarchive") handleBulkUnarchive();
                    else handleBulkArchive();
                  }}
                  disabled={isBulkActing}
                  className={cn(
                    "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50",
                    bulkConfirm === "delete" ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {bulkConfirm === "delete" ? "Delete" : bulkConfirm === "unarchive" ? "Move to Inbox" : "Archive"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
