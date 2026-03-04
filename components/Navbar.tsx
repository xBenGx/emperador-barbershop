"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Zap, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll);
    // Verificar estado inicial al montar
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Bloquear el scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileMenuOpen]);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 w-full z-[100] transition-all duration-500 border-b ${
          isScrolled 
            ? "bg-[#050505]/90 backdrop-blur-xl border-amber-500/20 shadow-[0_10px_40px_-10px_rgba(217,119,6,0.15)] py-3" 
            : "bg-gradient-to-b from-black/80 via-black/40 to-transparent border-transparent py-6"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative">
          <div className="flex items-center justify-between relative z-10">
            
            {/* LOGO DINÁMICO Y GRANDE (Izquierda) */}
            <Link href="/" className="relative z-10 block group perspective-1000">
              <motion.div
                animate={{
                  // El logo es un 10% más grande que el tamaño base al inicio (no scrolled)
                  scale: isScrolled ? 0.85 : 1.1,
                  // Pequeña corrección de posición cuando es grande
                  y: isScrolled ? 0 : 10,
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative flex items-center justify-center"
              >
                {/* Resplandor ámbar mejorado de fondo */}
                <div className="absolute inset-0 bg-amber-500/20 blur-[40px] group-hover:bg-amber-500/40 transition-all duration-500 rounded-full scale-150 pointer-events-none"></div>
                
                {/* Contenedor del logo con bordes definidos. AQUÍ ESTABA EL ERROR: cambié 'scrolled' por 'isScrolled' */}
                <div className={`relative z-10 rounded-full border border-amber-500/30 overflow-hidden shadow-[0_0_15px_rgba(217,119,6,0.2)] group-hover:border-amber-500/80 group-hover:shadow-[0_0_25px_rgba(217,119,6,0.4)] transition-all duration-500 ${isScrolled ? 'h-16 w-16' : 'h-24 w-24 md:h-28 md:w-28'}`}>
                  {/* Imagen del logo sin fondo negro interno forzado, ahora es transparente */}
                  <img 
                    src="/logo.png" 
                    alt="Emperador Barbershop Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </Link>

            {/* ENLACES DE NAVEGACIÓN (Centro - Desktop) */}
            <div className="hidden lg:flex items-center justify-center space-x-10 flex-1 ml-12">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="relative group py-2"
                  >
                    <span className={`text-xs font-black tracking-[0.2em] uppercase transition-colors duration-300 drop-shadow-md ${
                      isActive ? "text-amber-500" : "text-zinc-300 group-hover:text-white"
                    }`}>
                      {link.name}
                    </span>
                    {/* Línea animada inferior con sombra de neón */}
                    <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-amber-500 transform origin-left transition-transform duration-300 ease-out shadow-[0_0_10px_rgba(217,119,6,0.8)] ${
                      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}></span>
                  </Link>
                );
              })}
            </div>

            {/* BOTONES DE ACCIÓN (Derecha - Desktop) */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link 
                href={user ? "/dashboards" : "/login"} 
                className="group flex items-center gap-2 px-5 py-2.5 bg-[#0a0a0a]/80 backdrop-blur-sm border border-zinc-800 text-zinc-300 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] hover:border-amber-500 hover:text-white transition-all duration-300 shadow-lg"
              >
                <User size={16} className={`transition-colors duration-300 ${user ? "text-amber-500" : "group-hover:text-amber-500"}`} />
                {user ? "Mi Panel" : "Ingresar"}
              </Link>
              
              <Link 
                href="/reservar" 
                className="relative overflow-hidden group flex items-center gap-3 px-8 py-3 bg-amber-500 text-black rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_0_20px_rgba(217,119,6,0.4)] hover:shadow-[0_0_30px_rgba(217,119,6,0.6)] hover:-translate-y-0.5 active:scale-95 border border-amber-400"
              >
                {/* Efecto de brillo shimer al pasar el mouse */}
                <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                <span className="relative z-10">Agendar</span>
                <Zap size={16} className="relative z-10 fill-black group-hover:animate-bounce" />
              </Link>
            </div>

            {/* BOTÓN MENÚ MÓVIL ESTILIZADO */}
            <div className="lg:hidden flex items-center z-50">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="relative w-12 h-12 flex items-center justify-center bg-[#0a0a0a] border border-zinc-800 rounded-xl text-amber-500 shadow-lg focus:outline-none hover:border-amber-500 transition-colors"
              >
                <AnimatePresence mode="wait">
                  {isMobileMenuOpen ? (
                    <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                      <X size={24} />
                    </motion.div>
                  ) : (
                    <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                      <Menu size={24} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* MENÚ MÓVIL (Pantalla Completa) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[90] bg-[#050505]/95 flex flex-col justify-center items-center lg:hidden"
          >
            {/* Elemento decorativo de fondo circular ámbar */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="flex flex-col items-center space-y-8 w-full px-8 relative z-10">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
                  className="w-full text-center"
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block text-3xl font-black tracking-widest uppercase transition-colors ${
                      pathname === link.href ? "text-amber-500 drop-shadow-[0_0_15px_rgba(217,119,6,0.5)]" : "text-white hover:text-amber-500"
                    }`}
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}

              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.4 }}
                className="w-full h-px bg-zinc-800/50 my-6" 
              />

              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.4 }}
                className="w-full max-w-sm flex flex-col gap-4"
              >
                <Link 
                  href="/reservar" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-3 w-full py-5 bg-amber-500 text-black rounded-2xl text-sm font-black uppercase tracking-widest shadow-[0_0_30px_rgba(217,119,6,0.3)] active:scale-95 transition-transform"
                >
                  Agendar Hora <Zap size={20} className="fill-black" />
                </Link>

                <Link 
                  href={user ? "/dashboards" : "/login"} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-3 w-full py-5 bg-[#0a0a0a] border border-zinc-700 text-white rounded-2xl text-sm font-bold uppercase tracking-widest active:scale-95 transition-transform"
                >
                  <User size={20} className={user ? "text-amber-500" : ""} />
                  {user ? "Ir a mi Panel" : "Ingresar al Sistema"}
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}