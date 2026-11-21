import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: "Le diagnostic de votre maison, en 3D",
  description:
    "Toiture, charpente, isolation, zinguerie, façade, humidité, qualité de l'air : découvrez en 3D comment nous diagnostiquons et traitons votre maison à Aix-en-Provence.",
};

export const viewport: Viewport = { themeColor: "#0a1f4d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
