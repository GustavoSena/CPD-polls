"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  ADMIN_COOKIE,
  adminSessionToken,
  isAdmin,
  safeEqual,
} from "@/lib/auth";
import type { FormState } from "@/app/actions";

export async function adminLogin(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { ADMIN_USER, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    return {
      error:
        "Administração não configurada: define ADMIN_USER e ADMIN_PASSWORD no ambiente.",
    };
  }

  const user = String(formData.get("user") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!safeEqual(user, ADMIN_USER) || !safeEqual(password, ADMIN_PASSWORD)) {
    return { error: "Utilizador ou palavra-passe incorretos." };
  }

  (await cookies()).set(ADMIN_COOKIE, adminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}

function newToken(): string {
  return randomBytes(16).toString("base64url");
}

export async function addMember(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const name = String(formData.get("name") ?? "").trim();
  if (name) {
    await prisma.member.create({
      data: { name, links: { create: { token: newToken() } } },
    });
  }
  revalidatePath("/admin");
}

export async function removeMember(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  await prisma.member.deleteMany({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/");
}

// An extra secret link for the same person, so they can be recognized on
// another device. The label is just a reminder of which device it went to.
export async function addLink(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const memberId = String(formData.get("memberId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (member) {
    await prisma.memberLink.create({
      data: { memberId, label, token: newToken() },
    });
  }
  revalidatePath("/admin");
}

// Revoke a single link (e.g. a lost phone). The member's other devices keep
// working, and their past votes are untouched.
export async function removeLink(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  await prisma.memberLink.deleteMany({ where: { id } });
  revalidatePath("/admin");
}
