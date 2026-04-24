"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Lock, FileUp, ArrowRight, Users, MessageSquare } from "lucide-react";
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
import { useUploadThing } from "@/lib/uploadthing";

const uploadSchema = z.object({
  receiverEmails: z.string().min(1, "At least one recipient email is required"),
  subject: z.string().optional(),
  content: z.string().optional(),
});

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { startUpload } = useUploadThing("encryptedFileUploader");

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  async function onSubmit(data: z.infer<typeof uploadSchema>) {
    if (!file && !data.content) {
      toast.error("Please provide a file or message content to send.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    const uploadPromise = async () => {
      // Parse emails from comma separated string
      const emails = data.receiverEmails
        .split(",")
        .map(e => e.trim())
        .filter(e => e.length > 0);

      // 1. Fetch Public Keys (Receivers + Sender)
      setUploadProgress(20);
      const receiverKeys = await getPublicKeys(emails);
      const senderKey = await getSenderPublicKey();

      // Combine all keys (deduplicate if sender is also in receivers)
      const allKeys = [...receiverKeys];
      if (!allKeys.find(k => k.id === senderKey.id)) {
        allKeys.push({ id: senderKey.id, email: "Sender", publicKey: senderKey.publicKey });
      }

      // 2. Generate ONE Master AES Key for this Message/File
      setUploadProgress(30);
      const aesKey = await generateAesKey();

      // 3. Encrypt the Message Content
      let encryptedContent = undefined;
      if (data.content) {
        setUploadProgress(40);
        encryptedContent = await encryptString(data.content, aesKey);
      }

      // 4. Encrypt the File
      let uploadedFileUrl = "";
      if (file) {
        setUploadProgress(50);
        const { encryptedBlob } = await encryptFile(file, aesKey);

        setUploadProgress(60);
        const encryptedFile = new File([encryptedBlob], file.name, { type: file.type });
        const res = await startUpload([encryptedFile]);

        if (!res || res.length === 0) {
          throw new Error("Upload failed.");
        }
        uploadedFileUrl = res[0].url;
      }

      // 5. Wrap the AES Key for EVERY participant
      setUploadProgress(80);
      const keyShares = await Promise.all(
        allKeys.map(async (user) => {
          const wrapped = await wrapAesKey(aesKey, user.publicKey);
          return { userId: user.id, encryptedAesKey: wrapped };
        })
      );

      // 6. Send to API
      setUploadProgress(90);
      
      const attachments = file ? [{
        fileUrl: uploadedFileUrl,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        documentKeyShares: keyShares, // Using same keys for the document
      }] : [];

      await sendSecureMessage({
        subject: data.subject,
        content: encryptedContent,
        messageKeyShares: keyShares,
        attachments
      });

      setUploadProgress(100);
      return "Message sent securely!";
    };

    toast.promise(uploadPromise(), {
      loading: "Encrypting and sending message...",
      success: (msg) => {
        setIsUploading(false);
        setFile(null);
        window.location.href = "/dashboard";
        return msg;
      },
      error: (err) => {
        setIsUploading(false);
        setUploadProgress(0);
        return err.message || "Failed to send message.";
      },
    });
  }

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Recipients Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Recipients (comma separated)</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              {...register("receiverEmails")}
              placeholder="user1@company.com, user2@domain.com"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-4 text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          {errors.receiverEmails && <p className="mt-1 text-sm text-red-400">{errors.receiverEmails.message}</p>}
        </div>

        {/* Subject Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Subject (Optional)</label>
          <div className="relative">
            <input
              {...register("subject")}
              placeholder="Secure Documents Attached"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 px-4 text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Secure Message</label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
            <textarea
              {...register("content")}
              placeholder="Type your secure message here. It will be E2E encrypted."
              rows={4}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-4 text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
            />
          </div>
        </div>

        {/* File Dropzone */}
        <div className="glass-card flex flex-col items-center justify-center border-dashed border-2 border-slate-800 p-8 transition-all hover:border-sky-500/50">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={onFileChange}
          />
          <label
            htmlFor="file-upload"
            className="flex cursor-pointer flex-col items-center gap-4 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 text-sky-400">
              {file ? <Lock className="h-6 w-6" /> : <FileUp className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-base font-bold text-white">
                {file ? file.name : "Attach a file"}
              </p>
              <p className="text-xs text-slate-500">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Optional attachment"}
              </p>
            </div>
          </label>
        </div>

        {/* Security Alert */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-sky-400">
          <div className="flex gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <p>Your message and file will be encrypted using 256-bit AES. We never see your plaintext data.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="premium-button flex w-full items-center justify-center gap-2 py-4"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{uploadProgress}% Securely Uploading...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" />
              <span>Send Secure Message</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
