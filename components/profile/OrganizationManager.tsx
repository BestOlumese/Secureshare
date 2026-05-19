"use client";

import { useState } from "react";
import {
  Users, Mail, UserPlus, Shield, X, Loader2, Trash2, ShieldAlert, Building2, Crown,
} from "lucide-react";
import {
  inviteUserToOrg, revokeInvitation, updateMemberRole, removeMember, updateOrganization,
} from "@/app/actions/org-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrganizationManagerProps {
  user: any;
  members: any[];
  invitations: any[];
}

const ROLE_STYLES: Record<string, string> = {
  OWNER: "bg-amber-50 text-amber-600 border-amber-200",
  ADMIN: "bg-blue-50 text-blue-600 border-blue-200",
  USER: "bg-gray-100 text-gray-500 border-gray-200",
};

const AVATAR_PALETTE = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];
function getAvatarColor(str: string) {
  return AVATAR_PALETTE[str.toLowerCase().charCodeAt(0) % AVATAR_PALETTE.length];
}

export default function OrganizationManager({ user, members, invitations }: OrganizationManagerProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "USER">("USER");
  const [isInviting, setIsInviting] = useState(false);
  const [orgName, setOrgName] = useState(user.organization?.name || "");
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);

  const isAdminOrOwner = user.role === "OWNER" || user.role === "ADMIN";
  const pendingInvitations = invitations.filter((i) => i.status === "PENDING");

  const inputClass =
    "flex-1 rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all";
  const btnPrimary =
    "flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 whitespace-nowrap";

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orgName === user.organization?.name) return;
    setIsUpdatingOrg(true);
    try {
      await updateOrganization({ name: orgName });
      toast.success("Organization renamed!");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
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
      toast.success("Invitation sent!");
      setInviteEmail("");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeInvitation(id);
      toast.success("Invitation revoked.");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: "ADMIN" | "USER") => {
    try {
      await updateMemberRole(targetUserId, newRole);
      toast.success("Role updated.");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemove = async (targetUserId: string) => {
    if (!confirm("Remove this member from the organization?")) return;
    try {
      await removeMember(targetUserId);
      toast.success("Member removed.");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5">

      {!isAdminOrOwner ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">
            You are a member of{" "}
            <span className="font-semibold text-blue-600">{user.organization?.name}</span>.
            Only administrators can manage this organization.
          </p>
        </div>
      ) : (
        <>
          {/* Org Name */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              Organization Name
            </h4>
            <form onSubmit={handleUpdateOrg} className="flex gap-3">
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Organization Name"
                className={inputClass}
              />
              <button
                type="submit"
                disabled={isUpdatingOrg || orgName === user.organization?.name}
                className={btnPrimary}
              >
                {isUpdatingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </form>
          </section>

          {/* Invite Member */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserPlus className="h-3.5 w-3.5" />
              Invite Member
            </h4>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className={inputClass}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:bg-white transition-all"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button type="submit" disabled={isInviting} className={btnPrimary}>
                {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <><UserPlus className="h-4 w-4" />Invite</>
                )}
              </button>
            </form>
          </section>
        </>
      )}

      {/* Members & Invitations */}
      <div className="grid gap-5 md:grid-cols-2">

        {/* Members */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Members
            </h4>
            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
              {members.length}
            </span>
          </div>

          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 gap-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                      getAvatarColor(m.name || m.email)
                    )}
                  >
                    {(m.name || m.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn(
                    "flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border",
                    ROLE_STYLES[m.role] || ROLE_STYLES.USER
                  )}>
                    {m.role === "OWNER" && <Crown className="h-2.5 w-2.5" />}
                    {m.role === "ADMIN" && <Shield className="h-2.5 w-2.5" />}
                    {m.role}
                  </span>

                  {user.id !== m.id &&
                    m.role !== "OWNER" &&
                    (user.role === "OWNER" || (user.role === "ADMIN" && m.role === "USER")) && (
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => handleUpdateRole(m.id, m.role === "ADMIN" ? "USER" : "ADMIN")}
                          title="Toggle Role"
                          className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemove(m.id)}
                          title="Remove"
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pending Invitations */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              Pending Invitations
            </h4>
            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
              {pendingInvitations.length}
            </span>
          </div>

          <div className="space-y-2">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{inv.email}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                    {inv.role} · {new Date(inv.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(inv.id)}
                  title="Revoke"
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {pendingInvitations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="h-6 w-6 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No pending invitations.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
