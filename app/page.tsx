"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence, Variants } from "framer-motion";
import * as LucideIcons from "lucide-react"; 
import { 
  Gamepad2, MapPin, Instagram, ChevronRight, 
  Crown, Star, Scissors, Zap, Flame, Crosshair,
  Minus, Plus, Clapperboard, Heart, MessageCircle,
  ShoppingCart, Volume2, VolumeX, Quote
} from "lucide-react";

import { createClient } from "@/utils/supabase/client";

// ============================================================================
// DATA MAESTRA (FALLBACKS Y ESTRUCTURA DINÁMICA BASE)
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
  faq_desc: "Todo lo que necesitas saber antes de asegurar tu trono.",
  
  // RUTAS DE VIDEOS (Pueden ser sobreescritas desde Supabase 'settings')
  video_experiencia: "/presentacion.mp4",
  video_servicios: "/cortes.mp4",
  video_vip: "/mesadepool.mp4",
  video_salon: "/barberia.mp4"
};

const FALLBACK_HERO_SLIDES = [
  { id: "brand1", type: "brand", media_type: "image", media_url: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=2000&auto=format&fit=crop" }
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

  // Estados Dinámicos Sincronizados con el Panel Administrador
  const [pageContent, setPageContent] = useState(FALLBACK_PAGE_CONTENT);
  const [heroSlides, setHeroSlides] = useState<any[]>(FALLBACK_HERO_SLIDES);
  const [team, setTeam] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const totalSlides = heroSlides.length > 0 ? heroSlides.length : 1;
  
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 1000], [0, 400]);

  // CONTROL DE AUDIO PARA VIDEOS EN BUCLE
  const handleGlobalReelUnmute = (activeVideo: HTMLVideoElement) => {
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(vid => {
      if (vid !== activeVideo) vid.muted = true;
    });
  };

  // ============================================================================
  // FETCH DE DATOS (Conectado a la Base de Datos Pura)
  // ============================================================================
  const fetchPublicData = useCallback(async () => {
    try {
      // Pedimos todo en paralelo para máxima velocidad
      const [
        { data: dbSettings },
        { data: dbHero },
        { data: dbPromos },
        { data: dbTeam },
        { data: dbServices },
        { data: dbFaqs },
        { data: dbReels },
        { data: dbReviews }
      ] = await Promise.all([
        supabase.from('settings').select('*'),
        supabase.from('HeroSlides').select('*').order('order_index', { ascending: true }),
        supabase.from('StorePromos').select('*').order('created_at', { ascending: false }),
        // Ordenamos inicialmente por order_index en la BD
        supabase.from('Barbers').select('*').eq('status', 'ACTIVE').order('order_index', { ascending: true }), 
        supabase.from('Services').select('*').order('order_index', { ascending: true }).order('price', { ascending: true }),
        supabase.from('Faqs').select('*').order('created_at', { ascending: true }),
        supabase.from('InstagramReels').select('*').order('created_at', { ascending: false }),
        supabase.from('Reviews').select('*').order('created_at', { ascending: false })
      ]);

      // 1. Textos y Configuraciones Web
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

      // 2. Fusión Inteligente de Slides (Hero Visual + Promociones Tienda)
      let combinedSlides: any[] = [];
      if (dbHero?.length) {
        combinedSlides = [...combinedSlides, ...dbHero.map(s => ({ ...s, type: 'brand' }))];
      }
      if (dbPromos?.length) {
        combinedSlides = [...combinedSlides, ...dbPromos.map(s => ({ 
          ...s, 
          type: 'promo',
          title: s.title_left || s.tag, 
          subtitle: s.subtitle_left || ''
        }))];
      }
      if (combinedSlides.length > 0) setHeroSlides(combinedSlides);

      // 3. Barberos (Con orden secundario por seguridad), FAQs, Reels, Reviews
      if (dbTeam?.length) {
        const sortedTeam = [...dbTeam].sort((a, b) => {
          const indexA = a.order_index ?? 0;
          const indexB = b.order_index ?? 0;
          return indexA - indexB; 
        });
        setTeam(sortedTeam);
      }

      if (dbFaqs?.length) setFaqs(dbFaqs);
      if (dbReels?.length) setReels(dbReels);
      if (dbReviews?.length) setReviews(dbReviews);

      // 4. Servicios Ordenados ESTRICTAMENTE por order_index
      if (dbServices?.length) {
         const sortedServices = [...dbServices].sort((a, b) => {
            const indexA = a.order_index ?? 0; // Si no tiene orden, asume 0
            const indexB = b.order_index ?? 0;
            if (indexA !== indexB) {
              return indexA - indexB; // Ordena de menor a mayor (1, 2, 3...)
            }
            // Si el index es igual, desempata por precio
            return (a.price || 0) - (b.price || 0); 
         });
         // Mostramos solo los primeros 4 en la página principal
         setServices(sortedServices.slice(0, 4)); 
      }

    } catch (error) {
      console.log("Error sincronizando. Usando datos iniciales.");
    }
  }, [supabase]);

  // Ejecución inicial y Suscripción Realtime
  useEffect(() => {
    fetchPublicData();
    
    // Rotación del Hero
    const slideInterval = setInterval(() => setCurrentHeroSlide((prev) => (prev + 1) % totalSlides), 8000); 
    
    // Web Viva: Reacciona a cambios del Admin Panel en tiempo real
    const channel = supabase.channel('public-home-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, fetchPublicData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'HeroSlides' }, fetchPublicData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'StorePromos' }, fetchPublicData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Barbers' }, fetchPublicData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Services' }, fetchPublicData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'InstagramReels' }, fetchPublicData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Reviews' }, fetchPublicData)
      .subscribe();
      
    return () => { 
      clearInterval(slideInterval);
      supabase.removeChannel(channel); 
    };
  }, [fetchPublicData, supabase, totalSlides]);

  const currentSlideData = heroSlides[currentHeroSlide];

  return (
    <main className="bg-[#050505] min-h-screen font-sans selection:bg-amber-500 selection:text-black overflow-x-hidden relative -mt-24 md:-mt-28">
      
      {/* BOTÓN AGENDAR FLOTANTE - ANCLADO EN LA ESQUINA INFERIOR DER. */}
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2, type: "spring", stiffness: 100 }} className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[100]">
        <Link href="/reservar" className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-amber-500 rounded-full shadow-[0_0_30px_rgba(217,119,6,0.8)] hover:scale-110 transition-transform group border-2 border-amber-300">
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 rounded-full bg-amber-500"></motion.div>
          <Scissors size={28} className="text-black relative z-10 group-hover:rotate-180 transition-transform duration-500" />
        </Link>
      </motion.div>

      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* ========================================================================= */}
      {/* 1. HERO GLOBAL DINÁMICO */}
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
      {/* 2. LA EXPERIENCIA */}
      {/* ========================================================================= */}
      <section className="py-24 md:py-32 relative border-b border-zinc-900 overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 z-0">
          <video src={pageContent.video_experiencia} autoPlay loop muted playsInline className="w-full h-full object-cover blur-xl opacity-60 scale-110" />
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
                 src={pageContent.video_experiencia} 
                 onUnmute={handleGlobalReelUnmute} 
                 className="w-[340px] md:w-[420px] h-[600px] md:h-[750px] rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.8)] border-[6px] border-zinc-900" 
              />
           </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. EQUIPO DE TRABAJO (SIEMPRE A COLOR) */}
      {/* ========================================================================= */}
      <section id="squad" className="py-24 md:py-32 bg-[#050505] relative overflow-hidden border-b border-zinc-900">
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">{pageContent.team_tag}</h2>
            <h3 className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter leading-none">{pageContent.team_title}</h3>
          </div>
          
          {team.length > 0 ? (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((t, i) => (
                <motion.div key={t.id || i} variants={popUp} className="group relative h-[450px] md:h-[600px] rounded-[2rem] overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer shadow-xl hover:shadow-[0_20px_50px_rgba(217,119,6,0.3)] transition-all duration-500">
                  {/* IMAGEN SIEMPRE A COLOR, con zoom dinámico al hacer hover */}
                  <Image src={t.img || '/placeholder.jpg'} fill alt={t.name} className="object-cover scale-105 md:scale-100 group-hover:scale-110 transition-transform duration-700" unoptimized />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 md:via-[#050505]/50 to-transparent opacity-100 md:opacity-90 group-hover:opacity-70 transition-opacity" />
                  
                  <div className="absolute top-6 left-6">
                    <span className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-lg shadow-[0_0_15px_rgba(217,119,6,0.6)] animate-pulse inline-block">
                      {t.tag}
                    </span>
                  </div>
                  
                  <div className="absolute bottom-8 left-8 right-8">
                    <h4 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-1">{t.name}</h4>
                    <p className="text-amber-500 font-bold uppercase text-[10px] tracking-[0.3em] mb-6 drop-shadow-md">{t.role}</p>
                    
                    <div className="overflow-hidden mt-4">
                        <Link href={`/reservar?barber=${t.id}`} className="w-full py-4 bg-amber-500 md:bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl flex justify-center items-center gap-2 md:opacity-0 md:translate-y-full md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-300 md:hover:bg-amber-500 shadow-xl active:scale-95">
                           Reservar con él <Zap size={14} fill="currentColor" />
                        </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <p className="text-center text-zinc-500">Aún no se han configurado barberos activos.</p>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SERVICIOS DESTACADOS (CON ORDEN SINCRONIZADO) */}
      {/* ========================================================================= */}
      <section id="servicios" className="py-24 md:py-32 relative border-b border-zinc-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video src={pageContent.video_servicios} autoPlay loop muted playsInline className="w-full h-full object-cover blur-lg opacity-40 scale-105" />
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
               <DistributedVideo src={pageContent.video_servicios} onUnmute={handleGlobalReelUnmute} className="w-full h-full rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] border-[4px] border-zinc-800" />
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
          <video src={pageContent.video_vip} autoPlay loop muted playsInline className="w-full h-full object-cover blur-lg opacity-40 scale-105" />
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
               src={pageContent.video_vip} 
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
          <video src={pageContent.video_salon} autoPlay loop muted playsInline className="w-full h-full object-cover blur-lg opacity-40 scale-105" />
        </div>
        
        <div className="max-w-[1400px] mx-auto px-6 text-center mb-16 relative z-10">
           <div className="bg-black/60 backdrop-blur-md p-8 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl inline-block">
             <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">{pageContent.salon_tag}</h2>
             <h3 className="text-4xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter leading-none">{pageContent.salon_title}</h3>
           </div>
        </div>
        
        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
           <DistributedVideo 
              src={pageContent.video_salon} 
              onUnmute={handleGlobalReelUnmute} 
              className="w-full h-[350px] md:h-[650px] rounded-[3rem] shadow-[0_0_60px_rgba(0,0,0,0.8)] border-[4px] border-zinc-800" 
           />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. INSTAGRAM & TESTIMONIOS (REVIEWS) */}
      {/* ========================================================================= */}
      <section id="instagram" className="py-24 md:py-32 bg-[#0a0a0a] relative overflow-hidden border-b border-zinc-900 flex justify-center">
         <div className="absolute inset-0 opacity-20 pointer-events-none">
           <Image src="https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=2000&auto=format&fit=crop" fill className="object-cover blur-3xl scale-110" alt="Insta Background" unoptimized />
         </div>
         
         <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10 w-full">
            
            {/* COLUMNA IZQUIERDA: INSTAGRAM WIDGET */}
            <div className="w-full max-w-[450px] mx-auto lg:mx-0">
               <a href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer" className="flex justify-between items-center mb-4 text-white font-bold text-sm px-2 group cursor-pointer">
                 <div className="flex items-center gap-2">
                   <div className="bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#d6249f] rounded-[0.4rem] p-0.5 group-hover:scale-110 transition-transform">
                     <Instagram size={18} className="text-white" />
                   </div>
                   <span className="tracking-wide group-hover:text-amber-500 transition-colors">@emperador_barbershop</span>
                 </div>
                 <span className="text-[10px] md:text-xs uppercase font-black tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                   ABRIR APP ↗
                 </span>
               </a>

               <div className="bg-white rounded-[1.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(214,36,159,0.3)] transition-shadow duration-500 cursor-pointer">
                  <a href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer" className="block p-5 md:p-6 relative group">
                     <div className="absolute top-5 right-5 group-hover:scale-110 transition-transform">
                        <Instagram size={28} className="text-[#d6249f]" />
                     </div>

                     <div className="flex items-center gap-4">
                        <div className="shrink-0 w-[70px] h-[70px] md:w-[84px] md:h-[84px] rounded-full bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#d6249f] p-[3px] shadow-sm group-hover:scale-105 transition-transform">
                           <div className="w-full h-full bg-white rounded-full p-[2px]">
                              <div className="w-full h-full relative rounded-full overflow-hidden border border-gray-100 bg-black flex items-center justify-center">
                                <Image src="/logo.png" fill className="object-cover p-1" alt="Emperador Logo Instagram" />
                              </div>
                           </div>
                        </div>
                        <div className="text-black flex flex-col justify-center">
                           <h3 className="font-bold text-base md:text-lg leading-none mb-1 group-hover:text-[#d6249f] transition-colors">emperador_barbershop</h3>
                           <p className="text-zinc-600 text-[13px] md:text-sm mb-1">Emperador BarberShop</p>
                           
                           <div className="flex items-center gap-3 mt-1">
                              <p className="text-zinc-800 text-[12px] md:text-[13px]"><span className="font-bold">84</span> publicaciones</p>
                              <p className="text-zinc-800 text-[12px] md:text-[13px]"><span className="font-bold">1039</span> seguidores</p>
                           </div>
                           <p className="text-zinc-800 text-[12px] md:text-[13px] mt-0.5"><span className="font-bold">488</span> seguidos</p>
                        </div>
                     </div>
                  </a>

                  <div className="grid grid-cols-3 gap-0.5 bg-gray-200">
                     {reels.map((post) => (
                       <a 
                         key={post.id} 
                         href="https://www.instagram.com/emperador_barbershop/?hl=es" 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="relative aspect-square bg-white overflow-hidden group block"
                       >
                         <Image 
                           src={post.media_url} 
                           alt="Insta Post" 
                           fill
                           className="object-cover group-hover:scale-105 transition-transform duration-500" 
                           unoptimized
                         />
                         <div className="absolute top-2 right-2 text-white drop-shadow-md">
                            {post.type === 'reel' ? <Clapperboard size={14} fill="currentColor" /> : null}
                         </div>
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 backdrop-blur-sm">
                            <div className="flex items-center gap-1 text-white font-bold text-xs"><Heart fill="currentColor" size={12} /> {post.likes}</div>
                            <div className="flex items-center gap-1 text-white font-bold text-xs"><MessageCircle fill="currentColor" size={12} /> {post.comments}</div>
                         </div>
                       </a>
                     ))}
                  </div>
               </div>
            </div>

            {/* COLUMNA DERECHA: REVIEWS (Sincronizado con Admin) */}
            <div className="flex flex-col justify-center">
              <h3 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">Lo que dicen de nosotros</h3>
              <h4 className="text-4xl md:text-6xl font-serif font-black text-white uppercase tracking-tighter leading-none mb-10">Reviews.</h4>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {reviews.map(review => (
                  <div key={review.id} className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl backdrop-blur-sm">
                    <Quote className="text-zinc-700 w-8 h-8 mb-4 rotate-180" />
                    <p className="text-zinc-300 italic mb-6 font-medium leading-relaxed">"{review.text}"</p>
                    <div className="flex justify-between items-center border-t border-zinc-800/50 pt-4">
                      <span className="font-black text-white uppercase text-sm tracking-widest">{review.name}</span>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className={i < review.rating ? "text-amber-500 fill-amber-500" : "text-zinc-700"} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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