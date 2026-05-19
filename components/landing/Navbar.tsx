"use client";

import { Shield } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
        <Link href="/" className="flex items-center gap-2 font-black text-lg tracking-tight text-gray-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Shield className="h-4 w-4" />
          </div>
          SecureShare
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
          <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}
