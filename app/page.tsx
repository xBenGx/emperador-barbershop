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
  Lock, LayoutGrid, Clapperboard, Droplets, Sparkles, Wand2,
  UserCircle, Briefcase, KeyRound, ShoppingCart, Disc, Volume2, VolumeX, Volume1, Music
} from "lucide-react";

// Importamos el cliente de Supabase
import { createClient } from "@/utils/supabase/client";

// ============================================================================
// DATA MAESTRA (FALLBACKS) - Se usarán si la Base de Datos está vacía
// ============================================================================

const FALLBACK_STORE_SLIDES = [
  {
    id: "1",
    tag: "LAST DAY!",
    titleLeft: "Wahl Magic Clip",
    subtitleLeft: "Edición Gold Cordless",
    priceLeft: "$149.990",
    oldPriceLeft: "$189.990",
    titleRight: "Detailer Li",
    subtitleRight: "Trimmer Gold",
    priceRight: "$119.990",
    oldPriceRight: "$149.990",
    image: "https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=2000&auto=format&fit=crop", 
    promoText: "Por la compra de una Wahl Magic Clip en LastDay!,",
    promoHighlight: "+$19.990",
    promoEnd: "lleva un set de peines premium.",
    sku: "SKU: WAHL-GOLD-PACK"
  },
  {
    id: "2",
    tag: "NUEVO STOCK",
    titleLeft: "Pomada Reuzel",
    subtitleLeft: "Matte Clay 113g",
    priceLeft: "$22.990",
    oldPriceLeft: "$28.990",
    titleRight: "Pomada Reuzel",
    subtitleRight: "Extreme Hold 113g",
    priceRight: "$22.990",
    oldPriceRight: "$28.990",
    image: "https://images.unsplash.com/photo-1597354984706-fac992d9306f?q=80&w=2000&auto=format&fit=crop", 
    promoText: "Por la compra de 2 pomadas Reuzel en la web,",
    promoHighlight: "ENVÍO GRATIS",
    promoEnd: "a todo Curicó.",
    sku: "SKU: REUZEL-PACK-02"
  }
];

