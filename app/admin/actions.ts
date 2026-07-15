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

export async function addMember(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const name = String(formData.get("name") ?? "").trim();
  if (name) {
    await prisma.member.create({
      data: { name, token: randomBytes(16).toString("base64url") },
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

// New secret link for a member (e.g. if the old one leaked or was lost).
export async function regenerateLink(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  await prisma.member.updateMany({
    where: { id },
    data: { token: randomBytes(16).toString("base64url") },
  });
  revalidatePath("/admin");
}
