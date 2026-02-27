"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowLeft, UserCircle2, Scissors, Lock, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type PortalType = "CLIENTE" | "BARBERO" | "ADMIN" | null;

// ============================================================================
// COMPONENTE PRINCIPAL DE LOGIN (Envuelto para manejar useSearchParams)
// ============================================================================
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [portal, setPortal] = useState<PortalType>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-seleccionar portal si viene de la Landing Page (?role=...)
  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "client") setPortal("CLIENTE");
    if (roleParam === "barber") setPortal("BARBERO");
    if (roleParam === "admin") setPortal("ADMIN");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    // Redirección inteligente según el rol
    const session = await getSession();
    
    if (session?.user?.role === "BARBER") {
      router.push("/barber"); 
    } else if (session?.user?.role === "ADMIN") {
      router.push("/admin"); 
    } else {
      router.push("/client/book"); 
    }
    
    router.refresh(); 
  };

  // DATOS DE LAS TARJETAS DE SELECCIÓN
  const PORTALS = [
    {
      id: "CLIENTE" as PortalType,
      title: "Portal Cliente",
      desc: "Accede o regístrate para agendar tus horas, revisar tu historial y beneficios.",
      icon: <UserCircle2 size={36} />,
      btnText: "INGRESAR / REGISTRARSE",
    },
    {
      id: "BARBERO" as PortalType,
      title: "Staff Barberos",
      desc: "Acceso exclusivo para barberos. Revisa tu agenda y gestiona tus cortes.",
      icon: <Scissors size={36} />,
      btnText: "ACCESO STAFF",
    },
    {
      id: "ADMIN" as PortalType,
      title: "Administración",
      desc: "Acceso exclusivo para el personal de BAYX. Gestiona la plataforma completa.",
      icon: <Lock size={36} />,
      btnText: "ACCESO RESTRINGIDO",
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans relative overflow-hidden flex flex-col items-center justify-center p-6">
      
      {/* Fondos Glow sutiles */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-600/10 blur-[120px] pointer-events-none z-0"></div>
      
      {/* Botón Volver (Siempre visible) */}
      <div className="absolute top-8 left-8 z-20">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-amber-500 hover:text-amber-400 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Volver a la tienda
        </Link>
      </div>

      <AnimatePresence mode="wait">
        
        {/* VISTA 1: SELECCIÓN DE PORTAL (Las Tarjetas) */}
        {!portal && (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center mt-12"
          >
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4 font-serif">
                ACCESOS <span className="text-amber-500">PLATAFORMA</span>
              </h1>
              <p className="text-zinc-400 text-lg">Selecciona tu tipo de cuenta para ingresar al sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full">
              {PORTALS.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => setPortal(p.id)}
                  className="flex flex-col items-center p-8 bg-zinc-950 border border-zinc-800 rounded-3xl hover:border-amber-500 transition-all duration-300 cursor-pointer group shadow-2xl hover:-translate-y-2"
                >
                  <div className="w-20 h-20 rounded-full border-2 border-amber-500 flex items-center justify-center mb-6 text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-colors shadow-[0_0_15px_rgba(217,119,6,0.2)]">
                    {p.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4">{p.title}</h2>
                  <p className="text-zinc-500 text-center text-sm mb-10 leading-relaxed px-4">
                    {p.desc}
                  </p>
                  
                  <div className="mt-auto w-full py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center text-[10px] md:text-xs font-black text-zinc-400 uppercase tracking-[0.2em] group-hover:border-amber-500 group-hover:text-amber-500 transition-colors flex items-center justify-center gap-2">
                    {p.btnText} <ChevronRight size={16} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* VISTA 2: EL FORMULARIO DE LOGIN */}
        {portal && (
          <motion.div 
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[2rem] p-8 md:p-10 shadow-2xl"
          >
            <button 
              onClick={() => setPortal(null)}
              className="mb-8 flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
            >
              <ArrowLeft size={14} /> Cambiar Portal
            </button>

            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 mb-6">
                {portal === "CLIENTE" && <UserCircle2 size={32} />}
                {portal === "BARBERO" && <Scissors size={32} />}
                {portal === "ADMIN" && <Lock size={32} />}
              </div>
              <h2 className="text-3xl font-serif font-black text-white uppercase tracking-tighter">
                PORTAL <span className="text-amber-500">{portal}</span>
              </h2>
              <p className="text-zinc-500 text-sm mt-2">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-zinc-700"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Contraseña</label>
                <input
                  name="password"
                  type="password"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-zinc-700"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl text-center font-medium">
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm py-4 px-4 rounded-xl transition-all flex justify-center items-center hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(217,119,6,0.3)]"
              >
                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Iniciar Sesión"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// EXPORTACIÓN CON SUSPENSE (Requerido por Next.js al usar useSearchParams)
// ============================================================================
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-amber-500">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}