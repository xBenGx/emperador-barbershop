"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  Scissors, Clock, Calendar as CalendarIcon, MapPin, 
  ChevronLeft, CheckCircle2, User, Sparkles, ChevronRight,
  Phone, Mail, UserCircle, AlertCircle, Crown, Star, Flame, Crosshair, Zap
} from "lucide-react";

// ============================================================================
// DATA DE NEGOCIO (Actualizada con descripciones y servicios reales)
// ============================================================================
const BARBERS = [
  { id: "cesar", name: "Cesar Luna", role: "Master Barber", img: "https://images.unsplash.com/photo-1618306915102-1a4097f57c7b?q=80&w=200&auto=format&fit=crop" },
  { id: "jack", name: "Jack Guerra", role: "Fade Specialist", img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop" },
  { id: "jhonn", name: "Jhonn Prado", role: "Beard Expert", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop" },
  { id: "marcos", name: "Marcos Peña", role: "Senior Barber", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" },
];

const SERVICES = [
  { 
    id: "s1", 
    name: "Corte de Cabello Clásico o Degradado", 
    duration: "1 hrs", 
    price: 12000, 
    desc: "Estilo elegante y atemporal de líneas limpias, fácil de peinar y apropiado para cualquier ocasión." 
  },
  { 
    id: "s2", 
    name: "Corte de Cabello + Cejas", 
    duration: "1 hrs", 
    price: 14000, 
    desc: "Corte premium más perfilado de cejas para una mirada más definida y limpia." 
  },
  { 
    id: "s3", 
    name: "Barba + Vapor", 
    duration: "30 min", 
    price: 7000, 
    desc: "Perfilado con vapor caliente para abrir poros y facilitar un afeitado preciso y cómodo." 
  },
  { 
    id: "s4", 
    name: "Corte + Barba + Lavado GRATIS", 
    duration: "1 hrs 5 min", 
    price: 17000, 
    desc: "El combo esencial para un look impecable, incluyendo lavado de cortesía." 
  },
  { 
    id: "s5", 
    name: "Limpieza Facial + Vapor + Mascarilla", 
    duration: "25 min", 
    price: 10000, 
    desc: "Tratamiento revitalizante que elimina impurezas e hidrata profundamente la piel." 
  },
  { 
    id: "s7", 
    name: "Servicio Emperador Vip", 
    duration: "1 hrs 30 min", 
    price: 35000, 
    desc: "La máxima experiencia de relajación: cuidado total de cabello, barba y piel con atención exclusiva." 
  },
];

const DATES = [
  { day: "Lun", date: "23", month: "Feb" },
  { day: "Mar", date: "24", month: "Feb" },
  { day: "Mié", date: "25", month: "Feb" },
  { day: "Jue", date: "26", month: "Feb" },
  { day: "Vie", date: "27", month: "Feb" },
  { day: "Sáb", date: "28", month: "Feb" },
];

const TIME_SLOTS = {
  manana: ["10:00 am", "11:00 am"],
  tarde: ["12:00 pm", "1:00 pm", "2:00 pm", "3:00 pm", "4:00 pm", "5:00 pm"],
  noche: ["6:00 pm", "7:00 pm"]
};

// ============================================================================
// ANIMACIONES
// ============================================================================
const slideIn: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function BookingEngine() {
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState({
    service: null as any,
    barber: null as any,
    date: null as any,
    time: null as string | null,
    guest: { name: "", phone: "", email: "" }
  });

  const nextStep = () => setStep((p) => Math.min(p + 1, 5));
  const prevStep = () => setStep((p) => Math.max(p - 1, 1));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
  };

  return (
    <main className="min-h-screen bg-[#070708] text-zinc-50 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* HEADER TÁCTICO */}
      <header className="fixed top-0 w-full bg-[#070708]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Crown size={20} className="text-black" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-serif font-black text-lg leading-none tracking-wider text-white uppercase">EMPERADOR</span>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em]">Booking System</span>
            </div>
          </div>
          {step > 1 && step < 5 && (
            <button onClick={prevStep} className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all flex items-center gap-2">
              <ChevronLeft size={14} /> Atrás
            </button>
          )}
        </div>
      </header>

      <div className="pt-32 pb-20 px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
        
        {/* COLUMNA IZQUIERDA: RESUMEN DINÁMICO */}
        <div className="hidden lg:block lg:col-span-4 text-left">
          <div className="sticky top-32 space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2rem] overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Crown size={80} />
              </div>
              <h3 className="text-amber-500 font-black uppercase text-[10px] tracking-[0.3em] mb-8 text-left">Estado de Cita</h3>
              
              <ul className="space-y-8 relative z-10 text-left">
                <li className={`flex gap-4 items-center ${!booking.service && 'opacity-30'}`}>
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-amber-500 border border-zinc-700">
                    <Scissors size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-black text-zinc-500">Servicio</p>
                    <p className="text-sm font-bold text-white leading-tight">{booking.service?.name || "Pendiente..."}</p>
                  </div>
                </li>
                <li className={`flex gap-4 items-center ${!booking.barber && 'opacity-30'}`}>
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-amber-500 border border-zinc-700">
                    <UserCircle size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-black text-zinc-500">Especialista</p>
                    <p className="text-sm font-bold text-white">{booking.barber?.name || "Pendiente..."}</p>
                  </div>
                </li>
                <li className={`flex gap-4 items-center ${!booking.time && 'opacity-30'}`}>
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-amber-500 border border-zinc-700">
                    <CalendarIcon size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-black text-zinc-500">Horario</p>
                    <p className="text-sm font-bold text-white leading-tight">
                      {booking.date ? `${booking.date.day} ${booking.date.date} ${booking.date.month}` : "Pendiente..."}
                      {booking.time && ` • ${booking.time}`}
                    </p>
                  </div>
                </li>
              </ul>

              <div className="mt-12 pt-8 border-t border-zinc-800 text-left">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase font-black text-zinc-500">Total</span>
                  <span className="text-3xl font-black text-white tracking-tighter">
                    {booking.service ? formatPrice(booking.service.price) : "$0"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3 text-left">
              <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-400 font-medium">No se requiere pago online. Cancelas directamente en la barbería (Peña 666, Curicó).</p>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: WIZARD DE RESERVA */}
        <div className="lg:col-span-8 text-left">
          <AnimatePresence mode="wait">
            
            {/* PASO 1: SERVICIOS */}
            {step === 1 && (
              <motion.div key="s1" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="space-y-8 text-left">
                <div>
                  <h1 className="text-4xl md:text-6xl font-serif font-black text-white uppercase tracking-tighter text-left">¿Qué te <br/><span className="text-amber-500">hacemos hoy?</span></h1>
                  <p className="text-zinc-500 mt-4 font-medium">Selecciona el servicio para ver la disponibilidad.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                  {SERVICES.map((srv) => (
                    <button 
                      key={srv.id} 
                      onClick={() => { setBooking({ ...booking, service: srv }); nextStep(); }}
                      className={`group p-8 rounded-[2.5rem] border text-left transition-all duration-300 flex flex-col justify-between min-h-[220px] ${booking.service?.id === srv.id ? 'bg-amber-500 border-amber-500 text-black' : 'bg-zinc-900/40 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900/60'}`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <div className={`p-3 rounded-2xl ${booking.service?.id === srv.id ? 'bg-black/10' : 'bg-zinc-800'}`}>
                            <Scissors size={24} />
                          </div>
                          <span className={`text-xl font-black tracking-tighter ${booking.service?.id === srv.id ? 'text-black' : 'text-amber-500'}`}>{formatPrice(srv.price)}</span>
                        </div>
                        <h3 className="text-xl font-bold uppercase tracking-tight mb-2 leading-tight">{srv.name}</h3>
                        <p className={`text-xs font-medium leading-relaxed line-clamp-2 ${booking.service?.id === srv.id ? 'text-black/60' : 'text-zinc-500'}`}>{srv.desc}</p>
                      </div>
                      <div className={`mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${booking.service?.id === srv.id ? 'text-black/40' : 'text-zinc-600'}`}>
                        <Clock size={14} /> {srv.duration}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PASO 2: BARBEROS */}
            {step === 2 && (
              <motion.div key="s2" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="space-y-8 text-left">
                <h2 className="text-4xl md:text-6xl font-serif font-black text-white uppercase tracking-tighter text-left">Elige a tu <br/><span className="text-amber-500">Maestro.</span></h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {BARBERS.map((b) => (
                    <button 
                      key={b.id}
                      onClick={() => { setBooking({ ...booking, barber: b }); nextStep(); }}
                      className="group flex flex-col items-center gap-6 p-6 rounded-[3rem] bg-zinc-900/30 border border-zinc-800 hover:border-amber-500 transition-all duration-500"
                    >
                      <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-zinc-800 group-hover:border-amber-500 transition-all duration-700 group-hover:scale-105 shadow-2xl shadow-black">
                        <Image src={b.img} alt={b.name} fill className="object-cover grayscale group-hover:grayscale-0" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-base text-white uppercase tracking-tight">{b.name}</p>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mt-2 group-hover:text-amber-500 transition-colors">{b.role.split(" ")[0]}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PASO 3: CALENDARIO Y HORA */}
            {step === 3 && (
              <motion.div key="s3" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="space-y-12 text-left">
                <h2 className="text-4xl md:text-6xl font-serif font-black text-white uppercase tracking-tighter text-left">Elige el <br/><span className="text-amber-500">Momento.</span></h2>
                
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
                  {DATES.map((d, i) => (
                    <button 
                      key={i}
                      onClick={() => setBooking({ ...booking, date: d, time: null })}
                      className={`flex-shrink-0 w-24 h-32 rounded-[2rem] flex flex-col items-center justify-center gap-2 border transition-all duration-300 ${booking.date?.date === d.date ? 'bg-amber-500 text-black border-amber-500 shadow-xl shadow-amber-500/20' : 'bg-zinc-900/40 border-zinc-800 text-white hover:border-amber-500/50'}`}
                    >
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">{d.day}</span>
                      <span className="text-4xl font-black tracking-tighter">{d.date}</span>
                    </button>
                  ))}
                </div>

                {booking.date && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                    <div className="text-left space-y-6">
                      <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] flex items-center gap-4">Mañana <div className="h-px bg-zinc-800 flex-1" /></h4>
                      <div className="grid grid-cols-2 gap-3">
                        {TIME_SLOTS.manana.map(t => (
                          <button key={t} onClick={() => setBooking({...booking, time: t})} className={`py-4 rounded-2xl text-xs font-black uppercase border transition-all duration-300 ${booking.time === t ? 'bg-white text-black border-white shadow-lg' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-500'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-left space-y-6">
                      <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] flex items-center gap-4">Tarde <div className="h-px bg-zinc-800 flex-1" /></h4>
                      <div className="grid grid-cols-2 gap-3">
                        {TIME_SLOTS.tarde.map(t => (
                          <button key={t} onClick={() => setBooking({...booking, time: t})} className={`py-4 rounded-2xl text-xs font-black uppercase border transition-all duration-300 ${booking.time === t ? 'bg-white text-black border-white shadow-lg' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-500'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {booking.time && (
                  <motion.button 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    onClick={nextStep} 
                    className="w-full py-6 bg-amber-500 text-black font-black uppercase tracking-[0.2em] rounded-3xl flex justify-center items-center gap-3 hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/10"
                  >
                    Siguiente paso <ChevronRight size={24} />
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* PASO 4: FORMULARIO GUEST */}
            {step === 4 && (
              <motion.div key="s4" variants={slideIn} initial="hidden" animate="visible" exit="exit" className="space-y-8 text-left">
                <h2 className="text-4xl md:text-6xl font-serif font-black text-white uppercase tracking-tighter text-left">Casi <br/><span className="text-amber-500">Listos.</span></h2>
                <p className="text-zinc-500 font-medium">Ingresa tus datos para confirmar tu lugar en el trono.</p>
                
                <div className="space-y-4 text-left">
                  <div className="relative text-left">
                    <UserCircle className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                    <input type="text" placeholder="Nombre completo" className="w-full bg-zinc-900/40 border border-zinc-800 rounded-[2rem] pl-16 pr-6 py-6 text-white font-bold focus:outline-none focus:border-amber-500 transition-all placeholder:text-zinc-700" />
                  </div>
                  <div className="relative text-left">
                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                    <input type="tel" placeholder="WhatsApp (+56 9...)" className="w-full bg-zinc-900/40 border border-zinc-800 rounded-[2rem] pl-16 pr-6 py-6 text-white font-bold focus:outline-none focus:border-amber-500 transition-all placeholder:text-zinc-700" />
                  </div>
                  <div className="relative text-left">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                    <input type="email" placeholder="Email (Opcional)" className="w-full bg-zinc-900/40 border border-zinc-800 rounded-[2rem] pl-16 pr-6 py-6 text-white font-bold focus:outline-none focus:border-amber-500 transition-all placeholder:text-zinc-700" />
                  </div>
                </div>

                <button onClick={() => setStep(5)} className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.2em] rounded-3xl shadow-2xl hover:bg-amber-500 transition-all duration-300">
                  Confirmar Reserva Imperial
                </button>
              </motion.div>
            )}

            {/* PASO 5: FINALIZADO */}
            {step === 5 && (
              <motion.div key="s5" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-20 space-y-8">
                <div className="w-32 h-32 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-500/20 animate-pulse">
                  <CheckCircle2 size={60} className="text-amber-500" />
                </div>
                <h2 className="text-5xl md:text-7xl font-serif font-black text-white uppercase tracking-tighter leading-[0.9]">¡RESERVA <br/><span className="text-amber-500">CONFIRMADA!</span></h2>
                <div className="p-8 bg-zinc-900/50 rounded-[2.5rem] border border-zinc-800 inline-block">
                   <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs mb-2">Te esperamos con {booking.barber?.name}</p>
                   <p className="text-white text-2xl font-black uppercase tracking-tighter">{booking.date?.day} {booking.date?.date} • {booking.time}</p>
                </div>
                <div className="pt-10 flex flex-col gap-6 items-center">
                  <button onClick={() => window.location.href = '/'} className="px-12 py-5 bg-zinc-900 text-white font-black uppercase tracking-[0.2em] rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-all">
                    Volver al Inicio
                  </button>
                  <p className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.5em] mt-10">Arquitectura Digital por BAYX</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}