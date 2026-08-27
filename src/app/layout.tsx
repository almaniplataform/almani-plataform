import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Almani Plataform",
  description: "Portal do cliente Almani",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}