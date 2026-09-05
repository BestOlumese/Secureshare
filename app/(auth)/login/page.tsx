import LoginForm from "@/components/auth/LoginForm";
import Link from "next/link";
import { protectAuthPage } from "@/lib/auth-utils";
import Logo from "@/components/Logo";

export default async function LoginPage() {
  await protectAuthPage();
  return (
    <main className="flex min-h-screen bg-gray-50">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-blue-600 px-12 py-12">
        <Link href="/" className="flex items-center gap-2 font-semibold text-xl text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Logo className="h-4 w-4 text-white" />
          </div>
          SecureShare
        </Link>

        <div className="space-y-6">
          <h2 className="text-4xl font-semibold text-white leading-tight">
            Send files nobody else<br />can read.
          </h2>
          <p className="text-blue-100 text-base leading-relaxed max-w-sm">
            Locked in your browser before they reach us. Only the people you send them to can open them.
          </p>

          <div className="space-y-3 pt-4">
            {[
              "Encrypted in your browser",
              "Your keys stay on your device",
              "A separate key for every person",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-blue-100">
                <div className="h-1.5 w-1.5 rounded-full bg-white/60 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-blue-200">© 2026 SecureShare. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <Link href="/" className="lg:hidden flex items-center gap-2 font-semibold text-lg text-gray-900 mb-10">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Logo className="h-3.5 w-3.5" />
          </div>
          SecureShare
        </Link>

        <LoginForm />

        <p className="mt-8 text-sm text-gray-400">
          New here? We&apos;ll make you an account.
        </p>
      </div>
    </main>
  );
}
