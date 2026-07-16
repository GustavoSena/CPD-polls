import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

export const ADMIN_COOKIE = "cpd_admin";
export const MEMBER_COOKIE = "cpd_member";

// Constant-time string comparison (hashing first equalizes lengths).
export function safeEqual(a: string, b: string): boolean {
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}

// The admin session cookie stores this token. It is derived from the
// password, so changing ADMIN_PASSWORD invalidates existing sessions.
export function adminSessionToken(): string {
  return createHash("sha256")
    .update(`cpd-admin-session:${process.env.ADMIN_PASSWORD}`)
    .digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(value) && safeEqual(value!, adminSessionToken());
}

// The member identified by this browser's cookie, or null. The cookie holds
// one of the member's link tokens — they may have several, one per device.
export async function currentMember() {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!token) return null;
  const link = await prisma.memberLink.findUnique({
    where: { token },
    include: { member: true },
  });
  return link?.member ?? null;
}
