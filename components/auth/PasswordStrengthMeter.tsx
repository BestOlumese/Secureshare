"use client";

import { assessPassword } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

const BAR_COLORS: Record<number, string> = {
  0: "bg-red-400",
  1: "bg-red-400",
  2: "bg-amber-400",
  3: "bg-blue-500",
  4: "bg-emerald-500",
};

const TEXT_COLORS: Record<number, string> = {
  0: "text-red-500",
  1: "text-red-500",
  2: "text-amber-600",
  3: "text-blue-600",
  4: "text-emerald-600",
};

/**
 * Strength readout for the master password. Purely advisory in the UI — the
 * submit path does its own `assessPassword(...).acceptable` check.
 */
export default function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label, hints } = assessPassword(password);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" role="presentation">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                step <= score ? BAR_COLORS[score] : "bg-gray-200"
              )}
            />
          ))}
        </div>
        <span
          className={cn("text-xs font-medium", TEXT_COLORS[score])}
          // Announce changes without stealing focus from the input.
          aria-live="polite"
        >
          {label}
        </span>
      </div>

      {hints.length > 0 && (
        <ul className="space-y-0.5">
          {hints.map((hint) => (
            <li key={hint} className="text-xs text-gray-500">
              {hint}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
