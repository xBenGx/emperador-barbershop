"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { 
  Scissors, Clock, Calendar as CalendarIcon, MapPin, 
  ChevronLeft, CheckCircle2, User, Sparkles, ChevronRight,
  Phone, Mail, UserCircle, AlertCircle, Crown, Star, Flame, Crosshair, Zap,
  Droplets, Wand2, ShieldCheck, Lock
} from "lucide-react";

// Importamos el cliente de Supabase
import { createClient } from "@/utils/supabase/client";

// ============================================================================
// DATA DE RESPALDO (Fallbacks) 
// ============================================================================
const FALLBACK_BARBERS = [
  { id: "cesar", name: "Cesar Luna", role: "Master Barber", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop" },
  { id: "jack", name: "Jack Guerra", role: "Fade Specialist", img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop" },
];

const FALLBACK_SERVICES = [
  { id: "s1", name: "Corte Clásico / Degradado", time: "1 hrs", price: "$12.000", desc: "Clean, fresh, de líneas perfectas.", iconName: "Scissors" },
  { id: "s2", name: "Barba + Vapor Caliente", time: "30 min", price: "$7.000", desc: "Afeitado VIP. Poros abiertos, cero irritación.", iconName: "Flame" },
];

// Componente para renderizar iconos dinámicos desde la BD
const DynamicIcon = ({ name, size = 24 }: { name: string, size?: number }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Scissors;
  return <IconComponent size={size} />;
};

// Generador de fechas reales
const generateDates = () => {
  const dates = [];
  const today = new Date();
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
  for(let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    // Saltamos el domingo si no trabajan
    if(d.getDay() !== 0) { 
      dates.push({ 
        day: days[d.getDay()], 
        date: d.getDate().toString(), 
        month: months[d.getMonth()],
        fullDate: d.toISOString().split('T')[0]
      });
    }
  }
  return dates;
};
const DATES = generateDates();

const TIME_SLOTS = {
  manana: ["10:00", "11:00"],
  tarde: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
  noche: ["18:00", "19:00"]
};

// ============================================================================
// ANIMACIONES
// ============================================================================
const slideIn: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut", type: "spring", stiffness: 100 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function BookingEngine() {
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState({
    service: null as any,
    barber: null as any,
    date: null as any,
    time: null as string | null,
    guest: { name: "", phone: "", email: "" }
  });
  
  const [isConfirming, setIsConfirming] = useState(false);

  // Estados de Base de Datos
  const [dbBarbers, setDbBarbers] = useState<any[]>(FALLBACK_BARBERS);
  const [dbServices, setDbServices] = useState<any[]>(FALLBACK_SERVICES);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // 1. Cargar Barberos y Servicios desde Supabase al iniciar
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const { data: barbersData } = await supabase.from('Barbers').select('*').eq('status', 'ACTIVE');
        if (barbersData && barbersData.length > 0) setDbBarbers(barbersData);

        const { data: servicesData } = await supabase.from('Services').select('*');
        if (servicesData && servicesData.length > 0) setDbServices(servicesData);
      } catch (error) {
        console.error("Usando datos de respaldo.");
      }
    };
    loadInitialData();
  }, [supabase]);

  // 2. Cargar horas ocupadas cuando se selecciona Barbero y Fecha
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (booking.barber && booking.date) {
        try {
          const { data, error } = await supabase
            .from('Appointments')
            .select('time')
            .eq('barber_id', booking.barber.id)
            .eq('date', booking.date.fullDate);
            
          if (data) {
            setBookedSlots(data.map(d => d.time));
          }
        } catch (error) {
          setBookedSlots([]);
        }
      }
    };
    fetchBookedSlots();
  }, [booking.barber, booking.date, supabase]);


  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const nextStep = () => setStep((p) => Math.min(p + 1, 5));
  const prevStep = () => setStep((p) => Math.max(p - 1, 1));

  // Comprobar si la hora está en la lista de horas ocupadas de la BD
  const isSlotBooked = (time: string) => {
    return bookedSlots.includes(time);
  };

  const handleFinalConfirm = async () => {
    setIsConfirming(true);
    
    try {
      // 3. Guardar la cita en la base de datos
      const appointmentData = {
        barber_id: booking.barber.id,
        barber_name: booking.barber.name,
        service_name: booking.service.name,
        date: booking.date.fullDate,
        time: booking.time,
        client_name: booking.guest.name,
        client_phone: booking.guest.phone,
        status: 'PENDING'
      };

      const { error } = await supabase.from('Appointments').insert([appointmentData]);
      if (error) throw error;

      // Si todo sale bien, pasamos a la pantalla de éxito
      nextStep(); 
    } catch (error) {
      console.error("Error al guardar reserva:", error);
      alert("Hubo un error al confirmar tu reserva. Intenta de nuevo.");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-zinc-50 font-sans selection:bg-amber-500/30 selection:text-amber-200 relative overflow-x-hidden">
      
      {/* GLOBAL BACKGROUND: Ruido y Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* HEADER TÁCTICO & PREMIUM */}
      <header className="fixed top-0 w-full bg-[#050505]/90 backdrop-blur-2xl z-50 border-b border-amber-500/10 shadow-[0_10px_40px_-10px_rgba(217,119,6,0.1)]">
        <div className="max-w-[1400px] mx-auto px-6 h-24 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-amber-500/30 group-hover:border-amber-500 transition-all shadow-[0_0_15px_rgba(217,119,6,0.2)]">
              <Image src="/logo.png" alt="Emperador Logo" fill className="object-cover" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-serif font-black text-xl leading-none tracking-tight text-white uppercase drop-shadow-md">EMPERADOR</span>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.3em] mt-1">Booking System</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            {step > 1 && step < 5 && (
              <button onClick={prevStep} className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-zinc-600 transition-all flex items-center gap-2">
                <ChevronLeft size={14} /> Volver
              </button>
            )}
            {/* Indicador de Progreso Desktop */}
            <div className="hidden md:flex items-center gap-2">
               {[1,2,3,4].map(i => (
                 <div key={i} className={`h-2 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-amber-500 shadow-[0_0_10px_rgba(217,119,6,0.5)]' : 'w-2 bg-zinc-800'}`} />
               ))}
            </div>
          </div>
        </div>
      </header>

      <div className="pt-36 pb-24 px-6 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 text-left relative z-10">
        
        {/* COLUMNA IZQUIERDA: RESUMEN DINÁMICO (Sticky Sidebar) */}
        <div className="hidden lg:block lg:col-span-4 text-left">
          <div className="sticky top-36 space-y-6">
            
            <div className="bg-zinc-950/80 border border-zinc-800 p-10 rounded-[3rem] overflow-hidden relative shadow-2xl backdrop-blur-md">
              <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
                <Image src="/logo.png" alt="Watermark" width={300} height={300} className="grayscale" />
              </div>
              
              <h3 className="text-amber-500 font-black uppercase text-xs tracking-[0.4em] mb-10 border-b border-zinc-800 pb-4 inline-block relative z-10">Tu Trono</h3>
              
              <ul className="space-y-10 relative z-10 text-left">
                <li className={`flex gap-6 items-center transition-opacity duration-500 ${!booking.service ? 'opacity-30' : 'opacity-100'}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors ${booking.service ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(217,119,6,0.3)]' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                    {booking.service ? <DynamicIcon name={booking.service.iconName || "Scissors"} /> : <Scissors size={24} />}
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Servicio</p>
                    <p className="text-base font-bold text-white leading-tight line-clamp-2">{booking.service?.name || "Pendiente..."}</p>
                  </div>
                </li>
                
                <li className={`flex gap-6 items-center transition-opacity duration-500 ${!booking.barber ? 'opacity-30' : 'opacity-100'}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border overflow-hidden transition-colors ${booking.barber ? 'border-amber-500 shadow-[0_0_20px_rgba(217,119,6,0.3)]' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                    {booking.barber ? <Image src={booking.barber.img} alt="Barber" width={56} height={56} className="object-cover h-full w-full" unoptimized /> : <UserCircle size={24} />}
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Maestro</p>
                    <p className="text-base font-bold text-white">{booking.barber?.name || "Pendiente..."}</p>
                  </div>
                </li>
                
                <li className={`flex gap-6 items-center transition-opacity duration-500 ${!booking.time ? 'opacity-30' : 'opacity-100'}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors ${booking.time ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(217,119,6,0.3)]' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                    <CalendarIcon size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Horario</p>
                    <p className="text-base font-bold text-white leading-tight">
                      {booking.date ? `${booking.date.day} ${booking.date.date} ${booking.date.month}` : "Pendiente..."}
                      {booking.time && <span className="block text-amber-500 mt-1 text-xl">{booking.time} hrs</span>}
                    </p>
                  </div>
                </li>
              </ul>

              <div className="mt-12 pt-8 border-t border-zinc-800 text-left bg-zinc-900/30 -mx-10 px-10 -mb-10 pb-10">
                <div className="flex justify-between items-end">
                  <span className="text-xs uppercase font-black text-zinc-400 tracking-widest">A pagar en local</span>
                  <span className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    {booking.service ? booking.service.price : "$0"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] flex items-start gap-4 text-left">
              <ShieldCheck size={24} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-400 font-medium leading-relaxed">Confirmación automática. Reserva 100% gratuita. Cancelas tu servicio directamente en el local.</p>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: WIZARD DE RESERVA */}
        <div className="lg:col-span-8 text-left">
          <AnimatePresence mode="wait">
            
            {/* ========================================================= */}
            {/* PASO 1: SELECCIÓN DE SERVICIOS */}
            {/* ========================================================= */}
            {step === 1 && (
              <motion.div key="s1" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="space-y-10 text-left">
                <div>
                  <motion.div initial={{ width: 0 }} animate={{ width: "40px" }} className="h-1 bg-amber-500 mb-6 rounded-full"></motion.div>
                  <h1 className="text-5xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter text-left leading-[0.9]">¿Qué te <br/><span className="text-amber-500">hacemos hoy?</span></h1>
                  <p className="text-zinc-400 mt-6 font-medium text-lg max-w-lg">Selecciona tu servicio en nuestro menú completo. El precio es final.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 pb-10">
                  {dbServices.map((srv) => (
                    <button 
                      key={srv.id} 
                      onClick={() => { setBooking({ ...booking, service: srv }); nextStep(); }}
                      className={`group p-6 md:p-8 rounded-[2.5rem] border text-left transition-all duration-300 flex flex-col justify-between min-h-[240px] relative overflow-hidden ${booking.service?.id === srv.id ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_30px_rgba(217,119,6,0.3)] scale-[1.02]' : 'bg-zinc-900/40 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900/80'}`}
                    >
                      <div className="absolute -inset-24 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700 pointer-events-none -z-10" />
                      
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-inner ${booking.service?.id === srv.id ? 'bg-black text-amber-500' : 'bg-black border border-zinc-800 text-amber-500 group-hover:bg-amber-500 group-hover:text-black'}`}>
                            <DynamicIcon name={srv.iconName || "Scissors"} />
                          </div>
                          <span className={`text-2xl font-black tracking-tighter ${booking.service?.id === srv.id ? 'text-black' : 'text-white'}`}>{srv.price}</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-3 leading-tight">{srv.name}</h3>
                        <p className={`text-sm font-medium leading-relaxed ${booking.service?.id === srv.id ? 'text-black/70' : 'text-zinc-500'}`}>{srv.desc}</p>
                      </div>
                      
                      <div className="relative z-10 mt-8 flex justify-between items-end">
                         <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-widest ${booking.service?.id === srv.id ? 'text-black/50' : 'text-zinc-600'}`}>
                           <Clock size={16} /> {srv.time}
                         </div>
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${booking.service?.id === srv.id ? 'bg-black text-amber-500 scale-110' : 'bg-zinc-800 text-white opacity-0 group-hover:opacity-100 group-hover:bg-amber-500 group-hover:text-black'}`}>
                           <ChevronRight size={18} />
                         </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* PASO 2: BARBEROS */}
            {/* ========================================================= */}
            {step === 2 && (
              <motion.div key="s2" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="space-y-10 text-left">
                <div>
                  <motion.div initial={{ width: 0 }} animate={{ width: "80px" }} className="h-1 bg-amber-500 mb-6 rounded-full"></motion.div>
                  <h2 className="text-5xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter text-left leading-[0.9]">Elige a tu <br/><span className="text-amber-500">Maestro.</span></h2>
                  <p className="text-zinc-400 mt-6 font-medium text-lg max-w-lg">La élite de Curicó. Cada barbero maneja su propia agenda exclusiva.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 pb-10">
                  {dbBarbers.map((b) => (
                    <button 
                      key={b.id}
                      onClick={() => { setBooking({ ...booking, barber: b, time: null }); nextStep(); }}
                      className="group flex items-center gap-6 p-6 rounded-[3rem] bg-zinc-900/40 border border-zinc-800 hover:border-amber-500 transition-all duration-500 w-full text-left"
                    >
                      <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-full overflow-hidden border-2 border-zinc-700 group-hover:border-amber-500 transition-all duration-700 shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(217,119,6,0.3)]">
                        <Image src={b.img} alt={b.name} fill className="object-cover grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" unoptimized />
                      </div>
                      <div>
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 inline-block">{b.tag || "Top Rated"}</span>
                        <h4 className="font-black text-2xl md:text-3xl text-white uppercase tracking-tighter">{b.name}</h4>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mt-1 group-hover:text-amber-500 transition-colors">{b.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* PASO 3: CALENDARIO Y HORA (Sincronizado con BD) */}
            {/* ========================================================= */}
            {step === 3 && (
              <motion.div key="s3" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="space-y-12 text-left pb-32">
                <div>
                  <motion.div initial={{ width: 0 }} animate={{ width: "120px" }} className="h-1 bg-amber-500 mb-6 rounded-full"></motion.div>
                  <h2 className="text-5xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter text-left leading-[0.9]">Elige el <br/><span className="text-amber-500">Momento.</span></h2>
                  <p className="text-zinc-400 mt-6 font-medium text-lg flex items-center gap-2">
                    Viendo agenda exclusiva de <strong className="text-white bg-zinc-800 px-3 py-1 rounded-md ml-1">{booking.barber?.name}</strong>.
                  </p>
                </div>
                
                {/* Carrusel de Días */}
                <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-hide -mx-6 px-6 lg:mx-0 lg:px-0">
                  {DATES.map((d, i) => (
                    <button 
                      key={i}
                      onClick={() => setBooking({ ...booking, date: d, time: null })}
                      className={`flex-shrink-0 w-24 h-32 rounded-[2rem] flex flex-col items-center justify-center gap-2 border transition-all duration-300 relative ${booking.date?.date === d.date ? 'bg-amber-500 text-black border-amber-400 shadow-[0_10px_30px_-10px_rgba(217,119,6,0.6)] -translate-y-2' : 'bg-zinc-900/50 border-zinc-800 text-white hover:border-amber-500/50 hover:-translate-y-1'}`}
                    >
                      <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${booking.date?.date === d.date ? 'text-black/60' : 'text-zinc-500'}`}>{d.day}</span>
                      <span className="text-4xl font-black tracking-tighter">{d.date}</span>
                      {booking.date?.date === d.date && <div className="absolute -bottom-2 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(217,119,6,1)]"></div>}
                    </button>
                  ))}
                </div>

                {/* Slots de Hora */}
                {booking.date && (
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-[3rem] p-8 md:p-10 space-y-10 relative overflow-hidden">
                    {[
                      { title: "Jornada Mañana", slots: TIME_SLOTS.manana },
                      { title: "Jornada Tarde", slots: TIME_SLOTS.tarde },
                      { title: "Jornada Noche", slots: TIME_SLOTS.noche }
                    ].map((section, idx) => (
                      <div key={idx} className="text-left space-y-6 relative z-10">
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] flex items-center gap-6">
                          {section.title} <div className="h-px bg-zinc-800 flex-1" />
                        </h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 text-left">
                          {section.slots.map(t => {
                            const isBooked = isSlotBooked(t);
                            return (
                              <button 
                                key={t} 
                                disabled={isBooked}
                                onClick={() => setBooking({...booking, time: t})} 
                                className={`py-4 rounded-2xl text-xs font-black uppercase border transition-all duration-300 relative overflow-hidden
                                  ${isBooked ? 'bg-zinc-950/50 border-zinc-900 text-zinc-600 cursor-not-allowed' : 
                                    booking.time === t ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105' : 
                                    'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-amber-500 hover:bg-zinc-900 hover:-translate-y-1'
                                  }
                                `}
                              >
                                {isBooked && <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-[1px]"><Lock size={14} className="text-zinc-700"/></div>}
                                <span className={isBooked ? 'opacity-30' : ''}>{t}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botón Flotante Continuar */}
                <AnimatePresence>
                  {booking.time && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-8 right-6 left-6 lg:left-auto lg:w-[calc(66.666%-4rem)] max-w-[1400px] mx-auto z-50">
                      <button onClick={nextStep} className="w-full py-6 md:py-8 bg-amber-500 text-black font-black text-lg md:text-xl uppercase tracking-[0.2em] rounded-[2rem] flex justify-center items-center gap-4 hover:bg-white transition-all shadow-[0_20px_50px_-10px_rgba(217,119,6,0.6)] group">
                        Confirmar Horario <ChevronRight size={28} className="group-hover:translate-x-2 transition-transform" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* PASO 4: FORMULARIO GUEST & CONFIRMACIÓN */}
            {/* ========================================================= */}
            {step === 4 && (
              <motion.div key="s4" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="space-y-10 text-left">
                <div>
                  <motion.div initial={{ width: 0 }} animate={{ width: "160px" }} className="h-1 bg-amber-500 mb-6 rounded-full"></motion.div>
                  <h2 className="text-5xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter text-left leading-[0.9]">Casi <br/><span className="text-amber-500">Listos.</span></h2>
                  <p className="text-zinc-400 mt-6 font-medium text-lg">Ingresa tus datos de contacto. <strong className="text-white">Sin registros tediosos.</strong></p>
                </div>
                
                <form onSubmit={(e) => { e.preventDefault(); handleFinalConfirm(); }} className="bg-zinc-900/40 border border-zinc-800 p-8 md:p-12 rounded-[3rem] space-y-6 text-left shadow-xl relative overflow-hidden">
                  
                  <div className="relative text-left group">
                    <UserCircle className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={24} />
                    <input 
                      required 
                      type="text" 
                      placeholder="Tu nombre y apellido" 
                      value={booking.guest.name}
                      onChange={(e) => setBooking({...booking, guest: {...booking.guest, name: e.target.value}})}
                      className="w-full bg-black border border-zinc-800 rounded-[2rem] pl-16 pr-6 py-6 text-white font-bold text-lg focus:outline-none focus:border-amber-500 focus:bg-zinc-950 transition-all placeholder:text-zinc-700" 
                    />
                  </div>
                  
                  <div className="relative text-left group">
                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={24} />
                    <input 
                      required 
                      type="tel" 
                      placeholder="WhatsApp (+56 9...)" 
                      value={booking.guest.phone}
                      onChange={(e) => setBooking({...booking, guest: {...booking.guest, phone: e.target.value}})}
                      className="w-full bg-black border border-zinc-800 rounded-[2rem] pl-16 pr-6 py-6 text-white font-bold text-lg focus:outline-none focus:border-amber-500 focus:bg-zinc-950 transition-all placeholder:text-zinc-700" 
                    />
                  </div>
                  
                  <div className="pt-6 mt-6 border-t border-zinc-800">
                    <button type="submit" disabled={isConfirming} className="w-full py-8 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:text-black/50 text-black text-xl font-black uppercase tracking-[0.2em] rounded-[2rem] shadow-[0_0_40px_rgba(217,119,6,0.4)] hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3">
                      {isConfirming ? <Zap className="animate-pulse" size={28} /> : <CheckCircle2 size={28} />}
                      {isConfirming ? "Sincronizando..." : "Asegurar Mi Trono"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* PASO 5: FINALIZADO (Éxito Automático) */}
            {/* ========================================================= */}
            {step === 5 && (
              <motion.div key="s5" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-20 space-y-10 relative">
                
                {/* Lluvia de confeti simulada con Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none z-0"></div>

                <div className="w-40 h-40 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-amber-500/30 relative z-10">
                  <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping"></div>
                  <Crown size={80} className="text-amber-500 relative z-10" />
                </div>
                
                <div className="relative z-10">
                  <h2 className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter leading-[0.9] mb-4">¡RESERVA <br/><span className="text-amber-500">CONFIRMADA!</span></h2>
                  <p className="text-zinc-300 font-medium text-lg max-w-md mx-auto bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                    Tu trono está asegurado y el barbero ha sido notificado automáticamente.
                  </p>
                </div>

                <div className="p-10 bg-zinc-950/80 rounded-[3rem] border border-zinc-800 inline-block text-left shadow-2xl backdrop-blur-xl relative z-10">
                   <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-xs mb-4">Detalles Oficiales</p>
                   <p className="text-white text-3xl font-black uppercase tracking-tighter mb-2">{booking.date?.day} {booking.date?.date} {booking.date?.month} • <span className="text-amber-500">{booking.time} hrs</span></p>
                   <p className="text-zinc-300 font-medium text-lg flex items-center gap-3 mt-6"><UserCircle size={24} className="text-amber-500"/> {booking.barber?.name}</p>
                   <p className="text-zinc-300 font-medium text-lg flex items-center gap-3 mt-3"><Scissors size={24} className="text-amber-500"/> {booking.service?.name}</p>
                </div>
                
                <div className="pt-12 flex flex-col gap-8 items-center border-t border-zinc-800 mt-12 relative z-10">
                  <Link href="/" className="px-16 py-6 bg-zinc-900 text-white font-black uppercase tracking-[0.2em] rounded-2xl border border-zinc-800 hover:bg-zinc-800 hover:text-amber-500 transition-all shadow-xl hover:scale-105 active:scale-95">
                    Volver al Inicio
                  </Link>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}