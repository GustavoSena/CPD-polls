"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAdmin, normalizeEmail } from "@/lib/auth";
import { drawPairs, exclusionKey, MIN_PARTICIPANTS } from "@/lib/secretSanta";
import { imageType } from "@/lib/image";

function newToken(): string {
  return randomBytes(16).toString("base64url");
}

// An email that is free to use, or a redirect back with the reason.
async function checkEmail(raw: string, exceptMemberId?: string) {
  const email = normalizeEmail(raw);
  if (!email) return null;
  if (!email.includes("@")) redirect("/admin?erro=email-invalido");
  const owner = await prisma.member.findUnique({ where: { email } });
  if (owner && owner.id !== exceptMemberId) redirect("/admin?erro=email-usado");
  return email;
}

// New members sign in with their email. A personal link is no longer
// created up front; the admin can still add one for someone without email.
export async function addMember(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const name = String(formData.get("name") ?? "").trim();
  const email = await checkEmail(String(formData.get("email") ?? ""));
  if (name) {
    await prisma.member.create({ data: { name, email } });
  }
  revalidatePath("/admin");
  redirect("/admin");
}

// Set, change or clear the email a member signs in with. Devices already
// signed in stay signed in.
export async function setMemberEmail(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  const email = await checkEmail(String(formData.get("email") ?? ""), id);
  await prisma.member.updateMany({ where: { id }, data: { email } });
  revalidatePath("/admin");
  redirect("/admin");
}

export async function removeMember(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  const member = await prisma.member.findUnique({ where: { id } });
  await prisma.$transaction([
    prisma.member.deleteMany({ where: { id } }),
    ...(member?.imageId
      ? [prisma.media.deleteMany({ where: { id: member.imageId } })]
      : []),
  ]);
  revalidatePath("/admin");
  revalidatePath("/");
}

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Sets (or replaces) a member's profile photo. The swap only happens if
// the photo is still the one read here, so overlapping requests can't
// leave an image behind that no member points to.
export async function setMemberPhoto(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  const file = formData.get("image");
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    !PHOTO_TYPES.has(file.type) ||
    file.size > MAX_PHOTO_BYTES
  ) {
    redirect("/admin?erro=foto");
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const mimeType = imageType(data);
  if (!mimeType) redirect("/admin?erro=foto");

  const member = await prisma.member.findUnique({ where: { id } });
  if (member) {
    await prisma.$transaction(
      async (tx) => {
        const media = await tx.media.create({ data: { mimeType, data } });
        const swapped = await tx.member.updateMany({
          where: { id, imageId: member.imageId },
          data: { imageId: media.id },
        });
        if (swapped.count === 0) {
          await tx.media.delete({ where: { id: media.id } });
        } else if (member.imageId) {
          await tx.media.deleteMany({ where: { id: member.imageId } });
        }
      },
      { timeout: 20_000 }
    );
  }
  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function removeMemberPhoto(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  const member = await prisma.member.findUnique({ where: { id } });
  if (member?.imageId) {
    const imageId = member.imageId;
    await prisma.$transaction(async (tx) => {
      const cleared = await tx.member.updateMany({
        where: { id, imageId },
        data: { imageId: null },
      });
      if (cleared.count === 1) {
        await tx.media.deleteMany({ where: { id: imageId } });
      }
    });
  }
  revalidatePath("/", "layout");
  redirect("/admin");
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

// Revoke a single device or link (e.g. a lost phone). The member's other
// devices keep working, and their past votes are untouched.
export async function removeLink(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  await prisma.memberLink.deleteMany({ where: { id } });
  revalidatePath("/admin");
}

// The chosen members that still exist, from repeated `memberId` fields.
async function pickedMembers(formData: FormData): Promise<string[]> {
  const requested = [...new Set(formData.getAll("memberId").map(String))];
  const members = await prisma.member.findMany({
    where: { id: { in: requested } },
    select: { id: true },
  });
  return members.map((m) => m.id);
}

// Creates a Secret Santa round with the participants the admin picked. They
// can fill in their wishlists right away; the admin runs the draw later.
export async function createSecretSanta(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");

  const name = String(formData.get("name") ?? "").trim() || "Amigo secreto";
  const details = String(formData.get("details") ?? "").trim().slice(0, 1000);
  const ids = await pickedMembers(formData);
  if (ids.length < MIN_PARTICIPANTS) {
    redirect("/admin?erro=amigo-secreto-poucos#amigo-secreto");
  }
  if (await prisma.secretSantaEvent.findFirst({ where: { active: true } })) {
    redirect("/admin?erro=amigo-secreto-ativo#amigo-secreto");
  }

  await prisma.secretSantaEvent.create({
    data: {
      name,
      details,
      participants: { create: ids.map((memberId) => ({ memberId })) },
    },
  });
  revalidatePath("/", "layout");
  redirect("/admin#amigo-secreto");
}

// Changes who takes part, before the draw. Anyone removed loses their
// wishlist for this event.
export async function setSecretSantaParticipants(
  formData: FormData
): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");

  const id = String(formData.get("id") ?? "");
  const event = await prisma.secretSantaEvent.findUnique({ where: { id } });
  if (!event || !event.active || event.drawnAt) redirect("/admin");

  const ids = await pickedMembers(formData);
  if (ids.length < MIN_PARTICIPANTS) {
    redirect("/admin?erro=amigo-secreto-poucos#amigo-secreto");
  }

  const dropped = await prisma.wishlistItem.findMany({
    where: { eventId: id, memberId: { notIn: ids } },
    select: { imageId: true },
  });
  await prisma.$transaction([
    prisma.secretSantaParticipant.deleteMany({
      where: { eventId: id, memberId: { notIn: ids } },
    }),
    prisma.wishlistItem.deleteMany({
      where: { eventId: id, memberId: { notIn: ids } },
    }),
    prisma.secretSantaExclusion.deleteMany({
      where: {
        eventId: id,
        OR: [{ aId: { notIn: ids } }, { bId: { notIn: ids } }],
      },
    }),
    prisma.media.deleteMany({
      where: {
        id: { in: dropped.flatMap((i) => (i.imageId ? [i.imageId] : [])) },
      },
    }),
    prisma.secretSantaParticipant.createMany({
      data: ids.map((memberId) => ({ eventId: id, memberId })),
      skipDuplicates: true,
    }),
  ]);
  revalidatePath("/", "layout");
  redirect("/admin#amigo-secreto");
}

const SANTA = "/admin#amigo-secreto";

// An event the admin may still change: active and not drawn yet.
async function editableEvent(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const event = await prisma.secretSantaEvent.findUnique({ where: { id } });
  if (!event || !event.active || event.drawnAt) redirect("/admin");
  return event;
}

// Renames the event or changes its details. Allowed at any time while it
// is active, also after the draw.
export async function updateSecretSanta(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim() || "Amigo secreto";
  const details = String(formData.get("details") ?? "").trim().slice(0, 1000);
  await prisma.secretSantaEvent.updateMany({
    where: { id, active: true },
    data: { name: name.slice(0, 200), details },
  });
  revalidatePath("/", "layout");
  redirect(SANTA);
}

// Two participants who must not draw each other, in either direction.
export async function addSecretSantaExclusion(
  formData: FormData
): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const event = await editableEvent(formData);

  const a = String(formData.get("a") ?? "");
  const b = String(formData.get("b") ?? "");
  const inEvent = await prisma.secretSantaParticipant.count({
    where: { eventId: event.id, memberId: { in: [a, b] } },
  });
  if (!a || !b || a === b || inEvent !== 2) {
    redirect("/admin?erro=amigo-secreto-exclusao#amigo-secreto");
  }

  await prisma.secretSantaExclusion.createMany({
    data: [{ eventId: event.id, ...exclusionKey(a, b) }],
    skipDuplicates: true,
  });
  revalidatePath("/admin");
  redirect(SANTA);
}

