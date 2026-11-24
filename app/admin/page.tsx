import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { currentMember, isAdmin } from "@/lib/auth";
import {
  addLink,
  addMember,
  removeLink,
  removeMember,
  setMemberEmail,
} from "./actions";
import { CopyButton } from "./CopyButton";
import { ProposalsAdmin } from "./ProposalsAdmin";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "email-invalido": "Esse email não parece válido.",
  "email-usado": "Esse email já pertence a outro membro.",
};

const DATE_FORMAT = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "Europe/Lisbon",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  if (!(await isAdmin())) {
    return (
      <section className="card">
        <h2>Administração</h2>
        <p className="proposal-description">
          Área reservada à gestão de membros da comunidade.
        </p>
        {(await currentMember()) ? (
          <p className="form-error">
            Esta conta não tem acesso à administração.
          </p>
        ) : (
          <p className="proposal-description">
            <Link href="/entrar">Entra com o teu email</Link> de
            administrador para continuar.
          </p>
        )}
      </section>
    );
  }

  const members = await prisma.member.findMany({
    orderBy: { createdAt: "asc" },
    include: { links: { orderBy: { createdAt: "asc" } } },
  });

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${h.get("host")}`;

  return (
    <>
      <Link href="/" className="back-link">
        ← Todas as propostas
      </Link>

      <section className="card">
        <div className="admin-header">
          <h2>Membros da comunidade</h2>
        </div>
        <p className="proposal-description">
          Cada membro entra com o seu email: recebe um código e o dispositivo
          fica reconhecido. Os dispositivos de cada pessoa aparecem abaixo e
          podem ser revogados (ex.: telemóvel perdido). Para alguém sem email
          podes criar um link pessoal e enviá-lo em privado. Cada pessoa tem
          apenas um voto, seja qual for o dispositivo. As propostas encerram
          quando todos os membros da lista tiverem votado.
        </p>

        {erro && ERROR_MESSAGES[erro] && (
          <p className="form-error">{ERROR_MESSAGES[erro]}</p>
        )}

        {members.length === 0 && <p className="empty">Ainda não há membros.</p>}

        {members.map((m) => (
          <div className="member-row" key={m.id}>
            <div className="member-header">
              <span className="option-title">{m.name}</span>
              <form action={removeMember}>
                <input type="hidden" name="id" value={m.id} />
                <button type="submit" className="option-remove">
                  Remover membro
                </button>
              </form>
            </div>

            <form action={setMemberEmail} className="member-email-form">
              <input type="hidden" name="id" value={m.id} />
              <input
                name="email"
                type="email"
                defaultValue={m.email ?? ""}
                placeholder="Email para entrar"
                aria-label={`Email de ${m.name}`}
              />
              <button type="submit" className="option-add">
                Guardar
              </button>
            </form>

            {m.links.length === 0 && (
              <p className="empty">
                {m.email
                  ? "Ainda não entrou em nenhum dispositivo."
                  : "Sem email nem links — adiciona um para esta pessoa poder votar."}
              </p>
            )}

            {m.links.map((l) => {
              if (l.fromLogin) {
                return (
                  <div className="link-row" key={l.id}>
                    <div className="link-info">
                      <span className="link-label">
                        {l.label} · desde {DATE_FORMAT.format(l.createdAt)}
                      </span>
                    </div>
                    <div className="link-actions">
                      <form action={removeLink}>
                        <input type="hidden" name="id" value={l.id} />
                        <button type="submit" className="option-remove">
                          Revogar
                        </button>
                      </form>
                    </div>
                  </div>
                );
              }
              const link = `${baseUrl}/m/${l.token}`;
              return (
                <div className="link-row" key={l.id}>
                  <div className="link-info">
                    <span className="link-label">
                      {l.label || "Link sem nome"}
                    </span>
                    <input className="link-input" readOnly value={link} />
                  </div>
                  <div className="link-actions">
                    <CopyButton text={link} />
                    <form action={removeLink}>
                      <input type="hidden" name="id" value={l.id} />
                      <button type="submit" className="option-remove">
                        Revogar
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}

            <form action={addLink} className="add-link-form">
              <input type="hidden" name="memberId" value={m.id} />
              <input
                name="label"
                type="text"
                placeholder="Nome do dispositivo (ex.: telemóvel)"
              />
              <button type="submit" className="option-add">
                + Criar link pessoal
              </button>
            </form>
          </div>
        ))}

        <form action={addMember} className="add-member-form">
          <input
            name="name"
            type="text"
            required
            placeholder="Nome do novo membro"
          />
          <input name="email" type="email" placeholder="Email" />
          <button className="button" type="submit">
            Adicionar
          </button>
        </form>
      </section>

      <ProposalsAdmin />
    </>
  );
}
