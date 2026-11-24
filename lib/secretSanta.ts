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

// What one member can see of the active event: their own wishlist and the
// wishlist of the person they give to. Never anything about anyone else.
export async function secretSantaViewFor(memberId: string) {
  const event = await activeEvent();
  if (!event) return { event: null } as const;

  const assignment = await prisma.secretSantaAssignment.findUnique({
    where: { eventId_giverId: { eventId: event.id, giverId: memberId } },
    include: { receiver: { select: { id: true, name: true } } },
  });
  if (!assignment) return { event, participant: false } as const;

  const [ownItems, receiverItems] = await Promise.all([
    prisma.wishlistItem.findMany({
      where: { eventId: event.id, memberId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.wishlistItem.findMany({
      where: { eventId: event.id, memberId: assignment.receiver.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    event,
    participant: true,
    receiver: assignment.receiver,
    ownItems,
    receiverItems,
  } as const;
}
