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
  deriveKEKFromRecoveryKey,
  deriveKEKFromPassphrase,
  decryptDEK,
  encryptDEK,
  generateSalt,
} from "@/lib/encryption";
import {
  initializeSessionWithDEK,
  startAutoLockMonitoring,
} from "@/lib/session-key";
import { Eye, EyeOff, Key } from "lucide-react";
import { toast } from "sonner";

interface RecoverPassphraseProps {
  userId: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function RecoverPassphrase({
  userId,
  onSuccess,
  onBack,
}: RecoverPassphraseProps) {
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [showNewPassphrase, setShowNewPassphrase] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<"recovery" | "new-passphrase">("recovery");
  const [isLoading, setIsLoading] = useState(false);

  const handleRecoveryKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (recoveryKey.length < 20) {
      toast.error("Please enter a valid recovery key");
      return;
    }

    // Validate recovery key format (basic check)
    try {
      // Try to decode as base64 to validate format
      const decoded = atob(recoveryKey.replace(/-/g, "+").replace(/_/g, "/"));
      if (decoded.length < 20) {
        toast.error("Invalid recovery key format");
        return;
      }

      // Check if user has DEK
      const dekResponse = await fetch("/api/journal/get-dek");
      if (dekResponse.ok) {
        const dekData = await dekResponse.json();
        if (dekData.success && dekData.hasDEK) {
          // User has DEK - go to new passphrase step
          setStep("new-passphrase");
          return;
        }
      }

      // No DEK found
      toast.error("No encryption key found. Please contact support.");
    } catch (error) {
      toast.error("Invalid recovery key format");
    }
  };

  const handleNewPassphraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassphrase.length < 8) {
      toast.error("Passphrase must be at least 8 characters long");
      return;
    }

    if (newPassphrase !== confirmPassphrase) {
      toast.error("Passphrases do not match");
      return;
    }

    setIsLoading(true);

    try {
      // DEK Model: Try to recover using DEK first
      const dekResponse = await fetch("/api/journal/get-dek");
      if (dekResponse.ok) {
        const dekData = await dekResponse.json();
        if (dekData.success && dekData.hasDEK) {
          // User has DEK - use DEK model (no need to re-encrypt entries!)

          // Derive KEK_recovery from recovery key
          const kekRecovery = await deriveKEKFromRecoveryKey(
            recoveryKey,
            dekData.recoverySalt
          );

          // Decrypt DEK using recovery key
          const dek = await decryptDEK(
            dekData.encryptedDekRecovery,
            dekData.ivDekRecovery,
            kekRecovery
          );

          // Generate new salt for new passphrase
          const newPassphraseSalt = generateSalt();

          // Derive new KEK_passphrase from new passphrase
          const newKekPassphrase = await deriveKEKFromPassphrase(
            newPassphrase,
            newPassphraseSalt
          );

          // Re-encrypt DEK with new KEK_passphrase
          const newEncryptedDekPassphrase = await encryptDEK(
            dek,
            newKekPassphrase
          );

          // Update DEK in database (only the passphrase-encrypted version changes)
          const updateDekResponse = await fetch("/api/journal/store-dek", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              encryptedDekPassphrase: newEncryptedDekPassphrase.encrypted,
              ivDekPassphrase: newEncryptedDekPassphrase.iv,
              passphraseSalt: newPassphraseSalt,
              encryptedDekRecovery: dekData.encryptedDekRecovery, // Keep same
              ivDekRecovery: dekData.ivDekRecovery, // Keep same
              recoverySalt: dekData.recoverySalt, // Keep same
            }),
          });

          if (!updateDekResponse.ok) {
            throw new Error("Failed to update DEK");
          }

          // Initialize session with DEK
          await initializeSessionWithDEK(userId, dek);
          startAutoLockMonitoring();

          toast.success(
            "DEK updated successfully! No entries needed re-encryption."
          );
        } else {
          throw new Error("No encryption key found. Please contact support.");
        }
      } else {
        throw new Error("Failed to retrieve encryption key. Please try again.");
      }

      toast.success("Journal recovered! Your new passphrase is set.");
      onSuccess();
    } catch (error: any) {
      toast.error(
        error.message ||
          "Failed to recover journal. Please check your recovery key."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "new-passphrase") {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Key className="size-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Set New Passphrase</CardTitle>
              <CardDescription>
                Create a new passphrase to unlock your journal
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNewPassphraseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassphrase">New Passphrase</Label>
              <div className="relative">
                <Input
                  id="newPassphrase"
                  type={showNewPassphrase ? "text" : "password"}
                  value={newPassphrase}
                  onChange={(e) => setNewPassphrase(e.target.value)}
                  placeholder="Enter new passphrase"
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
                  onClick={() => setShowNewPassphrase(!showNewPassphrase)}
                >
                  {showNewPassphrase ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassphrase">Confirm Passphrase</Label>
              <div className="relative">
                <Input
                  id="confirmPassphrase"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Confirm new passphrase"
                  required
                  minLength={8}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("recovery")}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Recovering..." : "Recover Journal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Key className="size-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Recover Your Journal</CardTitle>
            <CardDescription>
              Enter your recovery key to set a new passphrase
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRecoveryKeySubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recoveryKey">Recovery Key</Label>
            <Input
              id="recoveryKey"
              type="text"
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              placeholder="Paste your recovery key here"
              required
              className="font-mono text-sm"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This is the key you saved when you first set up your journal
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1"
            >
              Back
            </Button>
            <Button type="submit" className="flex-1">
              Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
