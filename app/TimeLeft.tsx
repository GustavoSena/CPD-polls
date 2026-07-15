"use client";

import { useEffect, useState } from "react";

function format(msLeft: number): string {
  if (msLeft <= 0) return "tempo esgotado";
  const totalMinutes = Math.floor(msLeft / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `termina em ${days}d ${hours}h`;
  if (hours > 0) return `termina em ${hours}h ${minutes}m`;
  if (minutes > 0) return `termina em ${minutes}m`;
  return "termina em <1m";
}

// Live countdown. Renders nothing on the server to avoid hydration
// mismatches; the static deadline info next to it covers no-JS.
export function TimeLeft({ deadline }: { deadline: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (now === null) return null;
  return <span>{format(new Date(deadline).getTime() - now)}</span>;
}
