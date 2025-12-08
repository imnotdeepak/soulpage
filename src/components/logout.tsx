"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { clearSession, stopAutoLockMonitoring } from "@/lib/session-key";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";

export function Logout() {
  const router = useRouter();

  const handleLogout = async () => {
    // Clear encryption session
    clearSession();
    stopAutoLockMonitoring();

    // Note: We keep recovery_key in sessionStorage so user can unlock with just passphrase
    // It will clear when browser is closed (sessionStorage behavior)
    // Only clear the passphrase_created flag
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("passphrase_created");
    }

    // Sign out from auth
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <Button onClick={handleLogout} className="gap-2">
      Logout <LogOut className="size-4" />
    </Button>
  );
}
