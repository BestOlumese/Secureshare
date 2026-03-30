"use client";

import { Message } from "./DashboardUI";
import { format } from "date-fns";
import { 
  User, 
  Clock, 
  Paperclip, 
  ShieldCheck, 
  Download, 
  ChevronRight,
  FileText,
  Lock,
  MoreVertical,
  Reply,
  Forward,
  Trash2,
  Printer,
  Archive
} from "lucide-react";
import { motion } from "framer-motion";
import DecryptButton from "./DecryptButton";

interface MessageViewProps {
  message: Message;
}

export default function MessageView({ message }: MessageViewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Action Bar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/10">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors">
            <Reply className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors">
            <Forward className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors">
            <Archive className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors">
            <Printer className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-white mb-6 leading-tight italic tracking-tight">
            {message.subject || "(No Subject)"}
          </h1>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-linear-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-sky-500/10">
                {message.sender?.name?.charAt(0) || "U"}
              </div>
              <div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-10">From:</span>
                    <span className="font-bold text-white">{message.sender?.name || "Unknown"}</span>
                    <span className="text-xs text-slate-500">&lt;{message.sender?.email || "unknown@securemail"}&gt;</span>
                  </div>
                  {message.receiver && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-10">To:</span>
                      <span className="font-bold text-slate-300">{message.receiver.name}</span>
                      <span className="text-xs text-slate-500">&lt;{message.receiver.email}&gt;</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(message.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold uppercase tracking-widest text-[9px]">
                    <ShieldCheck className="h-3 w-3" />
                    End-to-End Encrypted
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-lg mb-12">
          {message.content ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-900/30 border border-slate-800 border-dashed text-center">
              <Lock className="h-8 w-8 mx-auto mb-4 text-slate-700" />
              <p className="text-slate-500">This message content is protected by Zero-Knowledge encryption.</p>
            </div>
          )}
        </div>

        {/* Attachments */}
        {message.documents.length > 0 && (
          <div className="mt-12">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-800 pb-2">
              <Paperclip className="h-4 w-4" />
              Attachments ({message.documents.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {message.documents.map((doc) => (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-5 rounded-2xl border border-slate-800 bg-[#0f172a]/50 hover:bg-[#0f172a] hover:border-sky-500/30 transition-all group"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-sky-500/10 group-hover:text-sky-400 transition-colors">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-white truncate text-sm">{doc.fileName || "Encrypted File"}</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "Encrypted Blob"} • {doc.contentType || "Binary"}
                      </p>
                    </div>
                  </div>
                  
                  <DecryptButton docId={doc.id} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
