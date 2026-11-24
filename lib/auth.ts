import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

export const MEMBER_COOKIE = "cpd_member";
// Holds the id of the pending LoginCode between the two sign-in steps.
export const LOGIN_COOKIE = "cpd_login";
// Browsers cap cookie lifetime at 400 days.
export const MEMBER_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Constant-time string comparison (hashing first equalizes lengths).
export function safeEqual(a: string, b: string): boolean {
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}

// Admins are members whose email is listed in ADMIN_EMAILS (comma-separated).
// They sign in like any member, with an emailed code; there is no separate
// admin password. A personal /m/ link never grants admin access, because
// such links can be forwarded: only a device signed in by email counts.
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export async function isAdmin(): Promise<boolean> {
  const link = await currentLink();
  return Boolean(
    link?.fromLogin &&
      link.member.email &&
      adminEmails().includes(link.member.email)
  );
}

// The member identified by this browser's cookie, or null. The cookie holds
// one of the member's device tokens (from email sign-in or a personal link).
export async function currentMember() {
  return (await currentLink())?.member ?? null;
}

async function currentLink() {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!token) return null;
  return prisma.memberLink.findUnique({
    where: { token },
    include: { member: true },
  });
}
