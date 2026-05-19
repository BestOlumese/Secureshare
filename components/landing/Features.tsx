"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Share2, History, Key, Cpu, RefreshCw } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Zero-Knowledge Storage",
    description: "We never hold your keys. Your data is encrypted locally before it ever reaches our servers.",
  },
  {
    icon: Share2,
    title: "Cross-Org Collaboration",
    description: "Securely bridge communication between different organizations without compromising security.",
  },
  {
    icon: History,
    title: "Immutable Audit Logs",
    description: "Track every interaction across organizations with enterprise-grade transparency.",
  },
  {
    icon: Key,
    title: "Per-Recipient Key Wrapping",
    description: "Each recipient gets their own encrypted copy of the AES key — no shared secrets.",
  },
  {
    icon: Cpu,
    title: "Client-Side Cryptography",
    description: "RSA-2048 and AES-256-GCM encryption runs directly in your browser. Nothing leaves unencrypted.",
  },
  {
    icon: RefreshCw,
    title: "Cross-Device Recovery",
    description: "Sync your vault across devices securely using your master password or emergency recovery key.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3"
          >
            Features
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4"
          >
            Built for security, designed for teams
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="max-w-xl mx-auto text-gray-500"
          >
            Every feature is engineered with privacy as the foundation, not an afterthought.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="group p-6 rounded-2xl border border-gray-200 bg-white hover:border-blue-200 hover:shadow-md transition-all duration-300"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
