"use server";

import { createHash, randomBytes, randomInt } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  LOGIN_COOKIE,
  MEMBER_COOKIE,
  MEMBER_COOKIE_MAX_AGE,
  normalizeEmail,
  safeEqual,
} from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import type { FormState } from "@/app/actions";

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
// At most this many codes per member in the rolling window below.
const MAX_CODES_PER_WINDOW = 5;
const WINDOW_MINUTES = 30;

function hashCode(loginCodeId: string, code: string): string {
  return createHash("sha256").update(`${loginCodeId}:${code}`).digest("hex");
}

// A short, human label for the admin's device list, from the User-Agent.
function deviceLabel(ua: string): string {
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "";
  const device = [os, browser].filter(Boolean).join(" · ");
  return device ? `Email · ${device}` : "Email";
}

// Step 1: the member types their email and gets a 6-digit code.
export async function requestLoginCode(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email || !email.includes("@")) {
    return { error: "Escreve um endereço de email válido." };
  }

  const member = await prisma.member.findUnique({ where: { email } });
  if (!member) {
    return {
      error:
        "Este email não está na lista de membros. Pede a quem gere a comunidade para o adicionar.",
    };
  }

  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const recent = await prisma.loginCode.count({
    where: { memberId: member.id, createdAt: { gte: since } },
  });
  if (recent >= MAX_CODES_PER_WINDOW) {
    return {
      error:
        "Já pediste vários códigos. Espera um pouco antes de pedir outro.",
    };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const loginCode = await prisma.loginCode.create({
    data: {
      memberId: member.id,
      codeHash: "",
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
    },
  });
  await prisma.loginCode.update({
    where: { id: loginCode.id },
    data: { codeHash: hashCode(loginCode.id, code) },
  });

  const sent = await sendEmail({
    to: email,
    subject: `${code} é o teu código de entrada na CPD`,
    text: `Olá, ${member.name}!\n\nO teu código para entrar no site da CPD é: ${code}\n\nÉ válido durante ${CODE_TTL_MINUTES} minutos. Se não foste tu a pedir, ignora este email.`,
    html: `<p>Olá, ${escapeHtml(member.name)}!</p><p>O teu código para entrar no site da CPD é:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>É válido durante ${CODE_TTL_MINUTES} minutos. Se não foste tu a pedir, ignora este email.</p>`,
  });
  if (!sent) {
    await prisma.loginCode.delete({ where: { id: loginCode.id } });
    return {
      error: "Não foi possível enviar o email. Tenta novamente daqui a pouco.",
    };
  }

  (await cookies()).set(LOGIN_COOKIE, loginCode.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CODE_TTL_MINUTES * 60,
  });
  redirect(`/entrar/codigo?email=${encodeURIComponent(email)}`);
}

// Step 2: the member types the code. On success this browser becomes a
// recognized device for a long time, until they sign out or it's revoked.
export async function verifyLoginCode(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const jar = await cookies();
  const loginCodeId = jar.get(LOGIN_COOKIE)?.value;
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");

  const loginCode = loginCodeId
    ? await prisma.loginCode.findUnique({ where: { id: loginCodeId } })
    : null;
  if (!loginCode || loginCode.expiresAt < new Date()) {
    return { error: "O código expirou. Volta atrás e pede um novo." };
  }
  if (loginCode.attempts >= MAX_ATTEMPTS) {
    return { error: "Demasiadas tentativas. Volta atrás e pede um novo código." };
  }

  if (
    code.length !== 6 ||
    !safeEqual(hashCode(loginCode.id, code), loginCode.codeHash)
  ) {
    await prisma.loginCode.update({
      where: { id: loginCode.id },
      data: { attempts: { increment: 1 } },
    });
    const left = MAX_ATTEMPTS - loginCode.attempts - 1;
    return {
      error:
        left > 0
          ? `Código incorreto. ${left === 1 ? "Resta 1 tentativa" : `Restam ${left} tentativas`}.`
          : "Demasiadas tentativas. Volta atrás e pede um novo código.",
    };
  }

  const ua = (await headers()).get("user-agent") ?? "";
  const token = randomBytes(16).toString("base64url");
  await prisma.$transaction([
    // Every pending code for this member is spent once one works.
    prisma.loginCode.deleteMany({ where: { memberId: loginCode.memberId } }),
    prisma.memberLink.create({
      data: {
        memberId: loginCode.memberId,
        token,
        label: deviceLabel(ua),
        fromLogin: true,
      },
    }),
  ]);

  jar.delete(LOGIN_COOKIE);
  jar.set(MEMBER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MEMBER_COOKIE_MAX_AGE,
  });
  redirect("/");
}

// Signs this device out. A device created by email sign-in is deleted, so
// its token stops working; a link the admin handed out is left alone (the
// person may still use it elsewhere). Other devices stay signed in.
export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value;
  if (token) {
    await prisma.memberLink.deleteMany({ where: { token, fromLogin: true } });
  }
  jar.delete(MEMBER_COOKIE);
  redirect("/");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
