"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// Importamos la Server Action segura que creamos en el Paso 3
import { createAppointment } from "@/app/actions/appointment";

import { 
  CalendarDays, Clock, Scissors, Star, ChevronRight, 
  ArrowLeft, CheckCircle2, Crown, Zap, History, Gift,
  AlertCircle, Lock, Settings, MessageSquare,
  Loader2, UserCircle2, XCircle, LogOut, Check
} from "lucide-react";

// ============================================================================
// TIPADOS REALES Y UTILIDADES
// ============================================================================
type TabType = "AGENDAR" | "HISTORIAL" | "BENEFICIOS";
type BookingStep = 1 | 2 | 3 | 4;

interface ClientProfile { id: string; name: string; phone: string; email: string; points: number; tier?: string; }
interface Barber { id: string; name: string; role: string; img: string; tag: string; }
interface Service { id: string; name: string; price: number; time: string; duration?: number; desc: string; }
interface Appointment { id: string; date: string; time: string; status: string; barber: Barber; service: Service; }
interface VIPBenefit { id: string; tier_name: string; required_points: number; reward_desc: string; }

// Intervalos exactos de 1 Hora
const TIME_SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

// Corrector de Zona Horaria (Para evitar bugs de UTC a medianoche)
const getLocalTodayDate = () => {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().split('T')[0];
};

