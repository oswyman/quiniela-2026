import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

const display = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const sans = Barlow({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "La Cancha | Quinielas privadas Mundial 2026",
  description: "Plataforma premium para organizar quinielas privadas del Mundial FIFA 2026",
  appleWebApp: {
    capable: true,
    title: "La Cancha",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10392d",
};

// Aplica el tema manual guardado antes del primer paint para evitar flash.
// Sin valor guardado no se setea data-theme y el CSS sigue al sistema.
const themeInitScript = `try{var t=localStorage.getItem("la_cancha_theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Header />
        <div id="main-content" tabIndex={-1} style={{ outline: "none" }} />
        {children}
        <SiteFooter />
        <AnalyticsProvider />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
