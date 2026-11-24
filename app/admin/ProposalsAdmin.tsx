import Link from "next/link";
import { prisma } from "@/lib/db";
import { DeleteProposalButton } from "./DeleteProposalButton";

const DATE_FORMAT = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "Europe/Lisbon",
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Admin list of all proposals, with a way to delete one (e.g. a test).
export async function ProposalsAdmin() {
  const proposals = await prisma.proposal.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: { select: { votes: true } },
    },
  });

  return (
    <section className="card">
      <h2>Propostas</h2>
      <p className="proposal-description">
        Apagar uma proposta remove também as opções, os votos e as imagens.
        Não pode ser desfeito.
      </p>

      {proposals.length === 0 && (
        <p className="empty">Ainda não há propostas.</p>
      )}

      {proposals.map((p) => (
        <div className="link-row" key={p.id}>
          <div className="link-info">
            <Link href={`/proposal/${p.id}`} className="option-title">
              {p.title}
            </Link>
            <span className="link-label">
              {DATE_FORMAT.format(p.createdAt)} ·{" "}
              {p._count.votes === 1 ? "1 voto" : `${p._count.votes} votos`}
            </span>
          </div>
          <div className="link-actions">
            <DeleteProposalButton id={p.id} title={p.title} />
          </div>
        </div>
      ))}
    </section>
  );
}
