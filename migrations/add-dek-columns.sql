-- Migration: Add DEK (Data Encryption Key) columns to user table
-- This migration is idempotent - it can be run multiple times safely

-- Add encrypted_dek_passphrase column (BYTEA for binary encrypted data)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'encrypted_dek_passphrase'
  ) THEN
    ALTER TABLE "user" ADD COLUMN encrypted_dek_passphrase BYTEA;
  END IF;
END $$;

-- Add iv_dek_passphrase column (BYTEA for binary IV)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'iv_dek_passphrase'
  ) THEN
    ALTER TABLE "user" ADD COLUMN iv_dek_passphrase BYTEA;
  END IF;
END $$;

-- Add passphrase_salt column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'passphrase_salt'
  ) THEN
    ALTER TABLE "user" ADD COLUMN passphrase_salt TEXT;
  END IF;
END $$;

-- Add encrypted_dek_recovery column (BYTEA for binary encrypted data)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'encrypted_dek_recovery'
  ) THEN
    ALTER TABLE "user" ADD COLUMN encrypted_dek_recovery BYTEA;
  END IF;
END $$;

-- Add iv_dek_recovery column (BYTEA for binary IV)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'iv_dek_recovery'
  ) THEN
    ALTER TABLE "user" ADD COLUMN iv_dek_recovery BYTEA;
  END IF;
END $$;

-- Add recovery_salt column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'recovery_salt'
  ) THEN
    ALTER TABLE "user" ADD COLUMN recovery_salt TEXT;
  END IF;
END $$;
