import React, { useState } from "react";
import {
  unwrapAesKey,
  decryptData,
  decryptPrivateKeyFromSync,
  tryDecryptString,
} from "@/lib/crypto-client";
import { getDocumentMetadata, getUserKeySyncInfo } from "@/app/actions/documents";
import { getOrgKeySyncInfo } from "@/app/actions/org-actions";
import { AnimatePresence, motion } from "framer-motion";
import { X, Lock, Eye, EyeOff, Key, Loader2, Download, Building2 } from "lucide-react";
import { set as setKey, get as getKey } from "idb-keyval";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useModalA11y } from "@/lib/use-modal-a11y";

interface DecryptButtonProps {
  docId: string;
  /** Message AES key, if the message body has already been decrypted in this view. */
  aesKey?: CryptoKey | null;
  /** Fires with the real file name once it has been decrypted. */
  onFileNameDecrypted?: (fileName: string) => void;
}

type DecryptMode = "personal" | "recovery" | "org";

/** Whatever the action returns — kept in sync automatically. */
type DocumentMeta = Awaited<ReturnType<typeof getDocumentMetadata>>;

export default function DecryptButton({ docId, aesKey: providedAesKey, onFileNameDecrypted }: DecryptButtonProps) {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [decryptMode, setDecryptMode] = useState<DecryptMode>("personal");
  const [cachedMeta, setCachedMeta] = useState<DocumentMeta | null>(null);

  const dialogRef = useModalA11y<HTMLDivElement>(showPasswordPrompt, () => setShowPasswordPrompt(false));

  /**
   * File names are stored encrypted, so resolve the real one with the AES key.
   * Falls back to the stored value for legacy documents saved in plaintext.
   */
  async function resolveFileName(storedName: string, aesKey: CryptoKey) {
    const name = (await tryDecryptString(storedName, aesKey)) || storedName || "secure-file";
    onFileNameDecrypted?.(name);
    return name;
  }

  async function downloadDecrypted(aesKey: CryptoKey, fileUrl: string, storedName: string, contentType: string) {
    const fileName = await resolveFileName(storedName, aesKey);
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Couldn't fetch the file.");
    const encryptedBlob = await response.arrayBuffer();
    const decryptedData = await decryptData(encryptedBlob, aesKey);
    const blob = new Blob([decryptedData], { type: contentType || "application/octet-stream" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async function handleDecrypt(recoveredKeyBuffer?: ArrayBuffer) {
    setIsDecrypting(true);

    const decryptPromise = async () => {
      const meta = cachedMeta || await getDocumentMetadata(docId);
      if (!cachedMeta) setCachedMeta(meta);

      const { fileUrl, encryptedAesKey, orgEncryptedAesKey, fileName, contentType } = meta;

      if (providedAesKey) {
        // The message body was already unlocked in this view — reuse that key.
        await downloadDecrypted(providedAesKey, fileUrl!, fileName, contentType);
        return "Downloaded";
      }

      if (encryptedAesKey) {
        // Personal recipient path
        const privateKeyBuffer = recoveredKeyBuffer || await getKey("secure-share-private-key");
        if (!privateKeyBuffer) {
          setIsDecrypting(false);
          setDecryptMode("personal");
          setShowPasswordPrompt(true);
          throw new Error("RECOVERY_REQUIRED");
        }
        const aesKey = await unwrapAesKey(encryptedAesKey, privateKeyBuffer as ArrayBuffer);
        await downloadDecrypted(aesKey, fileUrl!, fileName, contentType);
        return "Downloaded";
      }

      if (orgEncryptedAesKey) {
        // Org vault path — must use org private key
        setIsDecrypting(false);
        setDecryptMode("org");
        setShowPasswordPrompt(true);
        throw new Error("RECOVERY_REQUIRED");
      }

      throw new Error("You don't have a key for this file.");
    };

    toast.promise(decryptPromise(), {
      loading: "Decrypting...",
      success: (msg) => { setIsDecrypting(false); return msg; },
      error: (err) => {
        setIsDecrypting(false);
        if (err.message === "RECOVERY_REQUIRED") return decryptMode === "org" ? "Enter your org password" : "Enter your master password";
        return err.message || "Couldn't open this file.";
      },
    });
  }

  const handleRecoverKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDecrypting(true);

    const recoveryPromise = async () => {
      if (decryptMode === "org") {
        const orgSync = await getOrgKeySyncInfo();
        const orgPrivateKeyBuffer = await decryptPrivateKeyFromSync(orgSync.encryptedPrivateKey, password, orgSync.salt, orgSync.iv, orgSync.kdfIterations);
        const meta = cachedMeta || await getDocumentMetadata(docId);
        if (!meta.orgEncryptedAesKey) throw new Error("This file wasn't shared with your organization.");
        const aesKey = await unwrapAesKey(meta.orgEncryptedAesKey, orgPrivateKeyBuffer);
        setShowPasswordPrompt(false);
        setPassword("");
        await downloadDecrypted(aesKey, meta.fileUrl!, meta.fileName, meta.contentType);
        return "Downloaded with the org key";
      }

      const syncInfo = await getUserKeySyncInfo();
      let recoveredKeyBuffer: ArrayBuffer;

      if (isRecoveryMode) {
        // The salt and IV are nullable alongside the blob — check all three,
        // or a half-written recovery record fails as "invalid key" instead.
        if (!syncInfo.recoveryEncryptedPrivateKey || !syncInfo.recoverySalt || !syncInfo.recoveryIV) {
          throw new Error("No recovery key on this account.");
        }
        recoveredKeyBuffer = await decryptPrivateKeyFromSync(syncInfo.recoveryEncryptedPrivateKey, recoveryKey, syncInfo.recoverySalt, syncInfo.recoveryIV, syncInfo.kdfIterations);
      } else {
        recoveredKeyBuffer = await decryptPrivateKeyFromSync(syncInfo.encryptedPrivateKey, password, syncInfo.salt, syncInfo.iv, syncInfo.kdfIterations);
      }

      await setKey("secure-share-private-key", recoveredKeyBuffer);
      setShowPasswordPrompt(false);
      setPassword("");
      setRecoveryKey("");
      setIsRecoveryMode(false);
      await handleDecrypt(recoveredKeyBuffer);
      return "Unlocked";
    };

    toast.promise(recoveryPromise(), {
      loading: "Unlocking...",
      success: (msg) => { setIsDecrypting(false); return msg; },
      error: (err) => { setIsDecrypting(false); return err.message || "Wrong password."; },
    });
  };

  return (
    <>
      <button
        onClick={() => handleDecrypt()}
        disabled={isDecrypting}
        className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 active:scale-95 disabled:opacity-50 group"
      >
        {isDecrypting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Download
      </button>

      <AnimatePresence>
        {showPasswordPrompt && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordPrompt(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="decrypt-file-dialog-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl p-8 outline-none"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    decryptMode === "org" ? "bg-blue-50 text-blue-600"
                      : isRecoveryMode ? "bg-amber-50 text-amber-500"
                      : "bg-blue-50 text-blue-600"
                  )}>
                    {decryptMode === "org" ? <Building2 className="h-5 w-5" />
                      : isRecoveryMode ? <Key className="h-5 w-5" />
                      : <Key className="h-5 w-5" />}
                  </div>
                  <h2 id="decrypt-file-dialog-title" className="text-lg font-bold text-gray-900">
                    {decryptMode === "org" ? "Org password"
                      : isRecoveryMode ? "Recovery key"
                      : "Master password"}
                  </h2>
                </div>
                <button onClick={() => setShowPasswordPrompt(false)} aria-label="Close dialog" className="text-gray-400 hover:text-gray-700 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {decryptMode === "org"
                  ? "Opens this file with your organization's key."
                  : isRecoveryMode
                  ? "The key you saved when you set up your account."
                  : "This device doesn't have your key yet. Your password unlocks it."}
              </p>

              <form onSubmit={handleRecoverKey} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword || isRecoveryMode ? "text" : "password"}
                      value={isRecoveryMode ? recoveryKey : password}
                      onChange={(e) => isRecoveryMode ? setRecoveryKey(e.target.value) : setPassword(e.target.value)}
                      placeholder={
                        decryptMode === "org" ? "Org password"
                          : isRecoveryMode ? "Recovery key"
                          : "Master password"
                      }
                      autoFocus
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                    />
                    {!isRecoveryMode && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {decryptMode === "personal" && !isRecoveryMode && (
                    <button type="button" onClick={() => setIsRecoveryMode(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors ml-1">
                      Lost your password?
                    </button>
                  )}
                  {decryptMode === "personal" && isRecoveryMode && (
                    <button type="button" onClick={() => setIsRecoveryMode(false)}
                      className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors ml-1">
                      Use my password instead
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isDecrypting || (isRecoveryMode ? !recoveryKey : !password)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isDecrypting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
