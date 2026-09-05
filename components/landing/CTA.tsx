"use client";

import { motion } from "framer-motion";
import { AuthCta } from "./AuthCta";

export default function CTA() {
  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-xl bg-blue-600 px-10 py-16 text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-4 leading-tight">
            Start sending securely
          </h2>
          <p className="text-blue-100 text-base mb-10 max-w-lg mx-auto leading-relaxed">
            Free to use. Set up takes a couple of minutes.
          </p>
          <AuthCta className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-3.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors" />
        </motion.div>
      </div>
    </section>
  );
}