export async function removeSecretSantaExclusion(
  formData: FormData
): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const event = await editableEvent(formData);
  const exclusionId = String(formData.get("exclusionId") ?? "");
  await prisma.secretSantaExclusion.deleteMany({
    where: { id: exclusionId, eventId: event.id },
  });
  revalidatePath("/admin");
  redirect(SANTA);
}

// Runs the draw among the event's participants, keeping excluded pairs
// apart. The result is only ever shown to each giver.
export async function drawSecretSanta(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");

  const id = String(formData.get("id") ?? "");
  const event = await prisma.secretSantaEvent.findUnique({
    where: { id },
    include: {
      participants: { select: { memberId: true } },
      exclusions: { select: { aId: true, bId: true } },
    },
  });
  if (!event || !event.active || event.drawnAt) redirect("/admin");

  const ids = event.participants.map((p) => p.memberId);
  if (ids.length < MIN_PARTICIPANTS) {
    redirect("/admin?erro=amigo-secreto-poucos#amigo-secreto");
  }
  const pairs = drawPairs(
    ids,
    event.exclusions.map((e) => [e.aId, e.bId])
  );
  if (!pairs) redirect("/admin?erro=amigo-secreto-impossivel#amigo-secreto");

  // drawnAt: null in the where makes a double submit draw only once, and
  // the transaction undoes the claim if storing the pairs fails.
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.secretSantaEvent.updateMany({
      where: { id, drawnAt: null },
      data: { drawnAt: new Date() },
    });
    if (claimed.count === 1) {
      await tx.secretSantaAssignment.createMany({
        data: pairs.map((p) => ({ ...p, eventId: id })),
      });
    }
  });
  revalidatePath("/", "layout");
  redirect(SANTA);
}

// Undoes the draw so the admin can change participants or exclusions and
// draw again. Wishlists are kept; the old pairs are deleted.
export async function undoSecretSantaDraw(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  const event = await prisma.secretSantaEvent.findUnique({ where: { id } });
  if (!event || !event.active) redirect("/admin");
  await prisma.$transaction([
    prisma.secretSantaAssignment.deleteMany({ where: { eventId: id } }),
    prisma.secretSantaEvent.update({
      where: { id },
      data: { drawnAt: null },
    }),
  ]);
  revalidatePath("/", "layout");
  redirect(SANTA);
}

// Ends the round: it disappears for members, but the data is kept.
export async function endSecretSanta(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  await prisma.secretSantaEvent.updateMany({
    where: { id },
    data: { active: false },
  });
  revalidatePath("/", "layout");
  redirect("/admin#amigo-secreto");
}

// Deletes the round entirely (pairs and wishlists), e.g. to redo the draw
// with a different group.
export async function cancelSecretSanta(formData: FormData): Promise<void> {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  const items = await prisma.wishlistItem.findMany({
    where: { eventId: id, imageId: { not: null } },
    select: { imageId: true },
  });
  await prisma.$transaction([
    prisma.secretSantaEvent.deleteMany({ where: { id } }),
    prisma.media.deleteMany({
      where: { id: { in: items.map((i) => i.imageId!) } },
    }),
  ]);
  revalidatePath("/", "layout");
  redirect("/admin#amigo-secreto");
}
