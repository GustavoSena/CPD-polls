"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteProposal } from "./proposalActions";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="option-remove" disabled={pending}>
      {pending ? "A apagar…" : "Sim, apagar"}
    </button>
  );
}

// Two steps: the first click only asks for confirmation.
export function DeleteProposalButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="option-remove"
        onClick={() => setConfirming(true)}
        aria-label={`Apagar a proposta ${title}`}
      >
        Apagar
      </button>
    );
  }

  return (
    <form
      action={deleteProposal}
      className="link-actions"
      style={{ flexWrap: "wrap" }}
    >
      <input type="hidden" name="id" value={id} />
      <span className="link-label">
        Apagar de vez, com todos os votos?
      </span>
      <ConfirmButton />
      <button
        type="button"
        className="option-remove"
        onClick={() => setConfirming(false)}
      >
        Cancelar
      </button>
    </form>
  );
}
