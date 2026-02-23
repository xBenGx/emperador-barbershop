"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence, Variants } from "framer-motion";
import { 
  Gamepad2, MapPin, Instagram, ChevronRight, 
  Crown, Star, Scissors, Zap, Flame, Crosshair,
  Minus, Plus, CheckCircle, ShieldCheck, Play, 
  MessageSquare, Heart, MessageCircle, ExternalLink, 
  Lock, LayoutGrid, Clapperboard, Droplets, Sparkles, Wand2
} from "lucide-react";

// ============================================================================
// DATA MAESTRA (Extendida con TODOS los servicios del negocio)
// ============================================================================
const TEAM = [
  { id: "cesar", name: "Cesar Luna", role: "Master Barber", tag: "El Arquitecto", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop" },
  { id: "jack", name: "Jack Guerra", role: "Fade Specialist", tag: "Rey del Fade", img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop" },
  { id: "jhonn", name: "Jhonn Prado", role: "Beard Expert", tag: "Precisión", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop" },
  { id: "marcos", name: "Marcos Peña", role: "Senior Barber", tag: "Versatilidad", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop" },
];

const SERVICES = [
  { name: "Corte Clásico / Degradado", time: "1 hrs", price: "$12.000", desc: "El corte que define tu estilo. Clean, fresh, de líneas perfectas.", icon: <Scissors size={24} /> },
  { name: "Corte + Perfilado de Cejas", time: "1 hrs", price: "$14.000", desc: "Sube de nivel tu mirada. Detalles quirúrgicos que marcan la diferencia.", icon: <Crosshair size={24} /> },
  { name: "Barba + Vapor Caliente", time: "30 min", price: "$7.000", desc: "Afeitado VIP. Abrimos los poros para un acabado de seda y cero irritación.", icon: <Flame size={24} /> },
  { name: "Corte + Barba + Lavado GRATIS", time: "1h 5m", price: "$17.000", desc: "El combo indispensable para salir listo directo al fin de semana.", icon: <Zap size={24} /> },
  { name: "Limpieza Facial + Vapor", time: "25 min", price: "$10.000", desc: "Skin care masculino. Vapor, extracción de impurezas y mascarilla.", icon: <Sparkles size={24} /> },
  { name: "Corte + Barba + Cejas + Lavado", time: "1h 15m", price: "$20.000", desc: "Mantenimiento total. Renovación completa en una sola sesión.", icon: <Crown size={24} /> },
  { name: "Servicio Emperador VIP", time: "1h 30m", price: "$35.000", desc: "La experiencia definitiva. Trato de realeza garantizado.", icon: <Star size={24} /> },
  { name: "Perfilado de Cejas", time: "5 min", price: "$3.000", desc: "Limpieza rápida y definición de contornos.", icon: <Crosshair size={24} /> },
  { name: "Lavado de Cabello", time: "5 min", price: "$3.000", desc: "Lavado profundo con productos premium.", icon: <Droplets size={24} /> },
  { name: "Diseño / Hair Tattoo", time: "15 min", price: "$4.000", desc: "Líneas, tribales o diseños exclusivos a navaja.", icon: <Wand2 size={24} /> },
  { name: "Visos + Corte + Cejas", time: "4 hrs", price: "$70.000", desc: "Iluminación de cabello profesional más perfilado completo.", icon: <Zap size={24} /> },
  { name: "Platinado + Corte + Cejas", time: "5 hrs", price: "$90.000", desc: "Decoloración global nivel platino. Transformación extrema.", icon: <Flame size={24} /> },
];

const REVIEWS = [
  { name: "Matías R.", text: "El mejor fade de Curicó. Mientras esperaba jugué una partida de PS5. Servicio 10/10.", rating: 5 },
  { name: "Carlos D.", text: "Atención de primer nivel. Cesar es un artista con la tijera. El local tiene muchísimo flow.", rating: 5 },
  { name: "Andrés M.", text: "Ritual de barba con vapor increíble. Salí renovado. Los cabros tienen un talento brutal.", rating: 5 },
];

const FAQS = [
  { q: "¿Necesito cuenta para reservar?", a: "No, en Emperador valoramos tu tiempo. Puedes agendar como invitado en menos de 1 minuto ingresando solo tu nombre y número." },
  { q: "¿El uso de PS5 tiene costo?", a: "Para nada. PS5 y la mesa de Pool son un beneficio exclusivo y 100% gratuito para nuestros clientes mientras esperan." },
  { q: "¿Qué métodos de pago aceptan?", a: "Para tu comodidad, aceptamos Efectivo, Transferencia Electrónica y todas las tarjetas de Débito/Crédito vía Transbank." },
];

// FEED MOCK DE INSTAGRAM REALISTA (Formato Reels y Posts)
const INSTA_REELS = [
  { id: 1, likes: "12.4k", comments: "145", type: "reel", img: "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=600&auto=format&fit=crop" },
  { id: 2, likes: "8.2k", comments: "98", type: "post", img: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=600&auto=format&fit=crop" },
  { id: 3, likes: "15.1k", comments: "230", type: "reel", img: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=600&auto=format&fit=crop" },
  { id: 4, likes: "20.5k", comments: "314", type: "reel", img: "https://images.unsplash.com/photo-1620331311520-246422fd82f9?q=80&w=600&auto=format&fit=crop" },
  { id: 5, likes: "3.1k", comments: "89", type: "post", img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600&auto=format&fit=crop" },
  { id: 6, likes: "5.4k", comments: "112", type: "reel", img: "https://images.unsplash.com/photo-1534180477871-5d6cc81f3920?q=80&w=600&auto=format&fit=crop" },
];

// ============================================================================
// ANIMACIONES 
// ============================================================================
const popUp: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerFast: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

// ============================================================================
// COMPONENTES LÓGICOS
// ============================================================================

const FAQItem = ({ faq, index }: { faq: any, index: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <motion.div variants={fadeUp} className="border-b border-zinc-800">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-8 flex justify-between items-center text-left transition-colors hover:text-amber-500 group"
      >
        <span className="text-xl md:text-2xl font-black uppercase tracking-tighter">{faq.q}</span>
        <div className={`p-3 rounded-full transition-all duration-300 ${isOpen ? 'bg-amber-500 text-black rotate-180' : 'bg-zinc-900 text-amber-500 group-hover:bg-zinc-800'}`}>
          {isOpen ? <Minus size={20} /> : <Plus size={20} />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-8 text-zinc-400 font-medium text-lg leading-relaxed border-l-2 border-amber-500 pl-4 ml-2">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// VISTA PRINCIPAL (Landing Page Urbana & Premium)
// ============================================================================

export default function UltimateEmperadorLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("reels");
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 800], [0, 250]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="bg-[#050505] min-h-screen font-sans selection:bg-amber-500 selection:text-black overflow-x-hidden relative">
      
      {/* GLOBAL BACKGROUND: Ruido visual, Grid oscuro y Orbes animados para vibra Streetwear/Premium */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      {/* Animación de luces de fondo (Glow) */}
      <div className="fixed top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-amber-600/5 blur-[120px] pointer-events-none z-0 mix-blend-screen animate-pulse duration-1000"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-orange-600/5 blur-[120px] pointer-events-none z-0 mix-blend-screen"></div>

      {/* 1. NAVBAR PREMIUM CON LOGO CUSTOM */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? "py-3 bg-[#050505]/90 backdrop-blur-2xl border-b border-amber-500/20 shadow-[0_10px_40px_-10px_rgba(217,119,6,0.15)]" : "py-8 bg-transparent"}`}>
        <div className="max-w-[1400px] mx-auto px-6 flex justify-between items-center relative z-10">
          <Link href="/" className="flex items-center gap-4 group">
            {/* LOGO CUSTOM EN NAVBAR */}
            <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden border border-amber-500/30 group-hover:border-amber-500 transition-all duration-500 shadow-[0_0_15px_rgba(217,119,6,0.2)] group-hover:shadow-[0_0_25px_rgba(217,119,6,0.6)]">
              <Image src="/logo.png" alt="Emperador Logo" fill sizes="(max-width: 768px) 48px, 64px" className="object-cover" priority />
            </div>
            <div className="hidden sm:flex flex-col">
               <span className="font-serif font-black text-2xl tracking-tighter text-white uppercase leading-none drop-shadow-md">Emperador</span>
               <span className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.3em] mt-1">Barber Shop</span>
            </div>
          </Link>
          
          <div className="hidden lg:flex gap-10 text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em]">
            <Link href="#flow" className="hover:text-amber-500 hover:-translate-y-1 transition-all">VIP Room</Link>
            <Link href="#servicios" className="hover:text-amber-500 hover:-translate-y-1 transition-all">Servicios</Link>
            <Link href="#squad" className="hover:text-amber-500 hover:-translate-y-1 transition-all">El Squad</Link>
            <Link href="#instagram" className="hover:text-amber-500 hover:-translate-y-1 transition-all">Social</Link>
          </div>
          
          <Link href="/reservar" className="relative group px-8 py-3.5 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-xs overflow-hidden rounded-lg hover:scale-105 transition-all shadow-[0_0_20px_rgba(217,119,6,0.4)] active:scale-95">
             <span className="relative z-10 flex items-center gap-2">Agendar <Zap size={14} className="group-hover:animate-bounce" /></span>
             <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-0" />
          </Link>
        </div>
      </nav>

      {/* 2. HERO HYPE SECTION (Impacto visual máximo) */}
      <section className="relative h-[100svh] flex items-center justify-center overflow-hidden bg-black">
        <motion.div style={{ y: yHero }} className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=2070&auto=format&fit=crop" 
            alt="Barbería Emperador" fill priority className="object-cover grayscale contrast-125 opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent mix-blend-overlay" />
        </motion.div>

        <div className="relative z-10 w-full max-w-[1400px] px-6 text-center mt-24">
          <motion.div initial="hidden" animate="visible" variants={staggerFast}>
            <motion.div variants={popUp} className="mb-6 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/50 px-6 py-2 rounded-full text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-[0.4em] shadow-[0_0_20px_rgba(217,119,6,0.2)] backdrop-blur-md">
              <MapPin size={14} /> Peña 666, Piso 2 • Curicó
            </motion.div>
            
            <motion.h1 variants={popUp} className="text-[15vw] lg:text-[13rem] font-serif font-black text-white leading-[0.8] tracking-tighter uppercase mb-6 drop-shadow-2xl flex flex-col items-center">
              <span>TRUE</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-700">HUSTLE.</span>
            </motion.h1>
            
            <motion.p variants={popUp} className="text-zinc-300 text-lg md:text-2xl font-medium max-w-2xl mx-auto mb-12 drop-shadow-md">
              El respeto se gana. El estilo se elige. Disfruta de la mejor experiencia de grooming, PS5 y Pool en la ciudad.
            </motion.p>
            
            <motion.div variants={popUp} className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full">
              <Link href="/reservar" className="w-full sm:w-auto px-12 py-5 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-sm hover:bg-white transition-all shadow-[0_0_30px_rgba(217,119,6,0.4)] flex items-center justify-center gap-3 rounded-xl">
                Asegura tu Trono <ChevronRight size={20} />
              </Link>
              <a href="#instagram" className="w-full sm:w-auto px-8 py-5 border border-zinc-700 bg-zinc-900/50 backdrop-blur-sm text-white font-black uppercase tracking-[0.2em] text-sm hover:border-amber-500 hover:text-amber-500 transition-all flex items-center justify-center gap-3 rounded-xl">
                <Instagram size={20} /> Ver Trabajos
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 3. INFINITE TICKER (Energía Street) */}
      <div className="w-full bg-amber-500 py-4 overflow-hidden border-y border-amber-400 flex relative z-20 shadow-[0_0_40px_rgba(217,119,6,0.3)]">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, ease: "linear", duration: 15 }} className="flex whitespace-nowrap items-center gap-12 text-black font-black uppercase tracking-[0.2em] text-lg md:text-xl">
          {[...Array(10)].map((_, i) => (
            <React.Fragment key={i}>
              <span>VIP Room</span> <Star size={20} fill="black" />
              <span>PS5 Libre</span> <Gamepad2 size={20} fill="black" />
              <span>Mesa de Pool</span> <Crown size={20} fill="black" />
              <span>Fades Premium</span> <Scissors size={20} fill="black" />
            </React.Fragment>
          ))}
        </motion.div>
      </div>

      {/* 4. THE VIBE (Instalaciones VIP) */}
      <section id="flow" className="py-32 relative">
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerFast}>
            <motion.h2 variants={fadeUp} className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">El Club Privado</motion.h2>
            <motion.h3 variants={fadeUp} className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter leading-[0.9] mb-8">
              EL VIP ES <br /> <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-500 to-zinc-800">PARA TODOS.</span>
            </motion.h3>
            <motion.p variants={fadeUp} className="text-zinc-400 text-lg md:text-xl font-medium leading-relaxed mb-12 max-w-lg">
              La espera aburrida es del pasado. Hemos transformado el segundo piso en un santuario. Llega temprano, es un privilegio.
            </motion.p>
            <motion.div variants={fadeUp} className="space-y-6">
              <div className="flex items-center gap-6 p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-3xl hover:border-amber-500/50 transition-colors group">
                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-amber-500 shrink-0 shadow-[inset_0_0_20px_rgba(217,119,6,0.1)] group-hover:shadow-[inset_0_0_20px_rgba(217,119,6,0.3)] transition-all"><Gamepad2 size={32} /></div>
                <div><h4 className="text-white font-black text-xl uppercase tracking-tight">PlayStation 5 Libre</h4><p className="text-zinc-500 text-sm font-medium mt-1">Últimos títulos. Juega mientras esperas.</p></div>
              </div>
              <div className="flex items-center gap-6 p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-3xl hover:border-amber-500/50 transition-colors group">
                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-amber-500 shrink-0 shadow-[inset_0_0_20px_rgba(217,119,6,0.1)] group-hover:shadow-[inset_0_0_20px_rgba(217,119,6,0.3)] transition-all"><Crown size={32} /></div>
                <div><h4 className="text-white font-black text-xl uppercase tracking-tight">Mesa de Pool Premium</h4><p className="text-zinc-500 text-sm font-medium mt-1">Desafía a tus panas. 100% gratuita.</p></div>
              </div>
            </motion.div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} className="relative h-[700px] w-full group">
            <div className="absolute inset-0 bg-amber-500 translate-x-4 translate-y-4 rounded-[3rem] opacity-20 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-500" />
            <div className="relative h-full w-full rounded-[3rem] overflow-hidden border border-zinc-800 shadow-2xl">
               <Image src="https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop" fill alt="PS5 Experience" className="object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. INSTAGRAM SHOWCASE REALISTA (EL MURO) */}
      <section id="instagram" className="py-32 bg-black border-y border-zinc-900 relative overflow-hidden">
         {/* Fondo glow para destacar la sección social */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1200px] h-[500px] bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
         
         <div className="max-w-[1000px] mx-auto px-6 relative z-10">
            {/* Header del Perfil Realista */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 p-8 md:p-12 bg-zinc-950/80 border border-zinc-800/80 rounded-[3rem] backdrop-blur-xl shadow-2xl">
               {/* Avatar con anillo de "Historia" de Instagram */}
               <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 animate-spin-slow"></div>
                  <div className="absolute inset-1 rounded-full bg-black flex items-center justify-center overflow-hidden border-[3px] border-black">
                     <Image src="/logo.png" alt="Emperador Logo Instagram" width={150} height={150} className="object-cover" />
                  </div>
               </div>
               
               <div className="flex-1 text-center md:text-left w-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-6">
                     <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
                       emperador_barbershop 
                       <CheckCircle size={20} className="text-blue-500 fill-blue-500/20" />
                     </h3>
                     <div className="flex gap-2 justify-center">
                       <a href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer" className="px-8 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center">
                          Seguir
                       </a>
                       <a href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center">
                          <ExternalLink size={18} />
                       </a>
                     </div>
                  </div>
                  
                  <div className="flex justify-center md:justify-start gap-8 text-white mb-6 border-y border-zinc-800/50 py-4 md:border-0 md:py-0">
                     <span className="font-medium text-sm md:text-base"><strong className="font-black text-lg">849</strong> posts</span>
                     <span className="font-medium text-sm md:text-base"><strong className="font-black text-lg">12.5k</strong> followers</span>
                     <span className="font-medium text-sm md:text-base"><strong className="font-black text-lg">120</strong> following</span>
                  </div>
                  
                  <div className="text-zinc-300 font-medium text-sm md:text-base leading-relaxed max-w-lg mx-auto md:mx-0">
                     <p className="font-bold text-white mb-1">Emperador BarberShop</p>
                     Barbería Premium en Curicó 💈<br/>
                     ✂️ Fades & Grooming de Alto Nivel<br/>
                     🎮 PS5 & Pool Room VIP<br/>
                     📍 Peña 666, Piso 2 (Costado Falabella)<br/>
                     <a href="/reservar" className="text-blue-400 font-bold hover:underline mt-2 inline-block">🔗 Agenda tu cita aquí</a>
                  </div>
               </div>
            </motion.div>

            {/* Pestañas (Posts / Reels) */}
            <div className="flex justify-center border-b border-zinc-800 mb-8 gap-12">
               <button onClick={() => setActiveTab('reels')} className={`flex items-center gap-2 pb-4 font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'reels' ? 'text-white border-b-2 border-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
                 <Clapperboard size={16} /> Reels
               </button>
               <button onClick={() => setActiveTab('posts')} className={`flex items-center gap-2 pb-4 font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'posts' ? 'text-white border-b-2 border-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
                 <LayoutGrid size={16} /> Posts
               </button>
            </div>

            {/* Grilla de Contenido Interactiva */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerFast} className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-4">
               {INSTA_REELS.filter(item => activeTab === 'reels' ? true : item.type === 'post').map((post) => (
                  <motion.a 
                    key={post.id} href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer"
                    variants={popUp}
                    className="group relative aspect-[9/16] bg-zinc-900 overflow-hidden cursor-pointer md:rounded-2xl"
                  >
                     <Image src={post.img} fill alt="Instagram Content" className="object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                     
                     {/* Icono indicador en la esquina */}
                     <div className="absolute top-3 right-3 text-white drop-shadow-md">
                        {post.type === 'reel' ? <Clapperboard size={20} fill="currentColor" /> : <LayoutGrid size={20} fill="currentColor" />}
                     </div>

                     {/* Capa de Hover estilo IG */}
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                        <div className="flex gap-6">
                           <div className="flex items-center gap-2 text-white font-bold text-xl"><Heart fill="currentColor" size={28} /> {post.likes}</div>
                           <div className="flex items-center gap-2 text-white font-bold text-xl"><MessageCircle fill="currentColor" size={28} /> {post.comments}</div>
                        </div>
                     </div>
                  </motion.a>
               ))}
            </motion.div>
         </div>
      </section>

      {/* 6. SERVICES GRID EXTENDIDO */}
      <section id="servicios" className="py-32 bg-zinc-950 border-y border-zinc-900 relative">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
             <div>
               <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">El Menú Completo</h2>
               <h3 className="text-6xl md:text-9xl font-serif font-black text-white uppercase tracking-tighter leading-none">SERVICIOS.</h3>
             </div>
             <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs border-l-2 border-amber-500 pl-6 max-w-sm">
               Técnicas de vanguardia y productos premium para garantizar un resultado de nivel imperial.
             </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {SERVICES.map((s, i) => (
               <motion.div 
                 key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={popUp}
                 className="group p-8 bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] hover:bg-zinc-900 hover:border-amber-500 transition-all duration-500 flex flex-col justify-between"
               >
                  <div>
                    <div className="w-14 h-14 bg-black border border-zinc-800 rounded-2xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-colors mb-6 shadow-lg">
                      {s.icon}
                    </div>
                    <h4 className="text-xl font-black text-white uppercase mb-3 leading-tight group-hover:text-amber-500 transition-colors line-clamp-2">{s.name}</h4>
                    <p className="text-zinc-500 font-medium mb-8 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-end pt-6 border-t border-zinc-800 mb-6">
                      <div>
                        <span className="block text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">{s.time}</span>
                        <span className="text-3xl font-black text-amber-500 tracking-tighter">{s.price}</span>
                      </div>
                    </div>
                    <Link href="/reservar" className="w-full py-4 bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-xl flex justify-center items-center gap-2 group-hover:bg-white group-hover:text-black transition-colors border border-zinc-800">
                       Seleccionar <ChevronRight size={14} />
                    </Link>
                  </div>
               </motion.div>
             ))}
          </div>
        </div>
      </section>

      {/* 7. THE SQUAD (PERSONAJES) */}
      <section id="squad" className="py-32 bg-[#050505]">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">Conoce a los Maestros</h2>
            <h3 className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter leading-none">THE SQUAD.</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {TEAM.map((t, i) => (
              <motion.div 
                key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={popUp}
                className="group relative h-[500px] md:h-[600px] rounded-[3rem] overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer shadow-2xl"
              >
                <Image src={t.img} fill alt={t.name} className="object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />
                
                <div className="absolute top-6 left-6"><span className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-lg shadow-lg">{t.tag}</span></div>
                
                <div className="absolute bottom-8 left-8 right-8">
                  <h4 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-1">{t.name}</h4>
                  <p className="text-amber-500 font-bold uppercase text-[10px] tracking-[0.3em] mb-6">{t.role}</p>
                  
                  <div className="overflow-hidden">
                     <Link href={`/reservar?barber=${t.id}`} className="w-full py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl flex justify-center items-center gap-2 opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-amber-500 shadow-xl">
                       Reservar con él <Zap size={14} fill="currentColor" />
                     </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. REVIEWS & TRUST */}
      <section className="py-32 bg-zinc-900/30 border-t border-zinc-900">
        <div className="max-w-[1400px] mx-auto px-6">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {REVIEWS.map((r, i) => (
                <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" className="p-10 bg-zinc-950 border border-zinc-800 rounded-[2.5rem] relative overflow-hidden group hover:border-amber-500 transition-colors shadow-xl">
                   <div className="absolute -top-6 -right-6 text-zinc-900 group-hover:text-amber-500/10 transition-colors"><MessageSquare size={120} /></div>
                   <div className="flex gap-1 mb-6 text-amber-500 relative z-10">
                     {[...Array(r.rating)].map((_, j) => <Star key={j} size={16} fill="currentColor" />)}
                   </div>
                   <p className="text-white text-lg md:text-xl font-medium leading-relaxed italic mb-8 relative z-10">"{r.text}"</p>
                   <div className="flex items-center gap-4 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-amber-500 font-black text-xs border border-zinc-700">{r.name[0]}</div>
                      <span className="text-zinc-400 font-black uppercase text-[10px] tracking-widest">{r.name}</span>
                   </div>
                </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* 9. FAQ ACCORDION */}
      <section id="faq" className="py-32 bg-zinc-950 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
             <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">Resolviendo Dudas</h2>
             <h3 className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter">AYUDA.</h3>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, i) => <FAQItem key={i} faq={faq} index={i} />)}
          </div>
        </div>
      </section>

      {/* 10. CTA FINAL & FOOTER ADMINISTRATIVO */}
      <footer className="bg-black pt-32 pb-12 px-6 border-t border-zinc-900 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="max-w-[1400px] mx-auto text-center mb-32 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={popUp}>
            {/* LOGO CUSTOM EN FOOTER */}
            <div className="mx-auto w-24 h-24 md:w-32 md:h-32 mb-12 rounded-full overflow-hidden border-2 border-amber-500 shadow-[0_0_50px_rgba(217,119,6,0.5)] relative bg-zinc-950 p-1">
               <div className="relative w-full h-full rounded-full overflow-hidden">
                 <Image src="/logo.png" alt="Emperador Logo Final" fill className="object-cover" />
               </div>
            </div>
            
            <h2 className="text-6xl md:text-[8rem] lg:text-[11rem] font-serif font-black text-white leading-[0.8] tracking-tighter uppercase mb-12 drop-shadow-2xl">
              DOMINA EL <br /> <span className="text-amber-500">TRONO.</span>
            </h2>
            <Link href="/reservar" className="px-12 md:px-20 py-6 md:py-8 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-sm md:text-lg rounded-2xl hover:bg-white hover:scale-105 transition-all shadow-[0_0_50px_rgba(217,119,6,0.5)] inline-flex items-center gap-4">
              Agenda Tu Cita <CheckCircle size={28} />
            </Link>
          </motion.div>
        </div>

        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 border-t border-zinc-900 pt-20 mb-20 relative z-10">
           <div>
              <h4 className="text-white font-black text-2xl uppercase tracking-tighter mb-8 italic">Emperador</h4>
              <div className="space-y-4 text-zinc-400 font-bold uppercase text-[10px] tracking-[0.2em]">
                 <p className="flex items-center gap-3"><MapPin size={16} className="text-amber-500" /> Peña 666, Piso 2, Curicó</p>
                 <a href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-amber-500 transition-colors">
                    <Instagram size={16} className="text-amber-500" /> @emperador_barbershop
                 </a>
              </div>
           </div>
           
           <div>
              <h4 className="text-zinc-600 font-black uppercase text-xs tracking-widest mb-8">Horarios</h4>
              <ul className="text-white font-black text-sm uppercase tracking-tighter space-y-2">
                 <li className="flex justify-between border-b border-zinc-900 pb-3"><span>Lunes - Sábado</span> <span className="text-amber-500">10:00 - 20:00</span></li>
                 <li className="flex justify-between text-zinc-700 pt-3"><span>Domingo</span> <span>Cerrado</span></li>
              </ul>
           </div>
           
           {/* SECCIÓN ADMINISTRATIVA (DASHBOARD LOGIN) */}
           <div className="flex flex-col items-start md:items-end justify-between gap-8 md:gap-0">
              <div className="flex items-center gap-2 text-zinc-500"><ShieldCheck size={16} /> <span className="font-black uppercase text-[10px] tracking-widest">Reserva Segura sin Tarjeta</span></div>
              
              <div className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto">
                {/* BOTON DE LOGIN DESTACADO PARA STAFF */}
                <Link href="/login" className="w-full md:w-auto px-6 py-3 bg-zinc-900 border border-zinc-800 hover:border-amber-500 text-zinc-400 hover:text-white rounded-xl transition-all flex items-center justify-center md:justify-end gap-3 group">
                   <Lock size={14} className="group-hover:text-amber-500 transition-colors" /> 
                   <span className="font-black uppercase text-[10px] tracking-[0.2em]">Panel de Control</span>
                </Link>
                <p className="text-zinc-700 font-black uppercase text-[10px] tracking-[0.3em] mt-2">POWERED BY <a href="https://bayx.com" className="text-amber-700 hover:text-amber-500">BAYX</a></p>
              </div>
           </div>
        </div>
        
        {/* MARCA DE AGUA GIGANTE FINAL */}
        <div className="text-center text-zinc-900/40 font-black text-[15vw] uppercase leading-none select-none relative z-0 overflow-hidden">
           EMPERADOR
        </div>
      </footer>
    </main>
  );
}