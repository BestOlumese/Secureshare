"use client";

import { useState } from "react";
import { X, User, AtSign, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProfile } from "@/app/actions/org-actions";
import { toast } from "sonner";
import { useModalA11y } from "@/lib/use-modal-a11y";
import type { CurrentUser } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: CurrentUser;
}

export default function EditProfileModal({ isOpen, onClose, user }: EditProfileModalProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(isOpen, onClose);
  const [isUpdating, setIsUpdating] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, username: user.displayUsername || "" },
  });

  const onSubmit = async (data: ProfileData) => {
    setIsUpdating(true);
    try {
      await updateProfile(data);
      toast.success("Saved");
      onClose();
      window.location.reload();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Couldn't save."));
    } finally {
      setIsUpdating(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" tabIndex={-1} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden outline-none">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 id="edit-profile-title" className="text-base font-bold text-gray-900">Edit Profile</h2>
              <button onClick={onClose} aria-label="Close edit profile" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input {...register("name")} placeholder="Your name" className={inputClass} />
                </div>
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">Username</label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input {...register("username")} placeholder="username" className={`${inputClass} font-mono`} />
                </div>
                {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isUpdating} className="flex-[2] flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Save Changes</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
