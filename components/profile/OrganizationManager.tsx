"use client";

import { useState } from "react";
import { X, Loader2, Plus } from "lucide-react";
import {
  inviteUserToOrg, revokeInvitation, updateMemberRole, removeMember, updateOrganization,
} from "@/app/actions/org-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CurrentUser, OrgMember, OrgInvitation } from "@/lib/types";
import { avatarColor, avatarInitial } from "@/lib/avatar";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { motion, AnimatePresence } from "framer-motion";
import { getErrorMessage } from "@/lib/utils";

interface OrganizationManagerProps {
  user: CurrentUser;
  members: OrgMember[];
  invitations: OrgInvitation[];
}

/** Members and pending invites share one list, so rows carry a status. */
type Row =
  | { kind: "member"; id: string; name: string; email: string; role: string }
  | { kind: "invite"; id: string; email: string; role: string };

export default function OrganizationManager({ user, members, invitations }: OrganizationManagerProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "USER">("USER");
  const [isInviting, setIsInviting] = useState(false);
  const [orgName, setOrgName] = useState(user.organization?.name || "");
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const inviteDialogRef = useModalA11y<HTMLDivElement>(isInviteOpen, () => setIsInviteOpen(false));

  const isAdminOrOwner = user.role === "OWNER" || user.role === "ADMIN";
  const pendingInvitations = invitations.filter((i) => i.status === "PENDING");

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all";

  const rows: Row[] = [
    ...members.map((m): Row => ({
      kind: "member", id: m.id, name: m.name, email: m.email, role: m.role || "USER",
    })),
    ...pendingInvitations.map((i): Row => ({
      kind: "invite", id: i.id, email: i.email, role: i.role,
    })),
  ];

  const roleLabel = (role: string) =>
    role === "OWNER" ? "Owner" : role === "ADMIN" ? "Admin" : "Member";

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orgName === user.organization?.name) return;
    setIsUpdatingOrg(true);
    try {
      await updateOrganization({ name: orgName });
      toast.success("Renamed");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't rename it."));
    } finally {
      setIsUpdatingOrg(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setIsInviting(true);
    try {
      await inviteUserToOrg(inviteEmail, inviteRole);
      toast.success("Invitation sent");
      setInviteEmail("");
      setIsInviteOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't send the invitation."));
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvitation(id);
      toast.success("Invitation revoked");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't revoke it."));
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: "ADMIN" | "USER") => {
    try {
      await updateMemberRole(targetUserId, newRole);
      toast.success("Role updated");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't change their role."));
    }
  };

  const handleRemove = async (targetUserId: string) => {
    if (!confirm("Remove this member from the organization?")) return;
    try {
      await removeMember(targetUserId);
      toast.success("Member removed");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't remove them."));
    }
  };

  return (
    <div className="space-y-10">

      {/* ---------------- Organization ---------------- */}
      <section>
        <h2 className="text-sm font-medium text-gray-900 mb-1">Organization</h2>
        <p className="text-sm text-gray-500 mb-4">
          {isAdminOrOwner
            ? "The name people see when you send them a message."
            : `You're a member of ${user.organization?.name}. Only admins can make changes.`}
        </p>

        {isAdminOrOwner && (
          <form onSubmit={handleUpdateOrg} className="flex gap-2 max-w-md">
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              aria-label="Organization name"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={isUpdatingOrg || orgName === user.organization?.name || !orgName.trim()}
              className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              {isUpdatingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </button>
          </form>
        )}
      </section>

      {/* ---------------- People ---------------- */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-medium text-gray-900">People</h2>
          {isAdminOrOwner && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Invite
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {members.length} {members.length === 1 ? "member" : "members"}
          {pendingInvitations.length > 0 && `, ${pendingInvitations.length} invited`}
        </p>

        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {rows.map((row) => (
            <div key={`${row.kind}-${row.id}`} className="flex items-center gap-3 p-4">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                  row.kind === "invite"
                    ? "bg-gray-100 text-gray-400"
                    : avatarColor(row.email)
                )}
              >
                {row.kind === "member" ? avatarInitial(row.name, row.email) : "?"}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {row.kind === "member" ? row.name : row.email}
                  {row.kind === "invite" && <span className="text-gray-400"> · invited</span>}
                </p>
                {row.kind === "member" && (
                  <p className="text-sm text-gray-500 truncate">{row.email}</p>
                )}
              </div>

              {/* Owners can't be changed, and admins can't act on other admins. */}
              {row.kind === "member" ? (
                isAdminOrOwner && row.role !== "OWNER" && row.id !== user.id &&
                !(user.role === "ADMIN" && row.role === "ADMIN") ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={row.role}
                      onChange={(e) => handleUpdateRole(row.id, e.target.value as "ADMIN" | "USER")}
                      aria-label={`Role for ${row.name}`}
                      className="rounded-lg border border-gray-200 bg-white py-1.5 px-2 text-sm text-gray-700 focus:border-blue-400 focus:outline-none"
                    >
                      <option value="USER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      onClick={() => handleRemove(row.id)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 shrink-0">{roleLabel(row.role)}</span>
                )
              ) : (
                isAdminOrOwner && (
                  <button
                    onClick={() => handleRevoke(row.id)}
                    className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors"
                  >
                    Cancel
                  </button>
                )
              )}
            </div>
          ))}

          {rows.length === 0 && (
            <p className="p-4 text-sm text-gray-400">Nobody here yet.</p>
          )}
        </div>
      </section>

      {/* ---------------- Invite dialog ---------------- */}
      <AnimatePresence>
        {isInviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInviteOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              ref={inviteDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="invite-dialog-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl p-6 outline-none"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 id="invite-dialog-title" className="text-base font-semibold text-gray-900">
                    Invite someone
                  </h3>
                  <p className="text-sm text-gray-500">
                    They&apos;ll get an email with a link to join.
                  </p>
                </div>
                <button
                  onClick={() => setIsInviteOpen(false)}
                  aria-label="Close"
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleInvite} className="space-y-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@company.com"
                  aria-label="Email address"
                  className={inputClass}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "USER")}
                  aria-label="Role"
                  className={inputClass}
                >
                  <option value="USER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting || !inviteEmail}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isInviting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send invite
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
