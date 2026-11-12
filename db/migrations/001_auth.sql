-- P1-03 F-01 versioned PostgreSQL 15+ schema.
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PARTICIPANT', 'ORGANIZER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT normalized_login CHECK (email = lower(trim(email)))
);
CREATE TABLE sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);
CREATE INDEX sessions_active_user_idx ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;
