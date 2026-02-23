// app/layout.tsx
import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

// Configuración de tipografías premium
const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: "--font-serif",
  weight: ["400", "600", "700", "900"]
});

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Emperador BarberShop | Domina tu Estilo",
  description: "Barbería premium. Cortes de precisión, perfilado de barba y entretenimiento exclusivo con PS5 y Pool. Agenda tu cita en el segundo piso.",
  keywords: ["barbería", "cortes premium", "barba", "Emperador Barbershop", "estilo masculino"],
  authors: [{ name: "BAYX", url: "https://bayx.com" }], // Tu firma de agencia
  openGraph: {
    title: "Emperador BarberShop",
    description: "La experiencia definitiva de grooming masculino.",
    type: "website",
    locale: "es_CL",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body 
        className={`${inter.variable} ${playfair.variable} font-sans bg-zinc-950 text-zinc-50 antialiased overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}