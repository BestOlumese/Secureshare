"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Answers describe how the app actually behaves — the recovery key really is
 * the only fallback, vault reads really are logged, expiry really deletes.
 * Nothing here promises behaviour the code doesn't have.
 */
const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "What if I forget my master password?",
    a: "Your recovery key is the only way back in. We can't reset the password, because we never had it — it never leaves your browser. Save the recovery key somewhere safe when you sign up.",
  },
  {
    q: "Can my organization's admins read my messages?",
    a: "Only messages that were shared with the organization, not your personal ones. And every time an admin opens one that way, it's written to the audit log with their name and the time.",
  },
  {
    q: "What happens when a message expires?",
    a: "It disappears from every inbox and the attached files are deleted from storage. Not hidden behind a flag — the encrypted bytes are removed, so nobody can recover them afterwards. Not us either.",
  },
  {
    q: "Can I send to someone outside my organization?",
    a: "Yes. They need a SecureShare account so there's a key to send to, but they don't need to be in your organization. Cross-organization messages are logged on both sides.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. The encryption runs in your browser using the crypto built into it. There's no extension, plugin, or desktop app to manage.",
  },
  {
    q: "What happens if I lose my laptop?",
    a: "Sign in from another device and revoke the old session from your profile. Your key is stored encrypted, so whoever has the laptop still needs your master password to open anything.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-medium text-blue-600 mb-3"
          >
            Questions
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight"
          >
            Common questions
          </motion.h2>
        </div>

        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">{item.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-gray-400 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
