import type { Metadata } from "next";
import Link from "next/link";
import "./theme.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "CPD · A Casa do Povo",
  description:
    "Votações da Comunidade Pouco Democrática sobre A Casa do Povo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <div className="site-title">
              <Link href="/">CPD · A Casa do Povo</Link>
              <span className="site-subtitle">
                Comunidade Pouco Democrática
              </span>
            </div>
            <Link href="/new" className="nav-link">
              Nova proposta
            </Link>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <Link href="/admin">Administração</Link>
        </footer>
      </body>
    </html>
  );
}
