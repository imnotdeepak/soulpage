-- Migration: Convert DEK columns from TEXT to BYTEA
-- This script drops existing TEXT columns and recreates them as BYTEA

-- Drop encrypted_dek_passphrase column if it exists (as TEXT)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'encrypted_dek_passphrase'
  ) THEN
    ALTER TABLE "user" DROP COLUMN encrypted_dek_passphrase;
    RAISE NOTICE 'Dropped encrypted_dek_passphrase column';
  END IF;
END $$;

-- Drop iv_dek_passphrase column if it exists (as TEXT)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'iv_dek_passphrase'
  ) THEN
    ALTER TABLE "user" DROP COLUMN iv_dek_passphrase;
    RAISE NOTICE 'Dropped iv_dek_passphrase column';
  END IF;
END $$;

-- Drop encrypted_dek_recovery column if it exists (as TEXT)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'encrypted_dek_recovery'
  ) THEN
    ALTER TABLE "user" DROP COLUMN encrypted_dek_recovery;
    RAISE NOTICE 'Dropped encrypted_dek_recovery column';
  END IF;
END $$;

-- Drop iv_dek_recovery column if it exists (as TEXT)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'iv_dek_recovery'
  ) THEN
    ALTER TABLE "user" DROP COLUMN iv_dek_recovery;
    RAISE NOTICE 'Dropped iv_dek_recovery column';
  END IF;
END $$;

-- Now add them back as BYTEA
-- Add encrypted_dek_passphrase column (BYTEA for binary encrypted data)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'encrypted_dek_passphrase'
  ) THEN
    ALTER TABLE "user" ADD COLUMN encrypted_dek_passphrase BYTEA;
    RAISE NOTICE 'Added encrypted_dek_passphrase column as BYTEA';
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
    RAISE NOTICE 'Added iv_dek_passphrase column as BYTEA';
  END IF;
END $$;

-- Add passphrase_salt column (TEXT - stays as text)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'passphrase_salt'
  ) THEN
    ALTER TABLE "user" ADD COLUMN passphrase_salt TEXT;
    RAISE NOTICE 'Added passphrase_salt column as TEXT';
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
    RAISE NOTICE 'Added encrypted_dek_recovery column as BYTEA';
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
    RAISE NOTICE 'Added iv_dek_recovery column as BYTEA';
  END IF;
END $$;

-- Add recovery_salt column (TEXT - stays as text)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'recovery_salt'
  ) THEN
    ALTER TABLE "user" ADD COLUMN recovery_salt TEXT;
    RAISE NOTICE 'Added recovery_salt column as TEXT';
  END IF;
END $$;
