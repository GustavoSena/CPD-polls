"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { adminLogin } from "./actions";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    adminLogin,
    null
  );

  return (
    <form action={formAction}>
      {state?.error && <p className="form-error">{state.error}</p>}

      <div className="form-field">
        <label htmlFor="user">Utilizador</label>
        <input id="user" name="user" type="text" required />
      </div>

      <div className="form-field">
        <label htmlFor="password">Palavra-passe</label>
        <input id="password" name="password" type="password" required />
      </div>

      <button className="button" type="submit" disabled={pending}>
        {pending ? "A entrar…" : "Entrar"}
      </button>
    </form>
  );
}
