"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Zap, User, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface NavLink {
  name: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { name: "Inicio", href: "/" },
  { name: "Tienda", href: "/tienda" },
  { name: "Servicios", href: "/servicios" },
  { name: "Reservas", href: "/reservar" },
  { name: "Sobre Nosotros", href: "/nosotros" },
  { name: "Contacto", href: "/contacto" },
];

// Animaciones para el menú móvil
const mobileMenuVariants: Variants = {
  hidden: { opacity: 0, scale: 1.05, backdropFilter: "blur(0px)" },
  visible: { opacity: 1, scale: 1, backdropFilter: "blur(24px)", transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, scale: 1.05, backdropFilter: "blur(0px)", transition: { duration: 0.3, ease: "easeIn" } }
};

const linkItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const supabase = createClient();

  // 1. Manejo del Scroll para efectos de la Navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. Sincronización en Tiempo Real de la Sesión (Supabase)
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

  // 3. Bloqueo de scroll preventivo para el menú móvil
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    
    // Cleanup en caso de que el componente se desmonte mientras está abierto
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 w-full z-[100] transition-all duration-500 border-b ${
          isScrolled 
            ? "bg-[#050505]/95 backdrop-blur-xl border-amber-500/20 shadow-[0_10px_40px_-10px_rgba(217,119,6,0.3)] py-3" 
            : "bg-gradient-to-b from-black/95 via-black/50 to-transparent border-transparent py-6 md:py-8"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative">
          <div className="flex items-center justify-between relative z-10">
            
            {/* ========================================== */}
            {/* LOGO DINÁMICO Y MONUMENTAL */}
            {/* ========================================== */}
            <Link href="/" className="relative z-10 block group perspective-1000">
              <motion.div
                animate={{ y: isScrolled ? 0 : 15 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative flex items-center justify-center"
              >
                {/* Aura de resplandor bajo el logo mejorada */}
                <div className="absolute inset-0 bg-amber-500/25 blur-[45px] group-hover:bg-amber-500/40 transition-all duration-500 rounded-full scale-150 pointer-events-none"></div>
                
                {/* Contenedor del logo con proporciones corregidas */}
                <div 
                  className={`relative z-10 rounded-full border border-amber-500/30 overflow-hidden shadow-[0_0_20px_rgba(217,119,6,0.15)] group-hover:border-amber-500/80 group-hover:shadow-[0_0_35px_rgba(217,119,6,0.4)] transition-all duration-500 bg-black ${
                    isScrolled 
                      ? 'h-16 w-16 md:h-20 md:w-20' 
                      : 'h-24 w-24 md:h-32 md:w-32 lg:h-40 lg:w-40' 
                  }`}
                >
                  <Image 
                    src="/logo.png" 
                    alt="Emperador Barbershop Logo" 
                    fill
                    sizes="(max-width: 768px) 96px, 160px"
                    className="object-cover"
                    priority
                  />
                </div>
              </motion.div>
            </Link>

            {/* ========================================== */}
            {/* ENLACES DE NAVEGACIÓN - DESKTOP */}
            {/* ========================================== */}
            <div className="hidden lg:flex items-center justify-center space-x-10 xl:space-x-12 flex-1 ml-16">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="relative group py-2"
                  >
                    <span className={`text-[12px] xl:text-[13px] font-black tracking-[0.25em] uppercase transition-colors duration-300 drop-shadow-lg ${
                      isActive ? "text-amber-500" : "text-zinc-300 group-hover:text-white"
                    }`}>
                      {link.name}
                    </span>
                    {/* Línea animada inferior con sombra de neón */}
                    <span className={`absolute bottom-0 left-0 w-full h-[2px] bg-amber-500 transform origin-left transition-transform duration-300 ease-out shadow-[0_0_12px_rgba(217,119,6,0.6)] ${
                      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}></span>
                  </Link>
                );
              })}
            </div>

            {/* ========================================== */}
            {/* BOTONES DE ACCIÓN - DESKTOP */}
            {/* ========================================== */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link 
                href={user ? "/dashboards/admin" : "/login"} 
                className={`group flex items-center gap-3 px-6 py-3 backdrop-blur-md border rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-xl ${
                  user 
                    ? "bg-amber-500/10 border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-black" 
                    : "bg-[#0a0a0a]/60 border-zinc-800 text-zinc-300 hover:border-amber-500/50 hover:text-white"
                }`}
              >
                {user ? (
                  <><ShieldCheck size={16} /> Admin</>
                ) : (
                  <><User size={16} className="group-hover:text-amber-500 transition-colors" /> Ingresar</>
                )}
              </Link>
              
              <Link 
                href="/reservar" 
                className="relative overflow-hidden group flex items-center gap-3 px-10 py-4 bg-amber-500 text-black rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_15px_30px_-10px_rgba(217,119,6,0.4)] hover:shadow-[0_20px_40px_-10px_rgba(217,119,6,0.6)] hover:-translate-y-1 active:scale-95"
              >
                {/* Efecto de brillo shimer al pasar el mouse */}
                <span className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                <span className="relative z-10">Agendar</span>
                <Zap size={16} className="relative z-10 fill-black group-hover:animate-bounce" />
              </Link>
            </div>

            {/* ========================================== */}
            {/* BOTÓN MENÚ MÓVIL */}
            {/* ========================================== */}
            <div className="lg:hidden flex items-center z-50">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle Mobile Menu"
                className="relative w-14 h-14 flex items-center justify-center bg-[#0a0a0a] border border-zinc-800 rounded-xl text-amber-500 shadow-2xl focus:outline-none hover:border-amber-500 transition-colors"
              >
                <AnimatePresence mode="wait">
                  {isMobileMenuOpen ? (
                    <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                      <X size={28} />
                    </motion.div>
                  ) : (
                    <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                      <Menu size={28} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ========================================== */}
      {/* MENÚ MÓVIL DE PANTALLA COMPLETA */}
      {/* ========================================== */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            variants={mobileMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[90] bg-[#050505]/98 flex flex-col justify-center items-center lg:hidden overflow-hidden"
          >
            {/* Patrón de fondo sutil */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] opacity-20"></div>
            
            {/* Elemento decorativo de fondo circular ámbar */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110vw] h-[110vw] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="flex flex-col items-center space-y-8 w-full px-8 relative z-10">
              {NAV_LINKS.map((link, i) => {
                const isActive = pathname === link.href;
                return (
                  <motion.div
                    key={link.name}
                    variants={linkItemVariants}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="w-full text-center"
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block text-3xl font-black tracking-widest uppercase transition-colors drop-shadow-md ${
                        isActive 
                          ? "text-amber-500 scale-110" 
                          : "text-white hover:text-amber-500"
                      }`}
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                );
              })}

              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ delay: 0.5, duration: 0.4 }}
                className="w-full max-w-[200px] h-px bg-zinc-800/80 my-4" 
              />

              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.6, duration: 0.4 }}
                className="w-full max-w-sm flex flex-col gap-4"
              >
                <Link 
                  href="/reservar" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-3 w-full py-6 bg-amber-500 text-black rounded-2xl text-sm font-black uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(217,119,6,0.4)] active:scale-95 transition-transform"
                >
                  Agendar Mi Cita <Zap size={20} className="fill-black" />
                </Link>

                <Link 
                  href={user ? "/dashboards/admin" : "/login"} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-center gap-3 w-full py-5 rounded-2xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-all border ${
                    user 
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500" 
                      : "bg-[#0a0a0a] border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {user ? (
                    <><ShieldCheck size={18} /> Panel de Control</>
                  ) : (
                    <><User size={18} /> Acceso Staff</>
                  )}
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}