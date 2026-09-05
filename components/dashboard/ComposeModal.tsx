"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Paperclip,
  Loader2,
  User,
  Mail,
  XCircle,
  FileText,
  Lock,
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
  encryptString,
  opaqueUploadName
} from "@/lib/crypto-client";
import { 
  getPublicKeys,
  getSenderPublicKey, 
  sendSecureMessage 
} from "@/app/actions/documents";
import { searchOrganizations, getRecipientOrg, getOrgPublicKey } from "@/app/actions/org-actions";
import { useUploadThing } from "@/lib/uploadthing";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { getErrorMessage } from "@/lib/utils";

const composeSchema = z.object({
  subject: z.string().min(1, "Add a subject"),
  content: z.string().optional(),
});

type ComposeData = z.infer<typeof composeSchema>;

/** What sendSecureMessage expects for each encrypted attachment. */
interface AttachmentMetadata {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  documentKeyShares: Array<{ userId: string; encryptedAesKey: string }>;
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: {
    email: string;
    org: { id: string; name: string } | null;
    subject: string;
  };
  forwardSubject?: string;
}

export default function ComposeModal({ isOpen, onClose, replyTo, forwardSubject }: ComposeModalProps) {
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
  
  const dialogRef = useModalA11y<HTMLDivElement>(isOpen, onClose);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { startUpload } = useUploadThing("encryptedFileUploader");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ComposeData>({
    resolver: zodResolver(composeSchema),
  });

  // Pre-fill when replying or forwarding
  useEffect(() => {
    if (!isOpen) return;
    if (replyTo) {
      setToRecipient({ email: replyTo.email, org: replyTo.org });
      setValue("subject", replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`);
    } else if (forwardSubject) {
      setValue("subject", forwardSubject.startsWith("Fwd:") ? forwardSubject : `Fwd: ${forwardSubject}`);
    }
  }, [replyTo, forwardSubject, isOpen, setValue]);


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
      setCcRecipients(prev =>
        prev.map((cc, i) => (i === activeSearchTarget ? { ...cc, org } : cc))
      );
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
      // Ignore a lookup the user has already typed past.
      setToRecipient(prev => {
        if (prev.email !== email) return prev;
        if (!org) return { ...prev, dbOrgName: undefined };
        return {
          ...prev,
          dbOrgName: org.name,
          org: prev.org ? prev.org : { id: org.id, name: org.name },
        };
      });
    }
  };

  const updateCcEmail = async (index: number, email: string) => {
    // Updater form + copied rows: the lookup below is async, so building from
    // a captured snapshot would drop any CC row added while it was in flight.
    setCcRecipients(prev => prev.map((cc, i) => (i === index ? { ...cc, email } : cc)));

    if (email.includes("@") && email.includes(".")) {
      const org = await getRecipientOrg(email);
      setCcRecipients(prev => prev.map((cc, i) => {
        if (i !== index || cc.email !== email) return cc;
        if (!org) return { ...cc, dbOrgName: undefined };
        return {
          ...cc,
          dbOrgName: org.name,
          org: cc.org ? cc.org : { id: org.id, name: org.name },
        };
      }));
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
      toast.error("Add a recipient");
      return;
    }

    if (!toRecipient.org) {
      toast.error(`Pick an organization for ${toRecipient.email}`);
      return;
    }

    // CC rows carry their own org, and it drives that org's key share. A blank
    // one is silently dropped from involvedOrgIds, leaving those admins unable
    // to recover the message from their vault — so require it, as TO does.
    const ccWithoutOrg = ccRecipients.filter(cc => cc.email.trim().length > 0 && !cc.org);
    if (ccWithoutOrg.length > 0) {
      toast.error(`Pick an organization for ${ccWithoutOrg.map(cc => cc.email).join(", ")}`);
      return;
    }

    // 2. Mismatch Enforcement (Critical)
    const toMismatch = toRecipient.dbOrgName && toRecipient.org && toRecipient.org.name !== toRecipient.dbOrgName;
    const ccMismatch = ccRecipients.some(cc => cc.dbOrgName && cc.org && cc.org.name !== cc.dbOrgName);

    if (toMismatch || ccMismatch) {
      const wrong = toMismatch ? toRecipient : ccRecipients.find(cc => cc.dbOrgName && cc.org && cc.org.name !== cc.dbOrgName)!;
      toast.error(`${wrong.email} is at ${wrong.dbOrgName}, not ${wrong.org?.name}`, {
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

        // 3. Encrypt subject and message content
        setProgress(40);
        const encryptedSubject = await encryptString(data.subject, aesKey);
        let encryptedContent = undefined;
        if (data.content) {
          encryptedContent = await encryptString(data.content, aesKey);
        }

        const attachmentMetadata: AttachmentMetadata[] = [];
        
        // 4. Encrypt files
        if (files.length > 0) {
          setProgress(50);
          const encryptedFiles = await Promise.all(
            files.map(async (file) => {
              const { encryptedBlob } = await encryptFile(file, aesKey);
              return {
                // Opaque name — the storage provider must never see the real one
                file: new File([encryptedBlob], opaqueUploadName(file.name), { type: file.type }),
                // File name is encrypted with the same AES key as the message,
                // so it only becomes readable once the recipient decrypts.
                encryptedName: await encryptString(file.name, aesKey),
                size: file.size,
                type: file.type
              };
            })
          );

          setProgress(60);
          const uploadResults = await startUpload(encryptedFiles.map(f => f.file));
          if (!uploadResults) throw new Error("Couldn't upload the attachments.");

          encryptedFiles.forEach((f, i) => {
            attachmentMetadata.push({
              fileUrl: uploadResults[i].url,
              fileName: f.encryptedName,
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
          subject: encryptedSubject,
          content: encryptedContent,
          expiryDate,
          messageKeyShares: keyShares,
          orgKeyShares,
          attachments: attachmentMetadata,
        });

        setProgress(100);
        return "Sent";
      } catch (err: unknown) {
        throw new Error(getErrorMessage(err, "Couldn't send."));
      }
    };

    toast.promise(sendPromise(), {
      loading: "Sending...",
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
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-dialog-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl outline-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Mail className="h-4 w-4" />
                </div>
                <h2 id="compose-dialog-title" className="text-lg font-bold text-gray-900">
                  {replyTo ? "Reply" : forwardSubject ? "Forward" : "New message"}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close compose window"
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
                    <span className="text-sm font-bold text-gray-400 w-12">To</span>
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
                        placeholder="Organization"
                        className="bg-transparent text-xs font-semibold text-blue-600 focus:outline-none placeholder:text-gray-400 w-full"
                      />
                    </div>
                    {toRecipient.dbOrgName && toRecipient.org && toRecipient.org.name !== toRecipient.dbOrgName && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 text-red-500 border border-red-200 text-xs font-semibold animate-pulse">
                        <XCircle className="h-3 w-3" />
                        Target Mismatch
                      </div>
                    )}
                    {activeSearchTarget === "to" && isSearchingOrgs && (
                      <span className="text-xs font-bold text-gray-400 shrink-0">
                        Searching...
                      </span>
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
                    <span className="text-sm font-bold text-gray-400 w-12">CC</span>
                    <button type="button" onClick={addCc} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors">
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
                        <button type="button" onClick={() => removeCc(idx)} aria-label="Remove CC recipient" className="text-gray-400 hover:text-red-400">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="relative flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          <input
                            value={activeSearchTarget === idx ? orgSearch : (cc.org?.name || "")}
                            onChange={(e) => handleOrgSearch(e.target.value, idx)}
                            placeholder="Organization"
                            className="bg-transparent text-xs font-semibold text-gray-500 focus:outline-none placeholder:text-gray-400 w-full"
                          />
                        </div>
                        {cc.dbOrgName && cc.org && cc.org.name !== cc.dbOrgName && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 text-red-500 border border-red-200 text-[8px] font-semibold">
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
                    <span className="text-sm font-bold text-gray-400 w-12">About</span>
                    <input
                      {...register("subject")}
                      placeholder="Subject"
                      aria-invalid={!!errors.subject}
                      className="flex-1 bg-transparent text-gray-900 focus:outline-none text-sm font-bold placeholder:text-gray-400"
                    />
                  </div>
                  {errors.subject && (
                    <p className="text-xs text-red-500 -mt-2">{errors.subject.message}</p>
                  )}

                  <textarea
                    {...register("content")}
                    placeholder="Message"
                    className="w-full min-h-[120px] bg-transparent text-gray-700 focus:outline-none text-base resize-none leading-relaxed placeholder:text-gray-400"
                  />
                </div>

                {/* Who will be able to open this */}
                {involvedOrgs.length > 0 && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                    <div className="flex items-center gap-2.5">
                      <Lock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <p className="text-xs text-gray-700">
                        Only {involvedOrgs.length === 1 ? "" : "people at "}
                        {involvedOrgs.map((name, i) => (
                          <span key={i}>
                            {i > 0 && (i === involvedOrgs.length - 1 ? " and " : ", ")}
                            <b className="text-gray-900">{name}</b>
                          </span>
                        ))}
                        {" "}can open this.
                      </p>
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
                          aria-label={`Remove attachment ${file.name}`}
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
                    <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                      {files.length} Files Ready
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-all disabled:opacity-50"
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
