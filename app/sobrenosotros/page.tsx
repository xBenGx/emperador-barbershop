"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
// IMPORTANTE: Importamos 'Variants' para solucionar el error de TypeScript
import { motion, Variants } from "framer-motion";
import { 
  Crown, Target, Eye, Award, Flame, Users, 
  Gamepad2, MapPin, Scissors, CheckCircle2, ChevronRight 
} from "lucide-react";

// ============================================================================
// ANIMACIONES IMPACTANTES CON TIPADO ESTRICTO (Solución al error)
// ============================================================================
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

const textReveal: Variants = {
  hidden: { opacity: 0, y: "100%" },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.33, 1, 0.68, 1] } }
};

const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } }
};

// ============================================================================
// DATOS DE VALORES
// ============================================================================
const CORE_VALUES = [
  {
    icon: <Crown size={32} />,
    title: "Trato de Realeza",
    desc: "Cada cliente que cruza nuestras puertas es el centro de atención. No eres un número más, eres el Emperador."
  },
  {
    icon: <Scissors size={32} />,
    title: "Maestría Técnica",
    desc: "Nuestros barberos están en constante formación. Dominamos desde los cortes clásicos hasta las tendencias más urbanas."
  },
  {
    icon: <Award size={32} />,
    title: "Calidad Premium",
    desc: "Solo trabajamos con las mejores marcas a nivel mundial. Productos testeados y aprobados por expertos."
  },
  {
    icon: <Users size={32} />,
    title: "Hermandad",
    desc: "Más que una barbería, somos un club. Un espacio donde puedes relajarte, conversar, jugar y ser tú mismo."
  }
];

