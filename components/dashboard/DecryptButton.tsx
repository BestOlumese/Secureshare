import React, { useState } from "react";
import {
  unwrapAesKey,
  decryptData,
  decryptPrivateKeyFromSync,
} from "@/lib/crypto-client";
import { getDocumentMetadata, getUserKeySyncInfo } from "@/app/actions/documents";
import { getOrgKeySyncInfo } from "@/app/actions/org-actions";
import { AnimatePresence, motion } from "framer-motion";
import { X, Lock, Eye, EyeOff, Key, Loader2, ShieldCheck, Building2 } from "lucide-react";
import { set as setKey, get as getKey } from "idb-keyval";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DecryptButtonProps {
  docId: string;
}

type DecryptMode = "personal" | "recovery" | "org";

export default function DecryptButton({ docId }: DecryptButtonProps) {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [decryptMode, setDecryptMode] = useState<DecryptMode>("personal");
  const [cachedMeta, setCachedMeta] = useState<any>(null);

  async function downloadDecrypted(aesKey: CryptoKey, fileUrl: string, fileName: string, contentType: string) {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Failed to download encrypted file.");
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
        return "File decrypted and saved successfully!";
      }

      if (orgEncryptedAesKey) {
        // Org vault path — must use org private key
        setIsDecrypting(false);
        setDecryptMode("org");
        setShowPasswordPrompt(true);
        throw new Error("RECOVERY_REQUIRED");
      }

      throw new Error("No decryption key available for this file.");
    };

    toast.promise(decryptPromise(), {
      loading: "Decrypting vault...",
      success: (msg) => { setIsDecrypting(false); return msg; },
      error: (err) => {
        setIsDecrypting(false);
        if (err.message === "RECOVERY_REQUIRED") return decryptMode === "org" ? "Org Password required." : "Master Password required for this device.";
        return err.message || "Decryption failed.";
      },
    });
  }

  const handleRecoverKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDecrypting(true);

    const recoveryPromise = async () => {
      if (decryptMode === "org") {
        const orgSync = await getOrgKeySyncInfo();
        const orgPrivateKeyBuffer = await decryptPrivateKeyFromSync(orgSync.encryptedPrivateKey, password, orgSync.salt, orgSync.iv);
        const meta = cachedMeta || await getDocumentMetadata(docId);
        if (!meta.orgEncryptedAesKey) throw new Error("No org key share for this file.");
        const aesKey = await unwrapAesKey(meta.orgEncryptedAesKey, orgPrivateKeyBuffer);
        setShowPasswordPrompt(false);
        setPassword("");
        await downloadDecrypted(aesKey, meta.fileUrl!, meta.fileName, meta.contentType);
        return "File decrypted via Org Vault!";
      }

      const syncInfo: any = await getUserKeySyncInfo();
      let recoveredKeyBuffer: ArrayBuffer;

      if (isRecoveryMode) {
        if (!syncInfo.recoveryEncryptedPrivateKey) throw new Error("Emergency recovery not set up.");
        recoveredKeyBuffer = await decryptPrivateKeyFromSync(syncInfo.recoveryEncryptedPrivateKey, recoveryKey, syncInfo.recoverySalt, syncInfo.recoveryIV);
      } else {
        recoveredKeyBuffer = await decryptPrivateKeyFromSync(syncInfo.encryptedPrivateKey, password, syncInfo.salt, syncInfo.iv);
      }

      await setKey("secure-share-private-key", recoveredKeyBuffer);
      setShowPasswordPrompt(false);
      setPassword("");
      setRecoveryKey("");
      setIsRecoveryMode(false);
      await handleDecrypt(recoveredKeyBuffer);
      return isRecoveryMode ? "Vault recovered using Emergency Key!" : "Security key recovered!";
    };

    toast.promise(recoveryPromise(), {
      loading: decryptMode === "org" ? "Unlocking org vault..." : isRecoveryMode ? "Verifying recovery key..." : "Recovering security keys...",
      success: (msg) => { setIsDecrypting(false); return msg; },
      error: (err) => { setIsDecrypting(false); return err.message || "Recovery failed."; },
    });
  };

  return (
    <>
      <button
        onClick={() => handleDecrypt()}
        disabled={isDecrypting}
        className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-blue-600 transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 active:scale-95 disabled:opacity-50 group"
      >
        {isDecrypting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
        )}
        Decrypt Attachment
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl p-8"
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
                      : isRecoveryMode ? <ShieldCheck className="h-5 w-5" />
                      : <Key className="h-5 w-5" />}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {decryptMode === "org" ? "Org Vault Decrypt"
                      : isRecoveryMode ? "Emergency Recovery"
                      : "Recover Vault"}
                  </h2>
                </div>
                <button onClick={() => setShowPasswordPrompt(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {decryptMode === "org"
                  ? "Enter your Organization Security Password to decrypt this file via the org vault."
                  : isRecoveryMode
                  ? "Enter your Emergency Recovery Key to decrypt your vault and regain access."
                  : "Your security keys are missing on this device. Enter your Master Password to recover them."}
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
                        decryptMode === "org" ? "Org Security Password"
                          : isRecoveryMode ? "Enter Recovery Key"
                          : "Master Security Password"
                      }
                      autoFocus
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                    />
                    {!isRecoveryMode && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {decryptMode === "personal" && !isRecoveryMode && (
                    <button type="button" onClick={() => setIsRecoveryMode(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors ml-1">
                      Forgot Master Password?
                    </button>
                  )}
                  {decryptMode === "personal" && isRecoveryMode && (
                    <button type="button" onClick={() => setIsRecoveryMode(false)}
                      className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors ml-1">
                      Use Master Password instead
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isDecrypting || (isRecoveryMode ? !recoveryKey : !password)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isDecrypting ? <Loader2 className="h-4 w-4 animate-spin" />
                    : decryptMode === "org" ? "Decrypt via Org Vault"
                    : isRecoveryMode ? "Recover with Emergency Key"
                    : "Recover & Decrypt"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
