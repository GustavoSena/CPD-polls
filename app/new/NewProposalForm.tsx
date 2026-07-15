"use client";

import { useActionState, useState } from "react";
import { createProposal, type FormState } from "@/app/actions";

export function NewProposalForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createProposal,
    null
  );
  // Stable keys for the option rows so removing one doesn't reshuffle
  // what the user already typed in the others.
  const [optionKeys, setOptionKeys] = useState([0, 1]);
  const [nextKey, setNextKey] = useState(2);

  function addOption() {
    setOptionKeys((keys) => [...keys, nextKey]);
    setNextKey((k) => k + 1);
  }

  function removeOption(key: number) {
    setOptionKeys((keys) => keys.filter((k) => k !== key));
  }

  return (
    <form action={formAction}>
      {state?.error && <p className="form-error">{state.error}</p>}

      <div className="form-field">
        <label htmlFor="title">Título</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="Ex.: Que cor pintamos a sala?"
        />
      </div>

      <div className="form-field">
        <label htmlFor="description">Descrição (opcional)</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Contexto ou detalhes da proposta"
        />
      </div>

      <div className="form-field">
        <label htmlFor="proposalImage">Imagem da proposta (opcional)</label>
        <input
          id="proposalImage"
          name="proposalImage"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
        />
        <p className="form-hint">JPG, PNG, WebP ou GIF, até 4 MB.</p>
      </div>

      <div className="form-field">
        <label>Opções</label>
        {optionKeys.map((key, index) => (
          <fieldset className="option-entry" key={key}>
            <div className="option-entry-header">
              <span className="option-entry-number">Opção {index + 1}</span>
              {optionKeys.length > 2 && (
                <button
                  type="button"
                  className="option-remove"
                  onClick={() => removeOption(key)}
                >
                  Remover
                </button>
              )}
            </div>
            <input
              name="optionTitle"
              type="text"
              placeholder="Título da opção"
              required
            />
            <textarea
              name="optionDescription"
              rows={3}
              placeholder="Explicação (opcional)"
            />
            <input
              name="optionImage"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
            />
          </fieldset>
        ))}
        <button type="button" className="option-add" onClick={addOption}>
          + Adicionar opção
        </button>
      </div>

      <div className="form-field">
        <label htmlFor="durationHours">Duração da votação</label>
        <select id="durationHours" name="durationHours" defaultValue="24">
          <option value="1">1 hora</option>
          <option value="6">6 horas</option>
          <option value="24">1 dia</option>
          <option value="72">3 dias</option>
          <option value="168">1 semana</option>
        </select>
        <p className="form-hint">
          A proposta encerra quando o tempo acabar ou quando todos os membros
          da comunidade tiverem votado — o que acontecer primeiro.
        </p>
      </div>

      <div className="form-field">
        <label htmlFor="code">Código de residente</label>
        <input id="code" name="code" type="password" required />
      </div>

      <button className="button" type="submit" disabled={pending}>
        {pending ? "A submeter…" : "Submeter proposta"}
      </button>
    </form>
  );
}
