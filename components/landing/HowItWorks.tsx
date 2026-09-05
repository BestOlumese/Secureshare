"use client";

import { motion } from "framer-motion";
import { Upload, Send, Unlock } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "You lock it",
    description:
      "Your file is scrambled in your browser before it goes anywhere. We only ever receive the scrambled version.",
  },
  {
    number: "02",
    icon: Send,
    title: "We carry it",
    description:
      "We pass it along without being able to look inside. Everyone you sent it to gets their own key.",
  },
  {
    number: "03",
    icon: Unlock,
    title: "They unlock it",
    description:
      "Only the people you chose can open it, using a key that never leaves their own device.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-bold text-blue-600 mb-3"
          >
            How it works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight"
          >
            Three steps
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gray-200" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center text-center relative"
            >
              <div className="relative mb-6 z-10">
                <div className="h-20 w-20 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                  <step.icon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
