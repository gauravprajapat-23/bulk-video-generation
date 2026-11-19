import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { neon } from "@neondatabase/serverless";

const connection = process.env.SCHED_TEST_DATABASE_URL;
if (!connection || process.env.SCHED_TEST_ACK !== "ISOLATED") {
  throw new Error("Set SCHED_TEST_DATABASE_URL to a disposable test DB and SCHED_TEST_ACK=ISOLATED.");
}
const sql = neon(connection);

// This probe never touches application production tables or YouTube.
// It tests the same atomic conditional-UPDATE pattern used by job claims.
test("concurrent workers: exactly one schedule claim succeeds", async () => {
  await sql`CREATE TABLE IF NOT EXISTS sched001_claim_probe (
    id UUID PRIMARY KEY, status TEXT NOT NULL,
    active_run_id UUID
  )`;
  const id = randomUUID();
  try {
    await sql`INSERT INTO sched001_claim_probe (id, status) VALUES (${id}, 'pending')`;
    const claims = await Promise.all(Array.from({ length: 20 }, () => sql`
      UPDATE sched001_claim_probe SET status = 'processing'
      WHERE id = ${id} AND status = 'pending'
      RETURNING id
    `));
    assert.equal(claims.reduce((sum, rows) => sum + rows.length, 0), 1);
    const current = await sql`SELECT status FROM sched001_claim_probe WHERE id = ${id}`;
    assert.equal(current[0]?.status, "processing");
  } finally {
    await sql`DELETE FROM sched001_claim_probe WHERE id = ${id}`;
  }
});

test("concurrent Autopilot runners: exactly one durable claim succeeds", async () => {
  await sql`CREATE TABLE IF NOT EXISTS sched001_claim_probe (
    id UUID PRIMARY KEY, status TEXT NOT NULL,
    active_run_id UUID
  )`;
  const id = randomUUID();
  try {
    await sql`INSERT INTO sched001_claim_probe (id, status) VALUES (${id}, 'pending')`;
    const claims = await Promise.all(Array.from({ length: 20 }, () => sql`
      UPDATE sched001_claim_probe SET active_run_id = ${randomUUID()}
      WHERE id = ${id} AND active_run_id IS NULL
      RETURNING active_run_id
    `));
    assert.equal(claims.reduce((sum, rows) => sum + rows.length, 0), 1);
  } finally {
    await sql`DELETE FROM sched001_claim_probe WHERE id = ${id}`;
  }
});
