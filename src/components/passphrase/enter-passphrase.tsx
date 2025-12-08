"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  initializeSession,
  initializeSessionWithDEK,
  startAutoLockMonitoring,
} from "@/lib/session-key";
import {
  deriveKeyFromPassphrase,
  deriveKEKFromPassphrase,
  decryptDEK,
  decryptAndDecompress,
} from "@/lib/encryption";
import { Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";

interface EnterPassphraseProps {
  userId: string;
  recoveryKey?: string; // Optional: if provided, user is recovering with recovery key
  onSuccess: () => void;
  onRecoveryClick?: () => void; // Callback to switch to recovery mode
}

export function EnterPassphrase({
  userId,
  recoveryKey,
  onSuccess,
  onRecoveryClick,
}: EnterPassphraseProps) {
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecoveryKeyInput, setShowRecoveryKeyInput] = useState(false);
  const [manualRecoveryKey, setManualRecoveryKey] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passphrase.length < 8) {
      toast.error("Passphrase must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      // DEK Model: Try to unlock using DEK first
      const dekResponse = await fetch("/api/journal/get-dek");
      if (dekResponse.ok) {
        const dekData = await dekResponse.json();
        if (dekData.success && dekData.hasDEK) {
          // User has DEK - use DEK model
          console.log("[enter-passphrase] Using DEK model");

          // Derive KEK from passphrase
          const kek = await deriveKEKFromPassphrase(
            passphrase,
            dekData.passphraseSalt
          );

          // Decrypt DEK
          const dek = await decryptDEK(
            dekData.encryptedDekPassphrase,
            dekData.ivDekPassphrase,
            kek
          );

          // Initialize session with DEK
          await initializeSessionWithDEK(userId, dek);
          startAutoLockMonitoring();

          toast.success("Journal unlocked!");
          onSuccess();
          return;
        }
      }

      // Fallback: Legacy method (for users who haven't migrated to DEK model)
      console.log("[enter-passphrase] Using legacy method");

      // Try to get recovery key from various sources
      // Priority: prop > manual input > sessionStorage
      let salt = recoveryKey;
      if (!salt) {
        salt = manualRecoveryKey.trim() || null;
      }
      if (!salt && typeof window !== "undefined") {
        salt = sessionStorage.getItem("recovery_key") || null;
      }

      // If we don't have a recovery key, we can't validate properly
      // But we'll try to decrypt to see if it works
      if (!salt) {
        console.warn("No recovery key found - validation may fail");
      }

      // Fetch an entry to test decryption
      const entriesResponse = await fetch("/api/journal/entries?limit=1");
      if (!entriesResponse.ok) {
        throw new Error("Failed to fetch entries for validation");
      }

      const entriesResult = await entriesResponse.json();
      if (!entriesResult.success || !entriesResult.entries?.length) {
        // No entries yet - can't validate, but allow through for first-time setup
        // Use recovery key if available, otherwise userId
        salt = salt || userId;
        const key = await deriveKeyFromPassphrase(passphrase, salt);
        await initializeSession(userId, passphrase, salt);
        startAutoLockMonitoring();
        toast.success("Journal unlocked!");
        onSuccess();
        return;
      }

      // We have entries - validate passphrase by trying to decrypt
      const testEntryResponse = await fetch(
        `/api/journal/entries/${entriesResult.entries[0].id}`
      );
      if (!testEntryResponse.ok) {
        throw new Error("Failed to fetch entry for validation");
      }

      const testEntryResult = await testEntryResponse.json();
      if (!testEntryResult.success || !testEntryResult.entry) {
        throw new Error("Entry not found for validation");
      }

      // Try to decrypt with different possible salts
      // We need to find which salt was used during encryption
      let key: CryptoKey | null = null;
      let validSalt: string | null = null;

      // Try with recovery key as salt first (if we have it)
      if (salt) {
        try {
          key = await deriveKeyFromPassphrase(passphrase, salt);
          await decryptAndDecompress(
            testEntryResult.entry.encryptedContent,
            testEntryResult.entry.iv,
            key
          );
          // Decryption succeeded - this is the correct salt
          validSalt = salt;
        } catch (error: any) {
          console.log("Decryption with recovery key failed, trying userId...");
          key = null;
        }
      }

      // If decryption failed or no salt, try with userId as salt
      if (!validSalt) {
        try {
          key = await deriveKeyFromPassphrase(passphrase, userId);
          await decryptAndDecompress(
            testEntryResult.entry.encryptedContent,
            testEntryResult.entry.iv,
            key
          );
          // Decryption succeeded with userId as salt
          validSalt = userId;
        } catch (error: any) {
          // Both attempts failed
          console.error("Decryption failed with both salts:", error);
          if (!salt) {
            // No recovery key available - user needs to use recovery flow
            throw new Error(
              "Recovery key required. Your journal entries are encrypted with a recovery key. Please click 'Use recovery key' below and enter your saved recovery key along with your passphrase."
            );
          } else {
            // Had recovery key but decryption still failed - wrong passphrase
            throw new Error("Incorrect passphrase. Please try again.");
          }
        }
      }

      // Save recovery key to sessionStorage only (for current session)
      // We don't persist to localStorage for security
      if (validSalt && validSalt !== userId && typeof window !== "undefined") {
        sessionStorage.setItem("recovery_key", validSalt);
      }

      // Initialize session with the correct salt (legacy method)
      await initializeSession(userId, passphrase, validSalt);
      startAutoLockMonitoring();

      toast.success("Journal unlocked!");
      onSuccess();
    } catch (error: any) {
      console.error("Error unlocking journal:", error);
      if (error.message?.includes("Incorrect passphrase")) {
        toast.error("Incorrect passphrase. Please try again.");
      } else if (
        error.message?.includes("Recovery key required") ||
        error.message?.includes("recovery key")
      ) {
        toast.error(
          "Your journal requires a recovery key to unlock. Please use the 'Use recovery key' option below.",
          {
            duration: 6000,
          }
        );
      } else {
        toast.error(
          error.message || "Failed to unlock journal. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="size-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Unlock Your Journal</CardTitle>
            <CardDescription>
              Enter your passphrase to access your encrypted entries
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passphrase">Passphrase</Label>
            <div className="relative">
              <Input
                id="passphrase"
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter your passphrase"
                required
                minLength={8}
                className="pr-10"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPassphrase(!showPassphrase)}
              >
                {showPassphrase ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your passphrase is never sent to our servers
            </p>
          </div>

          <div className="space-y-2">
            {!showRecoveryKeyInput ? (
              <Button
                type="button"
                variant="link"
                className="w-full text-sm"
                onClick={() => setShowRecoveryKeyInput(true)}
              >
                Have a recovery key? Enter it here
              </Button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="recoveryKey">Recovery Key (optional)</Label>
                <Input
                  id="recoveryKey"
                  type="text"
                  value={manualRecoveryKey}
                  onChange={(e) => setManualRecoveryKey(e.target.value)}
                  placeholder="Paste your recovery key"
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-xs"
                  onClick={() => {
                    setShowRecoveryKeyInput(false);
                    setManualRecoveryKey("");
                  }}
                >
                  Hide recovery key field
                </Button>
              </div>
            )}
          </div>

          {onRecoveryClick && (
            <Button
              type="button"
              variant="link"
              className="w-full text-sm"
              onClick={onRecoveryClick}
            >
              Forgot your passphrase? Reset with recovery key
            </Button>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Unlocking..." : "Unlock Journal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
