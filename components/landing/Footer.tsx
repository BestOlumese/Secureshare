"use client";

import Link from "next/link";
import { AuthTextLink } from "./AuthCta";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-base text-gray-900 tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Logo className="h-3.5 w-3.5" />
          </div>
          SecureShare
        </Link>

        <div className="flex items-center gap-6 text-sm text-gray-400">
          <a href="#how-it-works" className="hover:text-gray-700 transition-colors">How it works</a>
          <a href="#features" className="hover:text-gray-700 transition-colors">Features</a>
          <a href="#faq" className="hover:text-gray-700 transition-colors">FAQ</a>
          <AuthTextLink className="hover:text-gray-700 transition-colors" />
        </div>

        <p className="text-xs text-gray-400">© 2026 SecureShare. All rights reserved.</p>
      </div>
    </footer>
  );
}
