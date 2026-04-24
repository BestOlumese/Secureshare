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
  ChevronLeft,
  FileText,
  Lock,
  MoreVertical,
  X,
  Trash2,
  Printer,
  Archive
} from "lucide-react";
import { motion } from "framer-motion";
import DecryptButton from "./DecryptButton";
import DecryptMessageText from "./DecryptMessageText";

interface MessageViewProps {
  message: Message;
  onClose?: () => void;
}

export default function MessageView({ message, onClose }: MessageViewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col w-full h-full overflow-hidden"
    >
      {/* Action Bar */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 border-b border-slate-800/60 bg-[#020617]/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          {onClose && (
            <button 
              onClick={onClose}
              className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 group-hover:border-slate-700">
                <ChevronLeft className="h-4 w-4 md:hidden" />
                <X className="h-4 w-4 hidden md:block" />
              </div>
            </button>
          )}
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/5 text-emerald-500 border border-emerald-500/10 text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Secure Channel</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button title="Archive" className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
            <Archive className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-slate-800/60 mx-1" />
          <button title="Delete" className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
        {/* Header */}
        <div className="max-w-4xl mx-auto w-full mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                {message.subject || "(No Subject)"}
              </h1>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 font-medium">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(message.createdAt), "EEEE, MMM do yyyy 'at' HH:mm")}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/30 border border-slate-800/40">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-linear-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-base sm:text-lg font-bold text-white shrink-0 shadow-lg shadow-sky-500/10">
              {message.sender?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between mb-3 sm:mb-2 gap-1 border-b border-slate-800/50 pb-2">
                <span className="font-black text-white text-sm sm:text-base tracking-tight truncate">{message.sender?.email}</span>
                <span className="text-[9px] sm:text-[10px] font-black text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20 uppercase tracking-widest shrink-0 w-fit">SENDER</span>
              </div>
              
              <div className="flex flex-col gap-y-2 text-[11px] sm:text-xs">
                <div className="flex items-start gap-2.5 text-slate-400">
                  <span className="text-slate-600 font-black uppercase tracking-widest text-[9px] sm:text-[10px] shrink-0 mt-0.5">To:</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {message.recipients?.filter(r => r.role === "TO").map((r, i, arr) => (
                      <span key={i} className="font-bold text-slate-300 hover:text-white transition-colors">
                        {r.user.email}
                      </span>
                    ))}
                  </div>
                </div>
                
                {message.recipients?.some(r => r.role === "CC") && (
                  <div className="flex items-start gap-2.5 text-slate-400">
                    <span className="text-slate-600 font-black uppercase tracking-widest text-[9px] sm:text-[10px] shrink-0 mt-0.5">Cc:</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {message.recipients?.filter(r => r.role === "CC").map((r, i, arr) => (
                        <span key={i} className="font-bold text-slate-400 hover:text-white transition-colors">
                          {r.user.email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto w-full mb-8 sm:mb-12">
          <div className="bg-slate-900/20 rounded-2xl sm:rounded-[40px] p-6 sm:p-10 border border-slate-800/30 relative">
            <div className="absolute top-4 sm:top-6 right-4 sm:right-8 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-[10px] font-bold text-slate-500">
              <Lock className="h-3 w-3" />
              <span className="hidden xs:inline">E2EE Payload</span>
              <span className="xs:hidden">E2EE</span>
            </div>
            
            <div className="prose prose-invert prose-slate max-w-none pt-6 sm:pt-0">
              <DecryptMessageText messageId={message.id} />
            </div>
          </div>
        </div>

        {/* Attachments */}
        {message.documents.length > 0 && (
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-6 px-2">
              <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-widest whitespace-nowrap">Secure Attachments</h4>
              <div className="h-px flex-1 bg-slate-800/60" />
              <span className="text-[9px] sm:text-[10px] font-black text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50 whitespace-nowrap">
                {message.documents.length} FILES
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {message.documents.map((doc) => (
                <div 
                  key={doc.id}
                  className="group flex items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/40 border border-slate-800/60 hover:border-sky-500/40 hover:bg-slate-900/60 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-800 flex items-center justify-center text-sky-400 shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-all">
                      <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                        {doc.fileName || "Secure File"}
                      </p>
                      <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">
                        {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "Encrypted"}
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
