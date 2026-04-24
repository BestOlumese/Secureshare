"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { set as setKey } from "idb-keyval";
import { completeOnboarding } from "@/app/actions/onboarding";
import { 
  Building2, 
  User as UserIcon, 
  ShieldCheck, 
  Loader2, 
  ChevronRight,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { encryptPrivateKeyForSync, generateRecoveryKey, encryptPrivateKeyWithRecoveryKey } from "@/lib/crypto-client";
import { Copy, Download, CheckCircle2 } from "lucide-react";

const onboardingSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  organizationName: z.string().min(2, "Organization name is too short"),
  securityPassword: z.string().min(8, "Security password must be at least 8 characters"),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

export default function OnboardingForm({ 
  userEmail, 
  invitation 
}: { 
  userEmail: string, 
  invitation?: { id: string, orgName: string, role: string } 
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1); 
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");

  const { register, handleSubmit, trigger, formState: { errors } } = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      organizationName: invitation?.orgName || "",
    }
  });

  async function generateKeys(password: string) {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    // 1. Export Public Key for server
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
    
    // 2. Encrypt Private Key for Server-Side Sync (Cross-device support)
    const { encryptedKey, salt, iv } = await encryptPrivateKeyForSync(privateKeyBuffer, password);

    // 4. Generate & Encrypt with Recovery Key
    const newRecoveryKey = generateRecoveryKey();
    setRecoveryKey(newRecoveryKey);

    const recoveryInfo = await encryptPrivateKeyWithRecoveryKey(privateKeyBuffer, newRecoveryKey);

    // 3. Save raw private key to local IndexedDB for immediate use
    await setKey("secure-share-private-key", privateKeyBuffer);

    return { 
      publicKeyBase64, 
      encryptedKey, 
      salt, 
      iv, 
      recoveryEncryptedKey: recoveryInfo.encryptedKey,
      recoverySalt: recoveryInfo.salt,
      recoveryIV: recoveryInfo.iv
    };
  }

  async function onSubmit(data: OnboardingData) {
    if (step === 1) {
      setStep(2);
      return;
    }

    setIsLoading(true);
    try {
      const keys = await generateKeys(data.securityPassword);
      
      // Call Server Action
      const result = await completeOnboarding({
        name: data.name,
        organizationName: data.organizationName,
        publicKey: keys.publicKeyBase64,
        encryptedPrivateKey: keys.encryptedKey,
        privateKeySalt: keys.salt,
        privateKeyIV: keys.iv,
        recoveryEncryptedPrivateKey: keys.recoveryEncryptedKey,
        recoverySalt: keys.recoverySalt,
        recoveryIV: keys.recoveryIV,
      });

      if (result.success) {
        setStep(3); // Go to Recovery Key Step
        toast.success("Account secured!");
      } else {
        toast.error(result.error || "Security setup failed.");
        setStep(1);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Security setup failed. Please try again.");
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  }

  const downloadRecoveryKey = () => {
    const element = document.createElement("a");
    const file = new Blob([`SecureMail Recovery Key\n\nEmail: ${userEmail}\nRecovery Key: ${recoveryKey}\n\nKEEP THIS KEY SAFE. If you lose your Master Password, this key is the only way to recover your account.`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "securemail-recovery-key.txt";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="w-full max-w-lg">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="glass-card p-8"
          >
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white">Create Your Account</h1>
              <p className="text-slate-400">Tell us a bit about yourself and your team.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Your Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    {...register("name")}
                    placeholder="John Doe"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-4 text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Organization Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    {...register("organizationName")}
                    placeholder="Acme Corp"
                    disabled={!!invitation}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-4 text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {invitation && (
                    <p className="mt-1 text-[10px] text-sky-400 font-bold uppercase tracking-widest">
                      You are joining as an invited {invitation.role}
                    </p>
                  )}
                  {errors.organizationName && <p className="mt-1 text-sm text-red-400">{errors.organizationName.message}</p>}
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  const isValid = await trigger(["name", "organizationName"]);
                  if (isValid) setStep(2);
                }}
                className="premium-button flex w-full items-center justify-center gap-2"
              >
                Continue to Security
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-card p-8"
          >
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                  <Lock className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold text-white">Security Password</h1>
              </div>
              <p className="text-slate-400">This password encrypts your security keys for cross-device sync. <span className="text-sky-400 font-medium">Never forget it.</span></p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Master Security Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    {...register("securityPassword")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-12 text-white placeholder:text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                  {errors.securityPassword && <p className="mt-1 text-sm text-red-400">{errors.securityPassword.message}</p>}
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
                <div className="flex gap-3">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <p>SecureMail is zero-knowledge. If you lose this password, we cannot recover your files. Keep it in a safe place.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 rounded-xl border border-slate-800 bg-slate-900/50 py-3 font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="premium-button flex-1 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Secure My Account"}
                  {!isLoading && <ShieldCheck className="h-4 w-4" />}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="glass-card p-8"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold text-white">Emergency Recovery Key</h1>
            </div>

            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              If you forget your master password, this key is the <b>only way</b> to recover your account. Store it in a password manager or write it down.
            </p>

            <div className="group relative mb-6">
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm text-sky-400 selection:bg-sky-500 selection:text-white">
                <span className="break-all">{recoveryKey}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(recoveryKey);
                    toast.success("Recovery key copied!");
                  }}
                  className="ml-4 p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={downloadRecoveryKey}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                Download Recovery Key (.txt)
              </button>
              
              <button
                onClick={() => setStep(5)}
                className="premium-button flex w-full items-center justify-center gap-2"
              >
                I have saved my Recovery Key
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="glass-card p-12 text-center"
          >
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-sky-500/20" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-sky-500/10 text-sky-400">
                  <Loader2 className="h-10 w-10 animate-spin" />
                </div>
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">Encrypting Vault</h2>
            <p className="mx-auto max-w-sm text-slate-400">
              Generating your RSA key pair and encrypting them with your security password for safe cross-device backup...
            </p>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onAnimationComplete={() => {
              setTimeout(() => {
                window.location.href = "/dashboard";
              }, 3000);
            }}
            className="glass-card p-12 text-center"
          >
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="h-12 w-12" />
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">Vault Secured</h2>
            <p className="mx-auto mb-8 max-w-sm text-slate-400">
              Setup complete. Your RSA keys are encrypted and mirrored to your secure cloud profile. You can now access your encrypted files from any device.
            </p>
            <div className="flex h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 3 }}
                className="bg-emerald-500" 
              />
            </div>
            <p className="mt-4 text-xs text-slate-500">Redirecting to Dashboard...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
