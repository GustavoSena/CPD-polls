import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentMember } from "@/lib/auth";
import { isClosed } from "@/lib/status";
import { castVote } from "@/app/actions";
import { TimeLeft } from "@/app/TimeLeft";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  escolhe: "Escolhe uma opção antes de votar.",
  repetido: "Já votaste nesta proposta.",
  fechada: "Esta proposta já encerrou.",
  membro: "Para votar, abre primeiro o teu link pessoal de membro.",
};

type OptionData = {
  id: string;
  text: string;
  description: string;
  imageId: string | null;
};

export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;

  const [proposal, memberCount, member] = await Promise.all([
    prisma.proposal.findUnique({
      where: { id },
      include: {
        options: true,
        votes: { select: { id: true, optionId: true } },
      },
    }),
    prisma.member.count(),
    currentMember(),
  ]);
  if (!proposal) notFound();

  const closed = isClosed(proposal, memberCount);
  const alreadyVoted = member
    ? Boolean(
        await prisma.memberVote.findUnique({
          where: {
            memberId_proposalId: { memberId: member.id, proposalId: id },
          },
        })
      )
    : false;

  return (
    <>
      <Link href="/" className="back-link">
        ← Todas as propostas
      </Link>

      <article className="card">
        <h2>{proposal.title}</h2>
        {proposal.description && (
          <p className="proposal-description">{proposal.description}</p>
        )}
        {proposal.imageId && (
          <img
            className="media-img"
            src={`/media/${proposal.imageId}`}
            alt={proposal.title}
          />
        )}
        <div className="card-meta">
          {closed ? (
            <span className="badge badge-closed">Encerrada</span>
          ) : (
            <span className="badge badge-open">Aberta</span>
          )}
          <span>
            {memberCount > 0
              ? `${proposal.votes.length} de ${memberCount} votos`
              : `${proposal.votes.length} votos`}
          </span>
          {!closed && <TimeLeft deadline={proposal.deadline.toISOString()} />}
        </div>
      </article>

      {erro && ERROR_MESSAGES[erro] && (
        <p className="form-error">{ERROR_MESSAGES[erro]}</p>
      )}

      {closed ? (
        <Results options={proposal.options} votes={proposal.votes} />
      ) : !member ? (
        <p className="notice">
          Para votar precisas do teu link pessoal de membro. Se ainda não o
          tens, pede a quem gere a comunidade.
        </p>
      ) : alreadyVoted ? (
        <p className="notice">
          O teu voto foi registado. Os resultados aparecem quando a proposta
          encerrar.
        </p>
      ) : (
        <section className="card">
          <form action={castVote}>
            <input type="hidden" name="proposalId" value={proposal.id} />
            {proposal.options.map((o) => (
              <label className="option-row" key={o.id}>
                <input type="radio" name="optionId" value={o.id} required />
                <span className="option-body">
                  <span className="option-title">{o.text}</span>
                  {o.description && (
                    <span className="option-description">{o.description}</span>
                  )}
                  {o.imageId && (
                    <img
                      className="media-img"
                      src={`/media/${o.imageId}`}
                      alt={o.text}
                    />
                  )}
                </span>
              </label>
            ))}
            <button className="button" type="submit">
              Votar
            </button>
          </form>
        </section>
      )}
    </>
  );
}

function Results({
  options,
  votes,
}: {
  options: OptionData[];
  votes: { optionId: string }[];
}) {
  const total = votes.length;
  const counts = options.map((o) => ({
    ...o,
    count: votes.filter((v) => v.optionId === o.id).length,
  }));
  const max = Math.max(...counts.map((c) => c.count));
  const winners = counts.filter((c) => c.count === max && max > 0);

  return (
    <section className="card">
      <p className="winner">
        {total === 0
          ? "Ninguém votou nesta proposta."
          : winners.length > 1
            ? `⚖️ Empate entre: ${winners.map((w) => w.text).join(", ")}`
            : `🏆 Opção vencedora: ${winners[0].text}`}
      </p>
      {counts.map((c) => (
        <div className="result-row" key={c.id}>
          <div className="result-label">
            <span>{c.text}</span>
            <span className="result-count">
              {c.count} {c.count === 1 ? "voto" : "votos"}
              {total > 0 && ` · ${Math.round((c.count / total) * 100)}%`}
            </span>
          </div>
          <div className="result-bar-track">
            <div
              className="result-bar"
              style={{ width: total > 0 ? `${(c.count / total) * 100}%` : 0 }}
            />
          </div>
          {c.description && (
            <p className="option-description">{c.description}</p>
          )}
          {c.imageId && (
            <img
              className="media-img media-img-small"
              src={`/media/${c.imageId}`}
              alt={c.text}
            />
          )}
        </div>
      ))}
    </section>
  );
}
