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

  const fieldClass = "w-full rounded-xl border border-gray-200 bg-white py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all";

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Recipients */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Recipients</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              {...register("receiverEmails")}
              placeholder="user1@company.com, user2@domain.com"
              className={`${fieldClass} pl-10`}
            />
          </div>
          {errors.receiverEmails && <p className="mt-1 text-xs text-red-500">{errors.receiverEmails.message}</p>}
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject <span className="text-gray-400 font-normal">(optional)</span></label>
          <input {...register("subject")} placeholder="Secure Documents Attached" className={fieldClass} />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message <span className="text-gray-400 font-normal">(optional)</span></label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <textarea
              {...register("content")}
              placeholder="Type your secure message here. It will be E2E encrypted."
              rows={4}
              className={`${fieldClass} pl-10 resize-none`}
            />
          </div>
        </div>

        {/* File Dropzone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Attachment <span className="text-gray-400 font-normal">(optional)</span></label>
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 transition-all hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer">
            <input type="file" id="file-upload" className="hidden" onChange={onFileChange} />
            <label htmlFor="file-upload" className="flex cursor-pointer flex-col items-center gap-3 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {file ? <Lock className="h-5 w-5" /> : <FileUp className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">{file ? file.name : "Click to attach a file"}</p>
                <p className="text-xs text-gray-400">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Any file type supported"}</p>
              </div>
            </label>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">Your message and files are encrypted with AES-256 in your browser. We never see your plaintext data.</p>
        </div>

        <button type="submit" disabled={isUploading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
          {isUploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />{uploadProgress}% Uploading...</>
          ) : (
            <><ShieldCheck className="h-4 w-4" />Send Secure Message<ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>
    </div>
  );
}