// ============================================================================
// PÁGINA PRINCIPAL: SOBRE NOSOTROS
// ============================================================================
export default function SobreNosotros() {
  return (
    // FIX DE ESPACIO: Margen negativo para que la imagen de fondo suba y cubra detrás de la Navbar
    <main className="bg-[#050505] min-h-screen font-sans selection:bg-amber-500 selection:text-black overflow-x-hidden relative -mt-24 md:-mt-28">
      
      {/* FONDO GLOBAL DE CUADRÍCULA */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION (LA HISTORIA) */}
      {/* ========================================================================= */}
      <section className="relative min-h-[85vh] flex flex-col justify-center items-center overflow-hidden border-b border-zinc-900 pb-20">
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop"
            alt="Interior Barbería"
            fill
            className="object-cover opacity-20 grayscale contrast-125"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
        </div>

        {/* FIX DEL LOGO: Padding top masivo para que el texto arranque por debajo del logo gigante */}
        <div className="relative z-10 w-full max-w-[1400px] px-6 text-center pt-[220px] md:pt-[280px] lg:pt-[320px]">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-4xl mx-auto">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-5 py-1.5 border border-amber-500/50 text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] rounded-full mb-6 backdrop-blur-md bg-black/40 shadow-[0_0_20px_rgba(217,119,6,0.2)]">
              <Flame size={14} className="fill-amber-500" /> Forjando Reyes
            </motion.div>
            
            <div className="overflow-hidden mb-6">
              <motion.h1 variants={textReveal} className="text-5xl md:text-[6rem] lg:text-[7rem] font-serif font-black tracking-tighter uppercase leading-[0.9] drop-shadow-2xl text-white">
                LA HISTORIA DEL <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-700">
                  EMPERADOR
                </span>
              </motion.h1>
            </div>
            
            <motion.p variants={fadeUp} className="text-zinc-300 text-lg md:text-xl font-medium leading-relaxed drop-shadow-md">
              Emperador Barbershop no nació solo para cortar cabello. Nació de la necesidad de crear un verdadero santuario masculino en Curicó. Un lugar donde la espera dejó de ser aburrida para convertirse en el mejor momento de tu día.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. MISIÓN Y VISIÓN (TARJETAS DE ALTO IMPACTO) */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 py-24">
        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true, margin: "-100px" }} 
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12"
        >
          {/* Tarjeta Misión */}
          <motion.div variants={scaleUp} className="relative group rounded-[3rem] p-10 md:p-14 bg-zinc-900/40 border border-zinc-800 overflow-hidden hover:border-amber-500/50 transition-all duration-500 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-black border border-zinc-800 rounded-2xl flex items-center justify-center text-amber-500 mb-8 group-hover:scale-110 transition-transform shadow-xl">
                <Target size={32} />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-4">Nuestra Misión</h2>
              <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-medium">
                Elevar la confianza, la imagen y la actitud de cada hombre que se sienta en nuestros sillones. Nos comprometemos a entregar un servicio de grooming de precisión absoluta, utilizando herramientas de élite, en un ambiente que inspira respeto, camaradería y lujo urbano.
              </p>
            </div>
          </motion.div>

          {/* Tarjeta Visión */}
          <motion.div variants={scaleUp} className="relative group rounded-[3rem] p-10 md:p-14 bg-zinc-900/40 border border-zinc-800 overflow-hidden hover:border-amber-500/50 transition-all duration-500 shadow-2xl">
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-black border border-zinc-800 rounded-2xl flex items-center justify-center text-amber-500 mb-8 group-hover:scale-110 transition-transform shadow-xl">
                <Eye size={32} />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-4">Nuestra Visión</h2>
              <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-medium">
                Consolidarnos como el centro de estética masculina número uno y el santuario definitivo en la región del Maule. Queremos ser reconocidos no solo por la excelencia de nuestros cortes, sino por redefinir el concepto de ir a la barbería, convirtiéndolo en una experiencia integral insuperable.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* 3. EXPERIENCIA VIP / ENTRETENIMIENTO (Banner Inmersivo) */}
      {/* ========================================================================= */}
      <section className="relative w-full border-y border-zinc-900 overflow-hidden bg-black py-24 md:py-32">
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop"
            alt="PS5 Gaming"
            fill
            className="object-cover opacity-20 grayscale transition-all duration-1000 hover:grayscale-0 hover:opacity-30"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-1/2"
          >
            <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">Cuentas con entretenimiento</h2>
            <h3 className="text-5xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter leading-[0.9] mb-8">
              JUEGA Y RELÁJATE <br /> ES <span className="text-amber-500">TOTALMENTE GRATIS.</span>
            </h3>
            <p className="text-zinc-300 text-lg md:text-xl font-medium leading-relaxed mb-10">
              Sabemos que tu tiempo vale oro. Por eso, hemos equipado nuestro salón para que la espera sea tu momento favorito del día. Juega, compite y relájate sin costo adicional.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center gap-6 p-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-xl hover:border-amber-500/50 transition-colors">
                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-amber-500 shrink-0"><Gamepad2 size={32} /></div>
                <div>
                  <h4 className="text-white font-black text-xl uppercase tracking-tight">Play5 Libre</h4>
                  <p className="text-zinc-400 text-sm font-medium mt-1">Los mejores títulos a tu disposición.</p>
                </div>
              </div>
              <div className="flex items-center gap-6 p-6 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-xl hover:border-amber-500/50 transition-colors">
                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-amber-500 shrink-0"><Crown size={32} /></div>
                <div>
                  <h4 className="text-white font-black text-xl uppercase tracking-tight">Mesa de Pool VIP</h4>
                  <p className="text-zinc-400 text-sm font-medium mt-1">Reta a tus amigos mientras esperas tu turno.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. VALORES FUNDAMENTALES */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 py-24 md:py-32">
        <div className="text-center mb-16 md:mb-24">
          <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">Nuestros Pilares</h2>
          <h3 className="text-4xl md:text-6xl font-serif font-black text-white uppercase tracking-tighter">
            VALORES EMPERADOR
          </h3>
        </div>

        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true, margin: "-50px" }} 
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {CORE_VALUES.map((val, i) => (
            <motion.div 
              key={i} 
              variants={fadeUp} 
              whileHover={{ y: -10 }}
              className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-[2rem] hover:bg-zinc-900 hover:border-amber-500/50 transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-black border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:text-amber-500 group-hover:border-amber-500/50 transition-colors mb-6 shadow-lg">
                {val.icon}
              </div>
              <h4 className="text-xl font-black text-white uppercase mb-3 tracking-tight">{val.title}</h4>
              <p className="text-zinc-500 font-medium text-sm leading-relaxed">
                {val.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* 5. UBICACIÓN Y CTA FINAL */}
      {/* ========================================================================= */}
      <section className="relative border-t border-zinc-900 bg-zinc-950 py-24">
        <div className="max-w-[1000px] mx-auto px-6 text-center">
          <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(217,119,6,0.4)] relative">
            <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-20"></div>
            <MapPin size={40} className="text-black relative z-10" />
          </div>
          
          <h2 className="text-4xl md:text-6xl font-serif font-black text-white uppercase tracking-tighter mb-6">
            ESTAMOS EN EL <span className="text-amber-500">SEGUNDO PISO</span>
          </h2>
          
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 max-w-2xl mx-auto mb-12 shadow-2xl backdrop-blur-sm">
            <p className="text-xl md:text-3xl text-white font-black uppercase tracking-tight mb-2">
              Peña 666 📍
            </p>
            <p className="text-zinc-400 font-medium text-lg mb-4">
              Al lado del Banco Falabella, Segundo Piso.
            </p>
            <p className="text-amber-500 font-black uppercase tracking-widest text-xs">
              Curicó, Región del Maule, Chile
            </p>
          </div>

          <Link 
            href="/reservar" 
            className="inline-flex items-center justify-center gap-4 px-12 py-6 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-sm md:text-base rounded-2xl hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_20px_40px_-10px_rgba(217,119,6,0.5)] group w-full sm:w-auto"
          >
            AGENDA AQUÍ 👇 <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>
      </section>

    </main>
  );
}