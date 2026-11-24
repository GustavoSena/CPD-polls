"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { requestLoginCode } from "./actions";

export function EmailForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    requestLoginCode,
    null
  );

  return (
    <form action={formAction}>
      {state?.error && <p className="form-error">{state.error}</p>}

      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          autoFocus
        />
        <p className="form-hint">
          Usa o email que deste a quem gere a comunidade. Enviamos-te um
          código de 6 dígitos.
        </p>
      </div>

      <button className="button" type="submit" disabled={pending}>
        {pending ? "A enviar…" : "Enviar código"}
      </button>
    </form>
  );
}