const FALLBACK_TEAM = [
  { id: "cesar", name: "Cesar Luna", role: "Master Barber", tag: "El Arquitecto", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop" },
  { id: "jack", name: "Jack Guerra", role: "Fade Specialist", tag: "Rey del Fade", img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop" },
  { id: "jhonn", name: "Jhonn Prado", role: "Beard Expert", tag: "Precisión", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop" },
  { id: "marcos", name: "Marcos Peña", role: "Senior Barber", tag: "Versatilidad", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop" },
];

const FALLBACK_SERVICES = [
  { id: "s1", name: "Corte Clásico / Degradado", time: "1 hrs", price: "$12.000", desc: "El corte que define tu estilo. Clean, fresh, de líneas perfectas.", iconName: "Scissors" },
  { id: "s2", name: "Corte + Perfilado de Cejas", time: "1 hrs", price: "$14.000", desc: "Sube de nivel tu mirada. Detalles quirúrgicos que marcan la diferencia.", iconName: "Crosshair" },
  { id: "s3", name: "Barba + Vapor Caliente", time: "30 min", price: "$7.000", desc: "Afeitado VIP. Abrimos los poros para un acabado de seda y cero irritación.", iconName: "Flame" },
  { id: "s4", name: "Corte + Barba + Lavado GRATIS", time: "1h 5m", price: "$17.000", desc: "El combo indispensable para salir listo directo al fin de semana.", iconName: "Zap" },
  { id: "s5", name: "Limpieza Facial + Vapor", time: "25 min", price: "$10.000", desc: "Skin care masculino. Vapor, extracción de impurezas y mascarilla.", iconName: "Sparkles" },
  { id: "s6", name: "Corte + Barba + Cejas + Lavado", time: "1h 15m", price: "$20.000", desc: "Mantenimiento total. Renovación completa en una sola sesión.", iconName: "Crown" },
  { id: "s7", name: "Servicio Emperador VIP", time: "1h 30m", price: "$35.000", desc: "La experiencia definitiva. Trato de realeza garantizado.", iconName: "Star" },
  { id: "s8", name: "Platinado + Corte + Cejas", time: "5 hrs", price: "$90.000", desc: "Decoloración global nivel platino. Transformación extrema.", iconName: "Flame" },
];

const FALLBACK_REVIEWS = [
  { name: "Matías R.", text: "El mejor fade de Curicó. Mientras esperaba jugué una partida de PS5. Servicio 10/10.", rating: 5 },
  { name: "Carlos D.", text: "Atención de primer nivel. Cesar es un artista con la tijera. El local tiene muchísimo flow.", rating: 5 },
  { name: "Andrés M.", text: "Ritual de barba con vapor increíble. Salí renovado. Los cabros tienen un talento brutal.", rating: 5 },
];

const FALLBACK_FAQS = [
  { q: "¿Necesito cuenta para reservar?", a: "No, en Emperador valoramos tu tiempo. Puedes agendar como invitado en menos de 1 minuto ingresando solo tu nombre y número." },
  { q: "¿El uso de PS5 tiene costo?", a: "Para nada. PS5 y la mesa de Pool son un beneficio exclusivo y 100% gratuito para nuestros clientes mientras esperan." },
  { q: "¿Qué métodos de pago aceptan?", a: "Para tu comodidad, aceptamos Efectivo, Transferencia Electrónica y todas las tarjetas de Débito/Crédito vía Transbank." },
  { q: "¿Puedo comprar productos online?", a: "Sí, contamos con una tienda integrada donde puedes adquirir ceras, pomadas y máquinas profesionales con retiro en tienda o envío a domicilio." },
];

// IG Grid de 6 elementos cuadrados perfectos
const INSTA_REELS = [
  { id: 1, likes: "12.4k", comments: "145", type: "post", img: "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=600&h=600&auto=format&fit=crop" },
  { id: 2, likes: "8.2k", comments: "98", type: "reel", img: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=600&h=600&auto=format&fit=crop" },
  { id: 3, likes: "15.1k", comments: "230", type: "post", img: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=600&h=600&auto=format&fit=crop" },
  { id: 4, likes: "20.5k", comments: "314", type: "reel", img: "https://images.unsplash.com/photo-1620331311520-246422fd82f9?q=80&w=600&h=600&auto=format&fit=crop" },
  { id: 5, likes: "9.8k", comments: "112", type: "post", img: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=600&h=600&auto=format&fit=crop" },
  { id: 6, likes: "18.3k", comments: "289", type: "reel", img: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?q=80&w=600&h=600&auto=format&fit=crop" },
];

const DynamicIcon = ({ name, size = 24 }: { name: string, size?: number }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Scissors;
  return <IconComponent size={size} />;
};

// ============================================================================
// ANIMACIONES
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

  const [team, setTeam] = useState<any[]>(FALLBACK_TEAM);
  const [services, setServices] = useState<any[]>(FALLBACK_SERVICES);
  const [storeSlides, setStoreSlides] = useState<any[]>(FALLBACK_STORE_SLIDES);
  const [reviews, setReviews] = useState<any[]>(FALLBACK_REVIEWS);
  const [faqs, setFaqs] = useState<any[]>(FALLBACK_FAQS);

  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const totalSlides = 1 + storeSlides.length;
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 1000], [0, 400]);

  // ============================================================================
  // ESTADOS DEL REPRODUCTOR DE MÚSICA AVANZADO
  // ============================================================================
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeInterval = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMusicHovered, setIsMusicHovered] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [volume, setVolume] = useState(0.3); 
  const [isMuted, setIsMuted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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
        }).catch(() => console.log("Autoplay bloqueado."));
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

  // ============================================================================
  // FETCH Y SLIDERS
  // ============================================================================
  useEffect(() => {
    const slideInterval = setInterval(() => setCurrentHeroSlide((prev) => (prev + 1) % totalSlides), 7000); 
    return () => clearInterval(slideInterval);
  }, [totalSlides]);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const { data: dbTeam } = await supabase.from('Barbers').select('*').order('created_at', { ascending: true });
        if (dbTeam?.length) setTeam(dbTeam);
        const { data: dbServices } = await supabase.from('Services').select('*').order('created_at', { ascending: true });
        if (dbServices?.length) setServices(dbServices);
        const { data: dbStore } = await supabase.from('StoreProducts').select('*').order('created_at', { ascending: false });
        if (dbStore?.length) setStoreSlides(dbStore);
        const { data: dbReviews } = await supabase.from('Reviews').select('*');
        if (dbReviews?.length) setReviews(dbReviews);
        const { data: dbFaqs } = await supabase.from('Faqs').select('*');
        if (dbFaqs?.length) setFaqs(dbFaqs);
      } catch (error) {
        console.log("Usando datos por defecto.");
      }
    }
    fetchAdminData();
  }, [supabase]);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <main className="bg-[#050505] min-h-screen font-sans selection:bg-amber-500 selection:text-black overflow-x-hidden relative -mt-24 md:-mt-28">
      
      <audio ref={audioRef} src="/vibe.mp3" loop preload="auto" />
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      {/* ========================================================================= */}
      {/* COMPONENTES FLOTANTES */}
      {/* ========================================================================= */}
      
      {/* MÚSICA (Avanzado) */}
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
                  <div className="flex items-center gap-2">
                    <button onClick={toggleMute} className="text-zinc-400 hover:text-amber-500 transition-colors focus:outline-none p-1"><VolumeIcon size={16} /></button>
                    <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-16 md:w-20 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-amber-500 hover:bg-zinc-700 transition-colors [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-125 transition-transform" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}

      {/* BOTÓN AGENDAR (Derecha) */}
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2, type: "spring", stiffness: 100 }} className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[100]">
        <Link href="/reservar" className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-amber-500 rounded-full shadow-[0_0_30px_rgba(217,119,6,0.8)] hover:scale-110 transition-transform group border-2 border-amber-300">
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 rounded-full bg-amber-500"></motion.div>
          <Scissors size={28} className="text-black relative z-10 group-hover:rotate-180 transition-transform duration-500" />
        </Link>
      </motion.div>

      {/* ========================================================================= */}
      {/* 1. HERO GLOBAL (Carrusel) */}
      {/* ========================================================================= */}
      <section className="relative w-full h-[100dvh] flex items-center justify-center overflow-hidden bg-black">
        
        <AnimatePresence mode="wait">
          <motion.div key={currentHeroSlide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeInOut" }} className="absolute inset-0 w-full h-full">
            
            {/* SLIDE 0: HERO MARCA */}
            {currentHeroSlide === 0 && (
              <div className="w-full h-full relative flex items-center justify-center">
                <motion.div style={{ y: yHero }} className="absolute inset-0 w-full h-full z-0">
                  <Image src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=2000&auto=format&fit=crop" alt="Barbería Emperador" fill className="object-cover grayscale contrast-125 opacity-50 scale-105" priority unoptimized />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
                </motion.div>

                {/* FIX DEL ESPACIO: Agregado mt-32 md:mt-48 para empujar el texto debajo de la Navbar, sin mover el fondo */}
                <div className="relative z-10 w-full max-w-[1400px] px-6 text-center mt-32 md:mt-48">
                  <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
                    <motion.div variants={popUp} className="mb-6 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/50 px-6 py-2 rounded-full text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-[0.4em] shadow-[0_0_20px_rgba(217,119,6,0.2)] backdrop-blur-md">
                      <MapPin size={14} /> Peña 666, Piso 2 • Curicó
                    </motion.div>
                    
                    <div className="overflow-hidden mb-2">
                      <motion.h2 variants={textReveal} className="text-[14vw] lg:text-[11rem] font-serif font-black text-white leading-[0.8] tracking-tighter uppercase drop-shadow-2xl">
                        EMPERADOR
                      </motion.h2>
                    </div>
                    <div className="overflow-hidden mb-8">
                      <motion.h2 variants={textReveal} className="text-[10vw] lg:text-[8rem] font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-700 leading-[0.8] tracking-widest uppercase drop-shadow-2xl">
                        BARBERSHOP
                      </motion.h2>
                    </div>
                    
                    <motion.p variants={popUp} className="text-zinc-300 text-lg md:text-2xl font-medium max-w-2xl mx-auto mb-12 drop-shadow-md">
                      La barbería no es un trámite, es un ritual. Disfruta de la mejor experiencia de grooming, atención premium, PS5 y mesa de Pool.
                    </motion.p>
                    
                    <motion.div variants={popUp} className="flex flex-col sm:flex-row items-center gap-4 justify-center w-full">
                      <Link href="/reservar" className="relative overflow-hidden w-full sm:w-auto px-12 py-5 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-sm hover:text-black transition-all shadow-[0_0_40px_rgba(217,119,6,0.5)] flex items-center justify-center gap-3 rounded-xl group hover:scale-105">
                        <span className="relative z-10 flex items-center gap-3">Asegura tu Trono <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></span>
                        <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-0" />
                      </Link>
                      <a href="#instagram" className="w-full sm:w-auto px-8 py-5 border border-zinc-700 bg-zinc-900/50 backdrop-blur-sm text-white font-black uppercase tracking-[0.2em] text-sm hover:border-amber-500 hover:text-amber-500 transition-all flex items-center justify-center gap-3 rounded-xl group">
                        <Instagram size={20} className="group-hover:scale-110 transition-transform" /> Ver Trabajos
                      </a>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            )}

            {/* SLIDE > 0: PRODUCTOS DESTACADOS A PANTALLA COMPLETA */}
            {currentHeroSlide > 0 && (
              <div className="w-full h-full relative flex items-center justify-center">
                <div className="absolute inset-0 z-0">
                  <Image src={storeSlides[currentHeroSlide - 1].image} alt="Producto Destacado" fill className="object-cover object-center grayscale-[20%] opacity-40 scale-105" unoptimized />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/40 to-[#050505]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
                </div>
                
                {/* FIX DEL ESPACIO: mt-32 md:mt-40 agregado aquí también para empujar el recuadro bajo la Navbar */}
                <div className="relative z-10 w-full max-w-[1400px] px-6 mt-32 md:mt-40 flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
                    <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                      <div className="inline-block px-4 py-1.5 border border-amber-500 text-amber-500 font-black text-[10px] uppercase tracking-[0.3em] rounded-full mb-6 backdrop-blur-md bg-black/40">EMPERADOR STORE</div>
                      <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none mb-2 drop-shadow-2xl">{storeSlides[currentHeroSlide - 1].tag}</h2>
                    </motion.div>

                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 bg-[#050505]/80 p-6 md:p-8 rounded-3xl backdrop-blur-xl border border-zinc-800/80 w-full max-w-lg shadow-2xl">
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                          <h3 className="text-white font-bold text-lg md:text-xl leading-tight">{storeSlides[currentHeroSlide - 1].titleLeft}</h3>
                          <p className="text-zinc-400 font-medium text-xs mb-2">{storeSlides[currentHeroSlide - 1].subtitleLeft}</p>
                          <p className="text-amber-500 font-black text-3xl tracking-tighter">{storeSlides[currentHeroSlide - 1].priceLeft}</p>
                          <p className="text-zinc-500 font-medium text-[10px] uppercase tracking-widest line-through">{storeSlides[currentHeroSlide - 1].oldPriceLeft}</p>
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-lg md:text-xl leading-tight">{storeSlides[currentHeroSlide - 1].titleRight}</h3>
                          <p className="text-zinc-400 font-medium text-xs mb-2">{storeSlides[currentHeroSlide - 1].subtitleRight}</p>
                          <p className="text-amber-500 font-black text-3xl tracking-tighter">{storeSlides[currentHeroSlide - 1].priceRight}</p>
                          <p className="text-zinc-500 font-medium text-[10px] uppercase tracking-widest line-through">{storeSlides[currentHeroSlide - 1].oldPriceRight}</p>
                        </div>
                      </div>

                      <div className="border-t border-zinc-800/50 pt-6">
                        <Link href="/tienda" className="w-full py-4 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-sm rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(217,119,6,0.3)] flex items-center justify-center gap-2 group">
                          <ShoppingCart size={18} className="group-hover:-rotate-12 transition-transform" /> Lo Quiero
                        </Link>
                        <p className="text-zinc-400 font-medium text-[11px] leading-relaxed mt-4 text-center">
                          {storeSlides[currentHeroSlide - 1].promoText} <br/>
                          <span className="text-amber-500 font-black">{storeSlides[currentHeroSlide - 1].promoHighlight}</span> {storeSlides[currentHeroSlide - 1].promoEnd}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 z-50">
          {[...Array(totalSlides)].map((_, idx) => (
            <button key={idx} onClick={() => setCurrentHeroSlide(idx)} className={`h-2 rounded-full transition-all duration-500 ${currentHeroSlide === idx ? 'bg-amber-500 w-12 shadow-[0_0_10px_rgba(217,119,6,0.8)]' : 'bg-zinc-600/50 hover:bg-amber-500/50 w-3 backdrop-blur-md'}`} aria-label={`Ir al slide ${idx + 1}`} />
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
      {/* 2. EQUIPO DE TRABAJO (TEAM EMPERADOR) */}
      {/* ========================================================================= */}
      <section id="squad" className="py-24 md:py-32 bg-[#050505] relative overflow-hidden border-b border-zinc-900">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-600/5 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">Conoce a los Maestros</h2>
            <h3 className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter leading-none">TEAM EMPERADOR.</h3>
          </div>
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((t, i) => (
              <motion.div key={t.id || i} variants={popUp} className="group relative h-[450px] md:h-[600px] rounded-[2rem] overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer shadow-xl hover:shadow-[0_20px_50px_rgba(217,119,6,0.3)] transition-all duration-500">
                <Image src={t.img} fill alt={t.name} className="object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" unoptimized />
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
      {/* 3. SERVICIOS (MENÚ) */}
      {/* ========================================================================= */}
      <section id="servicios" className="py-24 md:py-32 bg-zinc-950 relative">
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 md:mb-24 gap-8">
             <div>
               <motion.h2 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">El Menú Completo</motion.h2>
               <motion.h3 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} className="text-5xl md:text-9xl font-serif font-black text-white uppercase tracking-tighter leading-none">SERVICIOS.</motion.h3>
             </div>
             <motion.p initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} className="text-zinc-500 font-bold uppercase tracking-widest text-xs border-l-2 border-amber-500 pl-6 max-w-sm">
               Técnicas de vanguardia y productos premium para garantizar un resultado de nivel imperial.
             </motion.p>
          </div>
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {services.map((s, i) => (
               <motion.div key={s.id || i} variants={popUp} whileHover={{ y: -10, scale: 1.02 }} className="group p-8 bg-zinc-900/40 border border-zinc-800 rounded-[2rem] hover:bg-zinc-900 hover:border-amber-500 transition-all duration-300 flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-black border border-zinc-800 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-400 transition-colors mb-6 shadow-lg duration-300">
                      <DynamicIcon name={s.iconName || "Scissors"} />
                    </div>
                    <h4 className="text-xl font-black text-white uppercase mb-3 leading-tight group-hover:text-amber-500 transition-colors line-clamp-2">{s.name}</h4>
                    <p className="text-zinc-500 font-medium mb-8 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-end pt-6 border-t border-zinc-800 mb-6 group-hover:border-amber-500/30 transition-colors">
                      <div>
                        <span className="block text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">{s.time}</span>
                        <span className="text-3xl font-black text-amber-500 tracking-tighter">{s.price}</span>
                      </div>
                    </div>
                    <Link href="/reservar" className="w-full py-4 bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-xl flex justify-center items-center gap-2 group-hover:bg-white group-hover:text-black transition-colors border border-zinc-800 active:scale-95">
                       Seleccionar <ChevronRight size={14} />
                    </Link>
                  </div>
               </motion.div>
             ))}
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. VIP ROOM (THE VIBE) */}
      {/* ========================================================================= */}
      <section id="flow" className="py-24 md:py-32 relative bg-[#050505] border-t border-zinc-900">
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
            <div className="relative h-full w-full rounded-[3rem] overflow-hidden border border-zinc-800 shadow-2xl">
               <Image src="https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop" fill alt="PS5 Experience" className="object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105" unoptimized />
               <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. REVIEWS & TRUST */}
      {/* ========================================================================= */}
      <section className="py-24 bg-zinc-900/30 border-y border-zinc-900">
        <div className="max-w-[1400px] mx-auto px-6">
           <div className="text-center mb-16">
             <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em]">El Respeto se Gana</h2>
           </div>
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {reviews.map((r, i) => (
                <motion.div key={i} variants={fadeUp} className="p-10 bg-zinc-950 border border-zinc-800 rounded-[2rem] relative overflow-hidden group hover:border-amber-500 transition-colors shadow-xl hover:-translate-y-2 duration-300">
                   <div className="absolute -top-6 -right-6 text-zinc-900 group-hover:text-amber-500/10 transition-colors group-hover:rotate-12 duration-500"><MessageSquare size={120} /></div>
                   <div className="flex gap-1 mb-6 text-amber-500 relative z-10">
                     {[...Array(r.rating)].map((_, j) => <Star key={j} size={16} fill="currentColor" />)}
                   </div>
                   <p className="text-white text-lg font-medium leading-relaxed italic mb-8 relative z-10">"{r.text}"</p>
                   <div className="flex items-center gap-4 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-amber-500 font-black text-xs border border-zinc-700">{r.name[0]}</div>
                      <span className="text-zinc-400 font-black uppercase text-[10px] tracking-widest">{r.name}</span>
                   </div>
                </motion.div>
              ))}
           </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. INSTAGRAM V2 (DISEÑO REPLICA WEB OFICIAL) */}
      {/* ========================================================================= */}
      <section id="instagram" className="py-24 md:py-32 bg-black relative overflow-hidden border-b border-zinc-900">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] h-[400px] bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
         
         <div className="max-w-[950px] mx-auto px-4 md:px-6 relative z-10">
            
            {/* Cabecera Tipo Instagram */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10 mb-12">
               
               {/* Foto de perfil con anillo de historia */}
               <div className="relative w-28 h-28 sm:w-36 sm:h-36 shrink-0">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#d6249f] p-[3px]">
                     <div className="bg-black w-full h-full rounded-full border-2 border-black overflow-hidden relative">
                        <Image src="/logo.png" alt="Emperador Logo Instagram" fill className="object-cover p-2" />
                     </div>
                  </div>
               </div>
               
               {/* Info del perfil */}
               <div className="flex-1 text-white text-center sm:text-left w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
                     <h2 className="text-xl sm:text-2xl font-medium tracking-wide flex items-center justify-center sm:justify-start gap-2">
                       emperador_barbershop 
                       <CheckCircle size={18} className="text-blue-500 fill-blue-500/20" />
                     </h2>
                     <div className="flex gap-2 justify-center sm:justify-start">
                       <a href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer" className="bg-[#0095f6] hover:bg-[#1877f2] text-white font-bold text-sm py-1.5 px-6 rounded-lg transition-colors">
                         Seguir
                       </a>
                       <a href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer" className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm py-1.5 px-4 rounded-lg transition-colors">
                         Mensaje
                       </a>
                     </div>
                  </div>
                  
                  {/* Contadores */}
                  <div className="flex justify-center sm:justify-start gap-6 sm:gap-10 mb-5 text-sm sm:text-base border-y border-zinc-800/50 py-3 sm:border-0 sm:py-0">
                     <span><span className="font-bold">849</span> publicaciones</span>
                     <span><span className="font-bold">12.5 mil</span> seguidores</span>
                     <span><span className="font-bold">120</span> seguidos</span>
                  </div>
                  
                  {/* Bio */}
                  <div className="text-sm sm:text-base leading-snug">
                     <p className="font-bold mb-1">Emperador BarberShop</p>
                     <p className="text-zinc-200 whitespace-pre-line">
                       Barbería Premium en Curicó 💈<br/>
                       ✂️ Fades & Grooming de Alto Nivel<br/>
                       🎮 PS5 & Pool Room VIP<br/>
                       📍 Peña 666, Piso 2 (Costado Falabella)
                     </p>
                     <a href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer" className="text-[#e0f1ff] font-bold hover:underline mt-1 block">
                       instagram.com/emperador_barbershop
                     </a>
                  </div>
               </div>
            </motion.div>

            {/* Pestañas de Navegación Instagram */}
            <div className="flex justify-center border-t border-zinc-800 mb-1 gap-12">
               <button className="flex items-center gap-2 pt-4 font-bold text-xs uppercase tracking-widest text-white border-t border-white -mt-px">
                 <LayoutGrid size={14} /> Publicaciones
               </button>
               <button className="flex items-center gap-2 pt-4 font-bold text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors">
                 <Clapperboard size={14} /> Reels
               </button>
            </div>

            {/* Grid 3x2 Perfecto de Instagram */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-3 gap-1 md:gap-2">
               {INSTA_REELS.map((post) => (
                  <motion.a 
                    key={post.id} href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer"
                    variants={popUp} className="group relative aspect-square bg-zinc-900 overflow-hidden cursor-pointer"
                  >
                     <Image src={post.img} fill alt="Instagram Content" className="object-cover group-hover:scale-105 transition-transform duration-700" unoptimized />
                     <div className="absolute top-2 right-2 text-white drop-shadow-md">
                        {post.type === 'reel' ? <Clapperboard size={18} fill="currentColor" /> : null}
                     </div>
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6 backdrop-blur-[2px]">
                        <div className="flex items-center gap-2 text-white font-bold text-lg"><Heart fill="currentColor" size={22} /> {post.likes}</div>
                        <div className="flex items-center gap-2 text-white font-bold text-lg"><MessageCircle fill="currentColor" size={22} /> {post.comments}</div>
                     </div>
                  </motion.a>
               ))}
            </motion.div>
            
            <div className="text-center mt-12">
               <a href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-zinc-400 hover:text-amber-500 text-sm font-bold uppercase tracking-widest transition-colors">
                 Ver más en Instagram <ExternalLink size={16} />
               </a>
            </div>
         </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. AYUDA / FAQ */}
      {/* ========================================================================= */}
      <section id="faq" className="py-24 md:py-32 bg-[#0a0a0a] border-y border-zinc-900">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
             <h2 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] mb-4">Resolviendo Dudas</h2>
             <h3 className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter">AYUDA.</h3>
             <p className="text-zinc-400 mt-6 font-medium text-lg">Todo lo que necesitas saber antes de asegurar tu trono.</p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, i) => <FAQItem key={i} faq={faq} />)}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. CTA FINAL & FOOTER PREMIUM */}
      {/* ========================================================================= */}
      <footer className="bg-black pt-24 pb-12 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[300px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="max-w-[1400px] mx-auto text-center mb-20 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={popUp}>
            <div className="mx-auto w-24 h-24 md:w-32 md:h-32 mb-8 rounded-full overflow-hidden border-2 border-amber-500 shadow-[0_0_30px_rgba(217,119,6,0.4)] relative bg-zinc-950 p-2 hover:scale-105 transition-transform duration-500">
               <div className="relative w-full h-full rounded-full overflow-hidden">
                 <Image src="/logo.png" alt="Emperador Logo Final" fill className="object-cover" />
               </div>
            </div>
            
            <h2 className="text-5xl md:text-[6rem] lg:text-[8rem] font-serif font-black text-white leading-[0.85] tracking-tighter uppercase mb-10 drop-shadow-xl">
              DOMINA EL <br /> <span className="text-amber-500">TRONO.</span>
            </h2>
            <Link href="/reservar" className="px-10 md:px-14 py-5 md:py-6 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-xs md:text-base rounded-2xl hover:bg-white hover:scale-110 transition-all duration-300 shadow-[0_0_40px_rgba(217,119,6,0.4)] inline-flex items-center gap-4 group">
              Agenda Tu Cita <CheckCircle size={24} className="group-hover:text-green-600 transition-colors" />
            </Link>
          </motion.div>
        </div>

        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-zinc-900 pt-16 mb-12 relative z-10">
           {/* Columna 1 */}
           <div>
              <h4 className="text-white font-black text-xl uppercase tracking-tighter mb-6 italic">EMPERADOR</h4>
              <div className="space-y-4 text-zinc-400 font-bold uppercase text-[10px] tracking-[0.2em]">
                 <p className="flex items-center gap-3 hover:text-white transition-colors cursor-default"><MapPin size={16} className="text-amber-500 shrink-0" /> Peña 666, Piso 2, Curicó</p>
                 <a href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-amber-500 transition-colors">
                    <Instagram size={16} className="text-amber-500 shrink-0" /> @emperador_barbershop
                 </a>
              </div>
           </div>
           
           {/* Columna 2 */}
           <div>
              <h4 className="text-zinc-600 font-black uppercase text-xs tracking-widest mb-6">Horarios de Atención</h4>
              <ul className="text-white font-black text-sm uppercase tracking-tighter space-y-2">
                 <li className="flex justify-between border-b border-zinc-900 pb-3 hover:text-amber-500 transition-colors cursor-default"><span>Lunes - Sábado</span> <span className="text-amber-500">10:00 - 20:00</span></li>
                 <li className="flex justify-between text-zinc-700 pt-3 cursor-default"><span>Domingo</span> <span>Cerrado por descanso</span></li>
              </ul>
           </div>
           
           {/* Columna 3 (Accesos Rápidos) */}
           <div className="flex flex-col items-start md:items-end justify-between gap-6 md:gap-0">
              <div className="flex items-center gap-2 text-zinc-500"><ShieldCheck size={16} className="text-green-500" /> <span className="font-black uppercase text-[10px] tracking-widest">Plataforma 100% Segura</span></div>
              
              <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto mt-auto">
                <Link href="/login" className="w-full md:w-auto px-6 py-3 bg-zinc-900 border border-zinc-800 hover:border-amber-500 text-zinc-400 hover:text-white rounded-xl transition-all flex items-center justify-center md:justify-end gap-3 group">
                   <Lock size={14} className="group-hover:text-amber-500 transition-colors" /> 
                   <span className="font-black uppercase text-[10px] tracking-[0.2em]">Intranet Staff</span>
                </Link>
                <p className="text-zinc-700 font-black uppercase text-[9px] tracking-[0.3em] mt-2">
                  DESARROLLADO POR <a href="https://bayx.cl" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:text-amber-500 transition-colors">BAYX AGENCY</a>
                </p>
              </div>
           </div>
        </div>
        
        {/* MARCA DE AGUA GIGANTE FINAL */}
        <div className="text-center text-zinc-900/30 font-black text-[12vw] uppercase leading-none select-none relative z-0 overflow-hidden pointer-events-none mt-4">
           EMPERADOR
        </div>
      </footer>
    </main>
  );
}