"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert, Key, Download, Loader2, Lock, Eye, EyeOff,
  CheckCircle2, RotateCcw, ChevronRight, Building2, ShieldCheck, AlertTriangle,
  Monitor, Smartphone, Globe, LogOut, RefreshCw,
} from "lucide-react";
import { decryptPrivateKeyFromSync, exportPrivateKeyForManualBackup, encryptPrivateKeyForSync } from "@/lib/crypto-client";
import { toast } from "sonner";
import ResetPasswordModal from "./ResetPasswordModal";
import { saveOrgKeys } from "@/app/actions/org-actions";
import { getSessions, revokeSession } from "@/app/actions/documents";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  user: any;
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
      toast.success("Session revoked.");
    } catch {
      toast.error("Failed to revoke session.");
    } finally {
      setRevokingId(null);
    }
  }

  const handleGenerateOrgKeys = async () => {
    if (!orgPassword || orgPassword.length < 8) {
      toast.error("Org password must be at least 8 characters.");
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
      const { encryptedKey, salt, iv } = await encryptPrivateKeyForSync(privateKeyBuffer, orgPassword);
      await saveOrgKeys({ publicKey: publicKeyBase64, encryptedPrivateKey: encryptedKey, salt, iv });
      toast.success("Organization vault keys generated and saved!");
      setOrgPassword("");
      setShowRegenConfirm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate org keys.");
    } finally {
      setIsGeneratingOrgKeys(false);
    }
  };

  const handleExportPrivateKey = async () => {
    if (!password) { toast.error("Please enter your Master Password."); return; }
    setIsExporting(true);
    try {
      if (!user.encryptedPrivateKey || !user.privateKeySalt || !user.privateKeyIV) {
        throw new Error("No encrypted key found on server.");
      }
      const buffer = await decryptPrivateKeyFromSync(
        user.encryptedPrivateKey, password, user.privateKeySalt, user.privateKeyIV
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
      toast.success("Private key exported successfully!");
      setPassword("");
    } catch {
      toast.error("Invalid Master Password or decryption failed.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 h-full flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Security Center</h3>
          <p className="text-xs text-gray-400">Manage your zero-knowledge encryption keys.</p>
        </div>
      </div>

      {/* Unlock vault */}
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
          Unlock Vault
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Master Password"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleExportPrivateKey}
          disabled={isExporting || !password}
          className="flex items-center justify-between w-full p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40 transition-all group disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
              <Key className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-800">Export Private Key</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Manual Backup</p>
            </div>
          </div>
          {isExporting
            ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            : <Download className="h-4 w-4 text-gray-300 group-hover:text-blue-600 transition-colors" />}
        </button>

        <button
          onClick={() => setIsResetModalOpen(true)}
          className="flex items-center justify-between w-full p-4 rounded-xl border border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/40 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-500 transition-colors">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-800">Reset Master Password</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Requires Recovery Key</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-orange-500 transition-colors" />
        </button>

        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-orange-100 bg-orange-50">
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-600 leading-relaxed">
            Anyone with your exported private key can decrypt your messages. Store it securely offline.
          </p>
        </div>
      </div>

      {/* Org Vault Keys — owner only */}
      {user.role === "OWNER" && (
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-bold text-gray-800 flex-1">Organization Vault</h4>
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              Owner Only
            </span>
          </div>

          {user.organization?.publicKey && !showRegenConfirm ? (
            <>
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span>Org vault keys active. Outgoing messages are org-encrypted.</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Share your <b className="text-gray-600">Org Security Password</b> with other admins so they can use org-vault decryption.
              </p>
              <button
                onClick={() => setShowRegenConfirm(true)}
                className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
              >
                Regenerate org keys (breaks access to old messages)
              </button>
            </>
          ) : (
            <>
              {showRegenConfirm && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-200 bg-red-50">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 leading-relaxed">
                    Regenerating creates a new key pair. Old messages encrypted with the previous org key will{" "}
                    <b>no longer</b> be decryptable via org vault. This cannot be undone.
                  </p>
                </div>
              )}
              {!showRegenConfirm && (
                <p className="text-xs text-gray-500 leading-relaxed">
                  Generate a shared RSA key pair for your org. Admins can decrypt messages via org vault even if the original recipient has left.
                </p>
              )}

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showOrgPassword ? "text" : "password"}
                  value={orgPassword}
                  onChange={(e) => setOrgPassword(e.target.value)}
                  placeholder="Org Security Password (min 8 chars)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowOrgPassword(!showOrgPassword)}
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
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleGenerateOrgKeys}
                  disabled={isGeneratingOrgKeys || !orgPassword}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50",
                    showRegenConfirm
                      ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500"
                      : "border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                  )}
                >
                  {isGeneratingOrgKeys
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <ShieldCheck className="h-4 w-4" />}
                  {showRegenConfirm ? "Confirm Regenerate" : "Generate Org Vault Keys"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Active Sessions */}
      <div className="pt-4 border-t border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Sessions</h4>
          <button
            onClick={() => { setIsLoadingSessions(true); getSessions().then(setSessions).catch(() => {}).finally(() => setIsLoadingSessions(false)); }}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoadingSessions && "animate-spin")} />
          </button>
        </div>

        {isLoadingSessions ? (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-gray-400">No active sessions found.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const { label, icon: Icon } = parseDevice(s.userAgent);
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                    s.isCurrent ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    s.isCurrent ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-800">{label}</p>
                      {s.isCurrent && (
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">
                      {s.ipAddress && s.ipAddress !== "unknown" ? s.ipAddress : "IP unknown"} · {format(new Date(s.createdAt), "MMM d, HH:mm")}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      disabled={revokingId === s.id}
                      title="Revoke session"
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      {revokingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer status */}
      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        Zero-Knowledge Active
      </div>

      <ResetPasswordModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} user={user} />
    </section>
  );
}
