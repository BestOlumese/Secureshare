"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Search, User, Mail, Send, Building2, Archive, RefreshCw, Trash2, PenLine } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MessageList from "./MessageList";
import MessageView from "./MessageView";
import Sidebar, { DashboardView } from "./Sidebar";
import ComposeModal from "./ComposeModal";
import Link from "next/link";
import { markMessageRead, fetchNewMessages, deleteMessageForUser, toggleArchiveMessage, markAllMessagesRead } from "@/app/actions/documents";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { avatarColor, avatarInitial } from "@/lib/avatar";
import { useModalA11y } from "@/lib/use-modal-a11y";
import type { SessionUser } from "@/lib/types";

export type Message = {
  id: string;
  senderId: string;
  subject: string | null;
  content: string | null;
  createdAt: Date;
  sender: { email: string; name: string };
  recipients?: Array<{
    userId: string;
    user: { email: string; name: string };
    role: string;
    readAt?: Date | null;
  }>;
  // No fileUrl: the blob URL is fetched via getDocumentMetadata, which is
  // where the expiry and access checks run.
  documents: Array<{
    id: string;
    fileName: string | null;
    fileSize: number | null;
    contentType: string | null;
  }>;
};

const PAGE_SIZE = 50;

const VIEW_LABELS: Record<DashboardView, string> = {
  inbox: "Inbox",
  sent: "Sent",
  archived: "Archived",
  vault: "Org vault",
};

const VIEW_EMPTY: Record<DashboardView, { title: string; body: string }> = {
  inbox: { title: "Nothing in your inbox", body: "New messages will appear here." },
  sent: { title: "Nothing sent yet", body: "Messages you send will appear here." },
  archived: { title: "Nothing archived", body: "Archived messages will appear here." },
  vault: { title: "Nothing in the vault", body: "Messages shared with your organization appear here." },
};

interface DashboardUIProps {
  user: SessionUser;
  initialReceived: Message[];
  initialSent: Message[];
  initialArchived: Message[];
  initialOrgVault?: Message[];
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

  const keyboardDialogRef = useModalA11y<HTMLDivElement>(!!keyboardConfirm, () => setKeyboardConfirm(null));
  const bulkDialogRef = useModalA11y<HTMLDivElement>(!!bulkConfirm, () => setBulkConfirm(null));

  const hasVault = user.role === "OWNER" || user.role === "ADMIN";

  const [received, setReceived] = useState<Message[]>(initialReceived);
  const [sent, setSent] = useState<Message[]>(initialSent);
  const [archived, setArchived] = useState<Message[]>(initialArchived);
  const [orgVault, setOrgVault] = useState<Message[]>(initialOrgVault);

