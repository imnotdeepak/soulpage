-- Migration: Remove encrypted_passphrase and encrypted_recovery_key columns
-- These are no longer needed with the DEK model

-- Drop encrypted_passphrase column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'encrypted_passphrase'
  ) THEN
    ALTER TABLE "user" DROP COLUMN encrypted_passphrase;
    RAISE NOTICE 'Dropped encrypted_passphrase column';
  ELSE
    RAISE NOTICE 'encrypted_passphrase column does not exist';
  END IF;
END $$;

-- Drop encrypted_recovery_key column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'encrypted_recovery_key'
  ) THEN
    ALTER TABLE "user" DROP COLUMN encrypted_recovery_key;
    RAISE NOTICE 'Dropped encrypted_recovery_key column';
  ELSE
    RAISE NOTICE 'encrypted_recovery_key column does not exist';
  END IF;
END $$;
