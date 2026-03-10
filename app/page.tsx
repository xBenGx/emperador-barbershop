"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence, Variants } from "framer-motion";
import * as LucideIcons from "lucide-react"; 
import { 
  Gamepad2, MapPin, Instagram, ChevronRight, 
  Crown, Star, Scissors, Zap, Flame, Crosshair,
  Minus, Plus, CheckCircle, ShieldCheck, 
  MessageSquare, Heart, MessageCircle, ExternalLink, 
  Lock, LayoutGrid, Clapperboard, Sparkles,
  UserCircle, Briefcase, KeyRound, ShoppingCart, Volume2, VolumeX
} from "lucide-react";

import { createClient } from "@/utils/supabase/client";

// ============================================================================
// IMPORTACIÓN DE TU REPRODUCTOR DE MÚSICA GLOBAL
// ============================================================================
import MusicPlayer from "@/components/MusicPlayer";

// ============================================================================
// DATA MAESTRA (FALLBACKS Y TEXTOS POR DEFECTO PARA EL PANEL ADMIN)
// ============================================================================
const FALLBACK_PAGE_CONTENT = {
  hero_subtitle: "Peña 666, Piso 2 • Curicó",
  hero_title_1: "EMPERADOR",
  hero_title_2: "BARBERSHOP",
  hero_desc: "La barbería no es un trámite, es un ritual. Disfruta de la mejor experiencia de grooming, atención premium, PS5 y mesa de Pool.",
  hero_btn_1: "Asegura tu Trono",
  hero_btn_2: "Ver Trabajos",
  exp_tag: "La Experiencia",
  exp_title: "MÁS QUE UN CORTE, UN RITUAL.",
  exp_desc: "Nuestra administradora te cuenta por qué Emperador Barbershop ha redefinido el estándar de grooming masculino en Curicó. Atención premium, instalaciones de primer nivel y un resultado impecable garantizado.",
  team_tag: "Conoce a los Maestros",
  team_title: "TEAM EMPERADOR.",
  services_tag: "Lo Más Pedido",
  services_title: "SERVICIOS.",
  services_desc: "Técnicas de vanguardia y productos premium para garantizar un resultado de nivel imperial.",
  vip_tag: "El Club Privado",
  vip_title: "EL VIP ES PARA TODOS.",
  vip_desc: "La espera aburrida es del pasado. Hemos transformado nuestro salón en un santuario. Llega temprano a tu cita, es un privilegio.",
  salon_tag: "Instalaciones Premium",
  salon_title: "NUESTRO SALÓN.",
  faq_tag: "Resolviendo Dudas",
  faq_title: "AYUDA.",
  faq_desc: "Todo lo que necesitas saber antes de asegurar tu trono."
};

