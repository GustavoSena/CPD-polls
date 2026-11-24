import Link from "next/link";
import { currentMember } from "@/lib/auth";
import { signOut } from "@/app/entrar/actions";

// Header item: "Entrar" for visitors, or the member's name and a sign-out
// button for this device.
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
      <span className="member-nav-name">{member.name}</span>
      <button type="submit" className="nav-link member-nav-signout">
        Sair
      </button>
    </form>
  );
}
