"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Zap, ArrowRight, Share2, Globe, Cpu, Users } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-32 pb-20">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[150px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[150px] animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-sky-500/20 bg-sky-500/5 px-5 py-2 text-xs font-black uppercase tracking-[0.2em] text-sky-400 backdrop-blur-md"
        >
          <Shield className="h-4 w-4" />
          <span>Zero-Knowledge Architecture</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 text-7xl font-black tracking-tight text-white md:text-9xl leading-[0.9]"
        >
          Share Files with <br />
          <span className="bg-linear-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">
            Ironclad Security
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mb-12 max-w-2xl text-lg text-slate-400 md:text-xl font-medium leading-relaxed"
        >
          SecureShare redefines communication for the modern era. End-to-end encryption 
          with local key management ensures your data remains yours. Always.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link href="/login" className="premium-button group px-10 whitespace-nowrap inline-flex items-center justify-center">
            Get Started
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 shrink-0" />
          </Link>
          <Link href="/login" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/30 px-10 py-3.5 font-bold text-slate-300 backdrop-blur-md transition-all hover:bg-slate-800 hover:text-white whitespace-nowrap">
            Login
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
