import React, { useState } from "react";
import { 
  unwrapAesKey, 
  decryptData, 
  decryptPrivateKeyFromSync 
} from "@/lib/crypto-client";
import { getDocumentMetadata, getUserKeySyncInfo } from "@/app/actions/documents";
import { AnimatePresence, motion } from "framer-motion";
import { X, Lock, Eye, EyeOff, Key, Loader2, ShieldCheck } from "lucide-react";
import { set as setKey, get as getKey } from "idb-keyval";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DecryptButtonProps {
  docId: string;
}

export default function DecryptButton({ docId }: DecryptButtonProps) {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");

  async function handleDecrypt(recoveredKeyBuffer?: ArrayBuffer) {
    setIsDecrypting(true);

    const decryptPromise = async () => {
      // 1. Get Private Key from IndexedDB or recovered buffer
      let privateKeyBuffer = recoveredKeyBuffer || await getKey("secure-share-private-key");
      
      if (!privateKeyBuffer) {
        // Trigger recovery flow
        setIsDecrypting(false);
        setShowPasswordPrompt(true);
        throw new Error("RECOVERY_REQUIRED");
      }
      
      // ... rest of decryption ...
      const { fileUrl, encryptedAesKey, fileName } = await getDocumentMetadata(docId);
      const aesKey = await unwrapAesKey(encryptedAesKey, privateKeyBuffer as ArrayBuffer);
      const response = await fetch(fileUrl!);
      if (!response.ok) throw new Error("Failed to download encrypted file.");
      const encryptedBlob = await response.arrayBuffer();
      const decryptedData = await decryptData(encryptedBlob, aesKey);
      const blob = new Blob([decryptedData], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return "File decrypted and saved successfully!";
    };

    toast.promise(decryptPromise(), {
      loading: "Decrypting vault...",
      success: (msg) => {
        setIsDecrypting(false);
        return msg;
      },
      error: (err) => {
        setIsDecrypting(false);
        if (err.message === "RECOVERY_REQUIRED") return "Master Password required for this device.";
        return err.message || "Decryption failed.";
      },
    });
  }

  const handleRecoverKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDecrypting(true);
    
    const recoveryPromise = async () => {
      const syncInfo: any = await getUserKeySyncInfo();
      let recoveredKeyBuffer: ArrayBuffer;

      if (isRecoveryMode) {
        if (!syncInfo.recoveryEncryptedPrivateKey) {
          throw new Error("Emergency recovery not set up for this account.");
        }
        recoveredKeyBuffer = await decryptPrivateKeyFromSync(
          syncInfo.recoveryEncryptedPrivateKey,
          recoveryKey,
          syncInfo.recoverySalt,
          syncInfo.recoveryIV
        );
      } else {
        recoveredKeyBuffer = await decryptPrivateKeyFromSync(
          syncInfo.encryptedPrivateKey,
          password,
          syncInfo.salt,
          syncInfo.iv
        );
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
      loading: isRecoveryMode ? "Verifying recovery key..." : "Recovering security keys...",
      success: (msg) => {
        setIsDecrypting(false);
        return msg;
      },
      error: (err) => {
        setIsDecrypting(false);
        return err.message || "Recovery failed. Please check your credentials.";
      }
    });
  };

  return (
    <>
      <button
        onClick={() => handleDecrypt()}
        disabled={isDecrypting}
        className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-sky-400 transition-all hover:bg-sky-500 hover:text-white active:scale-95 disabled:opacity-50 shadow-lg shadow-sky-500/5 group"
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordPrompt(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-[#0f172a] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    isRecoveryMode ? "bg-amber-500/10 text-amber-500" : "bg-sky-500/10 text-sky-400"
                  )}>
                    {isRecoveryMode ? <ShieldCheck className="h-5 w-5" /> : <Key className="h-5 w-5" />}
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {isRecoveryMode ? "Emergency Recovery" : "Recover Vault"}
                  </h2>
                </div>
                <button onClick={() => setShowPasswordPrompt(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                {isRecoveryMode 
                  ? "Enter your 32-character Emergency Recovery Key to decrypt your vault and regain access."
                  : "Your security keys are missing. Enter your Master Password to recover them securely."}
              </p>

              <form onSubmit={handleRecoverKey} className="space-y-6">
                <div className="space-y-2">
                  <div className="relative">
                    {isRecoveryMode ? (
                      <ShieldCheck className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    ) : (
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    )}
                    <input
                      type={showPassword || isRecoveryMode ? "text" : "password"}
                      value={isRecoveryMode ? recoveryKey : password}
                      onChange={(e) => isRecoveryMode ? setRecoveryKey(e.target.value) : setPassword(e.target.value)}
                      placeholder={isRecoveryMode ? "Enter 32-char Recovery Key" : "Master Security Password"}
                      autoFocus
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-12 text-white placeholder:text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    {!isRecoveryMode && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    )}
                  </div>
                  {!isRecoveryMode && (
                    <button
                      type="button"
                      onClick={() => setIsRecoveryMode(true)}
                      className="text-[10px] font-black text-sky-400 uppercase tracking-widest hover:text-white transition-colors ml-1"
                    >
                      Forgot Master Password?
                    </button>
                  )}
                  {isRecoveryMode && (
                    <button
                      type="button"
                      onClick={() => setIsRecoveryMode(false)}
                      className="text-[10px] font-black text-amber-500 uppercase tracking-widest hover:text-white transition-colors ml-1"
                    >
                      Use Master Password
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isDecrypting || (isRecoveryMode ? !recoveryKey : !password)}
                  className={cn(
                    "premium-button w-full flex items-center justify-center gap-2 py-3",
                    isRecoveryMode && "border-amber-500/20 text-amber-500 bg-amber-500/5 hover:bg-amber-500 hover:text-black"
                  )}
                >
                  {isDecrypting ? <Loader2 className="h-5 w-5 animate-spin" /> : (isRecoveryMode ? "Recover with Emergency Key" : "Recover & Decrypt")}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
