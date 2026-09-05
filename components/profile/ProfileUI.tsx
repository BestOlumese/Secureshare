"use client";

import { useState, type ElementType } from "react";
import { motion } from "framer-motion";
import EditProfileModal from "./EditProfileModal";
import OrganizationManager from "./OrganizationManager";
import SecurityCenter from "./SecurityCenter";
import LogoutButton from "./LogoutButton";
import { User, Shield, Building2, ClipboardList } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { avatarColor, avatarInitial } from "@/lib/avatar";
import type { CurrentUser, OrgMember, OrgInvitation } from "@/lib/types";

type ProfileTab = "overview" | "security" | "organization";

interface ProfileUIProps {
  user: CurrentUser;
  members: OrgMember[];
  invitations: OrgInvitation[];
}

/** One labelled row in the details list. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  );
}

export default function ProfileUI({ user, members, invitations }: ProfileUIProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isAdmin = user.role === "OWNER" || user.role === "ADMIN";

  const tabs: { id: ProfileTab; label: string; icon: ElementType }[] = [
    { id: "overview", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    ...(user.orgId ? [{ id: "organization" as const, label: "Organization", icon: Building2 }] : []),
  ];

  const color = avatarColor(user.email || user.name || "");

  return (
    <div className="max-w-5xl mx-auto w-full pb-24">
      {/* Identity strip — quieter than the old banner card */}
      <div className="flex items-center gap-4 pb-6 mb-6 border-b border-gray-200">
        <div
          className={cn(
            "h-11 w-11 rounded-full flex items-center justify-center text-base font-medium shrink-0",
            color
          )}
        >
          {avatarInitial(user.name, user.email)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-semibold text-gray-900 truncate">{user.name}</h1>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              Edit
            </button>
          </div>
          <p className="text-sm text-gray-500 truncate">
            {user.email}
            {user.organization && (
              <>
                <span className="text-gray-300"> · </span>
                {user.role === "OWNER" ? "Owner" : user.role === "ADMIN" ? "Admin" : "Member"}
                <span className="text-gray-300"> · </span>
                {user.organization.name}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-10">
        {/* Section nav — a row on mobile, a column from md up */}
        <nav
          aria-label="Profile sections"
          className="flex md:flex-col gap-1 md:w-48 shrink-0 overflow-x-auto md:overflow-visible -mx-1 px-1 md:mx-0 md:px-0"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap text-left",
                activeTab === tab.id
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          ))}

          {user.orgId && isAdmin && (
            <Link
              href="/audit"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              Audit log
            </Link>
          )}
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-8"
            >
              <section>
                <h2 className="text-sm font-medium text-gray-900 mb-1">Your details</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Shown to people you send messages to.
                </p>
                <div className="rounded-xl border border-gray-200 bg-white px-5">
                  <DetailRow label="Name" value={user.name} />
                  <DetailRow label="Email" value={user.email} />
                  <DetailRow
                    label="Username"
                    value={user.displayUsername ? `@${user.displayUsername}` : "Not set"}
                  />
                  <DetailRow
                    label="Member since"
                    value={new Date(user.createdAt).toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  />
                </div>
              </section>

              <section>
                <h2 className="text-sm font-medium text-gray-900 mb-1">Sign out</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Your key stays on this device unless you clear your browser data.
                </p>
                <LogoutButton />
              </section>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SecurityCenter user={user} />
            </motion.div>
          )}

          {activeTab === "organization" && user.orgId && (
            <motion.div
              key="organization"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <OrganizationManager user={user} members={members} invitations={invitations} />
            </motion.div>
          )}
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
      />
    </div>
  );
}
