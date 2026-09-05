"use client";

import { motion } from "framer-motion";

/**
 * Comparison against ordinary email with attachments. Each row is something
 * SecureShare actually does today — expiry really deletes the bytes, admin
 * access really is logged.
 */
const ROWS: { label: string; email: string; secureshare: string }[] = [
  {
    label: "Who can read the contents",
    email: "You, them, and both mail providers",
    secureshare: "Only the people you chose",
  },
  {
    label: "What the provider stores",
    email: "The full message and attachments",
    secureshare: "Scrambled data it can't open",
  },
  {
    label: "If the provider is breached",
    email: "Everything is readable",
    secureshare: "There is nothing readable to take",
  },
  {
    label: "Attachment names",
    email: "Visible in the mailbox",
    secureshare: "Encrypted with the file",
  },
  {
    label: "Expiry",
    email: "Stays forever unless deleted",
    secureshare: "Deleted from storage on schedule",
  },
  {
    label: "Record of who opened it",
    email: "None",
    secureshare: "Logged, including admins",
  },
];

export default function Comparison() {
  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-medium text-blue-600 mb-3"
          >
            The difference
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight"
          >
            Against sending an attachment
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white"
        >
          <div className="grid grid-cols-[1fr] sm:grid-cols-[1.1fr_1fr_1fr]">
            {/* Header row — hidden on small screens, where each row stacks */}
            <div className="hidden sm:block px-5 py-3 border-b border-gray-200" />
            <div className="hidden sm:block px-5 py-3 border-b border-gray-200 text-sm font-medium text-gray-500">
              Email
            </div>
            <div className="hidden sm:block px-5 py-3 border-b border-gray-200 text-sm font-medium text-blue-700 bg-blue-50/50">
              SecureShare
            </div>

            {ROWS.map((row, i) => (
              <div key={row.label} className="contents">
                <div
                  className={`px-5 pt-5 sm:py-4 text-sm font-medium text-gray-900 ${
                    i > 0 ? "sm:border-t border-gray-100" : ""
                  }`}
                >
                  {row.label}
                </div>
                <div
                  className={`px-5 pb-1 sm:py-4 text-sm text-gray-500 ${
                    i > 0 ? "sm:border-t border-gray-100" : ""
                  }`}
                >
                  <span className="sm:hidden text-gray-400">Email: </span>
                  {row.email}
                </div>
                <div
                  className={`px-5 pb-5 sm:py-4 text-sm text-gray-800 bg-blue-50/50 ${
                    i > 0 ? "sm:border-t border-gray-100" : ""
                  }`}
                >
                  <span className="sm:hidden text-blue-600">SecureShare: </span>
                  {row.secureshare}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
