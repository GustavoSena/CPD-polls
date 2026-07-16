import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentMember } from "@/lib/auth";
import { isClosed } from "@/lib/status";
import { TimeLeft } from "./TimeLeft";

export const dynamic = "force-dynamic";

function optionCount(n: number): string {
  return n === 1 ? "1 opção" : `${n} opções`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const [proposals, memberCount, member] = await Promise.all([
    prisma.proposal.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        votes: { select: { id: true, optionId: true } },
        options: true,
      },
    }),
    prisma.member.count(),
    currentMember(),
  ]);

  const now = new Date();
  const open = proposals.filter((p) => !isClosed(p, memberCount, now));
  const closed = proposals.filter((p) => isClosed(p, memberCount, now));

  return (
    <>
      {erro === "link" && (
        <p className="form-error">
          Esse link de membro já não é válido. Pede um novo a quem gere a
          comunidade.
        </p>
      )}
      {member && (
        <p className="notice">
          Olá, {member.name}! Este browser está reconhecido — já podes votar.
        </p>
      )}

      <h1 className="section-title">Propostas abertas</h1>
      {open.length === 0 && (
        <p className="empty">Não há propostas abertas de momento.</p>
      )}
      {open.map((p) => (
        <article className="card" key={p.id}>
          <h2>
            <Link href={`/proposal/${p.id}`}>{p.title}</Link>
          </h2>
          {p.description && <p className="card-excerpt">{p.description}</p>}
          <div className="card-meta">
            <span className="badge badge-open">Aberta</span>
            <span>{optionCount(p.options.length)}</span>
            <span>
              {memberCount > 0
                ? `${p.votes.length} de ${memberCount} votos`
                : `${p.votes.length} votos`}
            </span>
            <TimeLeft deadline={p.deadline.toISOString()} />
          </div>
        </article>
      ))}

      <h1 className="section-title">Propostas encerradas</h1>
      {closed.length === 0 && (
        <p className="empty">Ainda não há propostas encerradas.</p>
      )}
      {closed.map((p) => {
        const counts = p.options.map((o) => ({
          text: o.text,
          count: p.votes.filter((v) => v.optionId === o.id).length,
        }));
        const max = Math.max(...counts.map((c) => c.count));
        const winners = counts.filter((c) => c.count === max && max > 0);
        return (
          <article className="card" key={p.id}>
            <h2>
              <Link href={`/proposal/${p.id}`}>{p.title}</Link>
            </h2>
            {p.description && <p className="card-excerpt">{p.description}</p>}
            <div className="card-meta">
              <span className="badge badge-closed">Encerrada</span>
              <span>{optionCount(p.options.length)}</span>
              <span>{p.votes.length} votos</span>
              <span>
                {winners.length === 0
                  ? "Sem votos"
                  : winners.length > 1
                    ? "Empate"
                    : `Vencedora: ${winners[0].text}`}
              </span>
            </div>
          </article>
        );
      })}
    </>
  );
}
