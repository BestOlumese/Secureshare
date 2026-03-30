"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Zap, ArrowRight, Share2 } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-20">
      {/* Background Orbs */}
      <div className="absolute top-1/4 -left-20 h-96 w-96 rounded-full bg-sky-500/10 blur-[120px]" />
      <div className="absolute bottom-1/4 -right-20 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/5 px-4 py-1.5 text-sm font-medium text-sky-400 backdrop-blur-md"
        >
          <Shield className="h-4 w-4" />
          <span>Zero-Knowledge Architecture</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 text-6xl font-extrabold tracking-tight text-white md:text-8xl"
        >
          Share Files with <br />
          <span className="bg-linear-to-r from-sky-400 to-indigo-500
 bg-clip-text text-transparent">
            Ironclad Security
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mb-10 max-w-2xl text-lg text-slate-400 md:text-xl"
        >
          SecureShare uses end-to-end encryption to ensure your files are only seen
          by the intended recipient. No one else, not even us, can access your data.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/login"
            className="premium-button flex items-center gap-2"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-3 font-semibold text-white backdrop-blur-md transition-all hover:bg-slate-800">
            View Source
          </button>
        </motion.div>
      </div>

      {/* Feature Grid */}
      <div className="mt-24 grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
        {[
          {
            icon: Lock,
            title: "End-to-End Encryption",
            desc: "Files are encrypted in your browser using AES-256 before being uploaded.",
          },
          {
            icon: Share2,
            title: "Secure Key Exchange",
            desc: "RSA-OAEP ensures only the intended recipient can decrypt the file.",
          },
          {
            icon: Zap,
            title: "Instant Verification",
            desc: "Passwordless OTP login keeps your account accessible and ultra-secure.",
          },
        ].map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
            className="group glass-card p-8 transition-all hover:-translate-y-2"
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <feature.icon className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">{feature.title}</h3>
            <p className="text-slate-400">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
