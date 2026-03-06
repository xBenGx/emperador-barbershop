"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Loader2, ArrowLeft, UserCircle2, Lock, 
  Mail, Phone, Eye, EyeOff, ShieldAlert, CheckCircle2,
  Crown
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // Estados de Formulario
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Estados de UI
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // 1. Validaciones Locales
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      setIsLoading(false);
      return;
    }

    try {
      // 2. Registro en Supabase Auth pasando los Metadatos
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone,
          }
        }
      });

      if (authError) {
        throw new Error(authError.message === "User already registered" 
          ? "Este correo ya está registrado en el sistema." 
          : authError.message);
      }

      // 3. Éxito
      setIsSuccess(true);
      
      // Redirigir al portal del cliente
      setTimeout(() => {
        router.push("/dashboards/client/book");
      }, 2500);

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans relative overflow-hidden flex flex-col items-center justify-center p-6">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-amber-600/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-zinc-600/5 blur-[120px] pointer-events-none"></div>

      <div className="absolute top-8 left-8 z-20">
        <Link href="/login" className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-amber-500 transition-all group">
          <ArrowLeft size={16} className="group-hover:-translate-x-2 transition-transform" />
          Volver al Login
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-md bg-zinc-950 border border-amber-500/30 rounded-[3rem] p-12 shadow-[0_0_50px_rgba(217,119,6,0.15)] text-center"
          >
            <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-serif font-black text-white uppercase tracking-tighter mb-2">
              ¡Cuenta Creada!
            </h2>
            <p className="text-zinc-400 font-medium mb-8">
              Bienvenido al portal imperial. Tu perfil ha sido registrado con éxito.
            </p>
            <Loader2 className="animate-spin text-amber-500 mx-auto" size={32} />
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-4">Ingresando al sistema...</p>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-[3rem] p-8 md:p-12 shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
          >
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 mb-6 shadow-inner border border-amber-500/20">
                <Crown size={40} />
              </div>
              <h2 className="text-4xl font-serif font-black text-white uppercase tracking-tighter leading-none mb-3">
                CREAR <span className="text-amber-500">CUENTA</span>
              </h2>
              <p className="text-zinc-500 text-sm font-medium tracking-wide">Únete para agendar y acumular puntos</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Nombre */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Nombre Completo</label>
                <div className="relative">
                  <UserCircle2 className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#080808] border border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                    placeholder="Ej. Andrés Muñoz"
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">WhatsApp / Celular</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#080808] border border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              {/* Correo */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#080808] border border-zinc-800 rounded-2xl pl-14 pr-6 py-4 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>

              {/* Contraseñas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#080808] border border-zinc-800 rounded-2xl pl-10 pr-4 py-4 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner text-sm"
                      placeholder="Mín. 6 letras"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Repetir Clave</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#080808] border border-zinc-800 rounded-2xl pl-10 pr-10 py-4 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner text-sm"
                      placeholder="Repetir..."
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-amber-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mensaje de Error */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs p-4 rounded-2xl text-center font-bold flex items-center justify-center gap-2"
                  >
                    <ShieldAlert size={16} /> {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 bg-amber-500 hover:bg-white text-black font-black uppercase tracking-[0.2em] text-xs py-6 rounded-2xl transition-all flex justify-center items-center hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-[0_20px_40px_rgba(217,119,6,0.3)]"
              >
                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : "CREAR MI CUENTA"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-zinc-500 font-medium">
                ¿Ya tienes una cuenta? {" "}
                <Link href="/login" className="text-amber-500 hover:text-white font-black transition-colors underline underline-offset-4">
                  Inicia Sesión aquí
                </Link>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}