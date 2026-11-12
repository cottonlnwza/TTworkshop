-- P1-EX02 F-02 Workshop Draft & Publish schema
CREATE TYPE workshop_status AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE workshops (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  capacity INTEGER,
  status workshop_status NOT NULL DEFAULT 'DRAFT',
  registration_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_capacity CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT valid_time_order CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT published_required CHECK (
    status = 'DRAFT' OR
    (title IS NOT NULL AND description IS NOT NULL AND location IS NOT NULL AND
     capacity IS NOT NULL AND starts_at IS NOT NULL AND ends_at IS NOT NULL)
  ),
  CONSTRAINT published_non_empty CHECK (
    status = 'DRAFT' OR
    (btrim(title) <> '' AND btrim(description) <> '' AND btrim(location) <> '')
  ),
  CONSTRAINT published_deadline CHECK (
    status = 'DRAFT' OR registration_deadline IS NULL OR registration_deadline <= starts_at
  )
);

CREATE INDEX workshops_owner_status_idx ON workshops(owner_user_id, status);
CREATE INDEX workshops_published_idx ON workshops(status, starts_at) WHERE status = 'PUBLISHED';
