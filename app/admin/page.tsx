import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { addMember, adminLogout, regenerateLink, removeMember } from "./actions";
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
          Cada membro tem um link pessoal secreto. Envia-o em privado — é com
          ele que a pessoa fica reconhecida para votar. As propostas encerram
          quando todos os membros da lista tiverem votado.
        </p>

        {members.length === 0 && (
          <p className="empty">Ainda não há membros.</p>
        )}
        {members.map((m) => {
          const link = `${baseUrl}/m/${m.token}`;
          return (
            <div className="member-row" key={m.id}>
              <div className="member-info">
                <span className="option-title">{m.name}</span>
                <input className="link-input" readOnly value={link} />
              </div>
              <div className="member-actions">
                <CopyButton text={link} />
                <form action={regenerateLink}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="option-remove">
                    Novo link
                  </button>
                </form>
                <form action={removeMember}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="option-remove">
                    Remover
                  </button>
                </form>
              </div>
            </div>
          );
        })}

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
