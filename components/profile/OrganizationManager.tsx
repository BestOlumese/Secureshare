"use client";

import { useState } from "react";
import { 
  Users, 
  Mail, 
  UserPlus, 
  Shield, 
  X, 
  Loader2, 
  Trash2, 
  ShieldAlert,
  ChevronDown,
  UserCheck,
  Building2
} from "lucide-react";
import { inviteUserToOrg, revokeInvitation, updateMemberRole, removeMember, updateOrganization } from "@/app/actions/org-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrganizationManagerProps {
  user: any;
  members: any[];
  invitations: any[];
}

export default function OrganizationManager({ user, members, invitations }: OrganizationManagerProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "USER">("USER");
  const [isInviting, setIsInviting] = useState(false);
  const [orgName, setOrgName] = useState(user.organization?.name || "");
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orgName === user.organization?.name) return;

    setIsUpdatingOrg(true);
    try {
      await updateOrganization({ name: orgName });
      toast.success("Organization renamed successfully!");
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
      toast.success("Invitation sent successfully!");
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
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await removeMember(targetUserId);
      toast.success("Member removed.");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isAdminOrOwner = user.role === "OWNER" || user.role === "ADMIN";

  return (
    <div className="space-y-8 mt-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
          <Shield className="h-5 w-5" />
        </div>
        <h3 className="text-xl font-bold uppercase tracking-tight">Organization Control</h3>
      </div>

      {isAdminOrOwner && (
        <>
          {/* Edit Org Name */}
          <section className="glass-card p-6 border-sky-500/10">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Edit Organization Information
            </h4>
            <form onSubmit={handleUpdateOrg} className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Organization Name"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 py-3 px-4 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={isUpdatingOrg || orgName === user.organization?.name}
                className="premium-button px-6 py-3 flex items-center justify-center gap-2"
              >
                {isUpdatingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </button>
            </form>
          </section>

          {/* Invite Member */}
          <section className="glass-card p-6 border-sky-500/10">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Team Member
            </h4>
            <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 py-3 px-4 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="rounded-xl border border-slate-800 bg-slate-900/50 py-3 px-4 text-sm text-slate-400 focus:border-sky-500 focus:outline-none"
              >
                <option value="USER">User (Receiver)</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button
                type="submit"
                disabled={isInviting}
                className="premium-button px-6 py-3 flex items-center justify-center gap-2"
              >
                {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
              </button>
            </form>
          </section>
        </>
      )}

      {!isAdminOrOwner && (
        <section className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30">
          <p className="text-xs font-bold text-slate-500 italic">
            You are a member of <span className="text-sky-400">@{user.organization?.name}</span>. Only administrators can manage invitations or rename the organization.
          </p>
        </section>
      )}

      {/* Members & Invitations Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Members */}
        <section className="glass-card p-6">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Users className="h-3 w-3" />
            Active Members ({members.length})
          </h4>
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-800/50 bg-slate-900/30">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center text-[10px] font-black uppercase">
                    {m.name?.charAt(0) || "U"}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{m.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{m.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter border",
                    m.role === "OWNER" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                    m.role === "ADMIN" ? "bg-sky-500/10 text-sky-500 border-sky-500/20" :
                    "bg-slate-500/10 text-slate-500 border-slate-500/20"
                  )}>
                    {m.role}
                  </span>
                  
                  {user.id !== m.id && (m.role !== "OWNER") && (
                    <div className="flex items-center gap-1">
                      {/* Only Owners can manage Admins, Admins manage Users */}
                      {((user.role === "OWNER") || (user.role === "ADMIN" && m.role === "USER")) && (
                        <>
                          <button 
                            onClick={() => handleUpdateRole(m.id, m.role === "ADMIN" ? "USER" : "ADMIN")}
                            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-sky-400 transition-colors"
                            title="Toggle Role"
                          >
                            <ShieldAlert className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={() => handleRemove(m.id)}
                            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pending Invites */}
        <section className="glass-card p-6">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Mail className="h-3 w-3" />
            Pending Invitations ({invitations.filter(i => i.status === "PENDING").length})
          </h4>
          <div className="space-y-3">
            {invitations.filter(i => i.status === "PENDING").map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-800/50 bg-slate-900/30">
                <div className="overflow-hidden mr-2">
                  <p className="text-xs font-bold text-white truncate">{inv.email}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{inv.role} • {new Date(inv.createdAt).toLocaleDateString()}</p>
                </div>
                <button 
                  onClick={() => handleRevoke(inv.id)}
                  className="shrink-0 p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
                  title="Revoke Invite"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {invitations.filter(i => i.status === "PENDING").length === 0 && (
              <p className="text-[10px] text-slate-600 italic">No pending invitations.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
