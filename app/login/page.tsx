"use client";

import React, { useState, useEffect, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Loader2, ArrowLeft, UserCircle2, Scissors, 
  Lock, ChevronRight, Eye, EyeOff, ShieldAlert 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type PortalType = "CLIENTE" | "BARBERO" | "ADMIN" | null;

// ============================================================================
// COMPONENTE DE CONTENIDO (Dentro de Suspense para evitar errores de Build)
// ============================================================================
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient(); 
  
  // Estados
  const [portal, setPortal] = useState<PortalType>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Detectar portal por URL (opcional)
  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "client") setPortal("CLIENTE");
    if (roleParam === "barber") setPortal("BARBERO");
    if (roleParam === "admin") setPortal("ADMIN");
  }, [searchParams]);

  // Manejador de Login con Validación de Roles
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      // 1. Auth con Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message === "Invalid login credentials" 
          ? "Credenciales incorrectas. Verifica tu correo y contraseña." 
          : "Error de conexión. Inténtalo de nuevo.");
      }

      // 2. Obtener Rol de la tabla User (asegúrate que la tabla se llame 'User' o cambia el nombre aquí)
      const { data: userProfile } = await supabase
        .from("User")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      const dbRole = userProfile?.role || "CLIENT";

      // 3. 🔒 Seguridad: Validar que el usuario entra al portal correcto
      if (portal === "ADMIN" && dbRole !== "ADMIN") {
        await supabase.auth.signOut();
        throw new Error("Acceso denegado. Se requieren permisos de Administrador.");
      }

      if (portal === "BARBERO" && dbRole !== "BARBER" && dbRole !== "ADMIN") {
        await supabase.auth.signOut();
        throw new Error("Acceso denegado. Esta cuenta no pertenece al Staff.");
      }

      // 4. 🚀 Redirección según RUTA REAL
      if (dbRole === "ADMIN") {
        router.push("/dashboards/admin");
      } else if (dbRole === "BARBER") {
        router.push("/dashboards/barber");
      } else {
        router.push("/dashboards/client/book"); // Tu ruta corregida
      }
      
      router.refresh();

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const PORTALS = [
    {
      id: "CLIENTE" as PortalType,
      title: "Portal Cliente",
      desc: "Agenda tus horas, revisa tus puntos VIP y accede a beneficios exclusivos.",
      icon: <UserCircle2 size={36} />,
      btnText: "INGRESAR AL PORTAL",
      glow: "bg-amber-500/10"
    },
    {
      id: "BARBERO" as PortalType,
      title: "Staff Barberos",
      desc: "Gestión de agenda personal, control de comisiones y flujo de caja diario.",
      icon: <Scissors size={36} />,
      btnText: "INGRESAR A ESTACIÓN",
      glow: "bg-zinc-500/10"
    },
    {
      id: "ADMIN" as PortalType,
      title: "Administración",
      desc: "Control total de la plataforma, inventario de tienda y gestión de personal.",
      icon: <Lock size={36} />,
      btnText: "ACCESO SISTEMA",
      glow: "bg-red-500/10"
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 relative overflow-hidden flex flex-col items-center justify-center p-6">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-amber-600/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-zinc-600/5 blur-[120px] pointer-events-none"></div>

      <div className="absolute top-8 left-8 z-20">
        <Link href="/" className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-amber-500 hover:text-white transition-all group">
          <ArrowLeft size={16} className="group-hover:-translate-x-2 transition-transform" />
          Volver al Inicio
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {!portal ? (
          /* PANTALLA DE SELECCIÓN */
          <motion.div 
            key="selection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center"
          >
            <div className="text-center mb-16">
              <span className="text-amber-500 font-black text-[10px] uppercase tracking-[0.5em] mb-4 block">Emperador System v2.0</span>
              <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4 font-serif italic">
                CONTROL DE <span className="text-amber-500">ACCESO</span>
              </h1>
              <p className="text-zinc-500 text-lg font-medium">Selecciona tu credencial para ingresar</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full px-4">
              {PORTALS.map((p) => (
                <motion.div 
                  key={p.id}
                  whileHover={{ y: -10 }}
                  onClick={() => setPortal(p.id)}
                  className="relative flex flex-col items-center p-10 bg-zinc-950 border border-zinc-900 rounded-[2.5rem] hover:border-amber-500/50 transition-all duration-500 cursor-pointer group shadow-2xl overflow-hidden"
                >
                  <div className={`absolute inset-0 ${p.glow} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                  <div className="relative z-10 w-24 h-24 rounded-3xl bg-black border border-zinc-800 flex items-center justify-center mb-8 text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all duration-500 shadow-xl">
                    {p.icon}
                  </div>
                  <h2 className="relative z-10 text-2xl font-black text-white mb-4 uppercase tracking-tight">{p.title}</h2>
                  <p className="relative z-10 text-zinc-500 text-center text-sm mb-10 leading-relaxed font-medium">{p.desc}</p>
                  <div className="relative z-10 mt-auto w-full py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-center text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] group-hover:bg-white group-hover:text-black group-hover:border-white transition-all flex items-center justify-center gap-2">
                    {p.btnText} <ChevronRight size={14} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* FORMULARIO DE LOGIN */
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-[3rem] p-10 md:p-12 shadow-2xl"
          >
            <button 
              onClick={() => {setPortal(null); setError(null);}}
              className="mb-10 flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-amber-500 transition-all uppercase tracking-widest bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800"
            >
              <ArrowLeft size={14} /> Cambiar Portal
            </button>

            <div className="text-center mb-10">
              <h2 className="text-4xl font-serif font-black text-white uppercase tracking-tighter leading-none mb-3">
                {portal} <span className="text-amber-500">LOGIN</span>
              </h2>
              <p className="text-zinc-500 text-sm font-medium">Introduce tus credenciales imperiales</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full bg-[#080808] border border-zinc-800 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-amber-500 transition-all"
                  placeholder="ejemplo@emperador.cl"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full bg-[#080808] border border-zinc-800 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-amber-500 transition-all"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-amber-500 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs p-4 rounded-2xl text-center font-bold flex items-center justify-center gap-2"
                >
                  <ShieldAlert size={16} /> {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-white text-black font-black uppercase tracking-[0.2em] text-xs py-6 rounded-2xl transition-all flex justify-center items-center hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-[0_20px_40px_rgba(217,119,6,0.3)]"
              >
                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "ACCEDER AHORA"}
              </button>
            </form>

            <div className="mt-10 text-center space-y-4">
              {portal === "CLIENTE" && (
                <p className="text-sm text-zinc-500 font-medium">
                  ¿No tienes cuenta? {" "}
                  <Link href="/register" className="text-amber-500 hover:text-white font-black transition-colors underline underline-offset-4">
                    Regístrate aquí
                  </Link>
                </p>
              )}
              {/* FIX: Se eliminó el atributo size="sm" que causaba el error de TS */}
              <Link href="/forgot-password" className="text-[10px] text-zinc-600 hover:text-amber-500 uppercase font-black tracking-widest transition-colors block">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Exportación Maestra con Suspense (Crucial para Next.js App Router)
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-amber-500">
        <Loader2 className="animate-spin h-10 w-10 mb-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.5em]">Cargando Sistema...</span>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}