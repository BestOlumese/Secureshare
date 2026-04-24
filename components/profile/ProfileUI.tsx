"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import EditProfileModal from "./EditProfileModal";
import OrganizationManager from "./OrganizationManager";
import SecurityCenter from "./SecurityCenter";
import LogoutButton from "./LogoutButton";
import { 
  User, 
  Shield, 
  Building2, 
  Edit3, 
  Fingerprint
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileUIProps {
  user: any;
  members: any[];
  invitations: any[];
}

export default function ProfileUI({ user, members, invitations }: ProfileUIProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "security" | "organization">("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isAdminOrOwner = user.role === "OWNER" || user.role === "ADMIN";

  const tabs = [
    { id: "overview", label: "Profile Overview", icon: User },
    { id: "security", label: "Security Vault", icon: Shield },
    ...(user.orgId ? [{ id: "organization", label: "Organization", icon: Building2 }] : []),
  ] as const;

  return (
    <div className="max-w-5xl mx-auto w-full space-y-12 pb-24">
      {/* Header / Identity Area */}
      <header className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-sky-500/20 blur-2xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-sky-400 to-indigo-600 shadow-2xl border border-white/10">
            <span className="text-3xl font-black text-white italic">{user.name?.charAt(0)}</span>
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">{user.name}</h1>
          <p className="text-slate-500 font-bold text-sm tracking-wide">{user.email}</p>
        </div>
      </header>

      {/* Modern Tab Navigation */}
      <nav className="flex items-center justify-center">
        <div className="flex p-1 gap-1 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20" 
                  : "text-slate-500 hover:text-white hover:bg-slate-800"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content Area */}
      <main className="min-h-[400px]">
        {activeTab === "overview" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 md:grid-cols-2"
          >
            {/* Identity Details */}
            <section className="glass-card p-8 border-sky-500/10 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identify Details</h3>
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-xs text-slate-500 font-bold">Username</span>
                  <span className="text-xs font-black text-sky-400 tracking-widest">@{user.displayUsername}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-xs text-slate-500 font-bold">Role</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md border border-sky-500/20 bg-sky-500/10 text-sky-400 font-black uppercase">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-xs text-slate-500 font-bold">Member Since</span>
                  <span className="text-xs font-bold text-white">
                    {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </section>

            {/* Account Status / Actions */}
            <section className="glass-card p-8 border-sky-500/10 flex flex-col justify-between">
              <div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Environment Status</h3>
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-widest">Active & Encrypted</p>
                    <p className="text-[10px] text-slate-500 font-bold">Zero-Knowledge Protocol Enabled</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <LogoutButton />
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === "security" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 md:grid-cols-3"
          >
            <div className="md:col-span-1">
              <section className="glass-card p-6 border-sky-500/10 h-full">
                <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 w-fit mb-4">
                  <Fingerprint className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2 leading-none">Vault Security</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed mb-6">
                  Manage your cryptographic keys and master security password. These control the fundamental encryption of your data.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <Shield className="h-3 w-3 text-emerald-500" />
                    Encrypted Sync Active
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <Shield className="h-3 w-3 text-emerald-500" />
                    Recovery Set Up
                  </div>
                </div>
              </section>
            </div>
            
            <div className="md:col-span-2">
              <SecurityCenter user={user} />
            </div>
          </motion.div>
        )}

        {activeTab === "organization" && user.orgId && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <OrganizationManager user={user} members={members} invitations={invitations} />
          </motion.div>
        )}
      </main>

      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        user={user} 
      />
    </div>
  );
}
