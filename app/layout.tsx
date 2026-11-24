import type { Metadata, Viewport } from "next";
import { Fredoka, Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { MemberNav } from "./MemberNav";
import { SiteNav } from "./SiteNav";
import "./theme.css";
import "./globals.css";

// Rounded display face echoes the logo lettering; Inter for everything else.
// Exposed as CSS variables consumed by app/theme.css.
const display = Fredoka({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-display",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CPD · A Casa do Povo",
  description:
    "Votações da Comunidade Pouco Democrática sobre A Casa do Povo.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#171411" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className={`${display.variable} ${sans.variable}`}>
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="site-brand">
              {/* Decorative: the title next to it already names the community. */}
              <Image
                className="site-logo"
                src="/logo.png"
                alt=""
                width={44}
                height={44}
                priority
              />
              <span className="site-title">
                CPD · A Casa do Povo
                <span className="site-subtitle">
                  Comunidade Pouco Democrática
                </span>
              </span>
            </Link>
            <SiteNav>
              <MemberNav />
            </SiteNav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <span>Comunidade Pouco Democrática · votos anónimos</span>
          <Link href="/admin">Administração</Link>
        </footer>
      </body>
    </html>
  );
}
