"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { exportAuditLogs, getAuditLogs } from "@/app/actions/org-actions";
import { Download, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toCsv } from "@/lib/csv";
import { toast } from "sonner";

type LogEntry = {
  id: string;
  actionType: string;
  timestamp: Date;
  ipAddress: string | null;
  // Prisma Json column: shape varies by actionType.
  metadata: unknown;
  initiatorOrgId: string | null;
  targetOrgId: string | null;
  user: { name: string; email: string } | null;
};

const ACTION_LABELS: Record<string, string> = {
  MESSAGE_SENT: "Message sent",
  CROSS_ORG_MESSAGE_SENT: "Message sent to another org",
  CROSS_ORG_DOC_VIEWED: "File opened from another org",
  ORG_VAULT_MESSAGE_DECRYPTED: "Message read via org key",
  ORG_VAULT_FILE_DECRYPTED: "File read via org key",
  LOGIN: "Signed in",
  MASTER_PASSWORD_RESET: "Password reset",
  ONBOARDING_COMPLETED: "Account set up",
};

/** Events where someone read something they weren't a named recipient of. */
const ELEVATED = new Set([
  "ORG_VAULT_MESSAGE_DECRYPTED",
  "ORG_VAULT_FILE_DECRYPTED",
  "CROSS_ORG_DOC_VIEWED",
]);

const FILTERS = [
  { value: "", label: "All actions" },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
];

const RANGES = [
  { value: "", label: "All time" },
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];

function actionLabel(type: string) {
  return ACTION_LABELS[type] ?? type.replace(/_/g, " ").toLowerCase();
}

/** Short reference form of an id — enough to cross-reference, not a wall. */
function ref(value: unknown): string | null {
  return typeof value === "string" && value ? value.slice(0, 8) : null;
}

function browserFrom(userAgent: unknown): string | null {
  if (typeof userAgent !== "string") return null;
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/Chrome\//.test(userAgent)) return "Chrome";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Safari\//.test(userAgent)) return "Safari";
  return null;
}

/**
 * Turns the stored metadata into the "what" of who-did-what-to-what.
 *
 * Note it never surfaces `fileName`: attachment names are ciphertext now, so
 * printing one would show the reader a line of base64.
 */
function describe(log: LogEntry): string | null {
  const meta = (log.metadata ?? {}) as Record<string, unknown>;

  switch (log.actionType) {
    case "MESSAGE_SENT":
    case "CROSS_ORG_MESSAGE_SENT": {
      const id = ref(meta.messageId);
      const count = typeof meta.recipientCount === "number" ? meta.recipientCount : null;
      if (!id) return null;
      return count
        ? `message ${id} · ${count} recipient${count === 1 ? "" : "s"}`
        : `message ${id}`;
    }
    case "ORG_VAULT_MESSAGE_DECRYPTED": {
      const id = ref(meta.messageId);
      return id ? `message ${id}` : null;
    }
    case "ORG_VAULT_FILE_DECRYPTED":
    case "CROSS_ORG_DOC_VIEWED": {
      const doc = ref(meta.docId);
      return doc ? `file ${doc}` : null;
    }
    case "LOGIN": {
      return browserFrom(meta.userAgent);
    }
    default:
      return null;
  }
}

function dayHeading(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d");
}

interface Props {
  initialLogs: LogEntry[];
  initialTotal: number;
}

