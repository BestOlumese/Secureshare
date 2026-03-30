import LoginForm from "@/components/auth/LoginForm";
import { Shield } from "lucide-react";
import Link from "next/link";
import { protectAuthPage } from "@/lib/auth-utils";

export default async function LoginPage() {
  await protectAuthPage();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full bg-[radial-gradient(circle_at_center,#0ea5e910_0%,transparent_70%)]" />
      </div>

      <Link 
        href="/" 
        className="mb-12 flex items-center gap-2 text-2xl font-black uppercase tracking-tighter text-white transition-opacity hover:opacity-80"
      >
        <Shield className="h-8 w-8 text-sky-500" />
        SecureShare
      </Link>

      <LoginForm />

      <p className="mt-8 text-sm text-slate-500">
        New here? We'll create an account for you automatically.
      </p>
    </main>
  );
}
