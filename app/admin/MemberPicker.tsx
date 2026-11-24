"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Option = { id: string; name: string };

// A dropdown with a search box and a checkbox per member. The chosen ids
// are submitted as repeated `memberId` fields with the surrounding form.
export function MemberPicker({
  members,
  initial = [],
  label = "Participantes",
}: {
  members: Option[];
  initial?: string[];
  label?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? members.filter((m) => m.name.toLowerCase().includes(q)) : members;
  }, [members, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const chosen = members.filter((m) => selected.has(m.id));
  const summary =
    chosen.length === 0
      ? "Escolhe as pessoas…"
      : chosen.length === 1
        ? "1 pessoa escolhida"
        : `${chosen.length} pessoas escolhidas`;

  return (
    <div className="form-field member-picker" ref={root}>
      <span className="member-picker-label">{label}</span>
      {chosen.map((m) => (
        <input key={m.id} type="hidden" name="memberId" value={m.id} />
      ))}

      <button
        type="button"
        className="member-picker-toggle"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{summary}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="member-picker-panel">
          <input
            type="text"
            className="member-picker-search"
            placeholder="Procurar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="member-picker-actions">
            <button
              type="button"
              className="option-add"
              onClick={() => setSelected(new Set(members.map((m) => m.id)))}
            >
              Todos
            </button>
            <button
              type="button"
              className="option-remove"
              onClick={() => setSelected(new Set())}
            >
              Nenhum
            </button>
          </div>
          <ul className="member-picker-list" role="listbox" aria-multiselectable>
            {visible.map((m) => (
              <li key={m.id}>
                <label className="member-picker-option">
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                  />
                  {m.name}
                </label>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="member-picker-empty">Ninguém com esse nome.</li>
            )}
          </ul>
        </div>
      )}

      {chosen.length > 0 && (
        <div className="member-picker-chips">
          {chosen.map((m) => (
            <span key={m.id} className="member-picker-chip">
              {m.name}
              <button
                type="button"
                aria-label={`Tirar ${m.name}`}
                onClick={() => toggle(m.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
