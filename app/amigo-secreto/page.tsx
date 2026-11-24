import Link from "next/link";
import { currentMember } from "@/lib/auth";
import { secretSantaViewFor } from "@/lib/secretSanta";
import { Linkify } from "@/app/Linkify";
import {
  addWishlistItem,
  joinSecretSanta,
  leaveSecretSanta,
  removeWishlistItem,
  setWishlistImage,
} from "./actions";
import { SubmitButton } from "./SubmitButton";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  membro:
    "Para participar no amigo secreto, entra primeiro com o teu email de membro.",
  link: "Esse link não parece válido. Cola o endereço completo da página (https://…).",
  nota: "A nota é demasiado longa (máximo 300 caracteres).",
  limite: "A tua lista já tem o máximo de 20 desejos.",
  imagem: "A imagem tem de ser JPG, PNG, WebP ou GIF, até 4 MB.",
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
        <div className="wish-actions">
          {!item.imageId && (
            <form action={setWishlistImage} className="wish-image-form">
              <input type="hidden" name="id" value={item.id} />
              <input
                type="file"
                name="image"
                aria-label="Imagem do presente"
                accept="image/jpeg,image/png,image/webp,image/gif"
                required
              />
              <button type="submit" className="option-add">
                Guardar imagem
              </button>
            </form>
          )}
          <form action={removeWishlistItem}>
            <input type="hidden" name="id" value={item.id} />
            <button type="submit" className="option-remove">
              Remover
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

type OwnItem = Item;

function OwnWishlist({ items }: { items: OwnItem[] }) {
  return (
  <section className="card">
    <h2>A tua lista de desejos</h2>
    <p className="form-hint">
      Só quem te sair no sorteio consegue ver esta lista.
    </p>

    {items.length > 0 && (
      <div className="wish-list">
        {items.map((item) => (
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
      <div className="form-field">
        <label htmlFor="wish-image">Imagem (opcional)</label>
        <input
          id="wish-image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
        />
        <p className="form-hint">
          Tentamos ir buscar a imagem ao link. Algumas lojas (Amazon,
          Worten, Fnac, Zara…) não deixam, por isso podes juntar uma
          captura de ecrã ou foto do presente.
        </p>
      </div>
      <SubmitButton idle="Adicionar à lista" pending="A ler o link…" />
    </form>
  </section>
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
          Para participar e preencher a tua lista de desejos, tens de{" "}
          <Link href="/entrar">entrar com o teu email</Link> de membro.
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

  const header = (
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
    </>
  );

  // Sign-up phase: join, fill in the wishlist, wait for the draw.
  if (view.phase === "signup") {
    if (!view.joined) {
      return (
        <>
          {header}
          <section className="card santa-reveal">
            <p className="santa-reveal-label">Inscrições abertas</p>
            <p className="proposal-description">
              Inscreve-te e prepara a tua lista de desejos. Quando o sorteio
              for feito, vais saber a quem dás o presente.
            </p>
            <form action={joinSecretSanta}>
              <button type="submit" className="button">
                Quero participar
              </button>
            </form>
          </section>
        </>
      );
    }
    return (
      <>
        {header}
        <section className="card santa-reveal">
          <p className="santa-reveal-label">Inscrição feita</p>
          <p className="proposal-description">
            O sorteio ainda não foi feito. Entretanto, vai preenchendo a tua
            lista de desejos.
          </p>
          <form action={leaveSecretSanta}>
            <button type="submit" className="option-remove">
              Já não quero participar (apaga a minha lista)
            </button>
          </form>
        </section>
        <OwnWishlist items={view.ownItems} />
      </>
    );
  }

  if (!view.joined) {
    return (
      <>
        {header}
        <p className="notice">
          O sorteio já foi feito e não fazes parte dele. Se achas que devias
          estar, fala com quem gere a comunidade.
        </p>
      </>
    );
  }

  return (
    <>
      {header}

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

      <OwnWishlist items={view.ownItems} />
    </>
  );
}
