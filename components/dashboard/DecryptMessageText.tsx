"use client";

import React, { useState } from "react";
import { unwrapAesKey, decryptString, decryptPrivateKeyFromSync } from "@/lib/crypto-client";
import { getMessageMetadata, getUserKeySyncInfo } from "@/app/actions/documents";
import { getOrgKeySyncInfo } from "@/app/actions/org-actions";
import { AnimatePresence, motion } from "framer-motion";
import { X, Lock, Eye, EyeOff, Key, Loader2, LockOpen, Building2 } from "lucide-react";
import { set as setKey, get as getKey } from "idb-keyval";
import { toast } from "sonner";
import { useModalA11y } from "@/lib/use-modal-a11y";

interface DecryptMessageTextProps {
  messageId: string;
  onSubjectDecrypted?: (subject: string) => void;
  /** Fired once the message AES key is unwrapped, so the parent can reveal attachment names. */
  onAesKey?: (aesKey: CryptoKey) => void;
}

// Org key decryption mode: "personal" | "org"
type DecryptMode = "personal" | "org";

/** Whatever the action returns — kept in sync automatically. */
type MessageMeta = Awaited<ReturnType<typeof getMessageMetadata>>;

export default function DecryptMessageText({ messageId, onSubjectDecrypted, onAesKey }: DecryptMessageTextProps) {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [decryptMode, setDecryptMode] = useState<DecryptMode>("personal");
  // Cached metadata so we don't fetch twice when prompting
  const [cachedMeta, setCachedMeta] = useState<MessageMeta | null>(null);

  const dialogRef = useModalA11y<HTMLDivElement>(showPasswordPrompt, () => setShowPasswordPrompt(false));

  async function handleDecrypt(recoveredKeyBuffer?: ArrayBuffer) {
    setIsDecrypting(true);
    const decryptPromise = async () => {
      const meta = cachedMeta || await getMessageMetadata(messageId);
      if (!cachedMeta) setCachedMeta(meta);

      const { content, encryptedAesKey, orgEncryptedAesKey } = meta;

      if (encryptedAesKey) {
        // Personal recipient path — use personal private key
        const privateKeyBuffer = recoveredKeyBuffer || await getKey("secure-share-private-key");
        if (!privateKeyBuffer) {
          setIsDecrypting(false);
          setDecryptMode("personal");
          setShowPasswordPrompt(true);
          throw new Error("RECOVERY_REQUIRED");
        }
        const aesKey = await unwrapAesKey(encryptedAesKey, privateKeyBuffer as ArrayBuffer);
        onAesKey?.(aesKey);
        setDecryptedText(content ? await decryptString(content, aesKey) : "Message is empty.");
        if (meta.subject) {
          try {
            onSubjectDecrypted?.(await decryptString(meta.subject, aesKey));
          } catch {
            onSubjectDecrypted?.(meta.subject); // fallback for old plaintext subjects
          }
        }
        return "Opened";
      }

      if (orgEncryptedAesKey) {
        // Org vault path — must use org private key, never personal
        setIsDecrypting(false);
        setDecryptMode("org");
        setShowPasswordPrompt(true);
        throw new Error("RECOVERY_REQUIRED");
      }

      throw new Error("You don't have a key for this message.");
    };

    toast.promise(decryptPromise(), {
      loading: "Opening...",
      success: (msg) => { setIsDecrypting(false); return msg; },
      error: (err) => {
        setIsDecrypting(false);
        if (err.message === "RECOVERY_REQUIRED") return decryptMode === "org" ? "Enter your org password" : "Enter your master password";
        return err.message || "Couldn't open this message.";
      },
    });
  }

  const handleRecoverKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDecrypting(true);
    const recoveryPromise = async () => {
      let recoveredKeyBuffer: ArrayBuffer;

      if (decryptMode === "org") {
        const orgSync = await getOrgKeySyncInfo();
        recoveredKeyBuffer = await decryptPrivateKeyFromSync(orgSync.encryptedPrivateKey, password, orgSync.salt, orgSync.iv, orgSync.kdfIterations);
        // Use org key directly (don't cache in IndexedDB — it's org-scoped)
        setShowPasswordPrompt(false);
        setPassword("");
        // Decrypt using org key and org-encrypted AES key
        const meta = cachedMeta || await getMessageMetadata(messageId);
        if (!meta.orgEncryptedAesKey) throw new Error("This message wasn't shared with your organization.");
        const aesKey = await unwrapAesKey(meta.orgEncryptedAesKey, recoveredKeyBuffer);
        onAesKey?.(aesKey);
        setDecryptedText(meta.content ? await decryptString(meta.content, aesKey) : "Message is empty.");
        if (meta.subject) {
          try {
            onSubjectDecrypted?.(await decryptString(meta.subject, aesKey));
          } catch {
            onSubjectDecrypted?.(meta.subject);
          }
        }
        return "Opened with the org key";
      } else {
        const syncInfo = await getUserKeySyncInfo();
        recoveredKeyBuffer = await decryptPrivateKeyFromSync(syncInfo.encryptedPrivateKey, password, syncInfo.salt, syncInfo.iv, syncInfo.kdfIterations);
        await setKey("secure-share-private-key", recoveredKeyBuffer);
        setShowPasswordPrompt(false);
        setPassword("");
        await handleDecrypt(recoveredKeyBuffer);
        return "Unlocked";
      }
    };
    toast.promise(recoveryPromise(), {
      loading: "Unlocking...",
      success: (msg) => { setIsDecrypting(false); return msg; },
      error: (err) => { setIsDecrypting(false); return err.message || "Wrong password."; },
    });
  };

  if (decryptedText !== null) {
    return (
      <div className="p-5 rounded-xl bg-blue-50 border border-blue-100 text-gray-800">
        <p className="whitespace-pre-wrap leading-relaxed text-sm">{decryptedText}</p>
        <div className="mt-4 text-xs text-emerald-700">
          Decrypted on this device
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-8 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center">
        <Lock className="h-7 w-7 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-400 mb-5">
          This message is encrypted.
        </p>
        <button
          onClick={() => handleDecrypt()}
          disabled={isDecrypting}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isDecrypting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockOpen className="h-4 w-4" />}
          Open message
        </button>
      </div>

      <AnimatePresence>
        {showPasswordPrompt && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPasswordPrompt(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="decrypt-message-dialog-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl p-8 outline-none"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${decryptMode ==="org" ? "bg-blue-50 text-blue-600" : "bg-blue-50 text-blue-600"}`}>
                    {decryptMode === "org" ? <Building2 className="h-5 w-5" /> : <Key className="h-5 w-5" />}
                  </div>
                  <h2 id="decrypt-message-dialog-title" className="text-lg font-bold text-gray-900">
                    {decryptMode === "org" ? "Org password" : "Master password"}
                  </h2>
                </div>
                <button onClick={() => setShowPasswordPrompt(false)} aria-label="Close dialog" className="text-gray-400 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {decryptMode === "org"
                  ? "Opens this message with your organization's key."
                  : "This device doesn't have your key yet. Your password unlocks it."}
              </p>

              <form onSubmit={handleRecoverKey} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={decryptMode === "org" ? "Org password" : "Master password"}
                    autoFocus
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
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

                {cachedMeta?.orgEncryptedAesKey && (
                  <button
                    type="button"
                    onClick={() => { setDecryptMode(decryptMode === "org" ? "personal" : "org"); setPassword(""); }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {decryptMode === "org" ? "Use my own password" : "Use the org key"}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isDecrypting || !password}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {isDecrypting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Open"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
