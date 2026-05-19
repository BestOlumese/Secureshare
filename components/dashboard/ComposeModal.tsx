"use client";

import { useState, useRef, useEffect } from "react";
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
  Building2,
  Clock,
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
import { searchOrganizations, getRecipientOrg, getOrgPublicKey } from "@/app/actions/org-actions";
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
  replyTo?: {
    email: string;
    org: { id: string; name: string } | null;
    subject: string;
  };
  forwardSubject?: string;
}

export default function ComposeModal({ isOpen, onClose, user, replyTo, forwardSubject }: ComposeModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expiryDays, setExpiryDays] = useState(0);
  
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

  // Pre-fill when replying or forwarding
  useEffect(() => {
    if (!isOpen) return;
    if (replyTo) {
      setToRecipient({ email: replyTo.email, org: replyTo.org });
      setValue("subject", replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`);
    } else if (forwardSubject) {
      setValue("subject", forwardSubject.startsWith("Fwd:") ? forwardSubject : `Fwd: ${forwardSubject}`);
    }
  }, [replyTo, forwardSubject, isOpen]);

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
          org: prev.org ? prev.org : { id: org.id, name: org.name },
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
          updatedCcs[index].org = { id: org.id, name: org.name };
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

        // 6. Wrap AES key for each target organization (org-to-org encryption)
        const involvedOrgIds = Array.from(new Set([
          toRecipient.org?.id,
          ...ccRecipients.map((r) => r.org?.id),
        ].filter(Boolean))) as string[];

        const orgKeyShares: { orgId: string; encryptedAesKey: string }[] = [];
        for (const orgId of involvedOrgIds) {
          const orgPublicKey = await getOrgPublicKey(orgId);
          if (orgPublicKey) {
            const wrapped = await wrapAesKey(aesKey, orgPublicKey);
            orgKeyShares.push({ orgId, encryptedAesKey: wrapped });
          }
        }

        // 7. Send to API
        setProgress(90);
        const expiryDate = expiryDays > 0
          ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
          : undefined;
        await sendSecureMessage({
          subject: data.subject,
          content: encryptedContent,
          expiryDate,
          messageKeyShares: keyShares,
          orgKeyShares,
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
        setExpiryDays(0);
        onClose();
        return msg as string;
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
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Mail className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {replyTo ? "Reply" : forwardSubject ? "Forward" : "New Secure Message"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-[75vh]">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* To Recipient */}
                <div className="space-y-2">
                  <div className="relative flex items-center gap-4 border-b border-gray-100 pb-2">
                    <span className="text-sm font-bold text-gray-400 w-12 uppercase tracking-widest">To</span>
                    <div className="relative flex-1">
                      <User className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        value={toRecipient.email}
                        onChange={(e) => updateToEmail(e.target.value)}
                        placeholder="recipient@example.com"
                        className="w-full bg-transparent py-2 pl-6 pr-4 text-sm text-gray-900 focus:outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="relative ml-16 flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      <input
                        value={activeSearchTarget === "to" ? orgSearch : (toRecipient.org?.name || "")}
                        onChange={(e) => handleOrgSearch(e.target.value, "to")}
                        placeholder="Assign Organization..."
                        className="bg-transparent text-[11px] font-black text-blue-600 focus:outline-none placeholder:text-gray-400 w-full uppercase tracking-widest"
                      />
                    </div>
                    {toRecipient.dbOrgName && toRecipient.org && toRecipient.org.name !== toRecipient.dbOrgName && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-500 border border-red-200 text-[9px] font-black uppercase animate-pulse">
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
                          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-32 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg custom-scrollbar"
                        >
                          {orgResults.map((org) => (
                            <button key={org.id} type="button" onClick={() => selectOrg(org)} className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-gray-50">
                              <span className="font-bold text-gray-800">{org.name}</span>
                              <Plus className="h-3 w-3 text-blue-500" />
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
                    <span className="text-sm font-bold text-gray-400 w-12 uppercase tracking-widest">CC</span>
                    <button type="button" onClick={addCc} className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-500 transition-colors">
                      <Plus className="h-3 w-3" />
                      Add CC
                    </button>
                  </div>

                  {ccRecipients.map((cc, idx) => (
                    <div key={idx} className="space-y-2 pl-4 border-l-2 border-gray-200">
                      <div className="flex items-center gap-3">
                        <input
                          value={cc.email}
                          onChange={(e) => updateCcEmail(idx, e.target.value)}
                          placeholder="cc@example.com"
                          className="flex-1 bg-transparent py-1 text-sm text-gray-900 focus:outline-none placeholder:text-gray-400 border-b border-gray-100"
                        />
                        <button type="button" onClick={() => removeCc(idx)} className="text-gray-400 hover:text-red-400">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="relative flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          <input
                            value={activeSearchTarget === idx ? orgSearch : (cc.org?.name || "")}
                            onChange={(e) => handleOrgSearch(e.target.value, idx)}
                            placeholder="Assign Organization..."
                            className="bg-transparent text-[10px] font-black text-gray-500 focus:outline-none placeholder:text-gray-400 w-full uppercase tracking-widest"
                          />
                        </div>
                        {cc.dbOrgName && cc.org && cc.org.name !== cc.dbOrgName && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-500 border border-red-200 text-[8px] font-black uppercase">
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
                              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-32 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg custom-scrollbar"
                            >
                              {orgResults.map((org) => (
                                <button key={org.id} type="button" onClick={() => selectOrg(org)} className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-gray-50">
                                  <span className="font-bold text-gray-800">{org.name}</span>
                                  <Plus className="h-3 w-3 text-blue-500" />
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
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-2">
                    <span className="text-sm font-bold text-gray-400 w-12 uppercase tracking-widest">About</span>
                    <input
                      {...register("subject")}
                      placeholder="Subject line..."
                      className="flex-1 bg-transparent text-gray-900 focus:outline-none text-sm font-bold placeholder:text-gray-400"
                    />
                  </div>

                  <textarea
                    {...register("content")}
                    placeholder="Write your encrypted message here..."
                    className="w-full min-h-[120px] bg-transparent text-gray-700 focus:outline-none text-base resize-none leading-relaxed placeholder:text-gray-400"
                  />
                </div>

                {/* Secure Routing Summary */}
                {involvedOrgs.length > 0 && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 ring-1 ring-blue-200">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Zero-Knowledge Routing Active</h4>
                        <p className="text-[11px] leading-relaxed text-gray-600">
                          Your message and attachments are cross-encrypted using <b>AES-256-GCM</b>.
                          Only participants within the authorized organizations below can decrypt this payload.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {involvedOrgs.map((name, i) => (
                        <div
                          key={i}
                          className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-all hover:border-blue-200 hover:bg-blue-50"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">{name}</span>
                          <Building2 className="h-3 w-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-blue-100 pt-3 text-[9px] font-bold uppercase tracking-widest text-blue-500">
                      <Lock className="h-3 w-3" />
                      End-to-End Encrypted Tunnel Established
                    </div>
                  </div>
                )}

                {/* File Previews */}
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-700">
                        <FileText className="h-3 w-3 text-blue-500" />
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="ml-1 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
                  >
                    <Paperclip className="h-4 w-4" />
                    Attach
                  </button>
                  <input type="file" multiple ref={fileInputRef} onChange={onFileChange} className="hidden" />

                  {/* Expiry selector */}
                  <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500">
                    <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <select
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(Number(e.target.value))}
                      className="bg-transparent focus:outline-none text-xs font-bold text-gray-600"
                    >
                      <option value={0}>No expiry</option>
                      <option value={1}>Expires in 1 day</option>
                      <option value={7}>Expires in 7 days</option>
                      <option value={30}>Expires in 30 days</option>
                      <option value={90}>Expires in 90 days</option>
                    </select>
                  </div>

                  {files.length > 0 && (
                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                      {files.length} Files Ready
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
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
