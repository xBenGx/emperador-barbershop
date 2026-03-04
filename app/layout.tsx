// app/layout.tsx
import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Navbar from "@/components/Navbar"; 
import MusicPlayer from "@/components/MusicPlayer"; 
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
  authors: [{ name: "BAYX", url: "https://bayx.cl" }], // Tu firma de agencia
  openGraph: {
    title: "Emperador BarberShop | Domina tu Estilo",
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
        className={`${inter.variable} ${playfair.variable} font-sans bg-[#050505] text-zinc-50 antialiased overflow-x-hidden flex flex-col min-h-screen`}
      >
        {/* Barra de navegación global (Fija y superpuesta) */}
        <Navbar />
        
        {/* Reproductor de Música Optimizado (Global) */}
        <MusicPlayer />
        
        {/* CONTENEDOR PRINCIPAL FIX:
          Se ha añadido pt-[120px] md:pt-[180px] lg:pt-[220px]. 
          Esto asegura que en NINGUNA página el contenido choque o quede tapado por 
          el logo gigante de la Navbar, manteniendo el diseño limpio en todas las rutas.
        */}
        <main className="flex-grow relative pt-[120px] md:pt-[180px] lg:pt-[220px]">
          {children}
        </main>
      </body>
    </html>
  );
}