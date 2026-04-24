"use client";

import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Share2, 
  Eye, 
  History, 
  Cpu, 
  Fingerprint,
  Zap,
  Lock
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Zero-Knowledge Storage",
    description: "We don't hold your keys. Your data is encrypted locally before it ever reaches the cloud.",
    color: "bg-sky-500"
  },
  {
    icon: Share2,
    title: "Cross-Org Collaboration",
    description: "Securely bridge communication between different organizations without compromising security.",
    color: "bg-indigo-500"
  },
  {
    icon: History,
    title: "Immutable Audit Logs",
    description: "Track every interaction across organizations with enterprise-grade transparency and accountability.",
    color: "bg-emerald-500"
  },
  {
    icon: Fingerprint,
    title: "MFA Authentication",
    description: "Biometric and hardware key support ensures only authorized personnel can access the vault.",
    color: "bg-amber-500"
  },
  {
    icon: Cpu,
    title: "Client-Side Cryptography",
    description: "Advanced RSA and AES-256 encryption engines running directly in your browser.",
    color: "bg-rose-500"
  },
  {
    icon: Zap,
    title: "Instant Secure Sync",
    description: "Sync your encrypted vault across all devices securely using your master password.",
    color: "bg-violet-500"
  }
];

export default function Features() {
  return (
    <section id="features" className="relative py-32 px-6 bg-[#020617]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-black uppercase tracking-widest border border-sky-500/20 mb-6"
          >
            <Lock className="h-3 w-3" />
            Enterprise Security
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-6"
          >
            Engineered for <span className="text-sky-500">Total Privacy</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-slate-400 text-lg font-medium"
          >
            SecureShare combines the ease of modern messaging with the security 
            of a private vault. Every feature is built with privacy at its core.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 rounded-[32px] bg-slate-900/40 border border-slate-800/60 hover:border-sky-500/50 hover:bg-slate-900/60 transition-all duration-500"
            >
              <div className={`mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.color} text-white shadow-lg shadow-${feature.color.split('-')[1]}-500/20 group-hover:scale-110 transition-transform duration-500`}>
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 tracking-tight group-hover:text-sky-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
