"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  MapPin, Phone, Mail, Clock, Send, 
  CheckCircle2, MessageSquare, Instagram, ChevronRight
} from "lucide-react";

// ============================================================================
// ANIMACIONES IMPACTANTES
// ============================================================================
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const textReveal: Variants = {
  hidden: { opacity: 0, y: "100%" },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.33, 1, 0.68, 1] } }
};

// ============================================================================
// PÁGINA PRINCIPAL: CONTACTO
// ============================================================================
export default function ContactoPage() {
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulamos un envío de datos (Aquí podrías conectar a Supabase o una API de correos)
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({ name: "", phone: "", email: "", message: "" });
      
      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => setIsSubmitted(false), 5000);
    }, 2000);
  };

  return (
    // FIX DE ESPACIO: Margen negativo para que la imagen suba hasta el borde superior tras la Navbar
    <main className="bg-[#050505] min-h-screen font-sans selection:bg-amber-500 selection:text-black overflow-x-hidden relative -mt-24 md:-mt-28">
      
      {/* FONDO GLOBAL DE CUADRÍCULA */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative min-h-[60vh] flex flex-col justify-center items-center overflow-hidden border-b border-zinc-900 pb-20">
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1521590832167-7bfcfaa6362f?q=80&w=2070&auto=format&fit=crop"
            alt="Contacto Emperador Barbershop"
            fill
            className="object-cover opacity-20 grayscale contrast-125"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
        </div>

        {/* FIX DEL LOGO GIGANTE: Padding top masivo para que el texto no choque con la Navbar */}
        <div className="relative z-10 w-full max-w-[1400px] px-6 text-center pt-[220px] md:pt-[280px] lg:pt-[320px]">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-4xl mx-auto">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-5 py-1.5 border border-amber-500/50 text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] rounded-full mb-6 backdrop-blur-md bg-black/40 shadow-[0_0_20px_rgba(217,119,6,0.2)]">
              <MessageSquare size={14} className="fill-amber-500" /> Línea Directa
            </motion.div>
            
            <div className="overflow-hidden mb-6">
              <motion.h1 variants={textReveal} className="text-5xl md:text-[6rem] lg:text-[7rem] font-serif font-black tracking-tighter uppercase leading-[0.9] drop-shadow-2xl text-white">
                HABLA CON EL <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-700">
                  EMPERADOR
                </span>
              </motion.h1>
            </div>
            
            <motion.p variants={fadeUp} className="text-zinc-300 text-lg md:text-xl font-medium leading-relaxed drop-shadow-md">
              ¿Dudas sobre un servicio? ¿Quieres agendar para un grupo? ¿Consultas sobre productos? Estamos aquí para atenderte con el trato que mereces.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SECCIÓN PRINCIPAL (FORMULARIO E INFORMACIÓN) */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 py-20 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          
          {/* COLUMNA IZQUIERDA: INFORMACIÓN Y MAPA */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="flex flex-col gap-8">
            
            <div>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-4">Información de Contacto</motion.h2>
              <motion.p variants={fadeUp} className="text-zinc-400 font-medium mb-10">
                Visítanos en nuestra sucursal oficial o contáctanos a través de nuestros canales digitales. Respuestas rápidas garantizadas.
              </motion.p>
            </div>

            <div className="space-y-6">
              {/* Tarjeta Ubicación */}
              <motion.div variants={fadeUp} className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-[2rem] flex gap-6 hover:border-amber-500/50 transition-colors group">
                <div className="w-14 h-14 bg-black border border-zinc-800 rounded-2xl flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="text-white font-black uppercase tracking-tight mb-1 text-lg">Ubicación Oficial</h4>
                  <p className="text-zinc-400 font-medium">Peña 666, Segundo Piso.<br/>(Costado Banco Falabella)<br/>Curicó, Región del Maule.</p>
                </div>
              </motion.div>

              {/* Tarjeta Horarios */}
              <motion.div variants={fadeUp} className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-[2rem] flex gap-6 hover:border-amber-500/50 transition-colors group">
                <div className="w-14 h-14 bg-black border border-zinc-800 rounded-2xl flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                  <Clock size={24} />
                </div>
                <div className="w-full">
                  <h4 className="text-white font-black uppercase tracking-tight mb-2 text-lg">Horario de Atención</h4>
                  <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2 mb-2">
                    <span className="text-zinc-400 font-medium">Lunes - Sábado</span>
                    <span className="text-amber-500 font-black">10:00 - 20:00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-medium">Domingo</span>
                    <span className="text-zinc-600 font-black">Cerrado</span>
                  </div>
                </div>
              </motion.div>

              {/* Tarjetas Contacto Rápido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <motion.a variants={fadeUp} href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer" className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-zinc-900 hover:border-amber-500 transition-all group cursor-pointer text-center">
                  <div className="text-zinc-500 group-hover:text-amber-500 transition-colors"><Instagram size={32} /></div>
                  <div>
                    <h4 className="text-white font-black uppercase tracking-tight text-sm">Instagram</h4>
                    <p className="text-zinc-500 text-xs mt-1">@emperador_barbershop</p>
                  </div>
                </motion.a>
                
                <motion.a variants={fadeUp} href="mailto:contacto@emperador.cl" className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-zinc-900 hover:border-amber-500 transition-all group cursor-pointer text-center">
                  <div className="text-zinc-500 group-hover:text-amber-500 transition-colors"><Mail size={32} /></div>
                  <div>
                    <h4 className="text-white font-black uppercase tracking-tight text-sm">Correo Eléctronico</h4>
                    <p className="text-zinc-500 text-xs mt-1">contacto@emperador.cl</p>
                  </div>
                </motion.a>
              </div>
            </div>
          </motion.div>

          {/* COLUMNA DERECHA: FORMULARIO */}
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
              
              {/* Elemento decorativo del formulario */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none"></div>
              
              <h3 className="text-3xl font-serif font-black text-white uppercase tracking-tighter mb-2 relative z-10">Envíanos un Mensaje</h3>
              <p className="text-zinc-400 font-medium mb-10 relative z-10">Completa el formulario y nuestro equipo te contactará a la brevedad.</p>

              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Nombre Completo</label>
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: Matías Rojas"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Teléfono / WhatsApp</label>
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="+56 9 1234 5678"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Correo (Opcional)</label>
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="tu@correo.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Tu Mensaje</label>
                  <textarea 
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    placeholder="¿En qué te podemos ayudar hoy?"
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-colors resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting || isSubmitted}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex justify-center items-center gap-3 shadow-xl ${
                    isSubmitted 
                      ? "bg-green-500 text-black cursor-not-allowed" 
                      : isSubmitting
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-amber-500 text-black hover:bg-white hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  {isSubmitting ? (
                    "Enviando Mensaje..."
                  ) : isSubmitted ? (
                    <>Mensaje Enviado <CheckCircle2 size={20} /></>
                  ) : (
                    <>Enviar al Emperador <Send size={18} /></>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. MAPA INTERACTIVO (Google Maps Embebido con Filtro Oscuro) */}
      {/* ========================================================================= */}
      <section className="relative w-full h-[500px] border-y border-zinc-900 bg-zinc-950">
        {/* Usamos filtros CSS (grayscale, invert, contrast) para darle un aspecto dark mode al iframe de Google Maps */}
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3246.5244583803273!2d-71.2405!3d-34.985!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzTCsDU5JzA2LjAiUyA3McKwMTQnMjUuOCJX!5e0!3m2!1ses-419!2scl!4v1650000000000!5m2!1ses-419!2scl" 
          width="100%" 
          height="100%" 
          style={{ border: 0 }} 
          allowFullScreen={false} 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full object-cover filter grayscale contrast-125 invert opacity-80"
          title="Ubicación Emperador Barbershop Curicó"
        ></iframe>
        
        {/* Overlay para integrar el mapa al diseño */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#050505] via-transparent to-[#050505]"></div>
        
        {/* Tarjeta Flotante en el Mapa */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md border border-amber-500/30 p-6 rounded-3xl text-center shadow-[0_0_40px_rgba(217,119,6,0.3)]">
            <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(217,119,6,0.6)] animate-bounce">
              <MapPin size={24} className="text-black" />
            </div>
            <p className="text-white font-black uppercase tracking-tight text-lg">Peña 666</p>
            <p className="text-amber-500 font-bold text-xs uppercase tracking-widest">Segundo Piso</p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CTA FINAL DE RESERVA */}
      {/* ========================================================================= */}
      <section className="relative py-32 bg-[#050505] text-center px-6">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter mb-6">
            NO ESPERES MÁS. <br /> <span className="text-amber-500">HAZTE RESPETAR.</span>
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl font-medium mb-12">
            La silla del Emperador te está esperando. Agenda hoy y vive la experiencia VIP definitiva.
          </p>
          <Link 
            href="/reservar" 
            className="inline-flex items-center justify-center gap-4 px-12 py-6 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-sm md:text-base rounded-2xl hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_20px_40px_-10px_rgba(217,119,6,0.5)] group w-full sm:w-auto"
          >
            AGENDAR MI CITA AHORA <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
          </Link>
        </motion.div>
      </section>

    </main>
  );
}