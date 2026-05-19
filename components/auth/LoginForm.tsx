"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Mail, ShieldCheck, Loader2, ArrowRight, ArrowLeft } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const otpSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

export default function LoginForm() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpArray, setOtpArray] = useState<string[]>(new Array(6).fill(""));

  useEffect(() => {
    otpForm.setValue("code", otpArray.join(""));
  }, [otpArray, otpForm]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    const newOtpArray = [...otpArray];
    newOtpArray[index] = value;
    setOtpArray(newOtpArray);
    if (value && index < 5) otpInputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpArray[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    if (pastedData.every((char) => /^\d$/.test(char))) {
      const newOtpArray = [...otpArray];
      pastedData.forEach((char, i) => { if (i < 6) newOtpArray[i] = char; });
      setOtpArray(newOtpArray);
      const focusIndex = Math.min(pastedData.length, 5);
      otpInputs.current[focusIndex]?.focus();
    }
  };

  async function onEmailSubmit(data: z.infer<typeof emailSchema>) {
    setIsLoading(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: data.email,
        type: "sign-in",
      });
      if (error) {
        toast.error(error.message || "Failed to send OTP");
      } else {
        setEmail(data.email);
        setStep("otp");
        toast.success("Verification code sent!");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onOtpSubmit(data: z.infer<typeof otpSchema>) {
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email,
        otp: data.code,
      });
      if (error) {
        toast.error(error.message || "Invalid or expired code");
      } else {
        toast.success("Welcome to SecureShare!");
        window.location.href = "/onboarding";
      }
    } catch {
      toast.error("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <AnimatePresence mode="wait">
        {step === "email" ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
          >
            <div className="mb-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
              <p className="text-sm text-gray-500">Enter your email to receive a secure login code.</p>
            </div>

            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    {...emailForm.register("email")}
                    type="email"
                    placeholder="name@company.com"
                    autoFocus
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                {emailForm.formState.errors.email && (
                  <p className="mt-1.5 text-xs text-red-500">{emailForm.formState.errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 group"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send login code
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
          >
            <div className="mb-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Mail className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Check your email</h1>
              <p className="text-sm text-gray-500">
                We sent a 6-digit code to <span className="font-semibold text-gray-700">{email}</span>
              </p>
            </div>

            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
              <div>
                <div className="flex justify-between gap-2">
                  {otpArray.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { otpInputs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white text-center text-xl font-bold text-gray-900 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                    />
                  ))}
                </div>
                <input type="hidden" {...otpForm.register("code")} />
                {otpForm.formState.errors.code && (
                  <p className="mt-2 text-center text-xs text-red-500">{otpForm.formState.errors.code.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || otpArray.some((d) => !d)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
              </button>

              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Use a different email
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
