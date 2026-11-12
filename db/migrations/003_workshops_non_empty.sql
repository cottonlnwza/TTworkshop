-- Ensure published workshops contain non-empty text fields.
-- NOT VALID keeps constraint creation separate from checking existing rows;
-- VALIDATE below enforces it for all existing and future rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'workshops'::regclass
      AND conname = 'published_non_empty'
  ) THEN
    ALTER TABLE workshops
      ADD CONSTRAINT published_non_empty CHECK (
        status = 'DRAFT' OR (
          btrim(title) <> ''
          AND btrim(description) <> ''
          AND btrim(location) <> ''
        )
      ) NOT VALID;
  END IF;
END
$$;

ALTER TABLE workshops
  VALIDATE CONSTRAINT published_non_empty;