const FALLBACK_HERO_SLIDES = [
  { id: "brand1", type: "brand", media_type: "image", media_url: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=2000&auto=format&fit=crop" },
  { id: "promo1", type: "promo", title: "WAHL MAGIC CLIP", subtitle: "Edición Gold Cordless", tag: "NUEVO STOCK", media_type: "image", media_url: "https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=2000&auto=format&fit=crop" },
  { id: "brand2", type: "brand", media_type: "image", media_url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=2000&auto=format&fit=crop" },
  { id: "promo2", type: "promo", title: "POMADA REUZEL", subtitle: "Matte Clay Extreme", tag: "OFERTA DEL MES", media_type: "image", media_url: "https://images.unsplash.com/photo-1597354984706-fac992d9306f?q=80&w=2000&auto=format&fit=crop" }
];

const FALLBACK_TEAM = [
  { id: "cesar", name: "Cesar Luna", role: "Master Barber", tag: "El Arquitecto", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop" },
  { id: "jack", name: "Jack Guerra", role: "Fade Specialist", tag: "Rey del Fade", img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop" },
  { id: "jhonn", name: "Jhonn Prado", role: "Beard Expert", tag: "Precisión", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop" },
  { id: "marcos", name: "Marcos Peña", role: "Senior Barber", tag: "Versatilidad", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop" },
];

const FALLBACK_SERVICES = [
  { id: "s1", name: "Corte Clásico / Degradado", time: "45 min", duration: 45, price: "$12.000", desc: "El corte que define tu estilo. Clean, fresh, de líneas perfectas.", iconName: "Scissors" },
  { id: "s2", name: "Corte + Perfilado de Cejas", time: "1 hrs", duration: 60, price: "$14.000", desc: "Sube de nivel tu mirada. Detalles quirúrgicos que marcan la diferencia.", iconName: "Crosshair" },
  { id: "s3", name: "Barba + Vapor Caliente", time: "30 min", duration: 30, price: "$7.000", desc: "Afeitado VIP. Abrimos los poros para un acabado de seda y cero irritación.", iconName: "Flame" },
  { id: "s4", name: "Corte + Barba + Lavado", time: "1h 15m", duration: 75, price: "$17.000", desc: "El combo indispensable para salir listo directo al fin de semana.", iconName: "Zap" },
];

const FALLBACK_FAQS = [
  { id: "f1", q: "¿Necesito cuenta para reservar?", a: "No, en Emperador valoramos tu tiempo. Puedes agendar como invitado en menos de 1 minuto ingresando solo tu nombre y número." },
  { id: "f2", q: "¿El uso de PS5 tiene costo?", a: "Para nada. PS5 y la mesa de Pool son un beneficio exclusivo y 100% gratuito para nuestros clientes mientras esperan." },
  { id: "f3", q: "¿Qué métodos de pago aceptan?", a: "Para tu comodidad, aceptamos Efectivo, Transferencia Electrónica y todas las tarjetas de Débito/Crédito vía Transbank." },
  { id: "f4", q: "¿Puedo comprar productos online?", a: "Sí, contamos con una tienda integrada donde puedes adquirir ceras, pomadas y máquinas profesionales." },
];

// ============================================================================
// COMPONENTES REUTILIZABLES E INTELIGENTES
// ============================================================================
const DynamicIcon = ({ name, size = 24 }: { name: string, size?: number }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Scissors;
  return <IconComponent size={size} />;
};

const formatPrice = (price: string | number) => {
  if (typeof price === 'number') {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
  }
  return price.startsWith('$') ? price : `$${price}`;
};

const MediaRenderer = ({ type, url, alt, className }: { type: string, url: string, alt: string, className: string }) => {
  if (type === 'video' || url?.includes('.mp4')) {
    return (
      <video src={url} autoPlay loop muted playsInline className={`object-cover object-center w-full h-full ${className}`} />
    );
  }
  return <Image src={url || '/placeholder.jpg'} alt={alt} fill className={`object-cover object-center ${className}`} unoptimized priority />;
};

// ============================================================================
// COMPONENTE INTELIGENTE DE VIDEOS (Distribuidos con Autoplay + Botón Audio)
// ============================================================================
const DistributedVideo = ({ src, onUnmute, className }: { src: string, onUnmute: (vid: HTMLVideoElement) => void, className?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.play().catch((e) => console.log("Autoplay prevent:", e));
    }
  }, [src]);

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      
      if (!nextMuted) {
        onUnmute(videoRef.current);
      }
    }
  };

  return (
    <div className={`relative group overflow-hidden bg-black ${className}`}>
      <video 
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted={isMuted}
        playsInline
        preload="auto"
        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
      />
      <button 
        onClick={toggleMute}
        className="absolute bottom-4 right-4 z-50 w-12 h-12 flex items-center justify-center bg-black/60 hover:bg-amber-500 text-white hover:text-black border border-white/20 hover:border-amber-400 rounded-full backdrop-blur-md transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-pointer pointer-events-auto group-hover:scale-110"
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} className="animate-pulse" />}
      </button>
    </div>
  );
};

// ============================================================================
// ANIMACIONES IMPACTANTES
// ============================================================================
const popUp: Variants = { hidden: { opacity: 0, y: 50, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 20 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } };
const staggerContainer: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } };
const textReveal: Variants = { hidden: { opacity: 0, y: "100%" }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.33, 1, 0.68, 1] } } };

