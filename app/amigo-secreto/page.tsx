import { currentMember } from "@/lib/auth";
import { secretSantaViewFor } from "@/lib/secretSanta";
import { Linkify } from "@/app/Linkify";
import { addWishlistItem, removeWishlistItem } from "./actions";
import { SubmitButton } from "./SubmitButton";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  membro:
    "Para participar no amigo secreto, abre primeiro o teu link pessoal de membro.",
  link: "Esse link não parece válido. Cola o endereço completo da página (https://…).",
  nota: "A nota é demasiado longa (máximo 300 caracteres).",
  limite: "A tua lista já tem o máximo de 20 desejos.",
};

type Item = {
  id: string;
  url: string;
  title: string;
  imageId: string | null;
  note: string;
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function WishCard({ item, removable }: { item: Item; removable: boolean }) {
  const host = hostOf(item.url);
  return (
    <div className="wish-card">
      <a
        className="wish-link"
        href={item.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {item.imageId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="wish-image" src={`/media/${item.imageId}`} alt="" />
        ) : (
          <span className="wish-image wish-image-empty" aria-hidden="true">
            🎁
          </span>
        )}
        <span className="wish-body">
          <span className="wish-title">{item.title || host}</span>
          <span className="wish-host">{host}</span>
        </span>
      </a>
      {item.note && (
        <p className="wish-note">
          <Linkify text={item.note} />
        </p>
      )}
      {removable && (
        <form action={removeWishlistItem} className="wish-remove">
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" className="option-remove">
            Remover
          </button>
        </form>
      )}
    </div>
  );
}

export default async function SecretSantaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const member = await currentMember();

  if (!member) {
    return (
      <>
        <h1 className="section-title">Amigo secreto</h1>
        <p className="notice">
          Para ver a quem vais dar um presente e preencher a tua lista de
          desejos, abre o teu link pessoal de membro. Se ainda não o tens, pede
          a quem gere a comunidade.
        </p>
      </>
    );
  }

  const view = await secretSantaViewFor(member.id);

  if (!view.event) {
    return (
      <>
        <h1 className="section-title">Amigo secreto</h1>
        <p className="empty">Não há nenhum amigo secreto a decorrer.</p>
      </>
    );
  }

  if (!view.participant) {
    return (
      <>
        <h1 className="section-title">{view.event.name}</h1>
        <p className="notice">
          Não fazes parte deste sorteio. Se achas que devias estar, fala com
          quem gere a comunidade.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="section-title">{view.event.name}</h1>
      {view.event.details && (
        <p className="proposal-description">
          <Linkify text={view.event.details} />
        </p>
      )}

      {erro && ERROR_MESSAGES[erro] && (
        <p className="form-error">{ERROR_MESSAGES[erro]}</p>
      )}

      <section className="card santa-reveal">
        <p className="santa-reveal-label">Vais dar um presente a</p>
        <p className="santa-reveal-name">{view.receiver.name}</p>
        <p className="form-hint">
          É segredo! Só tu sabes isto — nem a administração vê os pares.
        </p>
      </section>

      <section className="card">
        <h2>Lista de desejos de {view.receiver.name}</h2>
        {view.receiverItems.length === 0 ? (
          <p className="empty">
            {view.receiver.name} ainda não adicionou nada. Volta mais tarde!
          </p>
        ) : (
          <div className="wish-list">
            {view.receiverItems.map((item) => (
              <WishCard key={item.id} item={item} removable={false} />
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>A tua lista de desejos</h2>
        <p className="form-hint">
          Só a pessoa que te tirou consegue ver esta lista.
        </p>

        {view.ownItems.length > 0 && (
          <div className="wish-list">
            {view.ownItems.map((item) => (
              <WishCard key={item.id} item={item} removable />
            ))}
          </div>
        )}

        <form action={addWishlistItem} className="wish-form">
          <div className="form-field">
            <label htmlFor="wish-url">Link do presente</label>
            <input
              id="wish-url"
              name="url"
              type="text"
              inputMode="url"
              autoComplete="off"
              required
              placeholder="https://…"
            />
          </div>
          <div className="form-field">
            <label htmlFor="wish-note">Nota (opcional)</label>
            <input
              id="wish-note"
              name="note"
              type="text"
              maxLength={300}
              placeholder="Tamanho, cor, alternativa…"
            />
          </div>
          <SubmitButton idle="Adicionar à lista" pending="A ler o link…" />
        </form>
      </section>
    </>
  );
}
