/**
 * Session Key Manager
 *
 * Manages the encryption key in memory during the user's session.
 * Key is cleared when:
 * - User logs out
 * - Tab is closed
 * - Auto-lock timeout expires
 */

import {
  deriveKeyFromPassphrase,
  deriveKeyFromRecoveryKey,
} from "./encryption";

// ============================================================================
// Types
// ============================================================================

export interface SessionKeyState {
  key: CryptoKey | null;
  userId: string | null;
  lastActivity: number;
  autoLockTimeout: number; // milliseconds
}

// ============================================================================
// Session Storage
// ============================================================================

let sessionState: SessionKeyState = {
  key: null,
  userId: null,
  lastActivity: Date.now(),
  autoLockTimeout: 30 * 60 * 1000, // 30 minutes default
};

// ============================================================================
// Key Management
// ============================================================================

/**
 * Initializes the session with an encryption key derived from passphrase
 * @param userId - Current user ID
 * @param passphrase - User's journal passphrase
 * @param salt - Salt for key derivation (typically user ID or recovery key)
 * @returns The derived CryptoKey
 */
export async function initializeSession(
  userId: string,
  passphrase: string,
  salt: string
): Promise<CryptoKey> {
  const key = await deriveKeyFromPassphrase(passphrase, salt);
  sessionState = {
    key,
    userId,
    lastActivity: Date.now(),
    autoLockTimeout: sessionState.autoLockTimeout,
  };
  return key;
}

/**
 * Initializes session using recovery key
 * Used when user forgets passphrase
 * @deprecated Use initializeSessionWithDEK instead for DEK model
 */
export async function initializeSessionWithRecoveryKey(
  userId: string,
  recoveryKey: string,
  newPassphrase: string
): Promise<CryptoKey> {
  const key = await deriveKeyFromRecoveryKey(recoveryKey, newPassphrase);
  sessionState = {
    key,
    userId,
    lastActivity: Date.now(),
    autoLockTimeout: sessionState.autoLockTimeout,
  };
  return key;
}

/**
 * Initializes session with DEK (Data Encryption Key)
 * This is the new DEK model - DEK is used directly to encrypt/decrypt entries
 * @param userId - Current user ID
 * @param dek - The Data Encryption Key (CryptoKey)
 * @returns The DEK
 */
export async function initializeSessionWithDEK(
  userId: string,
  dek: CryptoKey
): Promise<CryptoKey> {
  sessionState = {
    key: dek,
    userId,
    lastActivity: Date.now(),
    autoLockTimeout: sessionState.autoLockTimeout,
  };
  return dek;
}

/**
 * Gets the current session encryption key
 * Returns null if session is locked or not initialized
 */
export function getSessionKey(): CryptoKey | null {
  // Check if session is locked due to inactivity
  if (isSessionLocked()) {
    return null;
  }

  // Update last activity timestamp
  updateActivity();

  return sessionState.key;
}

/**
 * Checks if session is locked (timed out due to inactivity)
 */
export function isSessionLocked(): boolean {
  if (!sessionState.key) {
    return true;
  }

  const timeSinceLastActivity = Date.now() - sessionState.lastActivity;
  return timeSinceLastActivity > sessionState.autoLockTimeout;
}

/**
 * Updates the last activity timestamp
 * Call this whenever user interacts with the app
 */
export function updateActivity(): void {
  if (sessionState.key) {
    sessionState.lastActivity = Date.now();
  }
}

/**
 * Locks the session (clears encryption key from memory)
 * User will need to re-enter passphrase to unlock
 */
export function lockSession(): void {
  sessionState.key = null;
  sessionState.lastActivity = Date.now();
}

/**
 * Clears the session completely (on logout)
 */
export function clearSession(): void {
  sessionState = {
    key: null,
    userId: null,
    lastActivity: Date.now(),
    autoLockTimeout: 30 * 60 * 1000,
  };
}

/**
 * Sets the auto-lock timeout
 * @param timeoutMs - Timeout in milliseconds
 */
export function setAutoLockTimeout(timeoutMs: number): void {
  sessionState.autoLockTimeout = timeoutMs;
}

/**
 * Gets the current auto-lock timeout
 */
export function getAutoLockTimeout(): number {
  return sessionState.autoLockTimeout;
}

/**
 * Gets the current user ID
 */
export function getCurrentUserId(): string | null {
  return sessionState.userId;
}

/**
 * Checks if session is active (key exists and not locked)
 */
export function isSessionActive(): boolean {
  return sessionState.key !== null && !isSessionLocked();
}

// ============================================================================
// Auto-lock monitoring
// ============================================================================

let autoLockInterval: NodeJS.Timeout | null = null;

/**
 * Starts monitoring for auto-lock
 * Should be called when session is initialized
 */
export function startAutoLockMonitoring(): void {
  if (autoLockInterval) {
    clearInterval(autoLockInterval);
  }

  // Check every minute if session should be locked
  autoLockInterval = setInterval(() => {
    if (isSessionLocked() && sessionState.key) {
      lockSession();
      // Dispatch event so UI can react
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("session-locked"));
      }
    }
  }, 60 * 1000); // Check every minute
}

/**
 * Stops auto-lock monitoring
 * Should be called on logout or when session is cleared
 */
export function stopAutoLockMonitoring(): void {
  if (autoLockInterval) {
    clearInterval(autoLockInterval);
    autoLockInterval = null;
  }
}

// ============================================================================
// Browser event handlers
// ============================================================================

if (typeof window !== "undefined") {
  // Clear session on page unload
  window.addEventListener("beforeunload", () => {
    clearSession();
    stopAutoLockMonitoring();
  });

  // Update activity on user interaction
  const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
  activityEvents.forEach((event) => {
    window.addEventListener(event, updateActivity, { passive: true });
  });
}
