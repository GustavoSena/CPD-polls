import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { currentMember, isAdmin } from "@/lib/auth";
import {
  addLink,
  addMember,
  cancelSecretSanta,
  createSecretSanta,
  drawSecretSanta,
  endSecretSanta,
  removeLink,
  removeMember,
  setMemberEmail,
} from "./actions";
import { MIN_PARTICIPANTS } from "@/lib/secretSanta";
import { CopyButton } from "./CopyButton";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "amigo-secreto-poucos": `O sorteio precisa de pelo menos ${MIN_PARTICIPANTS} participantes.`,
  "amigo-secreto-ativo": "Já há um amigo secreto a decorrer.",
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

  // Who signed up and counts only — never who drew whom.
  const santa = await prisma.secretSantaEvent.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: {
      participants: { select: { memberId: true } },
      wishlist: { select: { memberId: true } },
    },
  });
  const joinedIds = new Set(santa?.participants.map((p) => p.memberId));
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
        </div>
        <p className="proposal-description">
          Cada membro entra com o seu email: recebe um código e o dispositivo
          fica reconhecido. Os dispositivos de cada pessoa aparecem abaixo e
          podem ser revogados (ex.: telemóvel perdido). Para alguém sem email
          podes criar um link pessoal e enviá-lo em privado. Cada pessoa tem
          apenas um voto, seja qual for o dispositivo. As propostas encerram
          quando todos os membros da lista tiverem votado.
        </p>

        {erro && !erro.startsWith("amigo-secreto") && ERROR_MESSAGES[erro] && (
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

      <section className="card" id="amigo-secreto">
        <h2>Amigo secreto</h2>
        {erro?.startsWith("amigo-secreto") && ERROR_MESSAGES[erro] && (
          <p className="form-error">{ERROR_MESSAGES[erro]}</p>
        )}

        {santa && santa.drawnAt ? (
          <>
            <p className="proposal-description">
              <strong>{santa.name}</strong>: sorteio feito, com{" "}
              {joinedIds.size} participantes. {withWishes} têm desejos na
              lista. Cada pessoa vê a quem dá o presente em{" "}
              <Link href="/amigo-secreto">Amigo secreto</Link> — os pares não
              aparecem aqui.
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
        ) : santa ? (
          <>
            <p className="proposal-description">
              <strong>{santa.name}</strong>: inscrições abertas.{" "}
              {joinedIds.size} inscritos, {withWishes} com desejos na lista.
              Os membros inscrevem-se e preenchem a lista em{" "}
              <Link href="/amigo-secreto">Amigo secreto</Link>. Quando
              quiseres, faz o sorteio.
            </p>
            <form action={drawSecretSanta}>
              <input type="hidden" name="id" value={santa.id} />
              <fieldset className="form-field santa-participants">
                <legend>Participantes no sorteio</legend>
                {members.map((m) => (
                  <label key={m.id} className="santa-participant">
                    <input
                      type="checkbox"
                      name="memberId"
                      value={m.id}
                      defaultChecked={joinedIds.has(m.id)}
                    />
                    {m.name}
                    {joinedIds.has(m.id) ? "" : " (não inscrito)"}
                  </label>
                ))}
              </fieldset>
              <p className="form-hint">
                Os inscritos já vêm marcados. Podes juntar ou tirar pessoas
                antes de sortear. Depois do sorteio não há inscrições novas.
              </p>
              <div className="santa-admin-actions">
                <button className="button" type="submit">
                  Fazer sorteio
                </button>
              </div>
            </form>
            <div className="santa-admin-actions">
              <form action={cancelSecretSanta}>
                <input type="hidden" name="id" value={santa.id} />
                <button type="submit" className="option-remove">
                  Cancelar evento e apagar listas
                </button>
              </form>
            </div>
          </>
        ) : (
          <form action={createSecretSanta}>
            <p className="proposal-description">
              Cria o evento para abrir as inscrições: aparece o separador
              Amigo secreto, e cada membro pode inscrever-se e preencher a sua
              lista de desejos. O sorteio fazes tu mais tarde, aqui.
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
            <button className="button" type="submit">
              Criar evento
            </button>
          </form>
        )}
      </section>
    </>
  );
}
