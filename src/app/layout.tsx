import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { headers } from "next/headers";
import { I18nProvider } from "@/lib/i18n/context";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Anak.Studio — Houston lashes & brows",
    template: "%s · Anak.Studio",
  },
  description:
    "Pick the service. Then who does it. Houston lashes and brows marketplace — no account, confirm on WhatsApp.",
  applicationName: "Anak.Studio",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Anak.Studio",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/brand/anak-studio-mark.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f1e9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const h = await headers();
  const acceptLanguage = h.get("accept-language") || "en";

  return (
    <html lang="en" className={`${cormorant.variable} ${outfit.variable}`}>
      <body className="antialiased">
        <I18nProvider acceptLanguage={acceptLanguage}>
          <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
            <SiteHeader />
            <main className="flex-1 pb-16 pt-4 sm:pt-8">{children}</main>
            <SiteFooter />
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
