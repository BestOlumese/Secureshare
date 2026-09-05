-- AlterTable
-- Nullable on purpose: existing rows were derived with 100_000 rounds, and the
-- client treats NULL as exactly that. Backfilling a value would be wrong for
-- any key written after this migration but before the user re-encrypts.
ALTER TABLE "user" ADD COLUMN "kdfIterations" INTEGER;

-- AlterTable
ALTER TABLE "organization" ADD COLUMN "kdfIterations" INTEGER;