  // Track which message IDs the current user has NOT read yet (only for inbox)
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    initialReceived.forEach((m) => {
      const rec = m.recipients?.find((r) => r.userId === user.id || r.user?.email === user.email);
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

  // Subjects are stored encrypted, so search can only match ones this session
  // has already decrypted — plus the sender fields, which are plaintext.
  const query = searchQuery.trim().toLowerCase();
  const filteredMessages = !query
    ? messages
    : messages.filter(
        (m) =>
          decryptedSubjects[m.id]?.toLowerCase().includes(query) ||
          m.sender.name.toLowerCase().includes(query) ||
          m.sender.email.toLowerCase().includes(query) ||
          m.recipients?.some((r) =>
            (r.user.name || r.user.email).toLowerCase().includes(query)
          )
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
    else if (view === "vault") setOrgVault((prev) => [...prev, ...newMessages]);
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
      const [newInbox, newSent, newVault] = await Promise.all([
        fetchNewMessages({ view: "inbox", after }),
        fetchNewMessages({ view: "sent", after }),
        hasVault ? fetchNewMessages({ view: "vault", after }) : Promise.resolve([]),
      ]);
      if (newInbox.length > 0) {
        setReceived((prev) => [...(newInbox as Message[]), ...prev]);
        if (silent) toast.info(`${newInbox.length} new message${newInbox.length > 1 ? "s" : ""}`);
      }
      if (newSent.length > 0) {
        setSent((prev) => [...(newSent as Message[]), ...prev]);
      }
      if (newVault.length > 0) {
        setOrgVault((prev) => [...(newVault as Message[]), ...prev]);
      }
    } catch {} finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [hasVault]);

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
      toast.success("Marked as read");
    } catch {
      toast.error("Couldn't mark as read.");
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
    } catch { toast.error("Couldn't archive."); }
  }

  async function handleKeyboardDelete(messageId: string) {
    setKeyboardConfirm(null);
    try {
      await deleteMessageForUser(messageId);
      handleDeleted(messageId);
      toast.success("Deleted");
    } catch { toast.error("Couldn't delete."); }
  }

  function handleToggleSelect(id: string) {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    } catch { toast.error("Couldn't delete some of them."); }
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
    } catch { toast.error("Couldn't archive some of them."); }
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
    } catch { toast.error("Couldn't move some of them."); }
    finally { setIsBulkActing(false); }
  }

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 overflow-hidden font-sans">

      {/* Top bar — spans the full width so search stays reachable while reading */}
      <header className="flex items-center gap-3 sm:gap-6 border-b border-gray-200 px-4 sm:px-5 h-14 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Logo className="h-4 w-4" />
          </div>
          <span className="hidden sm:block font-semibold text-gray-900">SecureShare</span>
        </Link>

        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages"
            aria-label="Search messages"
            className="w-full rounded-lg bg-gray-100 py-2 pl-10 pr-4 text-sm placeholder:text-gray-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-transparent focus:border-gray-200 transition-all"
          />
        </div>

        <div className="ml-auto flex items-center gap-1 shrink-0">
          <button
            onClick={() => refreshMessages(false)}
            disabled={isRefreshing}
            title="Check for new"
            aria-label="Check for new messages"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </button>
          <Link
            href="/profile"
            title="Profile"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ml-1",
              avatarColor(user.email || "")
            )}
          >
            {avatarInitial(user.name, user.email)}
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <div className="hidden md:flex">
          <Sidebar
            currentView={view}
            setView={changeView}
            user={user}
            unreadCount={unreadCount}
            onCompose={() => setIsComposeOpen(true)}
          />
        </div>

        {/* One pane: reading a message replaces the list, as in Gmail */}
        <main className="flex flex-1 flex-col overflow-hidden">
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
            <>
              {/* List toolbar */}
              <div className="flex items-center gap-2 px-4 sm:px-5 h-12 border-b border-gray-100 shrink-0">
                <h1 className="text-sm font-medium text-gray-900">{VIEW_LABELS[view]}</h1>
                {filteredMessages.length > 0 && (
                  <span className="text-sm text-gray-400 tabular-nums">
                    {filteredMessages.length}{hasMore[view] && !searchQuery ? "+" : ""}
                  </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                  {view === "inbox" && unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={isMarkingAllRead}
                      className="rounded-lg px-2.5 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-40"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk action toolbar */}
              <AnimatePresence>
                {bulkSelectedIds.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-b border-blue-100 bg-blue-50 shrink-0"
                  >
                    <div className="flex items-center gap-2 px-4 sm:px-5 py-2">
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-700 hover:underline"
                      >
                        {bulkSelectedIds.size} selected
                      </button>
                      <div className="ml-auto flex items-center gap-1">
                        {view === "archived" ? (
                          <button
                            onClick={() => setBulkConfirm("unarchive")}
                            disabled={isBulkActing}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 hover:bg-white transition-colors disabled:opacity-50"
                          >
                            <Archive className="h-4 w-4" />
                            Move to inbox
                          </button>
                        ) : view !== "sent" ? (
                          <button
                            onClick={() => setBulkConfirm("archive")}
                            disabled={isBulkActing}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 hover:bg-white transition-colors disabled:opacity-50"
                          >
                            <Archive className="h-4 w-4" />
                            Archive
                          </button>
                        ) : null}
                        <button
                          onClick={() => setBulkConfirm("delete")}
                          disabled={isBulkActing}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 hover:bg-white hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredMessages.length === 0 && searchQuery ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <p className="text-sm text-gray-500">No matches for “{searchQuery}”</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Only senders and subjects you&apos;ve already opened can be searched.
                    </p>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                      {isVaultView ? <Building2 className="h-5 w-5 text-gray-400" />
                        : view === "archived" ? <Archive className="h-5 w-5 text-gray-400" />
                        : <Mail className="h-5 w-5 text-gray-400" />}
                    </div>
                    <p className="text-sm text-gray-500">{VIEW_EMPTY[view].title}</p>
                    <p className="text-sm text-gray-400 mt-1">{VIEW_EMPTY[view].body}</p>
                  </div>
                ) : (
                  <MessageList
                    messages={filteredMessages}
                    selectedId={selectedMessageId}
                    onSelect={handleSelect}
                    view={view}
                    unreadIds={view === "inbox" ? unreadIds : undefined}
                    decryptedSubjects={decryptedSubjects}
                    onLoadMore={handleLoadMore}
                    hasMore={!searchQuery && hasMore[view]}
                    selectedIds={bulkSelectedIds}
                    onToggleSelect={view !== "vault" ? handleToggleSelect : undefined}
                    onArchive={
                      view !== "sent"
                        ? (id) => setKeyboardConfirm({ type: "archive", messageId: id })
                        : undefined
                    }
                    onDelete={(id) => setKeyboardConfirm({ type: "delete", messageId: id })}
                  />
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Compose lives in the sidebar on desktop, which is hidden on mobile,
          so small screens get a floating button instead. */}
      {!selectedMessage && (
        <button
          onClick={() => setIsComposeOpen(true)}
          aria-label="Compose message"
          className="md:hidden fixed bottom-20 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
        >
          <PenLine className="h-5 w-5" />
        </button>
      )}

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
              <span className="absolute -top-1 -right-2 h-4 min-w-[16px] rounded-full bg-blue-600 text-xs font-semibold text-white flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <span className="text-xs font-bold">{label}</span>
          </button>
        ))}
        <Link href="/profile" className="flex flex-col items-center gap-1 text-gray-400">
          <User className="h-5 w-5" />
          <span className="text-xs font-bold">Profile</span>
        </Link>
      </div>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => { setIsComposeOpen(false); setReplyTarget(null); setForwardTarget(null); }}
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
              ref={keyboardDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="keyboard-confirm-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 mx-4 max-w-sm w-full outline-none"
            >
              <div className={cn(
                "flex items-center justify-center h-12 w-12 rounded-xl mx-auto mb-4",
                keyboardConfirm.type === "delete" ? "bg-red-50 border border-red-100" : "bg-blue-50 border border-blue-100"
              )}>
                {keyboardConfirm.type === "delete"
                  ? <Trash2 className="h-5 w-5 text-red-500" />
                  : <Archive className="h-5 w-5 text-blue-500" />}
              </div>
              <h3 id="keyboard-confirm-title" className="text-base font-bold text-gray-900 text-center mb-1">
                {keyboardConfirm.type === "delete" ? "Delete this message?" : view === "archived" ? "Move to inbox?" : "Archive this message?"}
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                {keyboardConfirm.type === "delete"
                  ? "Removes it from your inbox. Can't be undone."
                  : view === "archived"
                  ? "It goes back to your inbox."
                  : "You can restore it anytime."}
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
                  {keyboardConfirm.type === "delete" ? "Delete" : view === "archived" ? "Move to inbox" : "Archive"}
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
              ref={bulkDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="bulk-confirm-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 mx-4 max-w-sm w-full outline-none"
            >
              <div className={cn(
                "flex items-center justify-center h-12 w-12 rounded-xl mx-auto mb-4",
                bulkConfirm === "delete" ? "bg-red-50 border border-red-100" : "bg-blue-50 border border-blue-100"
              )}>
                {bulkConfirm === "delete"
                  ? <Trash2 className="h-5 w-5 text-red-500" />
                  : <Archive className="h-5 w-5 text-blue-500" />}
              </div>
              <h3 id="bulk-confirm-title" className="text-base font-bold text-gray-900 text-center mb-1">
                {bulkConfirm === "delete"
                  ? `Delete ${bulkSelectedIds.size} message${bulkSelectedIds.size > 1 ? "s" : ""}?`
                  : bulkConfirm === "unarchive"
                  ? `Move ${bulkSelectedIds.size} message${bulkSelectedIds.size > 1 ? "s" : ""} to inbox?`
                  : `Archive ${bulkSelectedIds.size} message${bulkSelectedIds.size > 1 ? "s" : ""}?`}
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                {bulkConfirm === "delete"
                  ? "Removes them from your inbox. Can't be undone."
                  : bulkConfirm === "unarchive"
                  ? "They go back to your inbox."
                  : "You can restore them anytime."}
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
                  {bulkConfirm === "delete" ? "Delete" : bulkConfirm === "unarchive" ? "Move to inbox" : "Archive"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
