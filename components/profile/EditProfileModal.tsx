"use client";

import { useState } from "react";
import { 
  X, 
  User, 
  AtSign, 
  Loader2, 
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProfile } from "@/app/actions/org-actions";
import { toast } from "sonner";

const profileSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function EditProfileModal({ isOpen, onClose, user }: EditProfileModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      username: user.displayUsername || "",
    }
  });

  const onSubmit = async (data: ProfileData) => {
    setIsUpdating(true);
    try {
      await updateProfile(data);
      toast.success("Profile updated successfully!");
      onClose();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800 bg-[#0f172a] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Edit Profile</h2>
              <button 
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input 
                      {...register("name")}
                      placeholder="Your name"
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all"
                    />
                  </div>
                  {errors.name && <p className="text-[10px] text-red-500 uppercase font-black ml-1">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input 
                      {...register("username")}
                      placeholder="username"
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all font-mono text-sm"
                    />
                  </div>
                  {errors.username && <p className="text-[10px] text-red-500 uppercase font-black ml-1">{errors.username.message}</p>}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-sm font-black text-white hover:bg-sky-400 transition-all shadow-lg shadow-sky-500/20"
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
