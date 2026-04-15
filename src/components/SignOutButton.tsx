"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const { signOut } = useAuthActions();
  return (
    <button
      onClick={() => signOut()}
      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      title="Sign out"
    >
      <LogOut className="w-4 h-4" />
      Sign out
    </button>
  );
}
