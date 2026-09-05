"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Share2, History, Key, Laptop, RefreshCw } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "We can't read your files",
    description: "Everything is locked on your device first. We only ever store scrambled data.",
  },
  {
    icon: Share2,
    title: "Works between companies",
    description: "Send to people at other organizations without either side giving up control.",
  },
  {
    icon: History,
    title: "A record of everything",
    description: "Who sent what, who opened it, and when. Including your own admins.",
  },
  {
    icon: Key,
    title: "A separate key per person",
    description: "Everyone gets their own way in, so one leak can't unlock the rest.",
  },
  {
    icon: Laptop,
    title: "Nothing leaves unlocked",
    description: "Encryption happens in your browser, before anything is uploaded.",
  },
  {
    icon: RefreshCw,
    title: "Use it anywhere",
    description: "Your master password unlocks your messages on any device you sign in from.",
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
            className="text-xs font-bold text-blue-600 mb-3"
          >
            Features
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight mb-4"
          >
            What you get
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="max-w-xl mx-auto text-gray-500"
          >
            The privacy is structural, not a setting you turn on.
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
              className="group p-6 rounded-xl border border-gray-200 bg-white hover:border-blue-200 hover:transition-all duration-300"
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
