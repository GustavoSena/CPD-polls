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
  setSecretSantaParticipants,
  addSecretSantaExclusion,
  removeSecretSantaExclusion,
  undoSecretSantaDraw,
  updateSecretSanta,
} from "./actions";
import { MemberPicker } from "./MemberPicker";
import { MIN_PARTICIPANTS } from "@/lib/secretSanta";
import { CopyButton } from "./CopyButton";
import { ProposalsAdmin } from "./ProposalsAdmin";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "amigo-secreto-poucos": `O sorteio precisa de pelo menos ${MIN_PARTICIPANTS} participantes.`,
  "amigo-secreto-ativo": "Já há um amigo secreto a decorrer.",
  "amigo-secreto-exclusao": "Escolhe duas pessoas diferentes, ambas participantes.",
  "amigo-secreto-impossivel":
    "Com estas exclusões não há sorteio possível. Tira alguma exclusão ou junta mais participantes.",
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
      exclusions: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          a: { select: { name: true } },
          b: { select: { name: true } },
        },
      },
    },
  });
  const joinedIds = new Set(santa?.participants.map((p) => p.memberId));
  const withWishes = new Set(santa?.wishlist.map((w) => w.memberId)).size;
  const pickable = members.map((m) => ({ id: m.id, name: m.name }));
  const participantsList = pickable.filter((m) => joinedIds.has(m.id));

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${h.get("host")}`;

  return (
    <>
      <Link href="/" className="back-link">
        ← Todas as propostas
      </Link>

      <section className="card" id="amigo-secreto">
        <h2>Amigo secreto</h2>
        {erro?.startsWith("amigo-secreto") && ERROR_MESSAGES[erro] && (
          <p className="form-error">{ERROR_MESSAGES[erro]}</p>
        )}

        {santa ? (
          <>
            {santa.drawnAt ? (
              <p className="proposal-description">
                <strong>{santa.name}</strong>: sorteio feito, com{" "}
                {joinedIds.size} participantes. {withWishes} têm desejos na
                lista. Cada pessoa vê a quem dá o presente em{" "}
                <Link href="/amigo-secreto">Amigo secreto</Link> — os pares
                não aparecem aqui.
              </p>
            ) : (
              <p className="proposal-description">
                <strong>{santa.name}</strong>: à espera do sorteio.{" "}
                {joinedIds.size} participantes, {withWishes} já com desejos
                na lista. Cada participante preenche a sua lista em{" "}
                <Link href="/amigo-secreto">Amigo secreto</Link>.
              </p>
            )}

            <details className="santa-edit">
              <summary>Editar nome e detalhes</summary>
              <form action={updateSecretSanta}>
                <input type="hidden" name="id" value={santa.id} />
                <div className="form-field">
                  <label htmlFor="santa-edit-name">Nome</label>
                  <input
                    id="santa-edit-name"
                    name="name"
                    type="text"
                    maxLength={200}
                    defaultValue={santa.name}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="santa-edit-details">
                    Detalhes (opcional)
                  </label>
                  <textarea
                    id="santa-edit-details"
                    name="details"
                    rows={2}
                    maxLength={1000}
                    defaultValue={santa.details}
                  />
                </div>
                <button type="submit" className="option-add">
                  Guardar alterações
                </button>
              </form>
            </details>

            {santa.drawnAt ? (
              <>
                <p className="form-hint santa-hint">
                  Para mudar participantes ou exclusões, anula o sorteio: os
                  pares são apagados (as listas de desejos ficam) e depois
                  fazes um novo sorteio.
                </p>
                <div className="santa-admin-actions">
                  <form action={endSecretSanta}>
                    <input type="hidden" name="id" value={santa.id} />
                    <button type="submit" className="button">
                      Encerrar
                    </button>
                  </form>
                  <form action={undoSecretSantaDraw}>
                    <input type="hidden" name="id" value={santa.id} />
                    <button type="submit" className="option-add">
                      Anular sorteio para editar
                    </button>
                  </form>
                  <form action={cancelSecretSanta}>
                    <input type="hidden" name="id" value={santa.id} />
                    <button type="submit" className="option-remove">
                      Cancelar e apagar tudo
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <form action={setSecretSantaParticipants}>
                  <input type="hidden" name="id" value={santa.id} />
                  <MemberPicker members={pickable} initial={[...joinedIds]} />
                  <p className="form-hint">
                    Podes mudar a lista até ao sorteio. Quem tirares perde a
                    sua lista de desejos.
                  </p>
                  <button type="submit" className="option-add">
                    Guardar participantes
                  </button>
                </form>

                <div className="santa-exclusions">
                  <h3>Quem não pode tirar quem</h3>
                  <p className="form-hint">
                    Por exemplo, casais. Funciona nos dois sentidos: nenhum
                    dos dois dá presente ao outro.
                  </p>
                  {santa.exclusions.length > 0 && (
                    <ul className="santa-exclusion-list">
                      {santa.exclusions.map((x) => (
                        <li key={x.id}>
                          <span>
                            {x.a.name} ↔ {x.b.name}
                          </span>
                          <form action={removeSecretSantaExclusion}>
                            <input type="hidden" name="id" value={santa.id} />
                            <input
                              type="hidden"
                              name="exclusionId"
                              value={x.id}
                            />
                            <button type="submit" className="option-remove">
                              Remover
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form
                    action={addSecretSantaExclusion}
                    className="santa-exclusion-form"
                  >
                    <input type="hidden" name="id" value={santa.id} />
                    <select name="a" aria-label="Primeira pessoa" required>
                      <option value="">Pessoa…</option>
                      {participantsList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <span aria-hidden="true">↔</span>
                    <select name="b" aria-label="Segunda pessoa" required>
                      <option value="">Pessoa…</option>
                      {participantsList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="option-add">
                      Adicionar
                    </button>
                  </form>
                </div>

                <div className="santa-admin-actions">
                  <form action={drawSecretSanta}>
                    <input type="hidden" name="id" value={santa.id} />
                    <button className="button" type="submit">
                      Fazer sorteio
                    </button>
                  </form>
                  <form action={cancelSecretSanta}>
                    <input type="hidden" name="id" value={santa.id} />
                    <button type="submit" className="option-remove">
                      Cancelar evento e apagar listas
                    </button>
                  </form>
                </div>
              </>
            )}
          </>
        ) : (
          <form action={createSecretSanta}>
            <p className="proposal-description">
              Cria o evento e escolhe quem participa. Aparece o separador
              Amigo secreto, e cada participante pode logo preencher a sua
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
            <MemberPicker members={pickable} />
            <p className="form-hint">
              Pelo menos {MIN_PARTICIPANTS} pessoas.
            </p>
            <button className="button" type="submit">
              Criar evento
            </button>
          </form>
        )}
      </section>

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

      <ProposalsAdmin />
    </>
  );
}
