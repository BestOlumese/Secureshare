"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

/**
 * Every line here is checked against what the database actually stores.
 * The left column is the honest part — a product that only lists what it
 * cannot see is telling you half the story.
 */
const CAN_SEE = [
  "Your email address",
  "Who you send messages to",
  "When you sent them",
  "How large a file is, and its type",
  "Who belongs to your organization",
];

const CANNOT_SEE = [
  "Subject lines",
  "Message text",
  "File contents",
  "File names",
  "Your master password",
];

export default function Transparency() {
  return (
    <section id="transparency" className="py-24 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-medium text-blue-600 mb-3"
          >
            Full disclosure
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight"
          >
            What we can and can&apos;t see
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-3 text-gray-500 max-w-xl mx-auto"
          >
            Encryption hides content, not the fact that you sent something. Here is
            the honest split.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-gray-200 bg-gray-50 p-6"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-5">What we can see</h3>
            <ul className="space-y-3">
              {CAN_SEE.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                  <Check className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="rounded-xl border border-blue-200 bg-blue-50 p-6"
          >
            <h3 className="text-sm font-medium text-blue-700 mb-5">What we can&apos;t</h3>
            <ul className="space-y-3">
              {CANNOT_SEE.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-800">
                  <X className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          The right column isn&apos;t a policy we promise to follow. It&apos;s a
          consequence of not holding the keys.
        </p>
      </div>
    </section>
  );
}
