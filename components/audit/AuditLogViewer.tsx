"use client";

import { useState } from "react";
import { format } from "date-fns";
import { getAuditLogs } from "@/app/actions/org-actions";
import {
  Shield, Send, Eye, LogIn, Loader2, Search, Filter, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LogEntry = {
  id: string;
  actionType: string;
  timestamp: Date;
  ipAddress: string | null;
  metadata: any;
  initiatorOrgId: string | null;
  targetOrgId: string | null;
  user: { name: string; email: string } | null;
};

const ACTION_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  MESSAGE_SENT:           { label: "Message Sent",        color: "bg-blue-50 text-blue-700 border-blue-200",    icon: Send },
  CROSS_ORG_MESSAGE_SENT: { label: "Cross-Org Message",   color: "bg-violet-50 text-violet-700 border-violet-200", icon: Send },
  CROSS_ORG_DOC_VIEWED:  { label: "Cross-Org File View",  color: "bg-amber-50 text-amber-700 border-amber-200",  icon: Eye },
  LOGIN:                  { label: "Login",               color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: LogIn },
};

function getActionMeta(type: string) {
  return ACTION_META[type] ?? { label: type.replace(/_/g, " "), color: "bg-gray-100 text-gray-600 border-gray-200", icon: Shield };
}

const ALL_TYPES = ["All", "MESSAGE_SENT", "CROSS_ORG_MESSAGE_SENT", "CROSS_ORG_DOC_VIEWED"];

export default function AuditLogViewer({ initialLogs }: { initialLogs: LogEntry[] }) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialLogs.length === 50);

  const filtered = logs.filter((l) => {
    const matchType = filterType === "All" || l.actionType === filterType;
    const matchSearch =
      !search ||
      l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.actionType.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  async function loadMore() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const more = await getAuditLogs({ cursor: logs[logs.length - 1].id, limit: 50 });
      setLogs((prev) => [...prev, ...more]);
      setHasMore(more.length === 50);
    } catch {
      toast.error("Failed to load more logs.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Security Audit Log</h2>
            <p className="text-sm text-gray-500 mt-1">
              All security events for your organization — messages sent, cross-org activity, and file access.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest shrink-0">
            <Shield className="h-3 w-3" />
            Admin Only
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user or action..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm text-gray-700 focus:border-blue-400 focus:outline-none transition-all"
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "All" ? "All actions" : getActionMeta(t).label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 font-medium">
        Showing {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        {hasMore && !search && filterType === "All" ? "+" : ""}
      </p>

      {/* Log Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="h-8 w-8 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No events found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((log) => {
              const meta = getActionMeta(log.actionType);
              const Icon = meta.icon;
              const isCrossOrg = !!log.targetOrgId && log.targetOrgId !== log.initiatorOrgId;
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border mt-0.5",
                    meta.color
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                        meta.color
                      )}>
                        {meta.label}
                      </span>
                      {isCrossOrg && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600 border border-violet-200">
                          Cross-Org
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {log.user?.name || log.user?.email || "Unknown user"}
                    </p>
                    {log.user?.name && (
                      <p className="text-xs text-gray-400 truncate">{log.user.email}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-xs font-medium text-gray-700 tabular-nums">
                      {format(new Date(log.timestamp), "MMM d, yyyy")}
                    </p>
                    <p className="text-[10px] text-gray-400 tabular-nums">
                      {format(new Date(log.timestamp), "HH:mm:ss")}
                    </p>
                    {log.ipAddress && log.ipAddress !== "unknown" && (
                      <p className="text-[10px] text-gray-300 font-mono">{log.ipAddress}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="border-t border-gray-100 p-4 flex justify-center">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isLoadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
