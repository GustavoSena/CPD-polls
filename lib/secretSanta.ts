import { randomInt } from "crypto";
import { prisma } from "./db";

export const MIN_PARTICIPANTS = 3;

// Draws a single gift-giving cycle: shuffle everyone, then each person gives
// to the next one in the shuffled order (the last gives to the first). Nobody
// draws themselves, and nobody can deduce their giver from a closed pair.
export function drawPairs(
  memberIds: string[]
): { giverId: string; receiverId: string }[] {
  const order = [...memberIds];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.map((giverId, i) => ({
    giverId,
    receiverId: order[(i + 1) % order.length],
  }));
}

export async function activeEvent() {
  return prisma.secretSantaEvent.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function isParticipant(eventId: string, memberId: string) {
  const row = await prisma.secretSantaParticipant.findUnique({
    where: { eventId_memberId: { eventId, memberId } },
    select: { id: true },
  });
  return Boolean(row);
}

// What one member can see of the active event: their own wishlist and, once
// drawn, the wishlist of the person they give to. Never anything else.
export async function secretSantaViewFor(memberId: string) {
  const event = await activeEvent();
  if (!event) return { event: null } as const;

  const joined = await isParticipant(event.id, memberId);
  const ownItems = joined
    ? await prisma.wishlistItem.findMany({
        where: { eventId: event.id, memberId },
        orderBy: { createdAt: "asc" },
      })
    : [];

  if (!event.drawnAt) {
    return { event, phase: "signup", joined, ownItems } as const;
  }

  const assignment = await prisma.secretSantaAssignment.findUnique({
    where: { eventId_giverId: { eventId: event.id, giverId: memberId } },
    include: { receiver: { select: { id: true, name: true } } },
  });
  if (!assignment) return { event, phase: "drawn", joined: false } as const;

  const receiverItems = await prisma.wishlistItem.findMany({
    where: { eventId: event.id, memberId: assignment.receiver.id },
    orderBy: { createdAt: "asc" },
  });

  return {
    event,
    phase: "drawn",
    joined: true,
    receiver: assignment.receiver,
    ownItems,
    receiverItems,
  } as const;
}
