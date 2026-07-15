import Link from "next/link";
import { NewProposalForm } from "./NewProposalForm";

export default function NewProposalPage() {
  return (
    <>
      <Link href="/" className="back-link">
        ← Todas as propostas
      </Link>
      <section className="card">
        <h2>Nova proposta</h2>
        <p className="proposal-description">
          Só residentes da Casa do Povo podem submeter propostas. A proposta é
          anónima — não fica registado quem a criou.
        </p>
        <NewProposalForm />
      </section>
    </>
  );
}
