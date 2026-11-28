"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentMember } from "@/lib/auth";
import { activeEvent, isParticipant } from "@/lib/secretSanta";
import { imageType } from "@/lib/image";
import {
  fetchLinkPreview,
  parsePublicUrl,
  type LinkPreview,
} from "@/lib/linkPreview";

const PAGE = "/amigo-secreto";
const MAX_ITEMS = 20;
const MAX_NOTE_LENGTH = 300;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// An image the member chose themselves, for shops that block link previews.
// Returns null when none was sent; redirects with an error when it's invalid.
async function uploadedImage(
  formData: FormData
): Promise<{ mimeType: string; data: Uint8Array<ArrayBuffer> } | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) {
    redirect(`${PAGE}?erro=imagem`);
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const mimeType = imageType(data);
  if (!mimeType) redirect(`${PAGE}?erro=imagem`);
  return { mimeType, data };
}

// Adds a wish to the current member's wishlist for the active event: a link,
// a picture, or both. For a link, the page's title and preview image are
// fetched once, here, and stored.
export async function addWishlistItem(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect(`${PAGE}?erro=membro`);

  const event = await activeEvent();
  if (!event) redirect(PAGE);

  if (!(await isParticipant(event.id, member.id))) redirect(PAGE);

  let raw = String(formData.get("url") ?? "").trim();
  if (raw && !/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const url = raw ? parsePublicUrl(raw) : null;
  if (raw && (!url || raw.length > 2000)) redirect(`${PAGE}?erro=link`);

  const note = String(formData.get("note") ?? "").trim();
  if (note.length > MAX_NOTE_LENGTH) redirect(`${PAGE}?erro=nota`);

  const count = await prisma.wishlistItem.count({
    where: { eventId: event.id, memberId: member.id },
  });
  if (count >= MAX_ITEMS) redirect(`${PAGE}?erro=limite`);

  const uploaded = await uploadedImage(formData);
  if (!url && !uploaded) redirect(`${PAGE}?erro=link-ou-imagem`);
  const preview: LinkPreview = url
    ? await fetchLinkPreview(url)
    : { title: "", image: null };
  const imageData =
    uploaded ??
    (preview.image
      ? {
          mimeType: preview.image.mimeType,
          data: new Uint8Array(preview.image.data),
        }
      : null);
  const image = imageData
    ? await prisma.media.create({ data: imageData })
    : null;

  await prisma.wishlistItem.create({
    data: {
      url: url?.toString() ?? "",
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

// Sets (or replaces) the picture of one of the member's own wishes.
export async function setWishlistImage(formData: FormData): Promise<void> {
  const member = await currentMember();
  if (!member) redirect(`${PAGE}?erro=membro`);

  const id = String(formData.get("id") ?? "");
  const item = await prisma.wishlistItem.findUnique({ where: { id } });
  const uploaded = await uploadedImage(formData);
  if (item && item.memberId === member.id && uploaded) {
    const media = await prisma.media.create({ data: uploaded });
    await prisma.$transaction([
      prisma.wishlistItem.update({ where: { id }, data: { imageId: media.id } }),
      ...(item.imageId
        ? [prisma.media.deleteMany({ where: { id: item.imageId } })]
        : []),
    ]);
  }

  revalidatePath(PAGE);
  redirect(PAGE);
}

