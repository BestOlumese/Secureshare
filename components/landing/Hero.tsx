"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { AuthCta } from "./AuthCta";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 pb-20 bg-white overflow-hidden">
      {/* Subtle background blobs */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-50 rounded-full blur-[120px] opacity-60" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-600"
        >
          <Lock className="h-3.5 w-3.5" />
          End-to-end encrypted
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-6 text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-gray-900 leading-[1.05]"
        >
          Send files nobody else
          <br />
          <span className="text-blue-600">can read.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mx-auto mb-10 max-w-2xl text-lg text-gray-500 leading-relaxed"
        >
          Messages and files are locked in your browser before they reach us.
          Only the people you send them to can open them. We can&apos;t.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <AuthCta className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-7 py-3.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors" />
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-7 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            See how it works
          </a>
        </motion.div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-gray-400"
        >
          {["Encrypted in your browser", "Your keys stay on your device", "Every action logged"].map(
            (item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {item}
              </div>
            )
          )}
        </motion.div>
      </div>
    </section>
  );
}
