"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import EditProfileModal from "./EditProfileModal";
import OrganizationManager from "./OrganizationManager";
import SecurityCenter from "./SecurityCenter";
import LogoutButton from "./LogoutButton";
import { User, Shield, Building2, Edit3, CheckCircle2, Calendar, AtSign, UserCircle2, ClipboardList } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ProfileUIProps {
  user: any;
  members: any[];
  invitations: any[];
}

const AVATAR_PALETTE = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-700",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-700",
];

function getAvatarGradient(name: string): string {
  return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];
}

export default function ProfileUI({ user, members, invitations }: ProfileUIProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "security" | "organization">("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const tabs = [
    { id: "overview", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    ...(user.orgId ? [{ id: "organization", label: "Organization", icon: Building2 }] : []),
  ] as const;

  const gradient = getAvatarGradient(user.name || "U");

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-24">

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className={cn(
          "h-16 w-16 rounded-2xl bg-linear-to-br flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg",
          gradient
        )}>
          {user.name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="flex-1 text-center sm:text-left min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{user.name}</h1>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          {user.organization && (
            <div className="mt-2 flex items-center justify-center sm:justify-start gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full uppercase tracking-widest">
                <Building2 className="h-3 w-3" />
                {user.organization.name}
              </span>
              <span className={cn(
                "text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border",
                user.role === "OWNER" ? "bg-amber-50 text-amber-600 border-amber-200" :
                user.role === "ADMIN" ? "bg-blue-50 text-blue-600 border-blue-200" :
                "bg-gray-100 text-gray-500 border-gray-200"
              )}>
                {user.role}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-300 transition-all shrink-0"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      {/* Pill Tab Navigation */}
      <div className="flex items-center gap-1.5 bg-gray-100/70 p-1.5 rounded-2xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              activeTab === tab.id
                ? "bg-white text-blue-700 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="grid gap-5 md:grid-cols-2"
          >
            {/* Identity Details */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Identity Details</h3>
              <div className="space-y-2">
                {[
                  {
                    icon: AtSign,
                    label: "Username",
                    value: user.displayUsername ? `@${user.displayUsername}` : "—",
                  },
                  {
                    icon: UserCircle2,
                    label: "Role",
                    value: user.role || "USER",
                  },
                  {
                    icon: Calendar,
                    label: "Member since",
                    value: new Date(user.createdAt).toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    }),
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-gray-50 border border-gray-100"
                  >
                    <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-500 font-medium flex-1">{label}</span>
                    <span className="text-xs font-bold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Account Status + Logout */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Account Status</h3>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">Active & Encrypted</p>
                    <p className="text-xs text-gray-400">Zero-Knowledge Protocol Enabled</p>
                  </div>
                </div>
              </div>
              <LogoutButton />
            </section>
          </motion.div>
        )}

        {activeTab === "security" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="grid gap-5 md:grid-cols-3"
          >
            <div className="md:col-span-1">
              <section className="bg-white rounded-2xl border border-gray-200 p-6 h-full space-y-4">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 w-fit">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Vault Security</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Manage your cryptographic keys and master password. These control the fundamental encryption of your data.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  {["Encrypted Sync Active", "Recovery Set Up"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {item}
                    </div>
                  ))}
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <OrganizationManager user={user} members={members} invitations={invitations} />

            {(user.role === "OWNER" || user.role === "ADMIN") && (
              <Link
                href="/audit"
                className="flex items-center justify-between w-full p-4 rounded-2xl border border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Security Audit Log</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">View all org security events</p>
                  </div>
                </div>
                <Shield className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </Link>
            )}
          </motion.div>
        )}
      </div>

      <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} user={user} />
    </div>
  );
}
