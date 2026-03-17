import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "WIDE CRM",
    template: "%s | WIDE CRM",
  },
  description: "CRM intelligente per WIDE Digital Agency. Gestisci lead, pipeline commerciale e report AI in un'unica piattaforma.",
  applicationName: "WIDE CRM",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WIDE CRM",
  },
  openGraph: {
    type: "website",
    title: "WIDE CRM",
    description: "CRM intelligente per WIDE Digital Agency",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
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
