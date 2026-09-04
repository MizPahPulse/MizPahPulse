-- CreateIndex
-- GIN index on Event.payload (JSONB) to accelerate @> containment queries
-- used by the search / analytics code paths (issue #50).
--
-- Prisma's schema DSL does not generate GIN indexes, so this is a
-- hand-written migration. The index name follows the existing
-- Event_<column>_idx convention.
CREATE INDEX "Event_payload_gin_idx" ON "Event" USING GIN ("payload");