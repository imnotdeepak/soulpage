"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { isSessionActive } from "@/lib/session-key";
import { CreatePassphrase } from "./create-passphrase";
import { EnterPassphrase } from "./enter-passphrase";
import { RecoverPassphrase } from "./recover-passphrase";

interface PassphraseGateProps {
  children: React.ReactNode;
}

type PassphraseMode = "checking" | "create" | "enter" | "recover" | "unlocked";

export function PassphraseGate({ children }: PassphraseGateProps) {
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<PassphraseMode>("checking");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) {
      setMode("checking");
      return;
    }
    // Only check status if we have a valid session
    if (session?.user) {
      checkPassphraseStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isPending]);

  // Remove sessionStorage check - we now use database
  // Clean up old sessionStorage flag if it exists
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("passphrase_created");
    }
  }, []);

  const checkPassphraseStatus = async () => {
    try {
      // Check if user is authenticated
      if (!session?.user) {
        // User not authenticated - this shouldn't happen if middleware is working
        // but handle it gracefully
        setMode("create");
        setUserId(null);
        return;
      }

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      // Check if session is already active (user has entered passphrase)
      if (isSessionActive()) {
        setMode("unlocked");
        return;
      }

      // Check database to see if user has any journal entries
      // If they have entries, they've set up passphrase before
      // If no entries, they need to create passphrase
      try {
        const response = await fetch("/api/journal/check-passphrase");
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            if (result.hasPassphrase) {
              setMode("enter");
              return;
            } else {
              // First-time user - needs to create passphrase
              setMode("create");
              return;
            }
          }
        }
      } catch (fetchError) {
        // API call failed - default to enter mode
      }

      // Fallback: if API call fails, default to "enter" mode
      setMode("enter");
    } catch (error) {
      // Default to "enter" mode if there's an error
      setMode("enter");
    }
  };

  const handlePassphraseCreated = (recoveryKey: string) => {
    // Store recovery key in sessionStorage only (clears on browser close)
    // We don't store in localStorage for security - user must unlock each session
    if (typeof window !== "undefined") {
      sessionStorage.setItem("recovery_key", recoveryKey);
    }
    setMode("unlocked");
  };

  const handlePassphraseEntered = () => {
    setMode("unlocked");
  };

  const handleRecoveryClick = () => {
    setMode("recover");
  };

  const handleRecoveryBack = () => {
    setMode("enter");
  };

  // Show loading while checking session
  if (mode === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If we don't have a userId, show create mode (shouldn't happen if middleware works)
  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <CreatePassphrase userId="" onComplete={handlePassphraseCreated} />
      </div>
    );
  }

  if (mode === "unlocked") {
    return <>{children}</>;
  }

  if (mode === "create") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <CreatePassphrase
          userId={userId}
          onComplete={handlePassphraseCreated}
        />
      </div>
    );
  }

  if (mode === "recover") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <RecoverPassphrase
          userId={userId}
          onSuccess={handlePassphraseEntered}
          onBack={handleRecoveryBack}
        />
      </div>
    );
  }

  // mode === "enter"
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <EnterPassphrase
        userId={userId}
        onSuccess={handlePassphraseEntered}
        onRecoveryClick={handleRecoveryClick}
      />
    </div>
  );
}
