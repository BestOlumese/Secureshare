"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ShieldAlert, 
  Lock, 
  Key, 
  Loader2, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Copy,
  Download,
  Fingerprint
} from "lucide-react";
import { 
  decryptPrivateKeyFromSync, 
  encryptPrivateKeyForSync, 
  generateRecoveryKey, 
  encryptPrivateKeyWithRecoveryKey 
} from "@/lib/crypto-client";
import { resetMasterPassword } from "@/app/actions/security-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function ResetPasswordModal({ isOpen, onClose, user }: ResetPasswordModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Recovery Key, 2: New Password, 3: New Recovery Key (Success)
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newRecoveryKey, setNewRecoveryKey] = useState("");
  const [privateKeyBuffer, setPrivateKeyBuffer] = useState<ArrayBuffer | null>(null);

  const handleVerifyRecoveryKey = async () => {
    if (!recoveryKey) return;
    setIsLoading(true);
    try {
      const buffer = await decryptPrivateKeyFromSync(
        user.recoveryEncryptedPrivateKey,
        recoveryKey,
        user.recoverySalt,
        user.recoveryIV
      );
      setPrivateKeyBuffer(buffer);
      setStep(2);
      toast.success("Recovery key verified. Now set your new master password.");
    } catch (err) {
      toast.error("Invalid recovery key. Please check and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !privateKeyBuffer) return;
    setIsLoading(true);
    try {
      // 1. Re-encrypt with new Master Password
      const syncInfo = await encryptPrivateKeyForSync(privateKeyBuffer, newPassword);

      // 2. Rotate Recovery Key: Generate a new one
      const rotatedRecoveryKey = generateRecoveryKey();
      setNewRecoveryKey(rotatedRecoveryKey);

      // 3. Encrypt with new Recovery Key
      const recoveryInfo = await encryptPrivateKeyWithRecoveryKey(privateKeyBuffer, rotatedRecoveryKey);

      // 4. Update Server
      const result = await resetMasterPassword({
        encryptedPrivateKey: syncInfo.encryptedKey,
        privateKeySalt: syncInfo.salt,
        privateKeyIV: syncInfo.iv,
        recoveryEncryptedPrivateKey: recoveryInfo.encryptedKey,
        recoverySalt: recoveryInfo.salt,
        recoveryIV: recoveryInfo.iv,
      });

      if (result.success) {
        setStep(3);
        toast.success("Master password has been reset and recovery key rotated!");
      }
    } catch (err) {
      toast.error("Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadNewRecoveryKey = () => {
    const element = document.createElement("a");
    const file = new Blob([`SecureMail NEW Recovery Key\n\nEmail: ${user.email}\nNew Recovery Key: ${newRecoveryKey}\n\nKEEP THIS KEY SAFE. Your old recovery key is now invalid.`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "securemail-new-recovery-key.txt";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Fingerprint className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold uppercase italic tracking-tight text-white">Reset Vault Password</h2>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {step === 1 && (
                <div className="space-y-6">
                  <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-widest font-black">
                    Phase 1: Verify Ownership
                  </p>
                  <p className="text-sm text-slate-400">
                    Enter your 32-character Emergency Recovery Key to prove you own this vault.
                  </p>
                  <div className="space-y-2">
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600" />
                      <input
                        type="text"
                        value={recoveryKey}
                        onChange={(e) => setRecoveryKey(e.target.value)}
                        placeholder="Enter 32-char Recovery Key"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-4 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleVerifyRecoveryKey}
                    disabled={isLoading || !recoveryKey}
                    className="premium-button w-full flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Recovery Key"}
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <p className="text-xs text-sky-400 leading-relaxed uppercase tracking-widest font-black">
                    Phase 2: Set New Password
                  </p>
                  <p className="text-sm text-slate-400">
                    Set a new Master Security Password. We will re-encrypt your vault with this password.
                  </p>
                  <div className="space-y-2">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Master Password"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-12 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleResetPassword}
                    disabled={isLoading || !newPassword}
                    className="premium-button w-full flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Vault Password"}
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">Security Rotated</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Your password has been changed. We have also **invalidated your old recovery key** and generated a new one. Download it now!
                  </p>
                  
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-sky-400 break-all select-all selection:bg-sky-500 selection:text-white">
                    {newRecoveryKey}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={downloadNewRecoveryKey}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Download className="h-4 w-4" />
                      Download New Key
                    </button>
                    <button
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="premium-button w-full"
                    >
                      Finish & Reload
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Warning Footer */}
            {step !== 3 && (
              <div className="mt-4 border-t border-slate-800/50 bg-slate-900/30 p-4">
                <div className="flex gap-3 text-[10px] text-amber-500 font-bold uppercase tracking-widest leading-relaxed">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <p>Resetting your password will regenerate your recovery key. Your previous recovery key will no longer work.</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
