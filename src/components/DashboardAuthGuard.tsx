"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      const token = await nextUser?.getIdTokenResult().catch(() => null);
      const allowed = token?.claims.admin === true;
      setUser(allowed ? nextUser : null);
      setChecking(false);
      if (!allowed) {
        localStorage.removeItem("admin_session");
        router.replace("/admin");
      }
    });
  }, [router]);

  if (checking || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f9f9f9]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e2e2e2] border-t-[#d48806]" />
      </div>
    );
  }

  return <>{children}</>;
}
