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
  initializeSessionWithDEK,
  startAutoLockMonitoring,
} from "@/lib/session-key";
import { deriveKEKFromPassphrase, decryptDEK } from "@/lib/encryption";
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

      // No DEK found - user needs to create a passphrase
      throw new Error(
        "No encryption key found. Please use the recovery flow if you've lost your passphrase."
      );
    } catch (error: any) {
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
