import assert from "node:assert/strict";
import { test } from "node:test";
import crypto from "node:crypto";

process.env.JWT_SECRET = "sec001-isolated-test-secret-at-least-32-bytes";

test("signed JWT accepts valid claims and rejects tampering or expiry", async () => {
  const { signToken, verifyToken } = await import("../src/middleware/auth");
  const token = signToken({ userId: "user-a", email: "user@example.com" });
  assert.deepEqual(verifyToken(token), { userId: "user-a", email: "user@example.com" });
  assert.equal(verifyToken(token.slice(0, -1) + (token.endsWith("A") ? "B" : "A")), null);
  assert.equal(verifyToken("not-a-jwt"), null);

  function sign(payload: Record<string, unknown>, header = { alg: "HS256", typ: "JWT" }) {
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
    const encodedBody = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", process.env.JWT_SECRET!)
      .update(encodedHeader + "." + encodedBody).digest("base64url");
    return [encodedHeader, encodedBody, signature].join(".");
  }
  const now = Math.floor(Date.now() / 1000);
  assert.equal(verifyToken(sign({ userId: "a", email: "a@b.c", iat: now })), null);
  assert.equal(verifyToken(sign({ userId: "a", email: "a@b.c", iat: now, exp: now - 1 })), null);
  assert.equal(verifyToken(sign({ userId: "a", email: "a@b.c", iat: now, exp: now + 100 }, { alg: "none", typ: "JWT" })), null);
  assert.equal(verifyToken(sign({ userId: "", email: "a@b.c", iat: now, exp: now + 100 })), null);
});
