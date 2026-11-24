import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { EmailForm } from "./EmailForm";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (await currentMember()) redirect("/");

  return (
    <>
      <Link href="/" className="back-link">
        ← Todas as propostas
      </Link>
      <section className="card">
        <h2>Entrar</h2>
        <p className="proposal-description">
          Os membros da comunidade entram com o seu email. Este dispositivo
          fica reconhecido, por isso só precisas de o fazer uma vez em cada
          um.
        </p>
        <EmailForm />
      </section>
    </>
  );
}
