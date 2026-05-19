"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CTA() {
  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl bg-blue-600 px-10 py-16 text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4 leading-tight">
            Ready to secure your organization?
          </h2>
          <p className="text-blue-100 text-base mb-10 max-w-lg mx-auto leading-relaxed">
            Join teams that trust SecureShare for their most sensitive communications.
            Get started with zero-knowledge security today — it&apos;s free.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors shadow-sm group"
          >
            Get started free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
