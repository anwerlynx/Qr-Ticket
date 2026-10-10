import crypto from "crypto";
import { cookies } from "next/headers";

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || "nextgen_admin_2026";
const COOKIE_NAME = "nextgen_admin_session";

/**
 * Creates a signed session token: timestamp.signature
 */
export function createSessionToken(): string {
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(`admin:${timestamp}`)
    .digest("hex");
  return `${timestamp}.${signature}`;
}

/**
 * Validates a signed session token (valid for 7 days)
 */
export function verifySessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // 7 days expiration
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > maxAge) return false;

  const expectedSignature = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(`admin:${timestampStr}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Validates an incoming request (via Bearer header or cookie)
 */
export async function isAuthenticatedAdmin(request?: Request): Promise<boolean> {
  // 1. Check Bearer Authorization header
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      // Allow direct ADMIN_SECRET or signed token
      if (token === ADMIN_SECRET || verifySessionToken(token)) {
        return true;
      }
    }
  }

  // 2. Check HTTP-only cookie
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
    return verifySessionToken(sessionCookie);
  } catch {
    return false;
  }
}

/**
 * Check entered password against admin secret
 */
export function verifyAdminPassword(password: string): boolean {
  if (!password) return false;
  return password === ADMIN_SECRET;
}

export { COOKIE_NAME };
