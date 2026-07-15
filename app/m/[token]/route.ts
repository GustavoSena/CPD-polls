import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MEMBER_COOKIE } from "@/lib/auth";

// A member's personal secret link. Visiting it marks this browser as that
// member (cookie) and sends them to the proposals list.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const member = await prisma.member.findUnique({ where: { token } });

  if (!member) {
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
