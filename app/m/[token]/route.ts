import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MEMBER_COOKIE } from "@/lib/auth";

// One of a member's personal secret links. Visiting it marks this browser as
// that member (cookie) and sends them to the proposals list. A member can have
// several links, so each of their devices can be recognized independently.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const link = await prisma.memberLink.findUnique({ where: { token } });

  if (!link) {
    return NextResponse.redirect(new URL("/?erro=link", req.url));
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(MEMBER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