const FAQItem = ({ faq }: { faq: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <motion.div variants={fadeUp} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-500 transition-colors duration-300">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full px-6 py-6 flex justify-between items-center text-left group">
        <span className="text-lg md:text-xl font-bold text-white group-hover:text-amber-500 transition-colors">{faq.q}</span>
        <div className={`p-2 rounded-full transition-all duration-300 flex-shrink-0 ${isOpen ? 'bg-amber-500 text-black rotate-180' : 'bg-black text-amber-500 border border-zinc-700 group-hover:border-amber-500'}`}>
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-[#050505]">
            <p className="px-6 pb-6 pt-4 text-zinc-300 font-medium leading-relaxed border-t border-zinc-800/50">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// VISTA PRINCIPAL
// ============================================================================
export default function UltimateEmperadorLanding() {
  const supabase = createClient();

  // Estados Dinámicos de Textos para sincronizar con el panel Admin
  const [pageContent, setPageContent] = useState(FALLBACK_PAGE_CONTENT);

  const [heroSlides, setHeroSlides] = useState<any[]>(FALLBACK_HERO_SLIDES);
  const [team, setTeam] = useState<any[]>(FALLBACK_TEAM);
  const [services, setServices] = useState<any[]>(FALLBACK_SERVICES);
  const [faqs, setFaqs] = useState<any[]>(FALLBACK_FAQS);

  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const totalSlides = heroSlides.length > 0 ? heroSlides.length : 1;
  
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 1000], [0, 400]);

  // CONTROL DE AUDIO PARA VIDEOS EN BUCLE
  const handleGlobalReelUnmute = (activeVideo: HTMLVideoElement) => {
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(vid => {
      if (vid !== activeVideo) {
        vid.muted = true;
      }
    });
  };

  // ============================================================================
  // FETCH Y SLIDERS (AHORA INCLUYE LOS TEXTOS DESDE SETTINGS)
  // ============================================================================
  useEffect(() => {
    const slideInterval = setInterval(() => setCurrentHeroSlide((prev) => (prev + 1) % totalSlides), 8000); 
    return () => clearInterval(slideInterval);
  }, [totalSlides]);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        // 1. OBTENER TEXTOS GLOBALES DE LA PÁGINA PARA PODER EDITARLOS DEL ADMIN
        const { data: dbSettings } = await supabase.from('settings').select('*');
        if (dbSettings?.length) {
          const contentUpdates = { ...FALLBACK_PAGE_CONTENT };
          dbSettings.forEach(setting => {
            if (Object.keys(contentUpdates).includes(setting.key)) {
               // @ts-ignore
               contentUpdates[setting.key] = setting.value;
            }
          });
          setPageContent(contentUpdates);
        }

        // 2. OBTENER EL RESTO DE DATOS
        const { data: dbHero } = await supabase.from('HeroSlides').select('*').order('order_index', { ascending: true });
        if (dbHero?.length) setHeroSlides(dbHero); 

        const { data: dbTeam } = await supabase.from('Barbers').select('*').eq('status', 'ACTIVE').order('created_at', { ascending: true });
        if (dbTeam?.length) setTeam(dbTeam);

        const { data: dbServices } = await supabase.from('Services').select('*').order('price', { ascending: true }).limit(4);
        if (dbServices?.length) setServices(dbServices);

        const { data: dbFaqs } = await supabase.from('Faqs').select('*');
        if (dbFaqs?.length) setFaqs(dbFaqs);

      } catch (error) {
        console.log("Usando datos por defecto.");
      }
    }
    fetchAdminData();
  }, [supabase]);

  const currentSlideData = heroSlides[currentHeroSlide];

  return (
    <main className="bg-[#050505] min-h-screen font-sans selection:bg-amber-500 selection:text-black overflow-x-hidden relative -mt-24 md:-mt-28">
      
      {/* RENDERIZAMOS TU REPRODUCTOR DE MÚSICA GLOBAL */}
      <div className="relative z-[150]">
         <MusicPlayer />
      </div>

      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* BOTÓN AGENDAR FLOTANTE */}
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2, type: "spring", stiffness: 100 }} className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[100]">
        <Link href="/reservar" className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-amber-500 rounded-full shadow-[0_0_30px_rgba(217,119,6,0.8)] hover:scale-110 transition-transform group border-2 border-amber-300">
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 rounded-full bg-amber-500"></motion.div>
          <Scissors size={28} className="text-black relative z-10 group-hover:rotate-180 transition-transform duration-500" />
        </Link>
      </motion.div>

      {/* ========================================================================= */}
      {/* 1. HERO GLOBAL DINÁMICO (Sincronizado con Admin) */}
      {/* ========================================================================= */}
      <section className="relative w-full h-[100dvh] flex flex-col justify-center overflow-hidden bg-[#050505]">
        <AnimatePresence>
          <motion.div key={currentHeroSlide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5, ease: "easeInOut" }} className="absolute inset-0 w-full h-full flex flex-col justify-center">
            
            <div className="w-full h-full relative flex flex-col justify-center items-center">
              <motion.div style={{ y: yHero }} className="absolute inset-0 w-full h-full z-0">
                <MediaRenderer 
                  type={currentSlideData?.media_type || 'image'} 
                  url={currentSlideData?.media_url || 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=2000&auto=format&fit=crop'} 
                  alt="Emperador Hero" 
                  className="transition-all duration-[10000ms] ease-linear scale-105" 
                />
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 text-center pt-[150px] md:pt-[220px] pointer-events-none flex flex-col justify-center h-full">
          {currentSlideData?.type !== 'promo' ? (
            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="pointer-events-auto inline-block self-center">
              <motion.div variants={popUp} className="mb-6 inline-flex items-center gap-2 bg-amber-500 text-black px-6 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-[0.4em] shadow-[0_4px_15px_rgba(217,119,6,0.4)]">
                <MapPin size={14} /> {pageContent.hero_subtitle}
              </motion.div>
              
              <div className="mb-2">
                <motion.h2 variants={textReveal} className="text-[12vw] lg:text-[10rem] font-serif font-black text-white leading-none tracking-tighter uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] pb-4">
                  {pageContent.hero_title_1}
                </motion.h2>
              </div>
              <div className="mb-8">
                <motion.h2 variants={textReveal} className="text-[9vw] lg:text-[7rem] font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-700 leading-none tracking-widest uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] pb-4">
                  {pageContent.hero_title_2}
                </motion.h2>
              </div>
              
              <motion.p variants={popUp} className="text-white text-lg md:text-xl font-bold max-w-2xl mx-auto mb-10 drop-shadow-[0_5px_10px_rgba(0,0,0,0.8)]">
                {pageContent.hero_desc}
              </motion.p>
              
              <motion.div variants={popUp} className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full">
                <Link href="/reservar" className="relative overflow-hidden w-full sm:w-auto px-10 py-4 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-sm hover:text-black transition-all shadow-[0_0_40px_rgba(217,119,6,0.5)] flex items-center justify-center gap-3 rounded-xl group hover:scale-105 border border-amber-400">
                  <span className="relative z-10 flex items-center gap-3">{pageContent.hero_btn_1} <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></span>
                  <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-0" />
                </Link>
                <a href="#instagram" className="w-full sm:w-auto px-8 py-4 border border-zinc-200 bg-black/40 text-white font-black uppercase tracking-[0.2em] text-sm hover:border-amber-500 hover:text-amber-500 transition-all flex items-center justify-center gap-3 rounded-xl group backdrop-blur-md shadow-lg">
                  <Instagram size={20} className="group-hover:scale-110 transition-transform" /> {pageContent.hero_btn_2}
                </a>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="bg-black/50 backdrop-blur-xl p-10 md:p-20 rounded-[3rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] inline-flex flex-col items-center pointer-events-auto self-center">
              <motion.div variants={popUp} className="mb-6 inline-flex items-center gap-2 bg-zinc-900 border border-zinc-700 px-6 py-2 rounded-full text-[10px] md:text-xs font-black text-white uppercase tracking-[0.4em] shadow-xl">
                {currentSlideData.tag || 'EMPERADOR STORE'}
              </motion.div>
              
              <div className="mb-2">
                <motion.h2 variants={textReveal} className="text-5xl md:text-8xl font-serif font-black text-white leading-none tracking-tighter uppercase drop-shadow-2xl pb-4">
                  {currentSlideData.title}
                </motion.h2>
              </div>
              <div className="mb-12">
                <motion.h3 variants={textReveal} className="text-2xl md:text-4xl font-serif font-bold text-amber-500 leading-tight tracking-widest uppercase drop-shadow-lg pb-4">
                  {currentSlideData.subtitle}
                </motion.h3>
              </div>

              <motion.div variants={popUp}>
                <Link href="/tienda" className="px-12 py-5 bg-white text-black font-black uppercase tracking-[0.2em] text-sm hover:bg-amber-500 transition-colors shadow-2xl flex items-center justify-center gap-3 rounded-xl hover:scale-105 duration-300">
                  Ir a la Tienda <ShoppingCart size={20} />
                </Link>
              </motion.div>
            </motion.div>
          )}
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-50">
          {[...Array(totalSlides)].map((_, idx) => (
            <button key={idx} onClick={() => setCurrentHeroSlide(idx)} className={`h-2 rounded-full transition-all duration-500 ${currentHeroSlide === idx ? 'bg-amber-500 w-12 shadow-[0_0_10px_rgba(217,119,6,0.8)]' : 'bg-white/50 hover:bg-amber-500 w-4 cursor-pointer'}`} aria-label={`Ir al slide ${idx + 1}`} />
          ))}
        </div>
      </section>

      {/* INFINITE TICKER */}
      <div className="w-full bg-amber-500 py-3 md:py-4 overflow-hidden border-y border-amber-400 flex relative z-20 shadow-[0_0_40px_rgba(217,119,6,0.3)]">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, ease: "linear", duration: 15 }} className="flex whitespace-nowrap items-center gap-12 text-black font-black uppercase tracking-[0.2em] text-base md:text-xl">
          {[...Array(10)].map((_, i) => (
            <React.Fragment key={i}>
              <span>VIP Room</span> <Star size={20} fill="black" />
              <span>PS5 Libre</span> <Gamepad2 size={20} fill="black" />
              <span>Mesa de Pool</span> <Crown size={20} fill="black" />
              <span>Fades Premium</span> <Scissors size={20} fill="black" />
              <span>Emperador Store</span> <ShoppingCart size={20} fill="black" />
            </React.Fragment>
          ))}
        </motion.div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LA EXPERIENCIA (Sincronizado con Admin) */}
      {/* ========================================================================= */}
      <section className="py-24 md:py-32 relative border-b border-zinc-900 overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 z-0">
          <video src="/presentacion.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover blur-xl opacity-60 scale-110" />
        </div>
        
        <div className="max-w-[1400px] w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="bg-black/60 backdrop-blur-xl p-10 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl">
              <motion.h2 variants={fadeUp} className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">{pageContent.exp_tag}</motion.h2>
              <motion.h3 variants={fadeUp} className="text-5xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter leading-[0.9] mb-6">
                {pageContent.exp_title.split(',')[0]},<br/> <span className="text-zinc-400">{pageContent.exp_title.split(',')[1] || ''}</span>
              </motion.h3>
              <motion.p variants={fadeUp} className="text-zinc-200 text-lg leading-relaxed">
                {pageContent.exp_desc}
              </motion.p>
           </motion.div>
           
           <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} className="flex justify-center lg:justify-end">
              <DistributedVideo 
                 src="/presentacion.mp4" 
                 onUnmute={handleGlobalReelUnmute} 
                 className="w-[340px] md:w-[420px] h-[600px] md:h-[750px] rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.8)] border-[6px] border-zinc-900" 
              />
           </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. EQUIPO DE TRABAJO */}
      {/* ========================================================================= */}
      <section id="squad" className="py-24 md:py-32 bg-[#050505] relative overflow-hidden border-b border-zinc-900">
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">{pageContent.team_tag}</h2>
            <h3 className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter leading-none">{pageContent.team_title}</h3>
          </div>
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((t, i) => (
              <motion.div key={t.id || i} variants={popUp} className="group relative h-[450px] md:h-[600px] rounded-[2rem] overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer shadow-xl hover:shadow-[0_20px_50px_rgba(217,119,6,0.3)] transition-all duration-500">
                <Image src={t.img || '/placeholder.jpg'} fill alt={t.name} className="object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />
                <div className="absolute top-6 left-6"><span className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-lg shadow-lg">{t.tag}</span></div>
                
                <div className="absolute bottom-8 left-8 right-8">
                  <h4 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-1">{t.name}</h4>
                  <p className="text-amber-500 font-bold uppercase text-[10px] tracking-[0.3em] mb-6">{t.role}</p>
                  
                  <div className="overflow-hidden">
                      <Link href={`/reservar?barber=${t.id}`} className="w-full py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl flex justify-center items-center gap-2 opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-amber-500 shadow-xl hover:scale-105 active:scale-95">
                         Reservar con él <Zap size={14} fill="currentColor" />
                      </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SERVICIOS DESTACADOS */}
      {/* ========================================================================= */}
      <section id="servicios" className="py-24 md:py-32 relative border-b border-zinc-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video src="/cortes.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover blur-lg opacity-40 scale-105" />
        </div>

        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-16 md:mb-24 gap-12">
             <div className="flex-1 bg-black/60 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl">
               <motion.h2 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">{pageContent.services_tag}</motion.h2>
               <motion.h3 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} className="text-5xl md:text-9xl font-serif font-black text-white uppercase tracking-tighter leading-none mb-6">{pageContent.services_title}</motion.h3>
               <motion.p initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} className="text-zinc-200 font-bold uppercase tracking-widest text-xs border-l-2 border-amber-500 pl-6 max-w-sm">
                 {pageContent.services_desc}
               </motion.p>
             </div>
             
             <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} className="w-full lg:w-[500px] h-[300px] shrink-0">
               <DistributedVideo src="/cortes.mp4" onUnmute={handleGlobalReelUnmute} className="w-full h-full rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] border-[4px] border-zinc-800" />
             </motion.div>
          </div>
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {services.map((s, i) => (
               <motion.div key={s.id || i} variants={popUp} whileHover={{ y: -10, scale: 1.02 }} className="group p-8 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-[2rem] hover:bg-zinc-900 hover:border-amber-500 transition-all duration-300 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-black border border-zinc-800 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-400 transition-colors mb-6 shadow-lg duration-300">
                      <DynamicIcon name={s.iconName || "Scissors"} />
                    </div>
                    <h4 className="text-xl font-black text-white uppercase mb-3 leading-tight group-hover:text-amber-500 transition-colors line-clamp-2">{s.name}</h4>
                    <p className="text-zinc-400 font-medium mb-8 text-sm leading-relaxed line-clamp-3">{s.desc}</p>
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-end pt-6 border-t border-zinc-800 mb-6 group-hover:border-amber-500/30 transition-colors">
                      <div>
                        <span className="block text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{s.time}</span>
                        <span className="text-3xl font-black text-amber-500 tracking-tighter">{formatPrice(s.price)}</span>
                      </div>
                    </div>
                    <Link href={`/reservar?service=${s.id}`} className="w-full py-4 bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-xl flex justify-center items-center gap-2 group-hover:bg-white group-hover:text-black transition-colors border border-zinc-800 active:scale-95">
                       Seleccionar <ChevronRight size={14} />
                    </Link>
                  </div>
               </motion.div>
             ))}
          </motion.div>
          
          <div className="text-center mt-16 bg-black/60 p-4 rounded-[2rem] inline-block mx-auto backdrop-blur-md border border-white/10">
            <Link href="/servicios" className="inline-flex items-center gap-2 text-amber-500 hover:text-white font-black uppercase tracking-[0.2em] text-sm px-6 py-2 transition-colors">
              Ver Menú Completo <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. VIP ROOM */}
      {/* ========================================================================= */}
      <section id="flow" className="py-24 md:py-32 relative border-b border-zinc-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video src="/mesadepool.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover blur-lg opacity-40 scale-105" />
        </div>

        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-20 items-center relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="bg-black/60 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl">
            <motion.h2 variants={fadeUp} className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">{pageContent.vip_tag}</motion.h2>
            <motion.h3 variants={fadeUp} className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter leading-[0.9] mb-8">
               {pageContent.vip_title.split(' ')[0]} {pageContent.vip_title.split(' ')[1]} <br /> 
               <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-400 to-zinc-600">
                  {pageContent.vip_title.split(' ').slice(2).join(' ')}
               </span>
            </motion.h3>
            <motion.p variants={fadeUp} className="text-zinc-200 text-lg md:text-xl font-medium leading-relaxed mb-12 max-w-lg">
              {pageContent.vip_desc}
            </motion.p>
            <motion.div variants={fadeUp} className="space-y-6">
              <div className="flex items-center gap-6 p-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl hover:border-amber-500/50 transition-colors group shadow-lg">
                <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform"><Gamepad2 size={32} /></div>
                <div><h4 className="text-white font-black text-xl uppercase tracking-tight">PlayStation 5 Libre</h4><p className="text-zinc-400 text-sm font-medium mt-1">Últimos títulos. Juega mientras esperas.</p></div>
              </div>
              <div className="flex items-center gap-6 p-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl hover:border-amber-500/50 transition-colors group shadow-lg">
                <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform"><Crown size={32} /></div>
                <div><h4 className="text-white font-black text-xl uppercase tracking-tight">Mesa de Pool Premium</h4><p className="text-zinc-400 text-sm font-medium mt-1">Desafía a tus panas. 100% gratuita.</p></div>
              </div>
            </motion.div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} className="relative h-[450px] md:h-[700px] w-full">
             <DistributedVideo 
               src="/mesadepool.mp4" 
               onUnmute={handleGlobalReelUnmute} 
               className="w-full h-full rounded-[3rem] shadow-[0_0_60px_rgba(0,0,0,0.8)] border-[6px] border-zinc-900"
             />
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. EL SALÓN */}
      {/* ========================================================================= */}
      <section className="py-24 md:py-32 relative border-b border-zinc-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video src="/barberia.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover blur-lg opacity-40 scale-105" />
        </div>
        
        <div className="max-w-[1400px] mx-auto px-6 text-center mb-16 relative z-10">
           <div className="bg-black/60 backdrop-blur-md p-8 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl inline-block">
             <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">{pageContent.salon_tag}</h2>
             <h3 className="text-4xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter leading-none">{pageContent.salon_title}</h3>
           </div>
        </div>
        
        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
           <DistributedVideo 
              src="/barberia.mp4" 
              onUnmute={handleGlobalReelUnmute} 
              className="w-full h-[350px] md:h-[650px] rounded-[3rem] shadow-[0_0_60px_rgba(0,0,0,0.8)] border-[4px] border-zinc-800" 
           />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. INSTAGRAM (LINK PREVIEW DEFINITIVO Y PROFESIONAL) */}
      {/* ========================================================================= */}
      <section id="instagram" className="py-24 md:py-32 bg-[#050505] relative overflow-hidden border-b border-zinc-900 flex justify-center items-center">
         <div className="max-w-[1400px] w-full mx-auto px-6 relative z-10 flex flex-col items-center">
            
            <div className="text-center mb-12">
               <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">Redes Sociales</h2>
               <h3 className="text-4xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter">SÍGUENOS.</h3>
            </div>
            
            {/* LINK PREVIEW MODERNO */}
            <motion.a 
               href="https://www.instagram.com/emperador_barbershop/?hl=es" 
               target="_blank" 
               rel="noopener noreferrer"
               whileHover={{ y: -10 }}
               className="block w-full max-w-[500px] bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(217,119,6,0.3)] hover:border-amber-500/50 transition-all duration-500 group"
            >
               {/* Área de Imagen / Cabecera */}
               <div className="relative w-full h-[250px] bg-black overflow-hidden flex items-center justify-center">
                  <Image src="https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=1000&auto=format&fit=crop" fill className="object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" alt="Emperador Preview Cover" unoptimized />
                  
                  {/* Foto de Perfil Central */}
                  <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#d6249f] p-1 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                     <div className="w-full h-full bg-black rounded-full p-1 border-2 border-white/20">
                        <Image src="/logo.png" fill className="object-contain p-2" alt="Logo" />
                     </div>
                  </div>
                  
                  {/* Icono de Instagram flotante */}
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md rounded-full p-2 text-white border border-white/10 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                     <Instagram size={20} />
                  </div>
               </div>
               
               {/* Área de Textos del Preview */}
               <div className="p-6 md:p-8 border-t border-zinc-800 bg-gradient-to-b from-zinc-900 to-black relative">
                  <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                     <ExternalLink size={12} /> instagram.com
                  </p>
                  <h4 className="text-2xl font-black text-white mb-2 group-hover:text-amber-500 transition-colors">
                     Emperador BarberShop (@emperador_barbershop)
                  </h4>
                  <p className="text-zinc-400 font-medium leading-relaxed text-sm mb-6">
                     84 posts • 1,039 followers • 488 following. La barbería no es un trámite, es un ritual. Disfruta de la mejor experiencia de grooming en Curicó.
                  </p>
                  
                  <div className="w-full py-4 bg-amber-500 text-black font-black uppercase text-sm tracking-[0.2em] rounded-xl flex justify-center items-center gap-3 group-hover:bg-white transition-colors">
                     Visitar Perfil <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </div>
               </div>
            </motion.a>
            
         </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. AYUDA / FAQ */}
      {/* ========================================================================= */}
      <section id="faq" className="py-24 md:py-32 bg-[#050505]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
             <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">{pageContent.faq_tag}</h2>
             <h3 className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter">{pageContent.faq_title}</h3>
             <p className="text-zinc-400 mt-6 font-medium text-lg">{pageContent.faq_desc}</p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, i) => <FAQItem key={faq.id || i} faq={faq} />)}
          </div>
        </div>
      </section>

    </main>
  );
}