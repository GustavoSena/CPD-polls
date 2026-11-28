import Link from "next/link";
import { currentMember } from "@/lib/auth";
import { signOut } from "@/app/entrar/actions";

// Header item: "Entrar" for visitors, or the member's photo, name and a
// sign-out button for this device.
export async function MemberNav() {
  const member = await currentMember();
  if (!member) {
    return (
      <Link href="/entrar" className="nav-link">
        Entrar
      </Link>
    );
  }
  return (
    <form action={signOut} className="member-nav">
      {member.imageId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="avatar member-nav-avatar"
          src={`/media/${member.imageId}`}
          alt=""
        />
      )}
      <span className="member-nav-name">{member.name}</span>
      <button type="submit" className="nav-link member-nav-signout">
        Sair
      </button>
    </form>
  );
}
