import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WIDE CRM",
  description: "CRM per gestione pipeline commerciale e analisi digitale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body className={inter.className} style={{ backgroundColor: "#0a0a0a", color: "#f5f5f5" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
