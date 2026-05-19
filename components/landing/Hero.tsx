"use client";

import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

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
          Zero-Knowledge End-to-End Encryption
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-6 text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-gray-900 leading-[1.05]"
        >
          Encrypted file sharing
          <br />
          <span className="text-blue-600">built for organizations.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mx-auto mb-10 max-w-2xl text-lg text-gray-500 leading-relaxed"
        >
          SecureShare lets organizations send files and messages with military-grade
          encryption. Only the intended recipient can decrypt — not even us.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 group"
          >
            Start for free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
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
          {["RSA-2048 + AES-256 encryption", "Keys never leave your device", "Audit logs for every action"].map(
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
