import { prisma } from "@/lib/db";
import { currentMember } from "@/lib/auth";
import { createSuggestion } from "@/app/actions";
import { Linkify } from "@/app/Linkify";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  membro:
    "Para deixar uma sugestão, abre primeiro o teu link pessoal de membro.",
  vazia: "Escreve a tua sugestão antes de enviar.",
  longa: "A sugestão é demasiado longa (máximo 2000 caracteres).",
};

const DATE_FORMAT = new Intl.DateTimeFormat("pt-PT", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const [suggestions, member] = await Promise.all([
    prisma.suggestion.findMany({
      orderBy: { createdAt: "desc" },
      include: { member: { select: { name: true } } },
    }),
    currentMember(),
  ]);

  return (
    <>
      <h1 className="section-title">Caixa de sugestões</h1>

      {erro && ERROR_MESSAGES[erro] && (
        <p className="form-error">{ERROR_MESSAGES[erro]}</p>
      )}

      {member ? (
        <section className="card">
          <form action={createSuggestion}>
            <div className="form-field">
              <label htmlFor="suggestion-text">
                Tens uma ideia para a comunidade, {member.name}?
              </label>
              <textarea
                id="suggestion-text"
                name="text"
                rows={4}
                maxLength={2000}
                required
              />
              <p className="form-hint">
                A sugestão fica visível para todos, com o teu nome.
              </p>
            </div>
            <button className="button" type="submit">
              Enviar sugestão
            </button>
          </form>
        </section>
      ) : (
        <p className="notice">
          Podes ler as sugestões, mas para deixar a tua precisas do teu link
          pessoal de membro. Se ainda não o tens, pede a quem gere a
          comunidade.
        </p>
      )}

      {suggestions.length === 0 && (
        <p className="empty">Ainda não há sugestões. Sê a primeira pessoa!</p>
      )}
      {suggestions.map((s) => (
        <article className="card" key={s.id}>
          <p className="proposal-description">
            <Linkify text={s.text} />
          </p>
          <div className="card-meta">
            <span>{s.member.name}</span>
            <span>{DATE_FORMAT.format(s.createdAt)}</span>
          </div>
        </article>
      ))}
    </>
  );
}