export default function AuditLogViewer({ initialLogs, initialTotal }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("");
  const [range, setRange] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasMore, setHasMore] = useState(initialLogs.length === 50);

  // Skip the query on first render — the server already sent page one.
  const isFirstRender = useRef(true);

  const buildFilters = useCallback(() => {
    const since = range
      ? new Date(Date.now() - Number(range) * 24 * 60 * 60 * 1000)
      : undefined;
    return {
      search: search.trim() || undefined,
      actionType: actionType || undefined,
      since,
    };
  }, [search, actionType, range]);

  // Filters run in the database, so a search covers the whole log rather than
  // whatever happens to be loaded. Debounced so typing isn't one query a key.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const result = await getAuditLogs({ ...buildFilters(), limit: 50 });
        if (cancelled) return;
        setLogs(result.logs as LogEntry[]);
        setTotal(result.total);
        setHasMore(result.logs.length === 50);
      } catch {
        if (!cancelled) toast.error("Couldn't load the log.");
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [buildFilters]);

  async function loadMore() {
    if (isLoadingMore || !hasMore || logs.length === 0) return;
    setIsLoadingMore(true);
    try {
      const result = await getAuditLogs({
        ...buildFilters(),
        cursor: logs[logs.length - 1].id,
        limit: 50,
      });
      setLogs((prev) => [...prev, ...(result.logs as LogEntry[])]);
      setHasMore(result.logs.length === 50);
    } catch {
      toast.error("Couldn't load more.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const { rows, truncated } = await exportAuditLogs(buildFilters());
      if (rows.length === 0) {
        toast.error("Nothing to export.");
        return;
      }

      const csv = toCsv(
        ["Timestamp", "Action", "User", "Email", "IP", "Cross-org", "Details"],
        rows.map((r) => [
          r.timestamp, r.actionType, r.userName, r.userEmail, r.ipAddress, r.crossOrg, r.metadata,
        ])
      );

      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        truncated ? `Exported the first ${rows.length} events` : `Exported ${rows.length} events`
      );
    } catch {
      toast.error("Couldn't export.");
    } finally {
      setIsExporting(false);
    }
  }

  const isFiltered = !!(search.trim() || actionType || range);

  // Group consecutive rows by day. The list is already sorted newest-first.
  const groups: { day: string; entries: LogEntry[] }[] = [];
  for (const log of logs) {
    const day = dayHeading(new Date(log.timestamp));
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(log);
    else groups.push({ day, entries: [log] });
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people or actions"
            aria-label="Search the audit log"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>

        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          aria-label="Filter by action"
          className="rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          aria-label="Filter by date"
          className="rounded-lg border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <button
          onClick={handleExport}
          disabled={isExporting || logs.length === 0}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export
        </button>
      </div>

      <p className="text-sm text-gray-500">
        {isSearching
          ? "Searching..."
          : total === 0
            ? "No matching events"
            : `${total} event${total === 1 ? "" : "s"}${isFiltered ? " matching" : ""}`}
      </p>

      {/* Log */}
      {logs.length === 0 && !isSearching ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-400">Nothing here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.day}>
              <h2 className="text-sm font-medium text-gray-500 mb-2">{group.day}</h2>

              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {group.entries.map((log) => {
                  const detail = describe(log);
                  const crossOrg = !!log.targetOrgId && log.targetOrgId !== log.initiatorOrgId;
                  const timestamp = new Date(log.timestamp);

                  return (
                    <div key={log.id} className="flex items-start gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">
                            {log.user?.name || log.user?.email || "Unknown user"}
                          </span>
                          <span className="text-gray-500"> · {actionLabel(log.actionType)}</span>
                        </p>

                        <p className="text-sm text-gray-500 truncate">
                          {detail && <span className="font-mono text-gray-400">{detail}</span>}
                          {detail && log.ipAddress && log.ipAddress !== "unknown" && " · "}
                          {log.ipAddress && log.ipAddress !== "unknown" && log.ipAddress}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {ELEVATED.has(log.actionType) && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                            Elevated
                          </span>
                        )}
                        {crossOrg && (
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                            Cross-org
                          </span>
                        )}
                        <time
                          dateTime={timestamp.toISOString()}
                          title={format(timestamp, "PPpp")}
                          className="text-sm text-gray-400 tabular-nums cursor-default"
                        >
                          {formatDistanceToNow(timestamp, { addSuffix: true })}
                        </time>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className={cn(
              "rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            )}
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
