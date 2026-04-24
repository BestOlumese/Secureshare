"use client";

import React, { useState } from "react";
import { 
  unwrapAesKey, 
  decryptString, 
  decryptPrivateKeyFromSync 
} from "@/lib/crypto-client";
import { getMessageMetadata, getUserKeySyncInfo } from "@/app/actions/documents";
import { AnimatePresence, motion } from "framer-motion";
import { X, Lock, Eye, EyeOff, Key, Loader2, ShieldCheck, LockOpen } from "lucide-react";
import { set as setKey, get as getKey } from "idb-keyval";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DecryptMessageTextProps {
  messageId: string;
}

export default function DecryptMessageText({ messageId }: DecryptMessageTextProps) {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);

  async function handleDecrypt(recoveredKeyBuffer?: ArrayBuffer) {
    setIsDecrypting(true);

    const decryptPromise = async () => {
      // 1. Get Private Key from IndexedDB or recovered buffer
      let privateKeyBuffer = recoveredKeyBuffer || await getKey("secure-share-private-key");
      
      if (!privateKeyBuffer) {
        setIsDecrypting(false);
        setShowPasswordPrompt(true);
        throw new Error("RECOVERY_REQUIRED");
      }
      
      const { content, encryptedAesKey } = await getMessageMetadata(messageId);
      
      if (!content) {
        return "Message is empty.";
      }

      const aesKey = await unwrapAesKey(encryptedAesKey, privateKeyBuffer as ArrayBuffer);
      const plainText = await decryptString(content, aesKey);
      
      setDecryptedText(plainText);
      return "Message decrypted successfully!";
    };

    toast.promise(decryptPromise(), {
      loading: "Decrypting message...",
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
      const recoveredKeyBuffer = await decryptPrivateKeyFromSync(
        syncInfo.encryptedPrivateKey,
        password,
        syncInfo.salt,
        syncInfo.iv
      );
      
      await setKey("secure-share-private-key", recoveredKeyBuffer);
      setShowPasswordPrompt(false);
      setPassword("");
      
      await handleDecrypt(recoveredKeyBuffer);
      return "Security key recovered!";
    };

    toast.promise(recoveryPromise(), {
      loading: "Recovering security keys...",
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

  if (decryptedText !== null) {
    return (
      <div className="p-6 rounded-2xl bg-sky-900/10 border border-sky-500/20 text-slate-200">
        <p className="whitespace-pre-wrap leading-relaxed">{decryptedText}</p>
        <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          Decrypted Locally
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800 border-dashed text-center">
        <Lock className="h-8 w-8 mx-auto mb-4 text-slate-700" />
        <p className="text-slate-400 mb-6">This message content is protected by Zero-Knowledge encryption.</p>
        <button
          onClick={() => handleDecrypt()}
          disabled={isDecrypting}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-6 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {isDecrypting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LockOpen className="h-5 w-5" />
          )}
          Decrypt Message
        </button>
      </div>

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
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                    <Key className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Recover Vault
                  </h2>
                </div>
                <button onClick={() => setShowPasswordPrompt(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Your security keys are missing. Enter your Master Password to recover them securely.
              </p>

              <form onSubmit={handleRecoverKey} className="space-y-6">
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Master Security Password"
                      autoFocus
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-12 text-white placeholder:text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isDecrypting || !password}
                  className="premium-button w-full flex items-center justify-center gap-2 py-3"
                >
                  {isDecrypting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Recover & Decrypt"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
