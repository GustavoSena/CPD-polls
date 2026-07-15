// A proposal's open/closed state is derived on read — no cron job needed.
// It closes when every community member has voted OR the deadline passes.

type ProposalLike = {
  deadline: Date;
  votes: { id: string }[];
};

export function isClosed(
  p: ProposalLike,
  memberCount: number,
  now: Date = new Date()
): boolean {
  if (now >= p.deadline) return true;
  return memberCount > 0 && p.votes.length >= memberCount;
}
