import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Choperia 820 - Admin",
  description: "Painel Administrativo da Choperia 820",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full w-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
