"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Zap, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// Tipos de las rutas
interface NavLink {
  name: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { name: "Inicio", href: "/" },
  { name: "Servicios", href: "/servicios" },
  { name: "Reservas", href: "/reservar" },
  { name: "Sobre Nosotros", href: "/nosotros" },
  { name: "Galería", href: "/galeria" },
  { name: "Contacto", href: "/contacto" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const pathname = usePathname();
  const supabase = createClient();

  // 1. Detectar Scroll para cambiar el fondo de la Navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. Conexión a Supabase para verificar si hay sesión activa
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkUser();

    // Escuchar cambios de sesión (ej. si el usuario hace login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-black/80 backdrop-blur-lg border-b border-zinc-800 py-3 shadow-2xl" 
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* LOGO (Izquierda) */}
          <div className="flex-shrink-0 relative group">
            {/* Efecto de resplandor trasero */}
            <div className="absolute inset-0 bg-amber-500 blur-[30px] opacity-40 group-hover:opacity-60 transition-opacity rounded-full"></div>
            <Link href="/" className="relative z-10 block">
              {/* Asegúrate de tener tu logo en la carpeta /public */}
              <img 
                src="/logo.png" // <-- CAMBIA ESTO POR EL NOMBRE REAL DE TU LOGO
                alt="Emperador Barbershop Logo" 
                className="h-16 w-16 md:h-20 md:w-20 rounded-full border border-amber-500/30 object-cover"
              />
            </Link>
          </div>

          {/* ENLACES DE NAVEGACIÓN (Centro - Solo Desktop) */}
          <div className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-bold tracking-widest uppercase transition-colors ${
                    isActive 
                      ? "text-amber-500" 
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* BOTONES DE ACCIÓN (Derecha - Solo Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              // Si está logueado, mostramos el botón a su panel
              <Link 
                href="/dashboards" 
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-sm font-bold hover:border-amber-500 transition-all"
              >
                <User size={18} className="text-amber-500" />
                Mi Panel
              </Link>
            ) : (
              // Si NO está logueado, mostramos botón de ingresar
              <Link 
                href="/login" 
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-sm font-bold hover:border-amber-500 transition-all"
              >
                <User size={18} />
                Ingresar
              </Link>
            )}
            
            <Link 
              href="/reservar" 
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(217,119,6,0.3)] hover:shadow-[0_0_25px_rgba(217,119,6,0.5)] transform hover:-translate-y-0.5"
            >
              Agendar <Zap size={16} />
            </Link>
          </div>

          {/* MENÚ HAMBURGUESA (Móvil) */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-zinc-300 hover:text-amber-500 focus:outline-none p-2"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* MENÚ DESPLEGABLE (Móvil) */}
      <div 
        className={`md:hidden absolute w-full bg-zinc-950 border-b border-zinc-800 transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen ? "max-h-[500px] opacity-100 py-4" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 space-y-3 flex flex-col">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-3 rounded-xl text-base font-bold tracking-widest uppercase text-zinc-300 hover:text-amber-500 hover:bg-zinc-900/50"
            >
              {link.name}
            </Link>
          ))}
          
          <div className="h-px bg-zinc-800 my-4"></div>
          
          <Link 
            href="/reservar" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-amber-500 text-black rounded-xl text-sm font-black uppercase tracking-widest"
          >
            Agendar Hora <Zap size={18} />
          </Link>

          <Link 
            href={user ? "/dashboards" : "/login"} 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-sm font-bold uppercase tracking-widest"
          >
            <User size={18} className={user ? "text-amber-500" : ""} />
            {user ? "Ir a mi Panel" : "Ingresar"}
          </Link>
        </div>
      </div>
    </nav>
  );
}