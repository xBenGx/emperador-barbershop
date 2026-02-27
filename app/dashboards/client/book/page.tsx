"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  CalendarDays, Clock, Scissors, Star, ChevronRight, 
  ArrowLeft, CheckCircle2, Crown, Zap, History, Gift,
  MapPin, AlertCircle, Lock, Edit2, Settings, MessageSquare
} from "lucide-react"; // <-- ICONO LOCK AÑADIDO AQUÍ

// ============================================================================
// TIPADOS
// ============================================================================
type TabType = "AGENDAR" | "HISTORIAL" | "BENEFICIOS";
type BookingStep = 1 | 2 | 3 | 4;

interface Barber { id: string; name: string; role: string; img: string; }
interface Service { id: string; name: string; price: number; duration: number; desc: string; }

// ============================================================================
// MOCK DATA (Perfil de Usuario Único y Base de Datos)
// ============================================================================
const CURRENT_USER = {
  name: "Matías Rojas",
  initial: "M",
  tier: "Oro",
  points: 850,
  phone: "+56 9 1234 5678"
};

const BARBERS: Barber[] = [
  { id: "b1", name: "Cesar Luna", role: "Master Barber", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop" },
  { id: "b2", name: "Jack Guerra", role: "Fade Specialist", img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=400&auto=format&fit=crop" },
  { id: "b3", name: "Jhonn Prado", role: "Beard Expert", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop" },
];

const SERVICES: Service[] = [
  { id: "s1", name: "Corte Clásico / Degradado", price: 12000, duration: 60, desc: "El corte que define tu estilo. Clean, fresh." },
  { id: "s2", name: "Corte + Perfilado de Cejas", price: 14000, duration: 60, desc: "Sube de nivel tu mirada." },
  { id: "s3", name: "Barba + Vapor Caliente", price: 7000, duration: 30, desc: "Afeitado VIP. Acabado de seda." },
  { id: "s4", name: "Corte + Barba + Lavado", price: 17000, duration: 65, desc: "El combo indispensable." },
  { id: "s5", name: "Servicio Emperador VIP", price: 35000, duration: 90, desc: "La experiencia definitiva. Trato de realeza." },
];

const TIME_SLOTS = ["10:00", "11:00", "12:00", "15:00", "16:00", "17:30", "18:30", "19:00"];

const PAST_CUTS = [
  { id: "h1", date: "15 Feb, 2026", service: "Corte Clásico", barber: "Cesar Luna", price: 12000, status: "COMPLETED" },
  { id: "h2", date: "02 Ene, 2026", service: "Corte + Barba", barber: "Jack Guerra", price: 17000, status: "COMPLETED" },
];

const UPCOMING_CUTS = [
  // Dejamos uno mockeado para que el cliente vea que tiene algo pendiente
  { id: "u1", date: "28 Feb, 2026", time: "16:00", service: "Servicio Emperador VIP", barber: "Cesar Luna", status: "CONFIRMED" }
];

// ============================================================================
// ANIMACIONES
// ============================================================================
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

const slideLeft = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.2 } }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function ClientDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("AGENDAR");
  
  // Estados del Wizard de Reserva
  const [step, setStep] = useState<BookingStep>(1);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientNotes, setClientNotes] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formatMoney = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  // Funciones de navegación del Wizard
  const handleNextStep = () => setStep((prev) => (prev < 4 ? prev + 1 : prev) as BookingStep);
  const handlePrevStep = () => setStep((prev) => (prev > 1 ? prev - 1 : prev) as BookingStep);

  const handleConfirmBooking = () => {
    setIsConfirming(true);
    // AQUÍ IRÁ TU SERVER ACTION PARA GUARDAR EN SUPABASE
    setTimeout(() => {
      setIsConfirming(false);
      setIsSuccess(true);
    }, 1500);
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedBarber(null);
    setSelectedService(null);
    setSelectedDate("");
    setSelectedTime("");
    setClientNotes("");
    setIsSuccess(false);
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      
      {/* HEADER DEL CLIENTE (Personalizado) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
          <div className="relative group cursor-pointer">
            <div className="w-20 h-20 bg-zinc-950 border-2 border-amber-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(217,119,6,0.3)] overflow-hidden">
              <span className="text-2xl font-black text-amber-500 group-hover:hidden">{CURRENT_USER.initial}</span>
              <Edit2 size={24} className="text-amber-500 hidden group-hover:block transition-all" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between md:justify-start gap-4">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase font-serif">
                Hola, <span className="text-amber-500">{CURRENT_USER.name.split(' ')[0]}</span>
              </h1>
              <button className="p-2 bg-zinc-950 text-zinc-400 hover:text-amber-500 rounded-full border border-zinc-800 transition-colors md:hidden">
                <Settings size={18} />
              </button>
            </div>
            <p className="text-zinc-400 mt-1 font-medium">Bienvenido a tu portal imperial.</p>
          </div>
        </div>

        {/* Tarjeta de Puntos VIP y Ajustes */}
        <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4 flex-1 md:flex-none">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
              <Crown size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nivel Actual</p>
              <p className="text-xl font-bold text-white flex items-center gap-2">
                {CURRENT_USER.tier} <span className="text-amber-500 text-sm bg-amber-500/10 px-2 py-0.5 rounded-md">{CURRENT_USER.points} pts</span>
              </p>
            </div>
          </div>
          <button className="hidden md:flex p-4 bg-zinc-950 text-zinc-400 hover:text-amber-500 rounded-2xl border border-zinc-800 transition-colors h-full items-center justify-center" title="Ajustes de Perfil">
            <Settings size={24} />
          </button>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex gap-3 mb-8 border-b border-zinc-800 pb-4 overflow-x-auto hide-scrollbar scroll-smooth">
        {(["AGENDAR", "HISTORIAL", "BENEFICIOS"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl font-bold text-sm tracking-widest uppercase transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-2 ${
              activeTab === tab 
                ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(217,119,6,0.3)]" 
                : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-white border border-zinc-800"
            }`}
          >
            {tab === "AGENDAR" && <CalendarDays size={16}/>}
            {tab === "HISTORIAL" && <History size={16}/>}
            {tab === "BENEFICIOS" && <Gift size={16}/>}
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* =================================================================== */}
        {/* TAB 1: AGENDAR CITA (EL WIZARD MEJORADO) */}
        {/* =================================================================== */}
        {activeTab === "AGENDAR" && (
          <motion.div key="agendar" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden">
            
            {isSuccess ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-10">
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 font-serif">¡Reserva Confirmada!</h2>
                <p className="text-zinc-400 max-w-md mx-auto mb-8">
                  Tu trono está asegurado. Te esperamos el <strong className="text-white">{selectedDate}</strong> a las <strong className="text-white">{selectedTime}</strong> con <strong className="text-amber-500">{selectedBarber?.name}</strong>.
                </p>
                <button onClick={resetBooking} className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl transition-colors border border-zinc-700 uppercase tracking-widest text-xs">
                  Agendar otra cita
                </button>
              </motion.div>
            ) : (
              <>
                {/* Indicador de Pasos */}
                <div className="flex items-center justify-between mb-10 relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-800 z-0 rounded-full"></div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-amber-500 z-0 rounded-full transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
                  
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 ${step >= i ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(217,119,6,0.5)]' : 'bg-zinc-900 text-zinc-500 border-2 border-zinc-800'}`}>
                      {step > i ? <CheckCircle2 size={20} /> : i}
                    </div>
                  ))}
                </div>

                {/* Botón Volver */}
                {step > 1 && (
                  <button onClick={handlePrevStep} className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 transition-colors mb-6 text-sm font-bold uppercase tracking-widest">
                    <ArrowLeft size={16} /> Volver
                  </button>
                )}

                {/* CONTENIDO DE LOS PASOS */}
                <div className="min-h-[400px]">
                  <AnimatePresence mode="wait">
                    
                    {/* PASO 1: SELECCIONAR BARBERO */}
                    {step === 1 && (
                      <motion.div key="step1" variants={slideLeft} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-2xl font-bold text-white mb-6">1. Elige a tu Maestro</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {BARBERS.map(b => (
                            <div 
                              key={b.id} 
                              onClick={() => { setSelectedBarber(b); handleNextStep(); }}
                              className={`cursor-pointer group relative overflow-hidden rounded-3xl border-2 transition-all duration-300 ${selectedBarber?.id === b.id ? 'border-amber-500 bg-zinc-900/80 shadow-[0_0_30px_rgba(217,119,6,0.15)]' : 'border-zinc-800 bg-zinc-950/50 hover:border-amber-500/50'}`}
                            >
                              <div className="aspect-[4/3] relative">
                                <Image src={b.img} fill alt={b.name} className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent"></div>
                              </div>
                              <div className="absolute bottom-0 left-0 w-full p-6">
                                <span className="px-3 py-1 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-md mb-2 inline-block">{b.role}</span>
                                <h4 className="text-xl font-bold text-white">{b.name}</h4>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* PASO 2: SELECCIONAR SERVICIO */}
                    {step === 2 && (
                      <motion.div key="step2" variants={slideLeft} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-2xl font-bold text-white mb-6">2. ¿Qué te haremos hoy?</h3>
                        <div className="grid gap-4">
                          {SERVICES.map(s => (
                            <div 
                              key={s.id} 
                              onClick={() => { setSelectedService(s); handleNextStep(); }}
                              className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${selectedService?.id === s.id ? 'border-amber-500 bg-zinc-900' : 'border-zinc-800 bg-zinc-950/50 hover:border-amber-500/50'}`}
                            >
                              <div className="flex gap-4 items-center mb-4 sm:mb-0">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedService?.id === s.id ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-amber-500'}`}>
                                  <Scissors size={24} />
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold text-white">{s.name}</h4>
                                  <p className="text-sm text-zinc-500">{s.desc}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-zinc-800 pt-4 sm:pt-0">
                                <span className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-1"><Clock size={14}/> {s.duration} min</span>
                                <span className="text-xl font-black text-amber-500">{formatMoney(s.price)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* PASO 3: FECHA, HORA Y NOTAS */}
                    {step === 3 && (
                      <motion.div key="step3" variants={slideLeft} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-2xl font-bold text-white mb-6">3. Fecha, Hora y Detalles</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Selector de Fecha */}
                          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl">
                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Día de la reserva</label>
                            <input 
                              type="date" 
                              min={new Date().toISOString().split("T")[0]}
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-4 text-white focus:border-amber-500 outline-none"
                            />
                            
                            {/* Notas adicionales */}
                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mt-6 mb-4 flex items-center gap-2">
                              <MessageSquare size={14} /> Instrucciones para el barbero (Opcional)
                            </label>
                            <textarea 
                              placeholder="Ej: Llego 5 min tarde, quiero un degradado bajo..."
                              value={clientNotes}
                              onChange={(e) => setClientNotes(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none resize-none h-24 text-sm"
                            ></textarea>
                          </div>

                          {/* Selector de Hora */}
                          <div>
                            {selectedDate ? (
                              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Horas Disponibles</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                  {TIME_SLOTS.map(time => (
                                    <button
                                      key={time}
                                      onClick={() => { setSelectedTime(time); handleNextStep(); }}
                                      className={`py-4 rounded-xl font-black text-sm transition-all border-2 ${selectedTime === time ? 'bg-amber-500 border-amber-500 text-black shadow-[0_0_15px_rgba(217,119,6,0.4)]' : 'bg-zinc-950 border-zinc-800 text-white hover:border-amber-500/50 hover:-translate-y-1'}`}
                                    >
                                      {time}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center">
                                <CalendarDays size={48} className="mb-4 opacity-20" />
                                <p className="font-bold">Selecciona una fecha primero<br/>para ver las horas disponibles.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* PASO 4: CONFIRMACIÓN */}
                    {step === 4 && selectedBarber && selectedService && (
                      <motion.div key="step4" variants={slideLeft} initial="hidden" animate="visible" exit="exit" className="max-w-2xl mx-auto">
                        <h3 className="text-2xl font-bold text-white mb-6 text-center">4. Confirma tu Trono</h3>
                        
                        {/* Ticket Style Summary */}
                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#050505] rounded-full border-r border-zinc-800"></div>
                          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#050505] rounded-full border-l border-zinc-800"></div>
                          
                          <div className="border-b-2 border-dashed border-zinc-800 pb-6 mb-6">
                            <h4 className="text-center font-serif font-black text-2xl text-white tracking-tighter uppercase mb-1">TICKET DE RESERVA</h4>
                            <p className="text-center text-amber-500 text-xs font-bold uppercase tracking-widest">{CURRENT_USER.name}</p>
                          </div>

                          <div className="space-y-6">
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Servicio</span>
                              <span className="text-white font-bold text-right">{selectedService.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Barbero</span>
                              <span className="text-white font-bold flex items-center gap-2"><Star size={14} className="text-amber-500"/> {selectedBarber.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Fecha y Hora</span>
                              <span className="text-white font-bold text-right bg-zinc-900 px-3 py-1 rounded-md">{selectedDate} / {selectedTime}</span>
                            </div>
                            {clientNotes && (
                              <div className="flex justify-between items-start">
                                <span className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Notas</span>
                                <span className="text-zinc-300 text-sm text-right max-w-[200px] italic">"{clientNotes}"</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-between items-end">
                            <span className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Total a pagar en local</span>
                            <span className="text-4xl font-black text-amber-500 tracking-tighter">{formatMoney(selectedService.price)}</span>
                          </div>
                        </div>

                        <button 
                          onClick={handleConfirmBooking}
                          disabled={isConfirming}
                          className="w-full mt-8 py-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-[0_0_30px_rgba(217,119,6,0.3)] flex justify-center items-center gap-3 disabled:opacity-70 disabled:hover:bg-amber-500"
                        >
                          {isConfirming ? <Zap className="animate-pulse" size={20} /> : <CheckCircle2 size={20} />}
                          {isConfirming ? "Procesando en sistema..." : "Confirmar Reserva"}
                        </button>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: HISTORIAL Y PRÓXIMAS CITAS */}
        {/* =================================================================== */}
        {activeTab === "HISTORIAL" && (
          <motion.div key="historial" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="space-y-10">
            
            {/* Próximas Citas Activas */}
            <div>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Clock className="text-amber-500" size={20}/> Tu Próximo Trono</h2>
              {UPCOMING_CUTS.map(cut => (
                <div key={cut.id} className="bg-gradient-to-r from-amber-500/20 to-zinc-950 border border-amber-500/50 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full pointer-events-none"></div>
                  
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-16 h-16 bg-amber-500 rounded-xl flex flex-col items-center justify-center text-black shadow-[0_0_15px_rgba(217,119,6,0.4)]">
                      <span className="font-black text-xl leading-none">{cut.time.split(':')[0]}</span>
                      <span className="text-xs font-bold leading-none">{cut.time.split(':')[1]}</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">{cut.service}</h4>
                      <p className="text-sm text-zinc-300 flex items-center gap-2 mt-1">
                        <CalendarDays size={14}/> {cut.date} • <Star size={14} className="text-amber-500 ml-2"/> {cut.barber}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end w-full sm:w-auto relative z-10 mt-2 sm:mt-0">
                    <button className="px-6 py-3 bg-zinc-900 border border-zinc-700 hover:border-red-500 hover:text-red-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors">
                      Cancelar Hora
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cortes Pasados */}
            <div>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><History className="text-zinc-500" size={20}/> Cortes Anteriores</h2>
              <div className="grid gap-4">
                {PAST_CUTS.map(cut => (
                  <div key={cut.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-900/80 transition-colors">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
                        <Scissors size={20} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white">{cut.service}</h4>
                        <p className="text-sm text-zinc-500 flex items-center gap-2 mt-1">
                          <CalendarDays size={14}/> {cut.date} • <Star size={14} className="text-amber-500 ml-2"/> {cut.barber}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end w-full sm:w-auto border-t sm:border-t-0 border-zinc-800 pt-4 sm:pt-0 mt-2 sm:mt-0">
                      <span className="text-lg font-black text-amber-500">{formatMoney(cut.price)}</span>
                      <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded-md mt-1">Completado</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: BENEFICIOS (Gamificación) */}
        {/* =================================================================== */}
        {activeTab === "BENEFICIOS" && (
          <motion.div key="beneficios" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="space-y-8">
            
            {/* Tarjeta Nivel VIP */}
            <div className="bg-gradient-to-br from-amber-500/20 to-zinc-950 border border-amber-500/30 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
              <Crown className="absolute -bottom-10 -right-10 text-amber-500/10 w-64 h-64 pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="w-32 h-32 bg-amber-500 rounded-full flex flex-col items-center justify-center text-black shadow-[0_0_40px_rgba(217,119,6,0.4)]">
                  <span className="text-4xl font-black">{CURRENT_USER.points}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Puntos</span>
                </div>
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Nivel: Cliente {CURRENT_USER.tier}</h3>
                  <p className="text-zinc-400 mb-6">Te faltan 150 puntos para alcanzar el nivel Platino y obtener beneficios supremos.</p>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-950 rounded-full h-4 border border-zinc-800 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full relative" style={{width: '85%'}}>
                      <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Promociones Desbloqueables */}
            <div>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Gift className="text-amber-500"/> Recompensas Disponibles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 flex items-start gap-4 hover:border-amber-500/50 transition-colors group">
                  <div className="w-14 h-14 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Corte Perfilado Gratis</h4>
                    <p className="text-sm text-zinc-400 mb-4">Canjeable por 500 puntos salvajes.</p>
                    <button className="px-5 py-2.5 bg-zinc-800 hover:bg-amber-500 hover:text-black text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors">
                      Canjear Ahora
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 flex items-start gap-4 opacity-60 relative overflow-hidden">
                  <div className="w-14 h-14 bg-zinc-800 text-zinc-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Servicio VIP a mitad de precio</h4>
                    <p className="text-sm text-zinc-400 mb-2">Requiere Nivel Platino (1000 pts).</p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-zinc-500">
                      <Lock size={12} /> Bloqueado
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}