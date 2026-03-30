"use client";

import { useState } from "react";
import { 
  ShieldAlert, 
  Key, 
  Download, 
  RefreshCw, 
  Loader2, 
  Lock, 
  Eye, 
  EyeOff,
  Copy,
  CheckCircle2,
  RotateCcw,
  ChevronRight
} from "lucide-react";
import { 
  decryptPrivateKeyFromSync, 
  exportPrivateKeyForManualBackup,
  generateRecoveryKey,
  encryptPrivateKeyWithRecoveryKey
} from "@/lib/crypto-client";
import { toast } from "sonner";
import ResetPasswordModal from "./ResetPasswordModal";

interface SecurityCenterProps {
  user: any;
}

export default function SecurityCenter({ user }: SecurityCenterProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newRecoveryKey, setNewRecoveryKey] = useState<string | null>(null);

  const handleExportPrivateKey = async () => {
    if (!password) {
      toast.error("Please enter your Master Password to unlock your vault.");
      return;
    }

    setIsExporting(true);
    try {
      if (!user.encryptedPrivateKey || !user.privateKeySalt || !user.privateKeyIV) {
        throw new Error("No encrypted key found on server.");
      }

      const buffer = await decryptPrivateKeyFromSync(
        user.encryptedPrivateKey,
        password,
        user.privateKeySalt,
        user.privateKeyIV
      );

      const base64Key = exportPrivateKeyForManualBackup(buffer);
      const blob = new Blob([base64Key], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `securemail-private-key-${user.email}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Private key exported successfully!");
      setPassword("");
    } catch (err: any) {
      toast.error("Invalid Master Password or decryption failed.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="glass-card p-8 border-emerald-500/10 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <h3 className="text-xl font-bold uppercase tracking-tight text-white">Security Center</h3>
      </div>

      <p className="text-sm text-slate-400 mb-8 leading-relaxed">
        Manage your zero-knowledge encryption keys. Your Master Password is used to unlock these actions.
      </p>

      <div className="space-y-6 flex-1">
        {/* Password Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
            Unlock Vault
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Master Password"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-12 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="grid gap-3">
          <button
            onClick={handleExportPrivateKey}
            disabled={isExporting}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-800/50 hover:border-emerald-500/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-emerald-400 transition-colors">
                <Key className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Export Private Key</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Manual Backup</p>
              </div>
            </div>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin text-emerald-400" /> : <Download className="h-4 w-4 text-slate-600 group-hover:text-white" />}
          </button>

          <button
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-800/50 hover:border-sky-500/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-sky-400 transition-colors">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Reset Master Password</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Requires Recovery Key</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-white" />
          </button>

          <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5">
            <p className="text-[10px] text-amber-500 leading-relaxed italic">
              Warning: Exporting your private key allows anyone with the file to decrypt your messages. Store it securely!
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Zero-Knowledge Active
        </div>
      </div>

      <ResetPasswordModal 
        isOpen={isResetModalOpen} 
        onClose={() => setIsResetModalOpen(false)} 
        user={user} 
      />
    </section>
  );
}
