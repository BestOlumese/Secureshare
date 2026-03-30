"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileUp, 
  Mail, 
  Calendar, 
  Loader2, 
  ShieldCheck, 
  Lock,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { 
  generateAesKey, 
  encryptFile, 
  wrapAesKey 
} from "@/lib/crypto-client";
import { 
  getReceiverPublicKey, 
  saveDocumentMetadata 
} from "@/app/actions/documents";
import { useUploadThing } from "@/lib/uploadthing";

const uploadSchema = z.object({
  receiverEmail: z.string().email("Invalid email address"),
  expiryDate: z.string().min(1, "Expiry date is required"),
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
    if (!file) {
      toast.error("Please select a file to encrypt and send.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    const uploadPromise = async () => {
      // 1. Fetch Receiver's Public Key
      setUploadProgress(20);
      const receiver = await getReceiverPublicKey(data.receiverEmail);
      
      // 2. Encrypt File Client-Side
      setUploadProgress(40);
      const aesKey = await generateAesKey();
      const { encryptedBlob } = await encryptFile(file, aesKey);

      // 3. Wrap AES Key for Receiver
      setUploadProgress(60);
      const wrappedKey = await wrapAesKey(aesKey, receiver.publicKey!);

      // 4. Upload to UploadThing
      setUploadProgress(75);
      const encryptedFile = new File([encryptedBlob], file.name, { type: file.type });
      
      const res = await startUpload([encryptedFile]);

      if (!res || res.length === 0) {
        throw new Error("UploadThing failed to process the request.");
      }

      const uploadResult = res[0];

      // 5. Save Metadata to DB
      setUploadProgress(90);
      await saveDocumentMetadata({
        receiverId: receiver.id,
        fileUrl: uploadResult.url, // Use the public URL from UploadThing
        encryptedAesKey: wrappedKey,
        expiryDate: data.expiryDate,
      });

      setUploadProgress(100);
      return "Document sent securely via UploadThing!";
    };

    toast.promise(uploadPromise(), {
      loading: "Encrypting and uploading document...",
      success: (msg) => {
        setIsUploading(false);
        setFile(null);
        window.location.href = "/dashboard";
        return msg;
      },
      error: (err) => {
        setIsUploading(false);
        setUploadProgress(0);
        return err.message || "Failed to send document.";
      },
    });
  }

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* File Dropzone */}
        <div className="glass-card flex flex-col items-center justify-center border-dashed border-2 border-slate-800 p-12 transition-all hover:border-sky-500/50">
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/10 text-sky-400">
              {file ? <Lock className="h-8 w-8" /> : <FileUp className="h-8 w-8" />}
            </div>
            <div>
              <p className="text-lg font-bold text-white">
                {file ? file.name : "Select a path to encrypt"}
              </p>
              <p className="text-sm text-slate-500">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF, JPEG, or DOCX up to 50MB"}
              </p>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Recipient Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Recipient Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                {...register("receiverEmail")}
                placeholder="colleague@company.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-4 text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {errors.receiverEmail && <p className="mt-1 text-sm text-red-400">{errors.receiverEmail.message}</p>}
            </div>
          </div>

          {/* Expiry Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Expiry Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                {...register("expiryDate")}
                type="date"
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-3 pl-10 pr-4 text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {errors.expiryDate && <p className="mt-1 text-sm text-red-400">{errors.expiryDate.message}</p>}
            </div>
          </div>
        </div>

        {/* Security Alert */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-sky-400">
          <div className="flex gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <p>Your file will be encrypted using 256-bit AES protection. The encryption key is protected using the recipient's RSA-OAEP public key. We never see your plaintext data.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="premium-button flex w-full items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{uploadProgress}% Securely Uploading...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" />
              <span>Send Encrypted Document</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
