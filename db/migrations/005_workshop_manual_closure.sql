-- P2-04 F-06 manual registration closure flag on workshops.
ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS registration_closed BOOLEAN NOT NULL DEFAULT false;
