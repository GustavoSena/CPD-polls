"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentMember } from "@/lib/auth";
import { activeEvent } from "@/lib/secretSanta";
import { fetchLinkPreview, parsePublicUrl } from "@/lib/linkPreview";

const PAGE = "/amigo-secreto";
const MAX_ITEMS = 20;
const MAX_NOTE_LENGTH = 300;

// Adds a link to the current member's wishlist for the active event. The
// page's title and preview image are fetched once, here, and stored.
export async function addWishlistItem(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect(`${PAGE}?erro=membro`);

  const event = await activeEvent();
  if (!event) redirect(PAGE);

  const isParticipant = await prisma.secretSantaAssignment.findUnique({
    where: { eventId_giverId: { eventId: event.id, giverId: member.id } },
    select: { id: true },
  });
  if (!isParticipant) redirect(PAGE);

  let raw = String(formData.get("url") ?? "").trim();
  if (raw && !/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const url = parsePublicUrl(raw);
  if (!url || raw.length > 2000) redirect(`${PAGE}?erro=link`);

  const note = String(formData.get("note") ?? "").trim();
  if (note.length > MAX_NOTE_LENGTH) redirect(`${PAGE}?erro=nota`);

  const count = await prisma.wishlistItem.count({
    where: { eventId: event.id, memberId: member.id },
  });
  if (count >= MAX_ITEMS) redirect(`${PAGE}?erro=limite`);

  const preview = await fetchLinkPreview(url);
  const image = preview.image
    ? await prisma.media.create({
        data: {
          mimeType: preview.image.mimeType,
          data: new Uint8Array(preview.image.data),
        },
      })
    : null;

  await prisma.wishlistItem.create({
    data: {
      url: url.toString(),
      title: preview.title,
      imageId: image?.id ?? null,
      note,
      eventId: event.id,
      memberId: member.id,
    },
  });

  revalidatePath(PAGE);
  redirect(PAGE);
}

// Members can only remove items from their own wishlist.
export async function removeWishlistItem(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect(`${PAGE}?erro=membro`);

  const id = String(formData.get("id") ?? "");
  const item = await prisma.wishlistItem.findUnique({ where: { id } });
  if (item && item.memberId === member.id) {
    await prisma.$transaction([
      prisma.wishlistItem.delete({ where: { id } }),
      ...(item.imageId
        ? [prisma.media.deleteMany({ where: { id: item.imageId } })]
        : []),
    ]);
  }

  revalidatePath(PAGE);
  redirect(PAGE);
}
