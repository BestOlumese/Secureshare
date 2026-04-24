"use client";

export default function Footer() {
  return (
    <footer id="enterprise" className="border-t border-slate-900 bg-[#020617] px-6 py-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <p className="text-xs font-medium text-slate-600">
          © 2026 SecureMail Systems Inc. All rights reserved.
        </p>
        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          All Systems Operational
        </div>
      </div>
    </footer>
  );
}
