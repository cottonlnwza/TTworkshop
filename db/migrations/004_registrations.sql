-- P1-05 F-03 persistent Participant registrations.
CREATE TYPE registration_status AS ENUM ('ACTIVE', 'CANCELLED');

CREATE TABLE registrations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workshop_id BIGINT NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  participant_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status registration_status NOT NULL DEFAULT 'ACTIVE',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  CONSTRAINT registration_cancelled_timestamp CHECK (
    (status = 'ACTIVE' AND cancelled_at IS NULL) OR
    (status = 'CANCELLED' AND cancelled_at IS NOT NULL)
  )
);

-- Cancellation/re-registration is downstream scope, but ACTIVE uniqueness is
-- enforced by PostgreSQL now and cannot be bypassed by concurrent API calls.
CREATE UNIQUE INDEX registrations_one_active_per_participant_workshop_idx
  ON registrations(workshop_id, participant_user_id)
  WHERE status = 'ACTIVE';

CREATE INDEX registrations_workshop_active_idx
  ON registrations(workshop_id, status)
  WHERE status = 'ACTIVE';

CREATE INDEX registrations_participant_idx
  ON registrations(participant_user_id, registered_at DESC);
