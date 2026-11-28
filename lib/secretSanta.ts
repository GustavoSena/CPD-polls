import { randomInt } from "crypto";
import { prisma } from "./db";

export const MIN_PARTICIPANTS = 3;

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const MAX_DRAW_STEPS = 200_000;

// Draws a single gift-giving cycle: each person gives to the next one in a
// random order, and the last gives to the first. Nobody draws themselves,
// and nobody can deduce their giver from a closed pair. Excluded pairs (in
// either direction) are never next to each other in the cycle. Returns null
// when the exclusions leave no possible draw.
export function drawPairs(
  memberIds: string[],
  exclusions: [string, string][] = []
): { giverId: string; receiverId: string }[] | null {
  if (memberIds.length < 2) return null;
  const blocked = new Set(
    exclusions.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`])
  );
  const allowed = (giver: string, receiver: string) =>
    !blocked.has(`${giver}|${receiver}`);

  // Randomized depth-first search for a cycle that avoids every exclusion.
  const [first, ...rest] = shuffle(memberIds);
  const order = [first];
  const used = new Set([first]);
  let steps = 0;
  const extend = (): boolean => {
    if (++steps > MAX_DRAW_STEPS) return false;
    const last = order[order.length - 1];
    if (order.length === memberIds.length) return allowed(last, first);
    for (const next of shuffle(rest)) {
      if (used.has(next) || !allowed(last, next)) continue;
      order.push(next);
      used.add(next);
      if (extend()) return true;
      order.pop();
      used.delete(next);
    }
    return false;
  };
  if (!extend()) return null;

  return order.map((giverId, i) => ({
    giverId,
    receiverId: order[(i + 1) % order.length],
  }));
}

// Stores an exclusion pair in a fixed order, so A–B and B–A are the same row.
export function exclusionKey(x: string, y: string): { aId: string; bId: string } {
  return x < y ? { aId: x, bId: y } : { aId: y, bId: x };
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
    include: { receiver: { select: { id: true, name: true, imageId: true } } },
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
