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
  Plus,
  Building2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  generateAesKey, 
  encryptFile, 
  wrapAesKey,
  encryptString
} from "@/lib/crypto-client";
import { 
  getPublicKeys,
  getSenderPublicKey, 
  sendSecureMessage 
} from "@/app/actions/documents";
import { searchOrganizations, getRecipientOrg } from "@/app/actions/org-actions";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

const composeSchema = z.object({
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
  
  // Recipient States with DB Org Tracking
  const [toRecipient, setToRecipient] = useState<{ 
    email: string, 
    org: { id: string, name: string } | null,
    dbOrgName?: string 
  }>({ email: "", org: null });
  
  const [ccRecipients, setCcRecipients] = useState<{ 
    email: string, 
    org: { id: string, name: string } | null,
    dbOrgName?: string
  }[]>([]);
  
  // Search States
  const [orgSearch, setOrgSearch] = useState("");
  const [orgResults, setOrgResults] = useState<{id: string, name: string}[]>([]);
  const [isSearchingOrgs, setIsSearchingOrgs] = useState(false);
  const [activeSearchTarget, setActiveSearchTarget] = useState<"to" | number | null>(null); // 'to' or index of cc
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { startUpload } = useUploadThing("encryptedFileUploader");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ComposeData>({
    resolver: zodResolver(composeSchema),
  });

  const handleOrgSearch = async (val: string, target: "to" | number) => {
    setOrgSearch(val);
    setActiveSearchTarget(target);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.length >= 1) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearchingOrgs(true);
        try {
          const results = await searchOrganizations(val);
          setOrgResults(results);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearchingOrgs(false);
        }
      }, 150); // Reduced to 150ms for ultra-fast response
    } else {
      setOrgResults([]);
    }
  };

  const selectOrg = (org: { id: string, name: string }) => {
    if (activeSearchTarget === "to") {
      setToRecipient(prev => ({ ...prev, org }));
    } else if (typeof activeSearchTarget === "number") {
      const newCcs = [...ccRecipients];
      newCcs[activeSearchTarget].org = org;
      setCcRecipients(newCcs);
    }
    setOrgSearch("");
    setOrgResults([]);
    setActiveSearchTarget(null);
  };

  const addCc = () => {
    setCcRecipients(prev => [...prev, { email: "", org: null }]);
  };

  const removeCc = (index: number) => {
    setCcRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateToEmail = async (email: string) => {
    setToRecipient(prev => ({ ...prev, email }));
    if (email.includes("@") && email.includes(".")) {
      const org = await getRecipientOrg(email);
      if (org) {
        setToRecipient(prev => ({ 
          ...prev, 
          dbOrgName: org.name,
          org: prev.org ? prev.org : { id: (org as any).id, name: org.name } // Auto-fill if not manually set
        }));
      } else {
        setToRecipient(prev => ({ ...prev, dbOrgName: undefined }));
      }
    }
  };

  const updateCcEmail = async (index: number, email: string) => {
    const newCcs = [...ccRecipients];
    newCcs[index].email = email;
    setCcRecipients(newCcs);
    
    if (email.includes("@") && email.includes(".")) {
      const org = await getRecipientOrg(email);
      if (org) {
        const updatedCcs = [...ccRecipients];
        updatedCcs[index].dbOrgName = org.name;
        if (!updatedCcs[index].org) {
          updatedCcs[index].org = { id: (org as any).id, name: org.name };
        }
        setCcRecipients(updatedCcs);
      } else {
        const updatedCcs = [...ccRecipients];
        updatedCcs[index].dbOrgName = undefined;
        setCcRecipients(updatedCcs);
      }
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const onSubmit = async (data: ComposeData) => {
    // 1. Mandatory Validation
    if (!toRecipient.email) {
      toast.error("Recipient Missing", {
        description: "Please specify a target email address for secure delivery.",
      });
      return;
    }

    if (!toRecipient.org) {
      toast.error("Organization Required", {
        description: `Please assign ${toRecipient.email} to a target organization to ensure correct encryption.`,
      });
      return;
    }

    // 2. Mismatch Enforcement (Critical)
    const toMismatch = toRecipient.dbOrgName && toRecipient.org && toRecipient.org.name !== toRecipient.dbOrgName;
    const ccMismatch = ccRecipients.some(cc => cc.dbOrgName && cc.org && cc.org.name !== cc.dbOrgName);

    if (toMismatch || ccMismatch) {
      toast.error("Cryptographic Mismatch Detected", {
        description: "The assigned organization does not match the recipient's secure record. Routing is blocked to prevent data leakage.",
        duration: 6000,
      });
      return;
    }

    setIsSending(true);
    setProgress(10);

    const sendPromise = async () => {
      try {
        const toEmails = [toRecipient.email];
        const ccEmails = ccRecipients.map(r => r.email).filter(e => e.length > 0);
        const allRecipientEmails = [...toEmails, ...ccEmails];

        // 1. Fetch Public Keys
        setProgress(20);
        const receiverKeys = await getPublicKeys(allRecipientEmails);
        const senderKey = await getSenderPublicKey();

        const recipientShares = receiverKeys.map(k => ({
          ...k,
          role: toEmails.includes(k.email) ? "TO" : "CC"
        }));

        const allKeysForEncryption = [...recipientShares];
        if (!allKeysForEncryption.find(k => k.id === senderKey.id)) {
          allKeysForEncryption.push({ id: senderKey.id, email: "Sender", publicKey: senderKey.publicKey, role: "SENDER" });
        }
        
        // 2. Generate Master AES Key
        setProgress(30);
        const aesKey = await generateAesKey();

        // 3. Encrypt the Message Content
        let encryptedContent = undefined;
        if (data.content) {
          setProgress(40);
          encryptedContent = await encryptString(data.content, aesKey);
        }

        const attachmentMetadata: any[] = [];
        
        // 4. Encrypt files
        if (files.length > 0) {
          setProgress(50);
          const encryptedFiles = await Promise.all(
            files.map(async (file) => {
              const { encryptedBlob } = await encryptFile(file, aesKey);
              return {
                file: new File([encryptedBlob], file.name, { type: file.type }),
                originalName: file.name,
                size: file.size,
                type: file.type
              };
            })
          );

          setProgress(60);
          const uploadResults = await startUpload(encryptedFiles.map(f => f.file));
          if (!uploadResults) throw new Error("Upload failed.");

          encryptedFiles.forEach((f, i) => {
            attachmentMetadata.push({
              fileUrl: uploadResults[i].url,
              fileName: f.originalName,
              fileSize: f.size,
              contentType: f.type,
              documentKeyShares: [] 
            });
          });
        }

        // 5. Wrap the AES Key
        setProgress(80);
        const keyShares = await Promise.all(
          allKeysForEncryption.map(async (u) => {
            const wrapped = await wrapAesKey(aesKey, u.publicKey);
            return { userId: u.id, encryptedAesKey: wrapped, role: u.role };
          })
        );

        attachmentMetadata.forEach(att => {
          att.documentKeyShares = keyShares.map(s => ({ userId: s.userId, encryptedAesKey: s.encryptedAesKey }));
        });

        // 6. Send to API
        setProgress(90);
        await sendSecureMessage({
          subject: data.subject,
          content: encryptedContent,
          messageKeyShares: keyShares,
          attachments: attachmentMetadata,
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
        setToRecipient({ email: "", org: null });
        setCcRecipients([]);
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

  const involvedOrgs = Array.from(new Set([
    ...(toRecipient.org ? [toRecipient.org.name] : []),
    ...ccRecipients.map(r => r.org?.name).filter(Boolean) as string[]
  ]));

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

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-[75vh]">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* To Recipient */}
                <div className="space-y-2">
                  <div className="relative flex items-center gap-4 border-b border-slate-800 pb-2">
                    <span className="text-sm font-bold text-slate-500 w-12 uppercase tracking-widest">To</span>
                    <div className="relative flex-1">
                      <User className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                      <input
                        value={toRecipient.email}
                        onChange={(e) => updateToEmail(e.target.value)}
                        placeholder="recipient@example.com"
                        className="w-full bg-transparent py-2 pl-6 pr-4 text-sm text-white focus:outline-none placeholder:text-slate-700"
                      />
                    </div>
                  </div>
                  
                  <div className="relative ml-16 flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <Building2 className="h-3.5 w-3.5 text-slate-600" />
                      <input 
                        value={activeSearchTarget === "to" ? orgSearch : (toRecipient.org?.name || "")}
                        onChange={(e) => handleOrgSearch(e.target.value, "to")}
                        placeholder="Assign Organization..."
                        className="bg-transparent text-[11px] font-black text-sky-400 focus:outline-none placeholder:text-slate-700 w-full uppercase tracking-widest"
                      />
                    </div>
                    {toRecipient.dbOrgName && toRecipient.org && toRecipient.org.name !== toRecipient.dbOrgName && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-black uppercase animate-pulse">
                        <XCircle className="h-3 w-3" />
                        Target Mismatch
                      </div>
                    )}
                    {/* Search Dropdown for To */}
                    <AnimatePresence>
                      {activeSearchTarget === "to" && orgResults.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-800 bg-[#161e31] shadow-2xl custom-scrollbar"
                        >
                          {orgResults.map((org) => (
                            <button key={org.id} type="button" onClick={() => selectOrg(org)} className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-800">
                              <span className="font-bold text-slate-300">{org.name}</span>
                              <Plus className="h-3 w-3 text-sky-500" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* CC Recipients */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-500 w-12 uppercase tracking-widest">CC</span>
                    <button type="button" onClick={addCc} className="flex items-center gap-1 text-[10px] font-black text-sky-500 uppercase tracking-widest hover:text-sky-400 transition-colors">
                      <Plus className="h-3 w-3" />
                      Add CC
                    </button>
                  </div>
                  
                  {ccRecipients.map((cc, idx) => (
                    <div key={idx} className="space-y-2 pl-4 border-l-2 border-slate-800">
                      <div className="flex items-center gap-3">
                        <input
                          value={cc.email}
                          onChange={(e) => updateCcEmail(idx, e.target.value)}
                          placeholder="cc@example.com"
                          className="flex-1 bg-transparent py-1 text-sm text-white focus:outline-none placeholder:text-slate-800 border-b border-slate-800/40"
                        />
                        <button type="button" onClick={() => removeCc(idx)} className="text-slate-600 hover:text-red-400">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="relative flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Building2 className="h-3 w-3 text-slate-700" />
                          <input 
                            value={activeSearchTarget === idx ? orgSearch : (cc.org?.name || "")}
                            onChange={(e) => handleOrgSearch(e.target.value, idx)}
                            placeholder="Assign Organization..."
                            className="bg-transparent text-[10px] font-black text-slate-500 focus:outline-none placeholder:text-slate-800 w-full uppercase tracking-widest"
                          />
                        </div>
                        {cc.dbOrgName && cc.org && cc.org.name !== cc.dbOrgName && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-black uppercase">
                            Mismatch
                          </div>
                        )}
                        {/* Search Dropdown for CC */}
                        <AnimatePresence>
                          {activeSearchTarget === idx && orgResults.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-800 bg-[#161e31] shadow-2xl custom-scrollbar"
                            >
                              {orgResults.map((org) => (
                                <button key={org.id} type="button" onClick={() => selectOrg(org)} className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-800">
                                  <span className="font-bold text-slate-300">{org.name}</span>
                                  <Plus className="h-3 w-3 text-sky-500" />
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
                    <span className="text-sm font-bold text-slate-500 w-12 uppercase tracking-widest">About</span>
                    <input 
                      {...register("subject")}
                      placeholder="Subject line..."
                      className="flex-1 bg-transparent text-white focus:outline-none text-sm font-bold"
                    />
                  </div>

                  <textarea 
                    {...register("content")}
                    placeholder="Write your encrypted message here..."
                    className="w-full min-h-[120px] bg-transparent text-slate-300 focus:outline-none text-base resize-none leading-relaxed"
                  />
                </div>

                {/* Secure Routing Summary - Informative & Premium */}
                {involvedOrgs.length > 0 && (
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500/10 to-transparent border border-sky-500/20 p-5">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-sky-500/5 blur-3xl" />
                    
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-sky-400">Zero-Knowledge Routing Active</h4>
                        <p className="text-[11px] leading-relaxed text-slate-400">
                          Your message and attachments are being cross-encrypted using <b>AES-256-GCM</b>. 
                          Only participants within the authorized organizational containers listed below can decrypt this payload.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {involvedOrgs.map((name, i) => (
                        <div 
                          key={i} 
                          className="group relative flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 transition-all hover:border-sky-500/40 hover:bg-slate-800"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">{name}</span>
                          <Building2 className="h-3 w-3 text-slate-600 group-hover:text-sky-400 transition-colors" />
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-sky-500/10 pt-3 text-[9px] font-bold uppercase tracking-widest text-sky-500/60">
                      <Lock className="h-3 w-3" />
                      End-to-End Encrypted Tunnel Established
                    </div>
                  </div>
                )}

                {/* File Previews */}
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-800/40">
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
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/30 px-5 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                  >
                    <Paperclip className="h-4 w-4" />
                    Attach
                  </button>
                  <input type="file" multiple ref={fileInputRef} onChange={onFileChange} className="hidden" />
                  
                  {files.length > 0 && (
                    <div className="text-[10px] font-black text-sky-500 uppercase tracking-widest bg-sky-500/10 px-3 py-1.5 rounded-full border border-sky-500/20">
                      {files.length} Files Ready
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 rounded-xl bg-sky-500 px-8 py-2.5 text-sm font-black text-white hover:bg-sky-400 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 active:scale-95"
                >
                  {isSending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {progress}%</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send Secure</>
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
