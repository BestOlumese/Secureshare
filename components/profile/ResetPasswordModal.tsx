"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert, Lock, Key, Loader2, CheckCircle2, Eye, EyeOff, Copy, Download, Fingerprint } from "lucide-react";
import { decryptPrivateKeyFromSync, encryptPrivateKeyForSync, generateRecoveryKey, encryptPrivateKeyWithRecoveryKey } from "@/lib/crypto-client";
import { resetMasterPassword } from "@/app/actions/security-actions";
import { toast } from "sonner";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { assessPassword } from "@/lib/password-strength";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import type { CurrentUser } from "@/lib/types";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: CurrentUser;
}

export default function ResetPasswordModal({ isOpen, onClose, user }: ResetPasswordModalProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(isOpen, onClose);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newRecoveryKey, setNewRecoveryKey] = useState("");
  const [privateKeyBuffer, setPrivateKeyBuffer] = useState<ArrayBuffer | null>(null);

  const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10";

  const handleVerifyRecoveryKey = async () => {
    if (!recoveryKey) return;
    // An account onboarded before emergency recovery existed has no blob to
    // verify against — say so rather than failing as "invalid key".
    if (!user.recoveryEncryptedPrivateKey || !user.recoverySalt || !user.recoveryIV) {
      toast.error("No recovery key on this account.");
      return;
    }
    setIsLoading(true);
    try {
      const buffer = await decryptPrivateKeyFromSync(user.recoveryEncryptedPrivateKey, recoveryKey, user.recoverySalt, user.recoveryIV, user.kdfIterations);
      setPrivateKeyBuffer(buffer);
      setStep(2);
      toast.success("Verified");
    } catch { toast.error("That recovery key doesn't match."); }
    finally { setIsLoading(false); }
  };

  const passwordCheck = assessPassword(newPassword);

  const handleResetPassword = async () => {
    if (!newPassword || !privateKeyBuffer) return;
    // Guarded here as well as on the button: this is the only enforcement
    // point, since the password is never sent to the server.
    if (!passwordCheck.acceptable) {
      toast.error("Pick a stronger password.");
      return;
    }
    setIsLoading(true);
    try {
      const syncInfo = await encryptPrivateKeyForSync(privateKeyBuffer, newPassword);
      const rotatedRecoveryKey = generateRecoveryKey();
      setNewRecoveryKey(rotatedRecoveryKey);
      const recoveryInfo = await encryptPrivateKeyWithRecoveryKey(privateKeyBuffer, rotatedRecoveryKey);
      const result = await resetMasterPassword({
        encryptedPrivateKey: syncInfo.encryptedKey,
        privateKeySalt: syncInfo.salt,
        privateKeyIV: syncInfo.iv,
        recoveryEncryptedPrivateKey: recoveryInfo.encryptedKey,
        recoverySalt: recoveryInfo.salt,
        recoveryIV: recoveryInfo.iv,
        // Both blobs are freshly derived, so they share the current count.
        kdfIterations: syncInfo.iterations,
      });
      if (result.success) { setStep(3); toast.success("Password changed"); }
    } catch { toast.error("Couldn't reset your password. Try again."); }
    finally { setIsLoading(false); }
  };

  const downloadNewRecoveryKey = () => {
    const el = document.createElement("a");
    const file = new Blob([`SecureShare NEW Recovery Key\n\nEmail: ${user.email}\nNew Recovery Key: ${newRecoveryKey}\n\nKEEP THIS KEY SAFE. Your old recovery key is now invalid.`], { type: "text/plain" });
    el.href = URL.createObjectURL(file);
    el.download = "secureshare-new-recovery-key.txt";
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="reset-password-title" tabIndex={-1} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden outline-none">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <h2 id="reset-password-title" className="text-base font-bold text-gray-900">Reset your password</h2>
              </div>
              <button onClick={onClose} aria-label="Close reset password" className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {step === 1 && (
                <>
                  <p className="text-xs font-bold text-blue-600">Step 1 — Prove it&apos;s you</p>
                  <p className="text-sm text-gray-500">Enter the recovery key you saved at setup.</p>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={recoveryKey} onChange={(e) => setRecoveryKey(e.target.value)} placeholder="Enter Recovery Key" className={inputClass} />
                  </div>
                  <button onClick={handleVerifyRecoveryKey} disabled={isLoading || !recoveryKey} className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Recovery Key"}
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <p className="text-xs font-bold text-blue-600">Step 2 — New password</p>
                  <p className="text-sm text-gray-500">Your keys get re-encrypted with it.</p>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Master Password" className={`${inputClass} pr-12`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={newPassword} />
                  <button onClick={handleResetPassword} disabled={isLoading || !passwordCheck.acceptable} className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
                  </button>
                </>
              )}

              {step === 3 && (
                <div className="text-center space-y-5">
                  <div className="h-14 w-14 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Password Reset</h3>
                    <p className="text-sm text-gray-500">Your old recovery key no longer works. Save the new one.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-blue-600 break-all">
                    <span className="flex-1 select-all">{newRecoveryKey}</span>
                    <button onClick={() => { navigator.clipboard.writeText(newRecoveryKey); toast.success("Copied"); }} className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 shrink-0">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={downloadNewRecoveryKey} className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                      <Download className="h-4 w-4" /> Download
                    </button>
                    <button onClick={() => window.location.reload()} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
                      Finish
                    </button>
                  </div>
                </div>
              )}
            </div>

            {step !== 3 && (
              <div className="border-t border-gray-100 bg-orange-50 p-4 flex gap-2 text-xs text-orange-600">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Resetting your password will regenerate your recovery key. Your previous recovery key will no longer work.</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