const TODAY_DATE = getLocalTodayDate();
const formatMoney = (amount: number | string) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(numericAmount || 0);
};

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
// COMPONENTE PRINCIPAL DEL CLIENTE (Contenido)
// ============================================================================
function ClientDashboardContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Estados Globales
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [vipBenefits, setVipBenefits] = useState<VIPBenefit[]>([]); // <--- Nuevo Estado Dinámico
  const [bookedSlots, setBookedSlots] = useState<string[]>([]); 
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Estados de UI
  const [activeTab, setActiveTab] = useState<TabType>("AGENDAR");
  
  // Estados del Wizard
  const [step, setStep] = useState<BookingStep>(1);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientNotes, setClientNotes] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ============================================================================
  // CARGA DE DATOS Y SEGURIDAD
  // ============================================================================
  const loadClientData = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) {
        router.push("/login");
        return;
      }

      // 1. Historial (Se carga primero para calcular los puntos reales)
      const { data: dbAppointments } = await supabase
        .from('Appointments')
        .select(`
          id, date, time, status, notes,
          barber:barber_id (id, name, img),
          service:service_id (id, name, price)
        `)
        .eq('client_id', user.id)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (dbAppointments) setMyAppointments(dbAppointments as unknown as Appointment[]);

      // Cálculo de Puntos Automático ($100 = 1 Punto)
      const completedAppts = (dbAppointments || []).filter(a => a.status === 'COMPLETED');
      const totalSpent = completedAppts.reduce((sum, a) => sum + Number((a.service as any)?.price || 0), 0);
      const puntosCalculados = Math.floor(totalSpent / 100);

      // 2. Perfil del Cliente
      let { data: profile } = await supabase.from('clients').select('*').eq('id', user.id).single();
      
      if (!profile) {
        const { data: newProfile } = await supabase.from('clients').insert({
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente Emperador',
          email: user.email,
          phone: user.user_metadata?.phone || '',
          points: 0
        }).select().single();
        profile = newProfile;
      }

      // Usamos el puntaje mayor: El calculado automáticamente o el forzado manualmente por el admin
      const puntosFinales = profile.points > puntosCalculados ? profile.points : puntosCalculados;

      // 3. Cargar Beneficios VIP desde Supabase (Dinámico)
      const { data: dbBenefits } = await supabase.from('ClientBenefits').select('*').order('required_points', { ascending: true });
      let loadedBenefits: VIPBenefit[] = [];
      if (dbBenefits) {
         loadedBenefits = dbBenefits;
         setVipBenefits(loadedBenefits);
      }

      // Gamificación Dinámica (Basado en la tabla de beneficios)
      let currentTier = "Nuevo";
      for (const benefit of loadedBenefits) {
         if (puntosFinales >= benefit.required_points) {
             currentTier = benefit.tier_name; // Va sobreescribiendo hasta quedarse con el nivel más alto alcanzado
         }
      }

      setClientProfile({ ...profile, points: puntosFinales, tier: currentTier });

      // 4. Cargar Barberos (Activos)
      const { data: dbBarbers } = await supabase.from('Barbers').select('*').eq('status', 'ACTIVE');
      if (dbBarbers) {
        setBarbers(dbBarbers as Barber[]);
        
        const barberIdFromUrl = searchParams.get("barber");
        if (barberIdFromUrl) {
          const preSelected = dbBarbers.find(b => b.id === barberIdFromUrl || b.name.toLowerCase().replace(/\s+/g, '-') === barberIdFromUrl);
          if (preSelected) {
            setSelectedBarber(preSelected as Barber);
            setStep(2); 
          }
        }
      }

      // 5. Cargar Servicios (Con order_index para que coincida con admin)
      const { data: dbServices } = await supabase.from('Services').select('*');
      if (dbServices) {
         const sortedServices = dbServices.sort((a, b) => {
            const indexA = a.order_index || 0;
            const indexB = b.order_index || 0;
            if (indexA === indexB) return (a.price || 0) - (b.price || 0);
            return indexA - indexB;
         });
         setServices(sortedServices);
      }

    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setIsAppLoading(false);
    }
  }, [supabase, router, searchParams]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  // ============================================================================
  // LÓGICA DE HORAS DISPONIBLES Y BLOQUEOS
  // ============================================================================
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (selectedDate && selectedBarber) {
        const { data } = await supabase
          .from('Appointments')
          .select('time')
          .eq('barber_id', selectedBarber.id)
          .eq('date', selectedDate)
          .in('status', ['PENDING', 'CONFIRMED', 'BLOCKED']); 
          
        if (data) {
          setBookedSlots(data.map(app => app.time.substring(0, 5)));
        }
      }
    };
    fetchBookedSlots();
  }, [selectedDate, selectedBarber, supabase]);

  // ============================================================================
  // ACCIONES DEL WIZARD
  // ============================================================================
  const handleNextStep = () => setStep((prev) => (prev < 4 ? prev + 1 : prev) as BookingStep);
  const handlePrevStep = () => setStep((prev) => (prev > 1 ? prev - 1 : prev) as BookingStep);

  const handleConfirmBooking = async () => {
    if (!clientProfile || !selectedBarber || !selectedService) return;
    setIsConfirming(true);
    
    try {
      const appointmentData = {
        barber_id: selectedBarber.id,
        barber_name: selectedBarber.name,
        service_id: selectedService.id,
        service_name: selectedService.name,
        date: selectedDate,
        time: selectedTime,
        client_name: clientProfile.name,
        client_phone: clientProfile.phone,
        notes: clientNotes ? `Nota del cliente: ${clientNotes}` : `Reserva desde Panel Cliente. Duración: ${selectedService.duration || 60} min`
      };

      const result = await createAppointment(appointmentData);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      await loadClientData(); 
      setIsSuccess(true);
    } catch (error: any) {
      alert(error.message || "Error al procesar reserva. Es posible que el horario ya no esté disponible.");
    } finally {
      setIsConfirming(false);
    }
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

  const handleCancelAppointment = async (id: string) => {
    if(!window.confirm("¿Seguro que deseas cancelar esta reserva? El barbero será notificado.")) return;
    try {
      const { error } = await supabase.from('Appointments').update({ status: 'CANCELLED' }).eq('id', id);
      if (error) throw error;
      loadClientData();
      alert("Reserva cancelada correctamente.");
    } catch (error) {
      alert("Error al cancelar la reserva.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const upcomingCuts = myAppointments.filter(a => a.date >= TODAY_DATE && (a.status === 'PENDING' || a.status === 'CONFIRMED'));
  const pastCuts = myAppointments.filter(a => a.date < TODAY_DATE || a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'NO_SHOW');

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-amber-500 gap-4">
        <Loader2 className="animate-spin" size={40} />
        <p className="font-black uppercase tracking-widest text-xs">Accediendo a tu cuenta imperial...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-20 pt-8 px-6">
      
      {/* HEADER DEL CLIENTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-zinc-900/40 p-8 rounded-[2.5rem] border border-zinc-800 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 bg-zinc-950 border-2 border-amber-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(217,119,6,0.3)] overflow-hidden">
              <span className="text-4xl font-black text-amber-500">{clientProfile?.name?.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase font-serif">
              Hola, <span className="text-amber-500">{clientProfile?.name.split(' ')[0]}</span>
            </h1>
            <p className="text-zinc-400 mt-1 font-medium text-sm flex items-center gap-2">
              <Star size={14} className="text-amber-500" /> Bienvenido a tu portal imperial.
            </p>
          </div>
        </div>

        {/* Tarjeta de Puntos VIP y Settings */}
        <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
          <div className="bg-zinc-950 border border-zinc-800 p-4 px-6 rounded-2xl flex items-center gap-4 flex-1 md:flex-none shadow-inner">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
              <Crown size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nivel Actual</p>
              <p className="text-xl font-bold text-white flex items-center gap-2">
                {clientProfile?.tier} <span className="text-black text-xs bg-amber-500 px-2 py-0.5 rounded-md font-black">{clientProfile?.points} pts</span>
              </p>
            </div>
          </div>
          
          <div className="relative">
            <button onClick={() => setShowSettings(!showSettings)} className="p-4 bg-zinc-950 text-zinc-400 hover:text-amber-500 rounded-2xl border border-zinc-800 transition-colors h-full flex items-center justify-center shadow-lg" title="Ajustes de Perfil">
              <Settings size={24} />
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-4 text-red-500 hover:bg-red-500/10 font-bold text-xs uppercase tracking-widest transition-colors text-left">
                  <LogOut size={16} /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex gap-3 mb-10 border-b border-zinc-800 pb-4 overflow-x-auto hide-scrollbar scroll-smooth">
        {(["AGENDAR", "HISTORIAL", "BENEFICIOS"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-2 ${
              activeTab === tab 
                ? "bg-amber-500 text-black shadow-[0_10px_30px_rgba(217,119,6,0.3)]" 
                : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800"
            }`}
          >
            {tab === "AGENDAR" && <CalendarDays size={18}/>}
            {tab === "HISTORIAL" && <History size={18}/>}
            {tab === "BENEFICIOS" && <Gift size={18}/>}
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* =================================================================== */}
        {/* TAB 1: AGENDAR CITA (WIZARD) */}
        {/* =================================================================== */}
        {activeTab === "AGENDAR" && (
          <motion.div key="agendar" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="bg-zinc-900/30 border border-zinc-800 rounded-[3rem] p-8 md:p-12 relative overflow-hidden">
            
            {isSuccess ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-16">
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 font-serif">¡Reserva Confirmada!</h2>
                <p className="text-zinc-400 max-w-md mx-auto mb-10 text-lg">
                  Tu trono está asegurado. Te esperamos el <strong className="text-white bg-zinc-800 px-2 py-1 rounded">{selectedDate}</strong> a las <strong className="text-white bg-zinc-800 px-2 py-1 rounded">{selectedTime}</strong> con <strong className="text-amber-500">{selectedBarber?.name}</strong>.
                </p>
                <button onClick={resetBooking} className="px-8 py-5 bg-zinc-950 hover:bg-zinc-800 text-white font-black rounded-2xl transition-colors border border-zinc-700 uppercase tracking-widest text-xs shadow-xl active:scale-95">
                  Agendar otra cita
                </button>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-12 relative max-w-3xl mx-auto">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-800 z-0 rounded-full"></div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-amber-500 z-0 rounded-full transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
                  
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 ${step >= i ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(217,119,6,0.5)] scale-110' : 'bg-zinc-900 text-zinc-500 border-2 border-zinc-800'}`}>
                      {step > i ? <CheckCircle2 size={24} /> : i}
                    </div>
                  ))}
                </div>

                {step > 1 && (
                  <button onClick={handlePrevStep} className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 transition-colors mb-8 text-xs font-black uppercase tracking-widest bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 w-max">
                    <ArrowLeft size={16} /> Volver
                  </button>
                )}

                <div className="min-h-[400px]">
                  <AnimatePresence mode="wait">
                    
                    {step === 1 && (
                      <motion.div key="step1" variants={slideLeft} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-3xl font-black text-white mb-8 font-serif italic">1. Elige a tu Maestro</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {barbers.map(b => (
                            <div 
                              key={b.id} 
                              onClick={() => { setSelectedBarber(b); handleNextStep(); }}
                              className={`cursor-pointer group relative overflow-hidden rounded-[2rem] border-2 transition-all duration-300 ${selectedBarber?.id === b.id ? 'border-amber-500 bg-zinc-900/80 shadow-[0_0_30px_rgba(217,119,6,0.2)] scale-105' : 'border-zinc-800 bg-zinc-950 hover:border-amber-500/50'}`}
                            >
                              <div className="aspect-square relative">
                                {b.img ? (
                                  <Image src={b.img} fill alt={b.name} className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700" unoptimized />
                                ) : (
                                  <UserCircle2 className="w-full h-full p-10 text-zinc-700 bg-zinc-900" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>
                              </div>
                              <div className="absolute bottom-0 left-0 w-full p-6">
                                <span className="px-3 py-1 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest rounded-md mb-2 inline-block">{b.tag || b.role || 'Barbero'}</span>
                                <h4 className="text-2xl font-black text-white">{b.name}</h4>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div key="step2" variants={slideLeft} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-3xl font-black text-white mb-8 font-serif italic">2. ¿Qué te haremos hoy?</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          {services.map(s => (
                            <div 
                              key={s.id} 
                              onClick={() => { setSelectedService(s); handleNextStep(); }}
                              className={`flex flex-col p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${selectedService?.id === s.id ? 'border-amber-500 bg-zinc-900 shadow-[0_0_20px_rgba(217,119,6,0.1)]' : 'border-zinc-800 bg-zinc-950 hover:border-amber-500/50 hover:-translate-y-1'}`}
                            >
                              <div className="flex gap-4 items-start mb-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${selectedService?.id === s.id ? 'bg-amber-500 text-black' : 'bg-black border border-zinc-800 text-amber-500'}`}>
                                  <DynamicIcon name={s.iconName || "Scissors"} size={24} />
                                </div>
                                <div>
                                  <h4 className="text-lg font-black text-white uppercase tracking-tight leading-tight">{s.name}</h4>
                                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{s.desc}</p>
                                </div>
                              </div>
                              <div className="flex items-end justify-between border-t border-zinc-800/50 pt-4 mt-auto">
                                <span className="text-xs font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1"><Clock size={14}/> {s.time}</span>
                                <span className="text-2xl font-black text-amber-500 tracking-tighter">{formatMoney(s.price)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div key="step3" variants={slideLeft} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-3xl font-black text-white mb-8 font-serif italic">3. Fecha y Hora con {selectedBarber?.name.split(' ')[0]}</h3>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          {/* FECHA */}
                          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2rem] shadow-inner h-max">
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 pl-2">Selecciona el Día</label>
                            <input 
                              type="date" 
                              min={TODAY_DATE}
                              value={selectedDate}
                              onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); }}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-5 text-white focus:border-amber-500 outline-none font-bold cursor-pointer"
                            />
                            
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-8 mb-4 pl-2 flex items-center gap-2">
                              <MessageSquare size={14} /> Instrucciones para el barbero
                            </label>
                            <textarea 
                              placeholder="Ej: Llegaré 5 minutos tarde..."
                              value={clientNotes}
                              onChange={(e) => setClientNotes(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none resize-none h-32 text-sm"
                            ></textarea>
                          </div>

                          {/* HORAS */}
                          <div>
                            {selectedDate ? (
                              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 pl-2">Horas Disponibles</label>
                                <div className="grid grid-cols-3 gap-4">
                                  {TIME_SLOTS.map(time => {
                                    const now = new Date();
                                    const currentHourStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                                    // Comprobamos si la hora ya pasó EN EL DÍA DE HOY
                                    const isPast = selectedDate === TODAY_DATE && time < currentHourStr;
                                    const isBooked = bookedSlots.includes(time.substring(0, 5)) || isPast;
                                    
                                    return (
                                      <button
                                        key={time}
                                        disabled={isBooked}
                                        onClick={() => { setSelectedTime(time); handleNextStep(); }}
                                        className={`py-5 rounded-2xl font-black text-sm transition-all border-2 flex flex-col items-center justify-center gap-1 ${
                                          isBooked 
                                            ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50' 
                                            : selectedTime === time 
                                              ? 'bg-amber-500 border-amber-500 text-black shadow-[0_10px_20px_rgba(217,119,6,0.4)] scale-105' 
                                              : 'bg-zinc-950 border-zinc-800 text-white hover:border-amber-500/50 hover:-translate-y-1'
                                        }`}
                                      >
                                        <span className={isBooked ? 'line-through' : ''}>{time}</span>
                                        {isBooked && <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">{isPast ? 'Pasado' : 'Ocupado'}</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                                <p className="text-zinc-500 text-xs mt-6 text-center italic font-medium">El sistema bloquea automáticamente los horarios ya reservados u horas pasadas.</p>
                              </motion.div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-[2rem] p-10 text-center bg-zinc-950/30">
                                <CalendarDays size={48} className="mb-4 opacity-20" />
                                <p className="font-bold text-sm">Selecciona una fecha primero<br/>para ver la disponibilidad del barbero.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {step === 4 && selectedBarber && selectedService && (
                      <motion.div key="step4" variants={slideLeft} initial="hidden" animate="visible" exit="exit" className="max-w-2xl mx-auto">
                        <h3 className="text-3xl font-black text-white mb-8 text-center font-serif italic">4. Confirma tu Trono</h3>
                        
                        <div className="bg-zinc-950 border border-zinc-800 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl">
                          <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#050505] rounded-full border-r border-zinc-800"></div>
                          <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#050505] rounded-full border-l border-zinc-800"></div>
                          
                          <div className="border-b-2 border-dashed border-zinc-800 pb-8 mb-8 text-center">
                            <h4 className="font-serif font-black text-3xl text-white tracking-tighter uppercase mb-2">TICKET DE RESERVA</h4>
                            <p className="text-amber-500 text-xs font-black uppercase tracking-[0.3em]">{clientProfile?.name}</p>
                          </div>

                          <div className="space-y-6">
                            <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl">
                              <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Servicio</span>
                              <span className="text-white font-black text-right uppercase">{selectedService.name}</span>
                            </div>
                            <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl">
                              <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Master Barber</span>
                              <span className="text-white font-black flex items-center gap-2"><Star size={14} className="text-amber-500"/> {selectedBarber.name}</span>
                            </div>
                            <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-xl">
                              <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Fecha y Hora</span>
                              <span className="text-black font-black bg-amber-500 px-4 py-1.5 rounded-lg">{selectedDate} / {selectedTime}</span>
                            </div>
                            {clientNotes && (
                              <div className="flex justify-between items-start p-4">
                                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Notas</span>
                                <span className="text-zinc-400 text-sm text-right max-w-[200px] italic">"{clientNotes}"</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-10 pt-8 border-t border-zinc-800 flex justify-between items-end">
                            <span className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">A pagar en local</span>
                            <span className="text-5xl font-black text-amber-500 tracking-tighter">{formatMoney(selectedService.price)}</span>
                          </div>
                        </div>

                        <button 
                          onClick={handleConfirmBooking}
                          disabled={isConfirming}
                          className="w-full mt-10 py-6 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] text-sm rounded-2xl transition-all shadow-[0_15px_40px_rgba(217,119,6,0.4)] flex justify-center items-center gap-3 disabled:opacity-70 disabled:hover:bg-amber-500 active:scale-95"
                        >
                          {isConfirming ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                          {isConfirming ? "Registrando en Base de Datos..." : "Confirmar Reserva"}
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
        {/* TAB 2: HISTORIAL */}
        {/* =================================================================== */}
        {activeTab === "HISTORIAL" && (
          <motion.div key="historial" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="space-y-12">
            <div>
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight border-b border-zinc-800 pb-4"><Clock className="text-amber-500" size={24}/> Próximos Cortes</h2>
              {upcomingCuts.length > 0 ? (
                <div className="grid gap-6">
                  {upcomingCuts.map(cut => (
                    <div key={cut.id} className="bg-gradient-to-r from-amber-500/10 to-zinc-950 border border-amber-500/30 rounded-[2rem] p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden shadow-lg">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none"></div>
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="w-20 h-20 bg-amber-500 rounded-2xl flex flex-col items-center justify-center text-black shadow-[0_0_20px_rgba(217,119,6,0.3)] shrink-0">
                          <span className="font-black text-2xl leading-none">{cut.time.split(':')[0]}</span>
                          <span className="text-sm font-bold leading-none">{cut.time.split(':')[1]}</span>
                        </div>
                        <div>
                          <h4 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{cut.service?.name}</h4>
                          <p className="text-sm text-zinc-400 flex items-center gap-2 font-bold">
                            <CalendarDays size={14}/> {cut.date} • <Star size={14} className="text-amber-500 ml-2"/> {cut.barber?.name}
                          </p>
                          <span className="inline-block mt-3 px-3 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/50 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            {cut.status === 'CONFIRMED' ? 'Confirmado por Barbero' : 'Esperando Confirmación'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end w-full sm:w-auto relative z-10 mt-4 sm:mt-0">
                        <button onClick={() => handleCancelAppointment(cut.id)} className="px-6 py-4 bg-zinc-950 border border-zinc-800 hover:border-red-500 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                          Cancelar Cita
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-10 text-center"><p className="text-zinc-500 font-medium">No tienes citas agendadas próximamente.</p></div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight border-b border-zinc-800 pb-4"><History className="text-zinc-500" size={24}/> Historial Completo</h2>
              {pastCuts.length > 0 ? (
                <div className="grid gap-4">
                  {pastCuts.map(cut => (
                    <div key={cut.id} className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-900/80 transition-colors">
                      <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${cut.status === 'COMPLETED' ? 'bg-zinc-950 border border-green-500/30 text-green-500' : 'bg-zinc-950 border border-red-500/30 text-red-500'}`}>
                          {cut.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white uppercase">{cut.service?.name}</h4>
                          <p className="text-sm text-zinc-500 flex items-center gap-2 mt-1 font-medium"><CalendarDays size={14}/> {cut.date} • <Star size={14} className="text-zinc-600 ml-2"/> {cut.barber?.name}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end w-full sm:w-auto border-t sm:border-t-0 border-zinc-800 pt-4 sm:pt-0 mt-2 sm:mt-0">
                        <span className="text-xl font-black text-white tracking-tighter">{formatMoney(cut.service?.price as number)}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md mt-2 ${cut.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {cut.status === 'COMPLETED' ? 'Realizado' : 'Cancelado / Falta'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 font-medium">Aún no tienes historial registrado.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: BENEFICIOS VIP DINÁMICOS */}
        {/* =================================================================== */}
        {activeTab === "BENEFICIOS" && (
          <motion.div key="beneficios" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="space-y-8">
            
            {/* Banner VIP Resumen */}
            <div className="bg-gradient-to-br from-amber-500/20 to-zinc-950 border border-amber-500/30 rounded-[3rem] p-10 md:p-16 relative overflow-hidden shadow-2xl">
              <Crown className="absolute -bottom-10 -right-10 text-amber-500/10 w-80 h-80 pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                <div className="w-36 h-36 bg-amber-500 rounded-[2.5rem] flex flex-col items-center justify-center text-black shadow-[0_0_50px_rgba(217,119,6,0.5)] shrink-0 rotate-3">
                  <span className="text-5xl font-black">{clientProfile?.points}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest mt-1">Puntos</span>
                </div>
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-3 font-serif italic">Nivel: {clientProfile?.tier}</h3>
                  <p className="text-zinc-300 mb-8 font-medium text-lg">Acumulas 1 punto por cada $100 gastados en tus cortes. Sigue subiendo de nivel para desbloquear los beneficios exclusivos de la barbería.</p>
                </div>
              </div>
            </div>

            {/* Listado Dinámico de Beneficios extraído de Supabase */}
            <div>
              <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3 uppercase border-b border-zinc-800 pb-4"><Gift className="text-amber-500" size={24}/> Catálogo de Recompensas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vipBenefits.length === 0 ? (
                  <div className="col-span-full p-10 border-2 border-dashed border-zinc-800 rounded-3xl text-center">
                    <p className="text-zinc-500 font-bold">Aún no hay beneficios VIP publicados. ¡Pronto habrá sorpresas!</p>
                  </div>
                ) : (
                  vipBenefits.map(benefit => {
                    // Verificamos si el cliente tiene los puntos necesarios para este beneficio
                    const isUnlocked = (clientProfile?.points || 0) >= benefit.required_points;
                    
                    return (
                      <div key={benefit.id} className={`bg-zinc-900/40 border ${isUnlocked ? 'border-green-500/30' : 'border-zinc-800'} rounded-[2rem] p-8 flex flex-col justify-between transition-colors relative overflow-hidden ${!isUnlocked && 'opacity-60'}`}>
                        
                        {/* Cinta de estado */}
                        <div className={`absolute top-0 right-0 px-4 py-1 text-[9px] font-black uppercase tracking-widest rounded-bl-xl ${isUnlocked ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                          {isUnlocked ? 'Desbloqueado' : 'Bloqueado'}
                        </div>

                        <div>
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${isUnlocked ? 'bg-green-500/10 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' : 'bg-zinc-950 border border-zinc-800 text-zinc-600'}`}>
                            {isUnlocked ? <Zap size={24} /> : <Lock size={24} />}
                          </div>
                          
                          <h4 className="font-black text-xl text-white mb-1 uppercase tracking-tight">{benefit.tier_name}</h4>
                          <p className="text-[10px] font-bold font-mono text-amber-500 bg-amber-500/10 px-2 py-1 rounded inline-block mb-4">Requiere: {benefit.required_points} PTS</p>
                          <p className="text-sm text-zinc-400 mb-6 font-medium leading-relaxed">{benefit.reward_desc}</p>
                        </div>

                        <button 
                          disabled={!isUnlocked} 
                          className={`w-full py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex justify-center items-center gap-2 ${
                            isUnlocked 
                              ? 'bg-zinc-950 border border-green-500 hover:bg-green-500 hover:text-black text-white shadow-lg' 
                              : 'bg-zinc-950 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                          }`}
                        >
                          {isUnlocked ? <><Check size={14}/> Cobrar en Local</> : <><Lock size={14}/> Faltan Puntos</>}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// Exportación envuelta en Suspense
export default function ClientDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-amber-500 gap-4">
        <Loader2 className="animate-spin h-10 w-10 mb-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.5em]">Cargando Portal...</span>
      </div>
    }>
      <ClientDashboardContent />
    </Suspense>
  );
}