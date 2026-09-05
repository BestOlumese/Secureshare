"use client";

import { useState, useEffect } from "react";
import {
  Download, Loader2, Lock, Eye, EyeOff, AlertTriangle,
  Monitor, Smartphone, Globe, RefreshCw,
} from "lucide-react";
import { decryptPrivateKeyFromSync, exportPrivateKeyForManualBackup, encryptPrivateKeyForSync } from "@/lib/crypto-client";
import { toast } from "sonner";
import ResetPasswordModal from "./ResetPasswordModal";
import { saveOrgKeys } from "@/app/actions/org-actions";
import { getSessions, revokeSession } from "@/app/actions/documents";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { CurrentUser } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";

type SessionEntry = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
};

function parseDevice(ua: string | null) {
  if (!ua) return { label: "Unknown Device", icon: Monitor };
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) return { label: "Mobile", icon: Smartphone };
  if (/Chrome/i.test(ua)) return { label: "Chrome", icon: Monitor };
  if (/Firefox/i.test(ua)) return { label: "Firefox", icon: Monitor };
  if (/Safari/i.test(ua)) return { label: "Safari", icon: Monitor };
  return { label: "Browser", icon: Globe };
}

interface SecurityCenterProps {
  user: CurrentUser;
}

export default function SecurityCenter({ user }: SecurityCenterProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [orgPassword, setOrgPassword] = useState("");
  const [showOrgPassword, setShowOrgPassword] = useState(false);
  const [isGeneratingOrgKeys, setIsGeneratingOrgKeys] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingSessions(true);
    getSessions().then(setSessions).catch(() => {}).finally(() => setIsLoadingSessions(false));
  }, []);

  async function handleRevokeSession(sessionId: string) {
    setRevokingId(sessionId);
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Signed out");
    } catch {
      toast.error("Couldn't sign that device out.");
    } finally {
      setRevokingId(null);
    }
  }

  const handleGenerateOrgKeys = async () => {
    if (!orgPassword || orgPassword.length < 8) {
      toast.error("Org password needs at least 8 characters.");
      return;
    }
    setIsGeneratingOrgKeys(true);
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true,
        ["encrypt", "decrypt"]
      );
      const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
      const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
      const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
      const { encryptedKey, salt, iv, iterations } = await encryptPrivateKeyForSync(privateKeyBuffer, orgPassword);
      await saveOrgKeys({ publicKey: publicKeyBase64, encryptedPrivateKey: encryptedKey, salt, iv, iterations });
      toast.success("Org key created");
      setOrgPassword("");
      setShowRegenConfirm(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't create the org key."));
    } finally {
      setIsGeneratingOrgKeys(false);
    }
  };

  const handleExportPrivateKey = async () => {
    if (!password) { toast.error("Enter your master password."); return; }
    setIsExporting(true);
    try {
      if (!user.encryptedPrivateKey || !user.privateKeySalt || !user.privateKeyIV) {
        throw new Error("No encrypted key found on server.");
      }
      const buffer = await decryptPrivateKeyFromSync(
        user.encryptedPrivateKey, password, user.privateKeySalt, user.privateKeyIV, user.kdfIterations
      );
      const base64Key = exportPrivateKeyForManualBackup(buffer);
      const blob = new Blob([base64Key], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `secureshare-private-key-${user.email}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Key downloaded");
      setPassword("");
    } catch {
      toast.error("Wrong password.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-10">

      {/* ---------------- Password ---------------- */}
      <section>
        <h2 className="text-sm font-medium text-gray-900 mb-1">Password</h2>
        <p className="text-sm text-gray-500 mb-4">
          Your master password unlocks your key. We never receive it, so we can&apos;t reset it for you.
        </p>

        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-sm text-gray-900">Reset your password</p>
              <p className="text-sm text-gray-500">Needs your recovery key</p>
            </div>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {/* ---------------- Keys ---------------- */}
      <section>
        <h2 className="text-sm font-medium text-gray-900 mb-1">Keys</h2>
        <p className="text-sm text-gray-500 mb-4">
          Download a copy of your private key as a backup. Enter your password to unlock it first.
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Master password"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            onClick={handleExportPrivateKey}
            disabled={isExporting || !password}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export key
          </button>

          <p className="flex items-start gap-2 text-sm text-orange-700">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
            Anyone with this file can read your messages. Keep it offline.
          </p>
        </div>
      </section>

      {/* ---------------- Org key (owner only) ---------------- */}
      {user.role === "OWNER" && (
        <section>
          <h2 className="text-sm font-medium text-gray-900 mb-1">Organization key</h2>
          <p className="text-sm text-gray-500 mb-4">
            Lets admins open messages shared with the organization when the original recipient
            isn&apos;t around. Every use is written to the audit log.
          </p>

          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            {user.organization?.publicKey && !showRegenConfirm ? (
              <>
                <p className="text-sm text-gray-900">Set up.</p>
                <p className="text-sm text-gray-500">
                  Share the org password with your other admins so they can use it.
                </p>
                <button
                  onClick={() => setShowRegenConfirm(true)}
                  className="text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  Replace the key
                </button>
              </>
            ) : (
              <>
                {showRegenConfirm ? (
                  <p className="flex items-start gap-2 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                    Messages opened with the old key won&apos;t be reachable any more. This can&apos;t be undone.
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Choose a password for it. It&apos;s separate from your own.
                  </p>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showOrgPassword ? "text" : "password"}
                    value={orgPassword}
                    onChange={(e) => setOrgPassword(e.target.value)}
                    placeholder="Org password"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOrgPassword(!showOrgPassword)}
                    aria-label={showOrgPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {showOrgPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex gap-2">
                  {showRegenConfirm && (
                    <button
                      type="button"
                      onClick={() => { setShowRegenConfirm(false); setOrgPassword(""); }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleGenerateOrgKeys}
                    disabled={isGeneratingOrgKeys || !orgPassword}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white transition-colors disabled:opacity-50",
                      showRegenConfirm ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                    )}
                  >
                    {isGeneratingOrgKeys && <Loader2 className="h-4 w-4 animate-spin" />}
                    {showRegenConfirm ? "Replace key" : "Create key"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ---------------- Devices ---------------- */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-medium text-gray-900">Devices</h2>
          <button
            onClick={() => { setIsLoadingSessions(true); getSessions().then(setSessions).catch(() => {}).finally(() => setIsLoadingSessions(false)); }}
            aria-label="Refresh devices"
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", isLoadingSessions && "animate-spin")} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Where you&apos;re signed in right now.</p>

        {isLoadingSessions ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400">No sessions.</p>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {sessions.map((s) => {
              const { label, icon: Icon } = parseDevice(s.userAgent);
              return (
                <div key={s.id} className="flex items-center gap-3 p-4">
                  <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {label}
                      {s.isCurrent && <span className="text-gray-400"> · this device</span>}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {s.ipAddress && s.ipAddress !== "unknown" ? s.ipAddress : "IP unknown"}
                      {" · "}
                      {format(new Date(s.createdAt), "MMM d, HH:mm")}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      disabled={revokingId === s.id}
                      className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      {revokingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sign out"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ResetPasswordModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} user={user} />
    </div>
  );
}
