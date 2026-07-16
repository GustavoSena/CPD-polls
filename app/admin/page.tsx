import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import {
  addLink,
  addMember,
  adminLogout,
  removeLink,
  removeMember,
} from "./actions";
import { AdminLoginForm } from "./AdminLoginForm";
import { CopyButton } from "./CopyButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
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
    </>
  );
}
