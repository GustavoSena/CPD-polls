import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { activeEvent } from "@/lib/secretSanta";

// The "Amigo secreto" tab appears for everyone while an event is running.
// With no event, admins still see it, pointing at the card where they
// create one.
export async function SecretSantaNavLink() {
  if (await activeEvent()) {
    return (
      <Link href="/amigo-secreto" className="nav-link">
        Amigo secreto
      </Link>
    );
  }
  if (await isAdmin()) {
    return (
      <Link href="/admin#amigo-secreto" className="nav-link">
        Amigo secreto
      </Link>
    );
  }
  return null;
}
