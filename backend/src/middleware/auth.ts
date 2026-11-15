import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
// Assert non-null for TypeScript — the throw above guarantees this
const SECRET: string = JWT_SECRET;

export interface AuthPayload {
  userId: string;
  email: string;
}

export function signToken(payload: AuthPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 })).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((p) => !p)) return null;
    const [header, body, signature] = parts;
    const jwtHeader = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
    if (jwtHeader.alg !== "HS256" || jwtHeader.typ !== "JWT") return null;
    const expected = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isInteger(payload.exp) || payload.exp <= now ||
        !Number.isInteger(payload.iat) || payload.iat > now + 60 ||
        typeof payload.userId !== "string" || !payload.userId ||
        typeof payload.email !== "string" || !payload.email) return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  (req as any).auth = payload;
  next();
}
