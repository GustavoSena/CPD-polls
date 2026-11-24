import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { CodeForm } from "./CodeForm";

export const dynamic = "force-dynamic";

export default async function CodePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  if (await currentMember()) redirect("/");
  const { email } = await searchParams;

  return (
    <>
      <Link href="/entrar" className="back-link">
        ← Usar outro email
      </Link>
      <section className="card">
        <h2>Confirma o código</h2>
        <p className="proposal-description">
          Enviámos um código de 6 dígitos para{" "}
          {email ? <strong>{email}</strong> : "o teu email"}. É válido
          durante 10 minutos. Se não o encontrares, vê na pasta de spam.
        </p>
        <CodeForm />
      </section>
    </>
  );
}
