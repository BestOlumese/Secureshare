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
  EyeOff,
  Copy,
  Download,
  CheckCircle2,
} from "lucide-react";
import { encryptPrivateKeyForSync, generateRecoveryKey, encryptPrivateKeyWithRecoveryKey } from "@/lib/crypto-client";

const onboardingSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  organizationName: z.string().min(2, "Organization name is too short"),
  securityPassword: z.string().min(8, "Security password must be at least 8 characters"),
});

type OnboardingData = z.infer<typeof onboardingSchema>;

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

export default function OnboardingForm({
  userEmail,
  invitation,
}: {
  userEmail: string;
  invitation?: { id: string; orgName: string; role: string };
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { organizationName: invitation?.orgName || "" },
  });

  async function generateKeys(password: string) {
    const keyPair = await window.crypto.subtle.generateKey(
      { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true,
      ["encrypt", "decrypt"]
    );
    const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
    const { encryptedKey, salt, iv } = await encryptPrivateKeyForSync(privateKeyBuffer, password);
    const newRecoveryKey = generateRecoveryKey();
    setRecoveryKey(newRecoveryKey);
    const recoveryInfo = await encryptPrivateKeyWithRecoveryKey(privateKeyBuffer, newRecoveryKey);
    await setKey("secure-share-private-key", privateKeyBuffer);
    return { publicKeyBase64, encryptedKey, salt, iv, recoveryEncryptedKey: recoveryInfo.encryptedKey, recoverySalt: recoveryInfo.salt, recoveryIV: recoveryInfo.iv };
  }

  async function onSubmit(data: OnboardingData) {
    if (step === 1) { setStep(2); return; }
    setIsLoading(true);
    try {
      const keys = await generateKeys(data.securityPassword);
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
      if (result.success) { setStep(3); toast.success("Account secured!"); }
      else { toast.error(("error" in result ? result.error : null) || "Security setup failed."); setStep(1); }
    } catch (err: any) {
      toast.error(err.message || "Security setup failed. Please try again.");
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  }

  const downloadRecoveryKey = () => {
    const el = document.createElement("a");
    const file = new Blob(
      [`SecureShare Recovery Key\n\nEmail: ${userEmail}\nRecovery Key: ${recoveryKey}\n\nKEEP THIS KEY SAFE. If you lose your Master Password, this key is the only way to recover your account.`],
      { type: "text/plain" }
    );
    el.href = URL.createObjectURL(file);
    el.download = "secureshare-recovery-key.txt";
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  };

  const card = "w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8";

  return (
    <div className="w-full max-w-md">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= s ? "w-8 bg-blue-600" : "w-4 bg-gray-200"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1 — Profile */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className={card}>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
              <p className="text-sm text-gray-500">Tell us about yourself and your organization.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input {...register("name")} placeholder="John Doe" className={inputClass} />
                </div>
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input {...register("organizationName")} placeholder="Acme Corp" disabled={!!invitation} className={inputClass} />
                </div>
                {invitation && (
                  <p className="mt-1 text-xs text-blue-600 font-medium">
                    Joining as invited {invitation.role} — organization is pre-filled
                  </p>
                )}
                {errors.organizationName && <p className="mt-1 text-xs text-red-500">{errors.organizationName.message}</p>}
              </div>

              <button
                type="button"
                onClick={async () => { const ok = await trigger(["name", "organizationName"]); if (ok) setStep(2); }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
              >
                Continue to security
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2 — Security password */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className={card}>
            <div className="mb-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Lock className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Set your security password</h1>
              <p className="text-sm text-gray-500">
                This encrypts your keys for cross-device sync.{" "}
                <span className="text-orange-500 font-semibold">Never forget it.</span>
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Master security password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    {...register("securityPassword")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    className={`${inputClass} pr-12`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.securityPassword && <p className="mt-1 text-xs text-red-500">{errors.securityPassword.message}</p>}
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700 flex gap-3">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p>SecureShare is zero-knowledge. We cannot recover your files if you lose this password.</p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="w-1/3 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldCheck className="h-4 w-4" /> Secure my account</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Step 3 — Recovery key */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className={card}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Emergency recovery key</h1>
                <p className="text-xs text-gray-500">Save this — it&apos;s your only fallback</p>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              If you forget your master password, this key is the <strong className="text-gray-800">only way</strong> to recover your account.
              Store it in a password manager or download the file.
            </p>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm text-blue-600 mb-5 gap-3">
              <span className="break-all select-all">{recoveryKey}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(recoveryKey); toast.success("Copied!"); }}
                className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 shrink-0 transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <button onClick={downloadRecoveryKey} className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <Download className="h-4 w-4" />
                Download recovery key (.txt)
              </button>
              <button onClick={() => setStep(5)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
                <CheckCircle2 className="h-4 w-4" />
                I&apos;ve saved my recovery key
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4 — Loading */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${card} text-center py-16`}>
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Encrypting your vault</h2>
            <p className="text-sm text-gray-500">Generating RSA key pair and encrypting with your security password…</p>
          </motion.div>
        )}

        {/* Step 5 — Success */}
        {step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            onAnimationComplete={() => setTimeout(() => { window.location.href = "/dashboard"; }, 2500)}
            className={`${card} text-center py-16`}
          >
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Vault secured</h2>
            <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
              Setup complete. Your encrypted keys are backed up securely. Redirecting to your dashboard…
            </p>
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.5 }}
                className="h-full bg-blue-600 rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
