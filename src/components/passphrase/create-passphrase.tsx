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
  generateRecoveryKey,
  generateDEK,
  generateSalt,
  deriveKEKFromPassphrase,
  deriveKEKFromRecoveryKey,
  encryptDEK,
} from "@/lib/encryption";
import {
  initializeSession,
  initializeSessionWithDEK,
  startAutoLockMonitoring,
} from "@/lib/session-key";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CreatePassphraseProps {
  userId: string;
  onComplete: (recoveryKey: string) => void;
}

export function CreatePassphrase({
  userId,
  onComplete,
}: CreatePassphraseProps) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateRecoveryKey = () => {
    const key = generateRecoveryKey();
    setRecoveryKey(key);
  };

  const handleCopyRecoveryKey = async () => {
    if (!recoveryKey) return;
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      toast.success("Recovery key copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy recovery key");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (passphrase.length < 8) {
      toast.error("Passphrase must be at least 8 characters long");
      return;
    }

    if (passphrase !== confirmPassphrase) {
      toast.error("Passphrases do not match");
      return;
    }

    if (!recoveryKey) {
      toast.error("Please generate a recovery key first");
      return;
    }

    setIsLoading(true);

    try {
      // DEK Model: Generate Data Encryption Key
      const dek = await generateDEK();

      // Generate salts for KEK derivation
      const passphraseSalt = generateSalt();
      const recoverySalt = generateSalt();

      // Derive Key Encryption Keys (KEKs)
      const kekPassphrase = await deriveKEKFromPassphrase(
        passphrase,
        passphraseSalt
      );
      const kekRecovery = await deriveKEKFromRecoveryKey(
        recoveryKey,
        recoverySalt
      );

      // Encrypt DEK with both KEKs
      const encryptedDekPassphrase = await encryptDEK(dek, kekPassphrase);
      const encryptedDekRecovery = await encryptDEK(dek, kekRecovery);

      // Store encrypted DEK in database
      const dekResponse = await fetch("/api/journal/store-dek", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          encryptedDekPassphrase: encryptedDekPassphrase.encrypted,
          ivDekPassphrase: encryptedDekPassphrase.iv,
          passphraseSalt,
          encryptedDekRecovery: encryptedDekRecovery.encrypted,
          ivDekRecovery: encryptedDekRecovery.iv,
          recoverySalt,
        }),
      });

      const dekResponseData = await dekResponse.json();

      if (!dekResponse.ok) {
        toast.error(
          `Failed to store DEK: ${dekResponseData.error || "Unknown error"}`
        );
        throw new Error("Failed to store DEK");
      }

      // Initialize session with DEK (not derived key)
      await initializeSessionWithDEK(userId, dek);
      startAutoLockMonitoring();

      toast.success("Journal passphrase created successfully!");
      onComplete(recoveryKey);
    } catch (error: any) {
      toast.error(
        error.message || "Failed to create passphrase. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // If recovery key is shown, display it prominently
  if (recoveryKey) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Save Your Recovery Key</CardTitle>
          <CardDescription>
            This key allows you to recover your journal if you forget your
            passphrase. Save it in a secure location - you won&apos;t be able to
            see it again!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Recovery Key</Label>
            <div className="flex items-center gap-2">
              <Input
                value={recoveryKey}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyRecoveryKey}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click the copy button to save this key securely
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              ⚠️ Important: Store this key safely
            </p>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Without this recovery key, you cannot recover your journal if you
              forget your passphrase. We don&apos;t store this key on our
              servers.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passphrase">Create Passphrase</Label>
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
                Minimum 8 characters. This encrypts your journal entries.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassphrase">Confirm Passphrase</Label>
              <div className="relative">
                <Input
                  id="confirmPassphrase"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Confirm your passphrase"
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Setting up..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Initial screen - generate recovery key
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome to Your Journal</CardTitle>
        <CardDescription>
          To protect your privacy, we use zero-knowledge encryption. Your
          entries are encrypted with a passphrase that only you know.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-medium">How it works:</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Your entries are encrypted before being saved</li>
            <li>• Only you can decrypt them with your passphrase</li>
            <li>• We generate a recovery key in case you forget</li>
            <li>• Your passphrase is never sent to our servers</li>
          </ul>
        </div>

        <Button
          onClick={handleGenerateRecoveryKey}
          className="w-full"
          size="lg"
        >
          Generate Recovery Key & Continue
        </Button>
      </CardContent>
    </Card>
  );
}
