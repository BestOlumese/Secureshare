"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Mail, ShieldCheck, Loader2, ArrowRight } from "lucide-react";

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
  const otpValues = useState<string[]>(new Array(6).fill(""));
  const [otpArray, setOtpArray] = otpValues;

  // Sync otpArray with react-hook-form
  useEffect(() => {
    otpForm.setValue("code", otpArray.join(""));
  }, [otpArray, otpForm]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1); // Only take last char if multiple
    if (!/^\d*$/.test(value)) return; // Only digits

    const newOtpArray = [...otpArray];
    newOtpArray[index] = value;
    setOtpArray(newOtpArray);

    // Move to next input if value is entered
    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpArray[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    if (pastedData.every(char => /^\d$/.test(char))) {
      const newOtpArray = [...otpArray];
      pastedData.forEach((char, i) => {
        if (i < 6) newOtpArray[i] = char;
      });
      setOtpArray(newOtpArray);
      // Focus last filled input or the 6th one
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
        toast.success("Verification code sent to your email!");
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onOtpSubmit(data: z.infer<typeof otpSchema>) {
    setIsLoading(true);
    console.log("Verifying code for:", email, "with code:", data.code);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email,
        otp: data.code, // Client expects 'otp' but I'll try both or just ensure it's not undefined
      });

      if (error) {
        toast.error(error.message || "Invalid or expired code");
      } else {
        toast.success("Welcome back to SecureShare!");
        window.location.href = "/onboarding"; // Redirect to onboarding check
      }
    } catch (err) {
      toast.error("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait">
        {step === "email" ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="glass-card p-8"
          >
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
              <p className="text-slate-400">
                Enter your email to receive a secure login code.
              </p>
            </div>

            <form
              onSubmit={emailForm.handleSubmit(onEmailSubmit)}
              className="space-y-4"
            >
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  {...emailForm.register("email")}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                {emailForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-400">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="premium-button flex w-full items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Send Login Code"
                )}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-card p-8"
          >
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                <Mail className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                Check Your Email
              </h1>
              <p className="text-slate-400">
                We've sent a 6-digit code to {email}
              </p>
            </div>

            <form
              onSubmit={otpForm.handleSubmit(onOtpSubmit)}
              className="space-y-6"
            >
              <div className="flex justify-between gap-2">
                {otpArray.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="h-14 w-full rounded-xl border border-slate-800 bg-slate-900/50 text-center text-2xl font-bold text-white transition-all focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                ))}
              </div>
              <input type="hidden" {...otpForm.register("code")} />
              {otpForm.formState.errors.code && (
                <p className="text-center text-sm text-red-400">
                  {otpForm.formState.errors.code.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="premium-button flex w-full items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Verify & Sign In"
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-sm font-medium text-slate-500 transition-colors hover:text-sky-400"
              >
                Use a different email address
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
