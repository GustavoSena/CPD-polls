"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { verifyLoginCode } from "../actions";

export function CodeForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    verifyLoginCode,
    null
  );

  return (
    <form action={formAction}>
      {state?.error && <p className="form-error">{state.error}</p>}

      <div className="form-field">
        <label htmlFor="code">Código</label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          required
          autoFocus
        />
      </div>

      <button className="button" type="submit" disabled={pending}>
        {pending ? "A verificar…" : "Entrar"}
      </button>
    </form>
  );
}
