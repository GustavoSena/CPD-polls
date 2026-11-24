import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import {
  addLink,
  addMember,
  adminLogout,
  cancelSecretSanta,
  endSecretSanta,
  removeLink,
  removeMember,
  startSecretSanta,
} from "./actions";
import { MIN_PARTICIPANTS } from "@/lib/secretSanta";
import { AdminLoginForm } from "./AdminLoginForm";
import { CopyButton } from "./CopyButton";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "amigo-secreto-poucos": `O sorteio precisa de pelo menos ${MIN_PARTICIPANTS} participantes.`,
  "amigo-secreto-ativo": "Já há um amigo secreto a decorrer.",
};

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
        <AdminLoginForm />
      </section>
    );
  }

  const members = await prisma.member.findMany({
    orderBy: { createdAt: "asc" },
    include: { links: { orderBy: { createdAt: "asc" } } },
  });

  // Only counts are loaded for the admin — never who drew whom.
  const santa = await prisma.secretSantaEvent.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { assignments: true } },
      wishlist: { select: { memberId: true } },
    },
  });
  const withWishes = new Set(santa?.wishlist.map((w) => w.memberId)).size;

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
          <form action={adminLogout}>
            <button type="submit" className="option-remove">
              Sair
            </button>
          </form>
        </div>
        <p className="proposal-description">
          Cada membro tem um ou mais links pessoais secretos — um por
          dispositivo (telemóvel, portátil…). Envia-os em privado: é com eles
          que a pessoa fica reconhecida para votar. Cada pessoa continua a ter
          apenas um voto, seja qual for o dispositivo. As propostas encerram
          quando todos os membros da lista tiverem votado.
        </p>

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

            {m.links.length === 0 && (
              <p className="empty">
                Sem links — adiciona um para esta pessoa poder votar.
              </p>
            )}

            {m.links.map((l) => {
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
                + Adicionar link
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
          <button className="button" type="submit">
            Adicionar
          </button>
        </form>
      </section>

      <section className="card" id="amigo-secreto">
        <h2>Amigo secreto</h2>
        {erro && ERROR_MESSAGES[erro] && (
          <p className="form-error">{ERROR_MESSAGES[erro]}</p>
        )}

        {santa ? (
          <>
            <p className="proposal-description">
              <strong>{santa.name}</strong> está a decorrer, com{" "}
              {santa._count.assignments} participantes.{" "}
              {withWishes} já adicionaram desejos à lista. Cada pessoa vê a
              quem dá o presente em <Link href="/amigo-secreto">Amigo
              secreto</Link> — os pares não aparecem aqui.
            </p>
            <div className="santa-admin-actions">
              <form action={endSecretSanta}>
                <input type="hidden" name="id" value={santa.id} />
                <button type="submit" className="button">
                  Encerrar
                </button>
              </form>
              <form action={cancelSecretSanta}>
                <input type="hidden" name="id" value={santa.id} />
                <button type="submit" className="option-remove">
                  Cancelar e apagar sorteio e listas
                </button>
              </form>
            </div>
          </>
        ) : (
          <form action={startSecretSanta}>
            <p className="proposal-description">
              Escolhe quem participa e faz o sorteio. Cada pessoa fica a saber
              só a quem dá o presente, e pode preencher uma lista de desejos
              que apenas quem a tirou consegue ver.
            </p>
            <div className="form-field">
              <label htmlFor="santa-name">Nome</label>
              <input
                id="santa-name"
                name="name"
                type="text"
                defaultValue={`Amigo secreto ${new Date().getFullYear()}`}
              />
            </div>
            <div className="form-field">
              <label htmlFor="santa-details">Detalhes (opcional)</label>
              <textarea
                id="santa-details"
                name="details"
                rows={2}
                maxLength={1000}
                placeholder="Ex.: valor até 20 €, troca a 20 de dezembro"
              />
            </div>
            <fieldset className="form-field santa-participants">
              <legend>Participantes</legend>
              {members.map((m) => (
                <label key={m.id} className="santa-participant">
                  <input
                    type="checkbox"
                    name="memberId"
                    value={m.id}
                    defaultChecked
                  />
                  {m.name}
                </label>
              ))}
            </fieldset>
            <button className="button" type="submit">
              Fazer sorteio
            </button>
          </form>
        )}
      </section>
    </>
  );
}
