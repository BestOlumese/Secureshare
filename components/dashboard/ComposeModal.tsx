"use client";

import { useState, useRef } from "react";
import { 
  X, 
  Send, 
  Paperclip, 
  ShieldCheck, 
  Loader2, 
  User, 
  Mail, 
  XCircle,
  FileText,
  Lock,
  Search,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  generateAesKey, 
  encryptFile, 
  wrapAesKey 
} from "@/lib/crypto-client";
import { 
  getReceiverPublicKey, 
  sendSecureMessage 
} from "@/app/actions/documents";
import { searchOrganizations, getRecipientOrg } from "@/app/actions/org-actions";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

const composeSchema = z.object({
  receiverEmail: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().optional(),
});

type ComposeData = z.infer<typeof composeSchema>;

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function ComposeModal({ isOpen, onClose, user }: ComposeModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [orgSearch, setOrgSearch] = useState("");
  const [orgResults, setOrgResults] = useState<{id: string, name: string}[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<{id: string, name: string} | null>(null);
  const [isSearchingOrgs, setIsSearchingOrgs] = useState(false);
  const [recipientOrg, setRecipientOrg] = useState<{name: string} | null>(null);
  const [isCheckingOrg, setIsCheckingOrg] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("encryptedFileUploader");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ComposeData>({
    resolver: zodResolver(composeSchema),
  });

  const handleOrgSearch = async (val: string) => {
    setOrgSearch(val);
    if (val.length > 1) {
      setIsSearchingOrgs(true);
      try {
        const results = await searchOrganizations(val);
        setOrgResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingOrgs(false);
      }
    } else {
      setOrgResults([]);
    }
  };

  const handleRecipientChange = async (email: string) => {
    if (email.includes("@") && email.includes(".")) {
      setIsCheckingOrg(true);
      try {
        const org = await getRecipientOrg(email);
        setRecipientOrg(org);
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingOrg(false);
      }
    } else {
      setRecipientOrg(null);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ComposeData) => {
    if (selectedOrg && !data.receiverEmail) {
       toast.error("Please specify a recipient.");
       return;
    }

    setIsSending(true);
    setProgress(10);

    const sendPromise = async () => {
      try {
        // 1. Get Receiver Public Key
        setProgress(20);
        const receiver = await getReceiverPublicKey(data.receiverEmail);
        
        const attachments: any[] = [];
        
        // 2. Encrypt each file
        setProgress(40);
        const encryptedFiles = await Promise.all(
          files.map(async (file) => {
            const aesKey = await generateAesKey();
            const { encryptedBlob } = await encryptFile(file, aesKey);
            const wrappedKey = await wrapAesKey(aesKey, receiver.publicKey!);
            
            // Return a File object for UploadThing
            return {
              file: new File([encryptedBlob], file.name, { type: file.type }),
              originalName: file.name,
              wrappedKey,
              size: file.size,
              type: file.type
            };
          })
        );

        // 3. Upload to UploadThing
        setProgress(60);
        const uploadResults = await startUpload(encryptedFiles.map(f => f.file));
        
        if (!uploadResults) throw new Error("Upload failed.");

        // Map results back to metadata
        const attachmentMetadata = encryptedFiles.map((f, i) => ({
          fileUrl: uploadResults[i].url,
          fileName: f.originalName,
          encryptedAesKey: f.wrappedKey,
          fileSize: f.size,
          contentType: f.type
        }));

        // 4. Create Message and Documents in DB
        setProgress(90);
        await sendSecureMessage({
          receiverId: receiver.id,
          subject: data.subject,
          content: data.content,
          attachments: attachmentMetadata,
          targetOrgId: selectedOrg?.id
        });

        setProgress(100);
        return "SecureMail sent successfully!";
      } catch (err: any) {
        throw new Error(err.message || "Failed to send message.");
      }
    };

    toast.promise(sendPromise(), {
      loading: "Encrypting and sending message...",
      success: (msg) => {
        setIsSending(false);
        setFiles([]);
        reset();
        setSelectedOrg(null);
        setOrgSearch("");
        onClose();
        window.location.reload(); 
        return msg;
      },
      error: (err) => {
        setIsSending(false);
        return err.message;
      }
    });
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
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-800 bg-[#0f172a] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
                  <Mail className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-white">New Secure Message</h2>
              </div>
              <button 
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-[70vh]">
              {/* Form Fields */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <div className="relative flex items-center gap-4 border-b border-slate-800 pb-2">
                  <span className="text-sm font-bold text-slate-500 w-12 uppercase tracking-widest">To</span>
                  <div className="relative flex-1">
                    <User className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                    <input
                      {...register("receiverEmail")}
                      onChange={(e) => {
                        register("receiverEmail").onChange(e);
                        handleRecipientChange(e.target.value);
                      }}
                      autoFocus
                      placeholder="recipient@example.com"
                      className="w-full bg-transparent py-2 pl-6 pr-4 text-sm text-white focus:outline-none placeholder:text-slate-700"
                    />
                    {isCheckingOrg && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                      </div>
                    )}
                  </div>
                </div>
                {errors.receiverEmail && <p className="text-[10px] text-red-500 uppercase font-black ml-16">{errors.receiverEmail.message}</p>}
                  
                  {recipientOrg && (
                    <p className="mt-1.5 text-[10px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3" />
                      Member of: {recipientOrg.name}
                    </p>
                  )}

                  {selectedOrg && recipientOrg && selectedOrg.name !== recipientOrg.name && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-500 leading-tight">
                      <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>
                        <strong>Org Mismatch:</strong> Recipient belongs to <b>{recipientOrg.name}</b>, but you've selected <b>{selectedOrg.name}</b>. This message will be blocked!
                      </p>
                    </div>
                  )}

                {/* Organization Picker */}
                <div className="relative border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-500 w-12 uppercase tracking-widest">Org</span>
                    {selectedOrg ? (
                      <div className="flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-400 border border-sky-500/20">
                        {selectedOrg.name}
                        <button type="button" onClick={() => setSelectedOrg(null)} className="hover:text-white transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative flex-1">
                        <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                        <input 
                          value={orgSearch}
                          onChange={(e) => handleOrgSearch(e.target.value)}
                          placeholder="Search target organization..."
                          className="w-full bg-transparent pl-6 text-white focus:outline-none text-sm placeholder:text-slate-700"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Results Dropdown */}
                  <AnimatePresence>
                    {!selectedOrg && orgResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-16 right-0 top-full z-10 mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-[#0f172a] shadow-2xl custom-scrollbar"
                      >
                        {orgResults.map((org) => (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => setSelectedOrg(org)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-900 transition-colors"
                          >
                            <span className="font-bold text-slate-200">{org.name}</span>
                            <Plus className="h-3 w-3 text-sky-500" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
                  <span className="text-sm font-bold text-slate-500 w-12 uppercase tracking-widest">About</span>
                  <input 
                    {...register("subject")}
                    placeholder="Subject line..."
                    className="flex-1 bg-transparent text-white focus:outline-none text-sm font-bold"
                  />
                </div>
                {errors.subject && <p className="text-[10px] text-red-500 uppercase font-black ml-16">{errors.subject.message}</p>}

                <div className="mt-4">
                  <textarea 
                    {...register("content")}
                    placeholder="Write your encrypted message here..."
                    className="w-full min-h-[150px] bg-transparent text-slate-300 focus:outline-none text-base resize-none leading-relaxed"
                  />
                </div>

                {/* File Previews */}
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-800">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-300">
                        <FileText className="h-3 w-3 text-sky-400" />
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button 
                          type="button"
                          onClick={() => removeFile(i)}
                          className="ml-1 text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="border-t border-slate-800 bg-slate-900/50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/30 px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                  >
                    <Paperclip className="h-4 w-4" />
                    Attach Files
                  </button>
                  <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef} 
                    onChange={onFileChange} 
                    className="hidden" 
                  />
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
                    <ShieldCheck className="h-3 w-3" />
                    AES-256 E2EE Enabled
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-black text-white hover:bg-sky-400 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {progress}%
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send SecureMail
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
