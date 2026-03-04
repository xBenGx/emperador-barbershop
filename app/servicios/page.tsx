"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import * as LucideIcons from "lucide-react"; 
import { 
  Scissors, Flame, Crosshair, Zap, Crown, Sparkles, 
  ChevronRight, Clock, Star, CheckCircle2, ShieldCheck,
  Gamepad2
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// ============================================================================
// TIPADOS
// ============================================================================
interface Service {
  id: string;
  name: string;
  desc: string;
  price: string;
  time: string;
  iconName: string;
}

// Fallback por si la base de datos está vacía
const FALLBACK_SERVICES: Service[] = [
  { id: "s1", name: "Corte Clásico / Degradado", time: "1 hrs", price: "$12.000", desc: "El corte que define tu estilo. Clean, fresh, de líneas perfectas.", iconName: "Scissors" },
  { id: "s2", name: "Corte + Perfilado de Cejas", time: "1 hrs", price: "$14.000", desc: "Sube de nivel tu mirada. Detalles quirúrgicos que marcan la diferencia.", iconName: "Crosshair" },
  { id: "s3", name: "Barba + Vapor Caliente", time: "30 min", price: "$7.000", desc: "Afeitado VIP. Abrimos los poros para un acabado de seda y cero irritación.", iconName: "Flame" },
  { id: "s4", name: "Corte + Barba + Lavado", time: "1h 5m", price: "$17.000", desc: "El combo indispensable para salir listo directo al fin de semana.", iconName: "Zap" },
  { id: "s5", name: "Limpieza Facial", time: "25 min", price: "$10.000", desc: "Skin care masculino. Vapor, extracción de impurezas y mascarilla.", iconName: "Sparkles" },
  { id: "s6", name: "Servicio Emperador VIP", time: "1h 30m", price: "$35.000", desc: "La experiencia definitiva. Trato de realeza garantizado con todo incluido.", iconName: "Crown" },
];

// Renderizador Dinámico de Iconos (lee el string de la BD y muestra el icono real)
const DynamicIcon = ({ name, size = 24 }: { name: string, size?: number }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Scissors;
  return <IconComponent size={size} />;
};

// ============================================================================
// ANIMACIONES
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

export default function ServiciosPage() {
  const supabase = createClient();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('Services')
          .select('*')
          .order('created_at', { ascending: true });

        if (data && data.length > 0) {
          setServices(data);
        } else {
          // Si no hay datos, mostramos el fallback para que la página nunca se vea vacía
          setServices(FALLBACK_SERVICES);
        }
      } catch (error) {
        console.error("Error cargando servicios:", error);
        setServices(FALLBACK_SERVICES);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, [supabase]);

  return (
    // FIX DE ESPACIO: Margen negativo para que la imagen suba hasta el borde superior tras la Navbar
    <main className="bg-[#050505] min-h-screen font-sans selection:bg-amber-500 selection:text-black overflow-x-hidden relative -mt-24 md:-mt-28">
      
      {/* FONDO GLOBAL DE CUADRÍCULA */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (MENÚ DE SERVICIOS) */}
      {/* ========================================================================= */}
      <section className="relative min-h-[65vh] flex flex-col justify-center items-center overflow-hidden border-b border-zinc-900 pb-20">
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=2000&auto=format&fit=crop"
            alt="Barbería Premium Servicios"
            fill
            className="object-cover opacity-20 grayscale contrast-125"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
        </div>

        {/* FIX DEL LOGO: Padding top masivo para que el texto arranque por debajo del logo gigante */}
        <div className="relative z-10 w-full max-w-[1400px] px-6 text-center pt-[200px] md:pt-[260px] lg:pt-[300px]">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-4xl mx-auto">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-5 py-1.5 border border-amber-500/50 text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] rounded-full mb-6 backdrop-blur-md bg-black/40 shadow-[0_0_20px_rgba(217,119,6,0.2)]">
              <Crown size={14} className="fill-amber-500" /> Grooming de Élite
            </motion.div>
            
            <div className="overflow-hidden mb-6">
              <motion.h1 variants={textReveal} className="text-5xl md:text-[6rem] lg:text-[7rem] font-serif font-black tracking-tighter uppercase leading-[0.9] drop-shadow-2xl text-white">
                NUESTROS <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-700">
                  SERVICIOS
                </span>
              </motion.h1>
            </div>
            
            <motion.p variants={fadeUp} className="text-zinc-300 text-lg md:text-xl font-medium leading-relaxed drop-shadow-md">
              La máxima expresión del cuidado masculino. Selecciona tu servicio, elige a tu Master Barber y prepárate para una experiencia sin igual.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. GRID DE SERVICIOS (Sincronizado con Supabase) */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 py-20 md:py-32">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-amber-500">
            <Scissors className="animate-spin-slow mb-4" size={40} />
            <span className="font-black uppercase tracking-widest text-xs animate-pulse">Afilando Navajas...</span>
          </div>
        ) : (
          <motion.div 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, margin: "-50px" }} 
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
          >
            {services.map((service, index) => (
              <motion.div 
                key={service.id || index} 
                variants={fadeUp} 
                whileHover={{ y: -10 }}
                className="group p-8 md:p-10 bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] hover:bg-zinc-900 hover:border-amber-500/50 transition-all duration-500 flex flex-col justify-between shadow-lg relative overflow-hidden"
              >
                {/* Resplandor interno sutil en hover */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors duration-500"></div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 bg-black border border-zinc-800 rounded-2xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-400 transition-colors shadow-lg duration-300">
                      <DynamicIcon name={service.iconName} size={28} />
                    </div>
                    <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-amber-500">
                      <Star size={12} fill="currentColor" />
                      <span className="text-[10px] font-black">TOP</span>
                    </div>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-4 leading-none group-hover:text-amber-500 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-zinc-400 font-medium text-sm md:text-base leading-relaxed mb-8">
                    {service.desc}
                  </p>
                </div>

                <div className="relative z-10 mt-auto">
                  <div className="flex justify-between items-end pt-6 border-t border-zinc-800/80 mb-8 group-hover:border-amber-500/30 transition-colors">
                    <div>
                      <span className="block text-[11px] text-zinc-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Clock size={12} /> Duración: {service.time}
                      </span>
                      <span className="text-4xl font-black text-amber-500 tracking-tighter">
                        {service.price}
                      </span>
                    </div>
                  </div>
                  
                  <Link 
                    href="/reservar" 
                    className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl flex justify-center items-center gap-2 group-hover:bg-amber-500 transition-colors shadow-xl active:scale-95"
                  >
                    Reservar Turno <ChevronRight size={16} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 3. EL RITUAL (VALOR AGREGADO) */}
      {/* ========================================================================= */}
      <section className="relative py-24 border-y border-zinc-900 bg-zinc-950 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] h-[300px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Texto */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
              <motion.h2 variants={fadeUp} className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">La Experiencia</motion.h2>
              <motion.h3 variants={fadeUp} className="text-4xl md:text-6xl font-serif font-black text-white uppercase tracking-tighter leading-[0.9] mb-6">
                TODO SERVICIO <br /> INCLUYE EL <span className="text-amber-500">RITUAL VIP.</span>
              </motion.h3>
              <motion.p variants={fadeUp} className="text-zinc-400 text-lg font-medium leading-relaxed mb-8">
                Al agendar cualquiera de nuestros servicios, no solo pagas por un corte. Pagas por tu acceso al club. Llega 30 minutos antes y disfruta de nuestras instalaciones sin costo extra.
              </motion.p>
              
              <motion.ul variants={staggerContainer} className="space-y-4">
                {[
                  "Acceso libre a PlayStation 5 con juegos actualizados.",
                  "Uso de Mesa de Pool profesional para ti y tus amigos.",
                  "Asesoría de imagen personalizada por Master Barbers.",
                  "Productos de acabado premium (Reuzel, Wahl) garantizados."
                ].map((item, i) => (
                  <motion.li key={i} variants={fadeUp} className="flex items-start gap-4">
                    <CheckCircle2 className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <span className="text-white font-medium">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            {/* Imagen Compuesta */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, x: 50 }} 
              whileInView={{ opacity: 1, scale: 1, x: 0 }} 
              viewport={{ once: true }} 
              transition={{ duration: 0.8 }}
              className="relative h-[400px] md:h-[600px] w-full rounded-[3rem] overflow-hidden border border-zinc-800 shadow-2xl group"
            >
              <Image 
                src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=2000&auto=format&fit=crop" 
                alt="Ritual Emperador" 
                fill 
                className="object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105" 
                unoptimized 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="bg-black/60 backdrop-blur-md border border-zinc-700 p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-white font-black uppercase tracking-widest text-sm mb-1">Zona VIP Activa</p>
                    <p className="text-amber-500 font-bold text-xs">Juega y Relájate</p>
                  </div>
                  <Gamepad2 className="text-white" size={32} />
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CTA FINAL */}
      {/* ========================================================================= */}
      <section className="relative py-32 bg-[#050505] text-center px-6">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter mb-6">
            ELIGE TU ESTILO. <br /> <span className="text-amber-500">DOMINA EL JUEGO.</span>
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl font-medium mb-12">
            Selecciona a tu barbero de confianza y asegura tu asiento en el trono de Emperador Barbershop.
          </p>
          <Link 
            href="/reservar" 
            className="inline-flex items-center justify-center gap-4 px-12 py-6 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-sm md:text-base rounded-2xl hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_20px_40px_-10px_rgba(217,119,6,0.5)] group w-full sm:w-auto"
          >
            AGENDAR MI CITA AHORA <Zap size={24} className="group-hover:animate-bounce fill-black" />
          </Link>
        </motion.div>
      </section>

    </main>
  );
}