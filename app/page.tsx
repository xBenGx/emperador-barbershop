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
  UserCircle, Briefcase, KeyRound, ShoppingCart, Disc, Volume2, VolumeX, Volume1, Music,
  PlayCircle
} from "lucide-react";

import { createClient } from "@/utils/supabase/client";

// ============================================================================
// DATA MAESTRA (FALLBACKS)
// ============================================================================
const FALLBACK_HERO_SLIDES = [
  // Slide 1: Presentación de Marca (SIN OPACIDAD NEGRA, IMAGEN FULL COLOR)
  { id: "brand1", type: "brand", media_type: "image", media_url: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=2000&auto=format&fit=crop" },
  // Slide 2: Promoción
  { id: "promo1", type: "promo", title: "WAHL MAGIC CLIP", subtitle: "Edición Gold Cordless", tag: "NUEVO STOCK", media_type: "image", media_url: "https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=2000&auto=format&fit=crop" },
  // Slide 3: Presentación de Marca 2
  { id: "brand2", type: "brand", media_type: "image", media_url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=2000&auto=format&fit=crop" },
  // Slide 4: Promoción 2
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

const FALLBACK_REVIEWS = [
  { id: "r1", name: "Matías R.", text: "El mejor fade de Curicó. Mientras esperaba jugué una partida de PS5. Servicio 10/10.", rating: 5 },
  { id: "r2", name: "Carlos D.", text: "Atención de primer nivel. Cesar es un artista con la tijera. El local tiene muchísimo flow.", rating: 5 },
  { id: "r3", name: "Andrés M.", text: "Ritual de barba con vapor increíble. Salí renovado. Los cabros tienen un talento brutal.", rating: 5 },
];

const FALLBACK_FAQS = [
  { id: "f1", q: "¿Necesito cuenta para reservar?", a: "No, en Emperador valoramos tu tiempo. Puedes agendar como invitado en menos de 1 minuto ingresando solo tu nombre y número." },
  { id: "f2", q: "¿El uso de PS5 tiene costo?", a: "Para nada. PS5 y la mesa de Pool son un beneficio exclusivo y 100% gratuito para nuestros clientes mientras esperan." },
  { id: "f3", q: "¿Qué métodos de pago aceptan?", a: "Para tu comodidad, aceptamos Efectivo, Transferencia Electrónica y todas las tarjetas de Débito/Crédito vía Transbank." },
  { id: "f4", q: "¿Puedo comprar productos online?", a: "Sí, contamos con una tienda integrada donde puedes adquirir ceras, pomadas y máquinas profesionales." },
];

// Falso Grid de Instagram que te lleva al perfil real
const INSTA_REELS = [
  { id: "i1", likes: "12.4k", comments: "145", type: "image", media_url: "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=600&h=600&auto=format&fit=crop" },
  { id: "i2", likes: "8.2k", comments: "98", type: "image", media_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&h=600&auto=format&fit=crop" },
  { id: "i3", likes: "15.1k", comments: "230", type: "image", media_url: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=600&h=600&auto=format&fit=crop" },
  { id: "i4", likes: "20.5k", comments: "314", type: "reel", media_url: "https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=600&h=600&auto=format&fit=crop" },
  { id: "i5", likes: "9.8k", comments: "112", type: "image", media_url: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=600&h=600&auto=format&fit=crop" },
  { id: "i6", likes: "18.3k", comments: "289", type: "reel", media_url: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?q=80&w=600&h=600&auto=format&fit=crop" },
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
    <div className={`relative group overflow-hidden ${className}`}>
      <video 
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted={isMuted}
        playsInline
        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
      />
      {/* Botón flotante para el audio (Transparente cristal) */}
      <button 
        onClick={toggleMute}
        className="absolute bottom-4 right-4 z-20 w-12 h-12 flex items-center justify-center bg-black/40 hover:bg-amber-500 hover:text-black text-white border border-white/20 hover:border-amber-400 rounded-full backdrop-blur-md transition-all duration-300 shadow-lg group-hover:scale-110"
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

  const [heroSlides, setHeroSlides] = useState<any[]>(FALLBACK_HERO_SLIDES);
  const [team, setTeam] = useState<any[]>(FALLBACK_TEAM);
  const [services, setServices] = useState<any[]>(FALLBACK_SERVICES);
  const [reviews, setReviews] = useState<any[]>(FALLBACK_REVIEWS);
  const [faqs, setFaqs] = useState<any[]>(FALLBACK_FAQS);
  const [reels, setReels] = useState<any[]>(INSTA_REELS);

  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const totalSlides = heroSlides.length > 0 ? heroSlides.length : 1;
  
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 1000], [0, 400]);

  // ============================================================================
  // REPRODUCTOR DE MÚSICA AVANZADO
  // ============================================================================
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeInterval = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMusicHovered, setIsMusicHovered] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [volume, setVolume] = useState(0.3); 
  const [isMuted, setIsMuted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [musicSrc, setMusicSrc] = useState("/vibe.mp3");

  useEffect(() => {
    setIsMounted(true);
    const savedVolume = localStorage.getItem('emperador_volume');
    const savedMuted = localStorage.getItem('emperador_muted');
    if (savedVolume) setVolume(parseFloat(savedVolume));
    if (savedMuted === 'true') setIsMuted(true);
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const fadeInAudio = (targetVolume: number) => {
    if (!audioRef.current) return;
    if (fadeInterval.current) clearInterval(fadeInterval.current);
    let vol = 0;
    audioRef.current.volume = vol;
    fadeInterval.current = setInterval(() => {
      vol += 0.05;
      if (vol >= targetVolume) {
        if (audioRef.current) audioRef.current.volume = targetVolume;
        if (fadeInterval.current) clearInterval(fadeInterval.current);
      } else {
        if (audioRef.current) audioRef.current.volume = vol;
      }
    }, 100);
  };

  const fadeOutAudioAndPause = () => {
    if (!audioRef.current) return;
    if (fadeInterval.current) clearInterval(fadeInterval.current);
    let vol = audioRef.current.volume;
    fadeInterval.current = setInterval(() => {
      vol -= 0.05;
      if (vol <= 0) {
        if (audioRef.current) {
          audioRef.current.volume = 0;
          audioRef.current.pause();
        }
        setIsPlaying(false);
        if (fadeInterval.current) clearInterval(fadeInterval.current);
      } else {
        if (audioRef.current) audioRef.current.volume = vol;
      }
    }, 50);
  };

  useEffect(() => {
    const handleInteraction = () => {
      if (!hasInteracted && audioRef.current && !isPlaying) {
        audioRef.current.volume = 0;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setHasInteracted(true);
          fadeInAudio(isMuted ? 0 : volume);
        }).catch(() => console.log("Autoplay bloqueado por el navegador."));
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('scroll', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('scroll', handleInteraction, { once: true });
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('scroll', handleInteraction);
    };
  }, [hasInteracted, volume, isMuted, isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      fadeOutAudioAndPause();
    } else {
      audioRef.current.play();
      fadeInAudio(isMuted ? 0 : volume);
      setIsPlaying(true);
    }
    setHasInteracted(true);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    localStorage.setItem('emperador_muted', newMutedState.toString());
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      localStorage.setItem('emperador_muted', 'false');
    }
    localStorage.setItem('emperador_volume', newVolume.toString());
  };

  // CONTROL INTELIGENTE DE AUDIO: Se llama cuando el usuario activa el audio en CUALQUIER video distribuido
  const handleGlobalReelUnmute = (activeVideo: HTMLVideoElement) => {
    // 1. Apaga la música general de la web
    if (isPlaying) {
      fadeOutAudioAndPause();
    }
    // 2. Silencia cualquier otro video que estuviera sonando
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(vid => {
      if (vid !== activeVideo) {
        vid.muted = true;
      }
    });
  };

  // ============================================================================
  // FETCH Y SLIDERS
  // ============================================================================
  useEffect(() => {
    const slideInterval = setInterval(() => setCurrentHeroSlide((prev) => (prev + 1) % totalSlides), 8000); 
    return () => clearInterval(slideInterval);
  }, [totalSlides]);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const { data: dbSettings } = await supabase.from('settings').select('*').eq('key', 'background_music').single();
        if (dbSettings?.value) setMusicSrc(dbSettings.value);

        const { data: dbHero } = await supabase.from('HeroSlides').select('*').order('order_index', { ascending: true });
        if (dbHero?.length) {
          setHeroSlides(dbHero); 
        }

        const { data: dbTeam } = await supabase.from('Barbers').select('*').eq('status', 'ACTIVE').order('created_at', { ascending: true });
        if (dbTeam?.length) setTeam(dbTeam);

        const { data: dbServices } = await supabase.from('Services').select('*').order('price', { ascending: true }).limit(4);
        if (dbServices?.length) setServices(dbServices);

        const { data: dbReviews } = await supabase.from('Reviews').select('*');
        if (dbReviews?.length) setReviews(dbReviews);

        const { data: dbFaqs } = await supabase.from('Faqs').select('*');
        if (dbFaqs?.length) setFaqs(dbFaqs);

        const { data: dbReels } = await supabase.from('InstagramReels').select('*').order('created_at', { ascending: false });
        if (dbReels?.length) setReels(dbReels);
      } catch (error) {
        console.log("Usando datos por defecto.");
      }
    }
    fetchAdminData();
  }, [supabase]);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const currentSlideData = heroSlides[currentHeroSlide];

  return (
    <main className="bg-[#050505] min-h-screen font-sans selection:bg-amber-500 selection:text-black overflow-x-hidden relative -mt-24 md:-mt-28">
      
      <audio ref={audioRef} src={musicSrc} loop preload="auto" />
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      {/* MÚSICA FLOTANTE */}
      {isMounted && (
        <motion.div
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 100, damping: 20, delay: 1 }}
          onMouseEnter={() => setIsMusicHovered(true)} onMouseLeave={() => setIsMusicHovered(false)}
          className="fixed bottom-6 left-6 md:bottom-10 md:left-10 z-[100] flex items-center"
        >
          <motion.div layout className={`flex items-center bg-[#050505]/90 backdrop-blur-xl border border-zinc-800 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all duration-500 overflow-hidden ${isMusicHovered ? 'pr-6' : 'pr-1'}`}>
            <button onClick={togglePlay} className="relative flex items-center justify-center w-14 h-14 bg-black rounded-full border border-zinc-800 shrink-0 group hover:border-amber-500 transition-colors m-1 z-10 focus:outline-none">
              <Disc size={28} className={`text-amber-500 transition-all ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : 'opacity-60'}`} />
              <div className="absolute w-2.5 h-2.5 bg-zinc-900 rounded-full border border-zinc-700"></div>
              {isPlaying && <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-md animate-pulse"></div>}
            </button>

            <AnimatePresence>
              {isMusicHovered && (
                <motion.div initial={{ width: 0, opacity: 0, paddingLeft: 0 }} animate={{ width: "auto", opacity: 1, paddingLeft: 12 }} exit={{ width: 0, opacity: 0, paddingLeft: 0 }} className="flex items-center gap-4 overflow-hidden whitespace-nowrap">
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <Music size={12} className="text-amber-500" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Emperador Vibe</p>
                    </div>
                    <div className="flex items-end gap-1 h-3 mt-1.5 opacity-80">
                      {[1, 2, 3, 4, 5].map((bar) => (
                        <motion.div key={bar} animate={isPlaying ? { height: ["4px", "12px", "4px", "8px"] } : { height: "2px" }} transition={{ repeat: Infinity, duration: 0.8 + (bar * 0.1), ease: "easeInOut" }} className={`w-1 rounded-t-sm ${isPlaying ? 'bg-amber-500' : 'bg-zinc-700'}`} />
                      ))}
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest ml-2">Vol. 1</span>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-zinc-800 mx-2"></div>
                  <div className="flex items-center gap-2 group/volume">
                    <button onClick={toggleMute} className="text-zinc-400 hover:text-amber-500 transition-colors focus:outline-none p-1"><VolumeIcon size={16} /></button>
                    <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-16 md:w-20 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-amber-500 hover:bg-zinc-700 transition-colors [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-125 transition-transform" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}

      {/* BOTÓN AGENDAR FLOTANTE */}
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2, type: "spring", stiffness: 100 }} className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[100]">
        <Link href="/reservar" className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-amber-500 rounded-full shadow-[0_0_30px_rgba(217,119,6,0.8)] hover:scale-110 transition-transform group border-2 border-amber-300">
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 rounded-full bg-amber-500"></motion.div>
          <Scissors size={28} className="text-black relative z-10 group-hover:rotate-180 transition-transform duration-500" />
        </Link>
      </motion.div>

      {/* ========================================================================= */}
      {/* 1. HERO GLOBAL DINÁMICO (Cero Filtros Negros) */}
      {/* ========================================================================= */}
      <section className="relative w-full h-[100dvh] flex flex-col justify-center overflow-hidden bg-[#050505]">
        <AnimatePresence mode="wait">
          <motion.div key={currentHeroSlide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: "easeInOut" }} className="absolute inset-0 w-full h-full flex flex-col justify-center">
            
            <div className="w-full h-full relative flex flex-col justify-center items-center">
              <motion.div style={{ y: yHero }} className="absolute inset-0 w-full h-full z-0">
                {/* FIX: Se eliminaron los filtros grayscale y opacity. Ahora la imagen brilla. */}
                <MediaRenderer 
                  type={currentSlideData?.media_type || 'image'} 
                  url={currentSlideData?.media_url || 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=2000&auto=format&fit=crop'} 
                  alt="Emperador Hero" 
                  className="transition-all duration-[10000ms] ease-linear scale-105" 
                />
                {/* Gradiente súper sutil SOLO en la parte inferior para que se lea el texto */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent pointer-events-none" />
              </motion.div>

              <div className="relative z-10 w-full max-w-[1400px] px-6 text-center pt-[150px] md:pt-[220px] pointer-events-none">
                {currentSlideData?.type !== 'promo' ? (
                  /* RENDER TIPO 1: BRANDING */
                  <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="pointer-events-auto">
                    <motion.div variants={popUp} className="mb-6 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/50 px-6 py-2 rounded-full text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-[0.4em] shadow-[0_0_20px_rgba(217,119,6,0.2)] backdrop-blur-md">
                      <MapPin size={14} /> Peña 666, Piso 2 • Curicó
                    </motion.div>
                    
                    <div className="overflow-hidden mb-2">
                      <motion.h2 variants={textReveal} className="text-[14vw] lg:text-[11rem] font-serif font-black text-white leading-[0.8] tracking-tighter uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                        EMPERADOR
                      </motion.h2>
                    </div>
                    <div className="overflow-hidden mb-8">
                      <motion.h2 variants={textReveal} className="text-[10vw] lg:text-[8rem] font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-700 leading-[0.8] tracking-widest uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                        BARBERSHOP
                      </motion.h2>
                    </div>
                    
                    <motion.p variants={popUp} className="text-zinc-200 text-lg md:text-2xl font-medium max-w-2xl mx-auto mb-12 drop-shadow-md bg-black/30 p-4 rounded-2xl backdrop-blur-sm">
                      La barbería no es un trámite, es un ritual. Disfruta de la mejor experiencia de grooming, atención premium, PS5 y mesa de Pool.
                    </motion.p>
                    
                    <motion.div variants={popUp} className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full">
                      <Link href="/reservar" className="relative overflow-hidden w-full sm:w-auto px-12 py-5 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-sm hover:text-black transition-all shadow-[0_0_40px_rgba(217,119,6,0.5)] flex items-center justify-center gap-3 rounded-xl group hover:scale-105">
                        <span className="relative z-10 flex items-center gap-3">Asegura tu Trono <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></span>
                        <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-0" />
                      </Link>
                      <a href="https://www.instagram.com/emperador_barbershop/" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-5 border border-white/50 bg-black/50 backdrop-blur-md text-white font-black uppercase tracking-[0.2em] text-sm hover:border-amber-500 hover:text-amber-500 transition-all flex items-center justify-center gap-3 rounded-xl group">
                        <Instagram size={20} className="group-hover:scale-110 transition-transform" /> Ver Trabajos
                      </a>
                    </motion.div>
                  </motion.div>
                ) : (
                  /* RENDER TIPO 2: PROMOCIONAL */
                  <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col items-center pointer-events-auto">
                    <motion.div variants={popUp} className="mb-6 inline-flex items-center gap-2 bg-black/80 border border-white/20 px-6 py-2 rounded-full text-[10px] md:text-xs font-black text-white uppercase tracking-[0.4em] shadow-xl backdrop-blur-md">
                      {currentSlideData.tag || 'EMPERADOR STORE'}
                    </motion.div>
                    
                    <div className="overflow-hidden mb-2">
                      <motion.h2 variants={textReveal} className="text-5xl md:text-8xl font-serif font-black text-white leading-[0.9] tracking-tighter uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                        {currentSlideData.title}
                      </motion.h2>
                    </div>
                    <div className="overflow-hidden mb-12">
                      <motion.h3 variants={textReveal} className="text-2xl md:text-4xl font-serif font-bold text-amber-500 leading-tight tracking-widest uppercase drop-shadow-lg bg-black/30 px-6 py-2 rounded-xl backdrop-blur-sm inline-block">
                        {currentSlideData.subtitle}
                      </motion.h3>
                    </div>

                    <motion.div variants={popUp} className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full">
                      <Link href="/tienda" className="px-12 py-5 bg-white text-black font-black uppercase tracking-[0.2em] text-sm hover:bg-amber-500 transition-colors shadow-2xl flex items-center justify-center gap-3 rounded-xl hover:scale-105 duration-300">
                        Ir a la Tienda <ShoppingCart size={20} />
                      </Link>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Indicadores de Paginación */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-50">
          {[...Array(totalSlides)].map((_, idx) => (
            <button key={idx} onClick={() => setCurrentHeroSlide(idx)} className={`h-2 rounded-full transition-all duration-500 ${currentHeroSlide === idx ? 'bg-amber-500 w-12 shadow-[0_0_10px_rgba(217,119,6,0.8)]' : 'bg-white/50 hover:bg-amber-500/50 w-3 backdrop-blur-md'}`} aria-label={`Ir al slide ${idx + 1}`} />
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
      {/* 2. LA EXPERIENCIA (VIDEO: presentacion.mp4 - Formato Vertical como Reel) */}
      {/* ========================================================================= */}
      <section className="py-24 md:py-32 relative border-b border-zinc-900 overflow-hidden">
        {/* Fondo: El mismo video pero desenfocado y oscuro */}
        <div className="absolute inset-0 z-0">
          <video src="/presentacion.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover opacity-30 blur-2xl scale-110" />
          <div className="absolute inset-0 bg-[#050505]/70" />
        </div>
        
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
              <motion.h2 variants={fadeUp} className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">La Experiencia</motion.h2>
              <motion.h3 variants={fadeUp} className="text-4xl md:text-6xl font-serif font-black text-white uppercase tracking-tighter leading-[0.9] mb-6">
                MÁS QUE UN CORTE,<br/> <span className="text-zinc-500">UN RITUAL.</span>
              </motion.h3>
              <motion.p variants={fadeUp} className="text-zinc-300 text-lg leading-relaxed mb-8 max-w-lg">
                Nuestra administradora te cuenta por qué Emperador Barbershop ha redefinido el estándar de grooming masculino en Curicó. Atención premium, instalaciones de primer nivel y un resultado impecable garantizado.
              </motion.p>
           </motion.div>
           
           {/* Recuadro vertical para el video de presentación */}
           <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} className="flex justify-center lg:justify-end">
              <DistributedVideo 
                 src="/presentacion.mp4" 
                 onUnmute={handleGlobalReelUnmute} 
                 className="w-[300px] md:w-[360px] h-[550px] md:h-[650px] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.6)] border border-white/10" 
              />
           </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. EQUIPO DE TRABAJO (TEAM EMPERADOR) */}
      {/* ========================================================================= */}
      <section id="squad" className="py-24 md:py-32 bg-zinc-950 relative overflow-hidden border-b border-zinc-900">
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">Conoce a los Maestros</h2>
            <h3 className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter leading-none">TEAM EMPERADOR.</h3>
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
      {/* 4. SERVICIOS DESTACADOS (VIDEO: cortes.mp4) */}
      {/* ========================================================================= */}
      <section id="servicios" className="py-24 md:py-32 bg-[#050505] relative border-b border-zinc-900">
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-16 md:mb-24 gap-12">
             <div className="flex-1">
               <motion.h2 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">Lo Más Pedido</motion.h2>
               <motion.h3 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} className="text-5xl md:text-9xl font-serif font-black text-white uppercase tracking-tighter leading-none mb-6">SERVICIOS.</motion.h3>
               <motion.p initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} className="text-zinc-500 font-bold uppercase tracking-widest text-xs border-l-2 border-amber-500 pl-6 max-w-sm">
                 Técnicas de vanguardia y productos premium para garantizar un resultado de nivel imperial.
               </motion.p>
             </div>
             
             <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} className="w-full lg:w-[400px] h-[300px] shrink-0">
               <DistributedVideo src="/cortes.mp4" onUnmute={handleGlobalReelUnmute} className="w-full h-full rounded-[2rem] shadow-xl border border-zinc-800" />
             </motion.div>
          </div>
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {services.map((s, i) => (
               <motion.div key={s.id || i} variants={popUp} whileHover={{ y: -10, scale: 1.02 }} className="group p-8 bg-zinc-900/40 border border-zinc-800 rounded-[2rem] hover:bg-zinc-900 hover:border-amber-500 transition-all duration-300 flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-black border border-zinc-800 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-400 transition-colors mb-6 shadow-lg duration-300">
                      <DynamicIcon name={s.iconName || "Scissors"} />
                    </div>
                    <h4 className="text-xl font-black text-white uppercase mb-3 leading-tight group-hover:text-amber-500 transition-colors line-clamp-2">{s.name}</h4>
                    <p className="text-zinc-500 font-medium mb-8 text-sm leading-relaxed line-clamp-3">{s.desc}</p>
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-end pt-6 border-t border-zinc-800 mb-6 group-hover:border-amber-500/30 transition-colors">
                      <div>
                        <span className="block text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">{s.time}</span>
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
          
          <div className="text-center mt-16">
            <Link href="/servicios" className="inline-flex items-center gap-2 text-amber-500 hover:text-white font-black uppercase tracking-[0.2em] text-sm border-b border-amber-500 hover:border-white pb-1 transition-colors">
              Ver Menú Completo <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. VIP ROOM (VIDEO: mesadepool.mp4) */}
      {/* ========================================================================= */}
      <section id="flow" className="py-24 md:py-32 relative bg-zinc-950 border-b border-zinc-900">
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-20 items-center relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}>
            <motion.h2 variants={fadeUp} className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">El Club Privado</motion.h2>
            <motion.h3 variants={fadeUp} className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter leading-[0.9] mb-8">
              EL VIP ES <br /> <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-500 to-zinc-800">PARA TODOS.</span>
            </motion.h3>
            <motion.p variants={fadeUp} className="text-zinc-400 text-lg md:text-xl font-medium leading-relaxed mb-12 max-w-lg">
              La espera aburrida es del pasado. Hemos transformado nuestro salón en un santuario. Llega temprano a tu cita, es un privilegio.
            </motion.p>
            <motion.div variants={fadeUp} className="space-y-6">
              <div className="flex items-center gap-6 p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl hover:border-amber-500/50 transition-colors group shadow-lg">
                <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform"><Gamepad2 size={32} /></div>
                <div><h4 className="text-white font-black text-xl uppercase tracking-tight">PlayStation 5 Libre</h4><p className="text-zinc-500 text-sm font-medium mt-1">Últimos títulos. Juega mientras esperas.</p></div>
              </div>
              <div className="flex items-center gap-6 p-6 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl hover:border-amber-500/50 transition-colors group shadow-lg">
                <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform"><Crown size={32} /></div>
                <div><h4 className="text-white font-black text-xl uppercase tracking-tight">Mesa de Pool Premium</h4><p className="text-zinc-500 text-sm font-medium mt-1">Desafía a tus panas. 100% gratuita.</p></div>
              </div>
            </motion.div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }} className="relative h-[500px] md:h-[700px] w-full group">
            <div className="absolute inset-0 bg-amber-500 translate-x-4 translate-y-4 rounded-[3rem] opacity-20 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-500" />
            <div className="relative h-full w-full rounded-[3rem] overflow-hidden border border-zinc-800 shadow-2xl bg-zinc-900">
               {/* FIX: Video automático de fondo para la sección VIP sin opacidades negras que lo oculten */}
               <DistributedVideo 
                 src="/mesadepool.mp4" 
                 onUnmute={handleGlobalReelUnmute} 
                 className="w-full h-full"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. EL SALÓN (VIDEO: barberia.mp4) */}
      {/* ========================================================================= */}
      <section className="py-24 md:py-32 bg-[#050505] relative border-b border-zinc-900">
        <div className="max-w-[1400px] mx-auto px-6 text-center mb-16 relative z-10">
           <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">Instalaciones Premium</h2>
           <h3 className="text-4xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter leading-none">NUESTRO SALÓN.</h3>
        </div>
        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
           <DistributedVideo 
              src="/barberia.mp4" 
              onUnmute={handleGlobalReelUnmute} 
              className="w-full h-[300px] md:h-[600px] rounded-[2rem] shadow-2xl border border-zinc-800" 
           />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. INSTAGRAM (ENLACE FORZADO AL PERFIL REAL) */}
      {/* ========================================================================= */}
      <section id="instagram" className="py-24 md:py-32 bg-zinc-950 relative overflow-hidden border-b border-zinc-900">
         {/* Fondo estilo desenfocado */}
         <div className="absolute inset-0 opacity-30 pointer-events-none">
           <Image src="https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=2000&auto=format&fit=crop" fill className="object-cover blur-3xl scale-110" alt="Insta Background" unoptimized />
         </div>
         
         <div className="max-w-[450px] mx-auto px-4 md:px-0 relative z-10">
            
            {/* Cabecera oscura exterior - ENLACE DIRECTO AL PERFIL */}
            <a href="https://www.instagram.com/emperador_barbershop/" target="_blank" rel="noopener noreferrer" className="flex justify-between items-center mb-4 text-white font-bold text-sm px-2 drop-shadow-md group">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#d6249f] rounded-[0.4rem] p-0.5 group-hover:scale-110 transition-transform">
                  <Instagram size={18} className="text-white" />
                </div>
                <span className="tracking-wide group-hover:text-amber-500 transition-colors">@emperador_barbershop</span>
              </div>
              <span className="text-[10px] md:text-xs uppercase font-black tracking-widest text-zinc-300 group-hover:text-white transition-colors">
                ABRIR APP ↗
              </span>
            </a>

            {/* WHITE CARD CLON EXACTO - TODA LA TARJETA ES UN ENLACE */}
            <div className="bg-white rounded-[1.5rem] overflow-hidden shadow-2xl hover:shadow-[0_0_40px_rgba(214,36,159,0.2)] transition-shadow duration-500">
               
               {/* Cabecera de la tarjeta */}
               <a href="https://www.instagram.com/emperador_barbershop/" target="_blank" rel="noopener noreferrer" className="block p-5 md:p-6 relative group">
                  {/* Icono Insta flotante derecha */}
                  <div className="absolute top-5 right-5 group-hover:scale-110 transition-transform">
                     <Instagram size={28} className="text-[#d6249f]" />
                  </div>

                  {/* Perfil & Estadísticas */}
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
                        <p className="text-zinc-500 text-[12px] md:text-[13px]">12,5 mil seguidores</p>
                        <p className="text-zinc-400 text-[10px] my-0.5">•</p>
                        <p className="text-zinc-500 text-[12px] md:text-[13px]">849 publicaciones</p>
                     </div>
                  </div>
               </a>

               {/* Grid de Fotos (Todos los enlaces forzados al perfil) */}
               <div className="grid grid-cols-3 gap-0.5 bg-gray-200">
                  {reels.slice(0, 6).map((post) => (
                    <a 
                      key={post.id} 
                      href="https://www.instagram.com/emperador_barbershop/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="relative aspect-square bg-white overflow-hidden group block"
                    >
                       <MediaRenderer 
                         type={post.media_type || (post.type === 'reel' ? 'video' : 'image')} 
                         url={post.media_url} 
                         alt="Insta Post" 
                         className="group-hover:scale-105 transition-transform duration-500" 
                       />
                       <div className="absolute top-2 right-2 text-white drop-shadow-md">
                          {post.type === 'reel' || post.media_type === 'video' ? <Clapperboard size={14} fill="currentColor" /> : null}
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
      </section>

      {/* ========================================================================= */}
      {/* 8. AYUDA / FAQ */}
      {/* ========================================================================= */}
      <section id="faq" className="py-24 md:py-32 bg-[#050505]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
             <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">Resolviendo Dudas</h2>
             <h3 className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter">AYUDA.</h3>
             <p className="text-zinc-400 mt-6 font-medium text-lg">Todo lo que necesitas saber antes de asegurar tu trono.</p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, i) => <FAQItem key={faq.id || i} faq={faq} />)}
          </div>
        </div>
      </section>

    </main>
  );
}