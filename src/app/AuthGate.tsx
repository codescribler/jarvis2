"use client";

import { ReactNode } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { Navigation } from "@/components/Navigation";
import { SignInScreen } from "@/components/SignInScreen";
import { SignOutButton } from "@/components/SignOutButton";

export function AuthGate({ children }: { children: ReactNode }) {
  return (
    <>
      <Authenticated>
        <div className="w-full max-w-6xl flex items-center justify-between mb-2">
          <Navigation />
          <SignOutButton />
        </div>
        {children}
      </Authenticated>
      <Unauthenticated>
        <SignInScreen />
      </Unauthenticated>
    </>
  );
}
