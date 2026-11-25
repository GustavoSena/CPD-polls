import Link from "next/link";
import { activeEvent } from "@/lib/secretSanta";

// The "Amigo secreto" tab only appears while an event is running.
export async function SecretSantaNavLink() {
  if (!(await activeEvent())) return null;
  return (
    <Link href="/amigo-secreto" className="nav-link">
      Amigo secreto
    </Link>
  );
}
