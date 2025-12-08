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
  deriveKeyFromRecoveryKey,
  deriveKeyFromPassphrase,
  deriveKEKFromRecoveryKey,
  deriveKEKFromPassphrase,
  decryptDEK,
  encryptDEK,
  generateSalt,
  decryptAndDecompress,
  compressAndEncrypt,
} from "@/lib/encryption";
import {
  initializeSessionWithRecoveryKey,
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
  const [oldPassphrase, setOldPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showOldPassphrase, setShowOldPassphrase] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<
    "recovery" | "old-passphrase" | "new-passphrase"
  >("recovery");
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

      // Check if user has DEK - if yes, skip old passphrase step
      const dekResponse = await fetch("/api/journal/get-dek");
      if (dekResponse.ok) {
        const dekData = await dekResponse.json();
        if (dekData.success && dekData.hasDEK) {
          // User has DEK - skip old passphrase, go straight to new passphrase
          console.log(
            "[recover-passphrase] DEK found, skipping old passphrase"
          );
          setStep("new-passphrase");
          return;
        }
      }

      // No DEK - need old passphrase for legacy method
      setStep("old-passphrase");
    } catch (error) {
      toast.error("Invalid recovery key format");
    }
  };

  const handleOldPassphraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (oldPassphrase.length < 8) {
      toast.error("Passphrase must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      // Validate old passphrase by trying to decrypt an entry
      const oldKey = await deriveKeyFromPassphrase(oldPassphrase, recoveryKey);

      // Fetch an entry to test decryption
      const entriesResponse = await fetch("/api/journal/entries?limit=1");
      if (!entriesResponse.ok) {
        throw new Error("Failed to fetch entries for validation");
      }

      const entriesResult = await entriesResponse.json();
      if (!entriesResult.success || !entriesResult.entries?.length) {
        // No entries - skip to new passphrase
        setStep("new-passphrase");
        setIsLoading(false);
        return;
      }

      // Try to decrypt with old passphrase
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

      // Try to decrypt
      await decryptAndDecompress(
        testEntryResult.entry.encryptedContent,
        testEntryResult.entry.iv,
        oldKey
      );

      // Old passphrase is correct - proceed to new passphrase
      setStep("new-passphrase");
    } catch (error) {
      console.error("Error validating old passphrase:", error);
      toast.error("Incorrect old passphrase. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy recovery method (for users without DEK)
  const handleLegacyRecovery = async () => {
    if (!oldPassphrase) {
      throw new Error("Old passphrase required for legacy recovery");
    }

    // Derive keys
    const oldKey = await deriveKeyFromPassphrase(oldPassphrase, recoveryKey);
    const newKey = await deriveKeyFromRecoveryKey(recoveryKey, newPassphrase);

    // Fetch all entries to re-encrypt
    const entriesResponse = await fetch("/api/journal/entries?limit=1000");
    if (!entriesResponse.ok) {
      throw new Error("Failed to fetch entries for re-encryption");
    }

    const entriesResult = await entriesResponse.json();
    if (entriesResult.success && entriesResult.entries?.length > 0) {
      // Re-encrypt all entries
      toast.info(`Re-encrypting ${entriesResult.entries.length} entries...`);

      const reEncryptedEntries = await Promise.all(
        entriesResult.entries.map(async (entry: any) => {
          // Fetch full entry with encrypted content
          const entryResponse = await fetch(`/api/journal/entries/${entry.id}`);
          if (!entryResponse.ok) {
            throw new Error(`Failed to fetch entry ${entry.id}`);
          }

          const entryData = await entryResponse.json();
          if (!entryData.success || !entryData.entry) {
            throw new Error(`Entry ${entry.id} not found`);
          }

          // Decrypt with old key
          const decryptedText = await decryptAndDecompress(
            entryData.entry.encryptedContent,
            entryData.entry.iv,
            oldKey
          );

          // Re-encrypt with new key
          const reEncrypted = await compressAndEncrypt(decryptedText, newKey);

          return {
            id: entry.id,
            encryptedContent: reEncrypted.encrypted,
            iv: reEncrypted.iv,
            encryptedSummary: entryData.entry.encryptedSummary || null,
          };
        })
      );

      // Update all entries in database
      const updateResponse = await fetch("/api/journal/re-encrypt-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entries: reEncryptedEntries,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update re-encrypted entries");
      }

      toast.success(
        `Successfully re-encrypted ${reEncryptedEntries.length} entries!`
      );
    }

    // Initialize session with new passphrase (legacy)
    await initializeSessionWithRecoveryKey(userId, recoveryKey, newPassphrase);
    startAutoLockMonitoring();
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
          console.log("[recover-passphrase] Using DEK model");

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
          // No DEK - use legacy method
          console.log("[recover-passphrase] Using legacy method (no DEK)");
          if (!oldPassphrase) {
            throw new Error("Old passphrase required for legacy recovery");
          }
          await handleLegacyRecovery();
        }
      } else {
        // Failed to fetch DEK - use legacy method
        console.log(
          "[recover-passphrase] Failed to fetch DEK, using legacy method"
        );
        if (!oldPassphrase) {
          throw new Error("Old passphrase required for legacy recovery");
        }
        await handleLegacyRecovery();
      }

      toast.success("Journal recovered! Your new passphrase is set.");
      onSuccess();
    } catch (error) {
      console.error("Error recovering journal:", error);
      toast.error("Failed to recover journal. Please check your recovery key.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "old-passphrase") {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Key className="size-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Enter Old Passphrase</CardTitle>
              <CardDescription>
                Enter your current passphrase to decrypt existing entries before
                setting a new one (legacy method)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleOldPassphraseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassphrase">Current Passphrase</Label>
              <div className="relative">
                <Input
                  id="oldPassphrase"
                  type={showOldPassphrase ? "text" : "password"}
                  value={oldPassphrase}
                  onChange={(e) => setOldPassphrase(e.target.value)}
                  placeholder="Enter your current passphrase"
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
                  onClick={() => setShowOldPassphrase(!showOldPassphrase)}
                >
                  {showOldPassphrase ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This is needed to decrypt your existing entries before
                re-encrypting them with your new passphrase.
              </p>
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
                {isLoading ? "Validating..." : "Continue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

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
                  type={showPassphrase ? "text" : "password"}
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
                  onClick={() => setShowPassphrase(!showPassphrase)}
                >
                  {showPassphrase ? (
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
                onClick={() => setStep("old-passphrase")}
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
