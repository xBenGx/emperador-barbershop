"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// Importamos la Server Action segura (¡Esto dispara el WhatsApp automático al crear/cancelar!)
import { createAppointment, deleteAppointment } from "@/app/actions/appointment";

// IMPORTACIONES DE ICONOS
import * as LucideIcons from "lucide-react";
import { 
  CalendarDays, Clock, Scissors, Star, ChevronRight, 
  ArrowLeft, CheckCircle2, Crown, Zap, History, Gift,
  AlertCircle, Lock, Settings, MessageSquare,
  Loader2, UserCircle2, XCircle, LogOut, Check,
  Phone
} from "lucide-react";

// ============================================================================
// TIPADOS REALES Y UTILIDADES
// ============================================================================
type TabType = "AGENDAR" | "HISTORIAL" | "BENEFICIOS";
type BookingStep = 1 | 2 | 3 | 4;

interface ClientProfile { id: string; name: string; phone: string; email: string; points: number; tier?: string; }
interface Barber { id: string; name: string; role: string; img: string; tag: string; order_index?: number; }
interface Service { id: string; name: string; price: number; time: string; duration?: number; desc: string; iconName?: string; order_index?: number; }
interface Appointment { id: string; date: string; time: string; status: string; barber: Barber; service: Service; }
interface VIPBenefit { id: string; tier_name: string; required_points: number; reward_desc: string; }
interface Schedule { day_of_week: string; is_active: boolean; start_time: string; end_time: string; break_start: string; break_end: string; }

// Componente Dinámico para renderizar iconos desde la BD
const DynamicIcon = ({ name, size = 24, className = "" }: { name: string, size?: number, className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Scissors;
  return <IconComponent size={size} className={className} />;
};

const FALLBACK_TIME_SLOTS = {
  manana: ["10:00", "11:00", "12:00", "13:00", "14:00"],
  tarde: ["15:00", "16:00", "17:00"],
  noche: ["18:00", "19:00", "20:00"]
};

// Corrector de Zona Horaria
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

// CONSTANTES GLOBALES (Aseguradas para TS)
const DAYS_OF_WEEK = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const generateDates = () => {
  const dates = [];
  const today = new Date();
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
  for(let i = 0; i < 14; i++) { 
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const localDateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    if(d.getDay() !== 0) { 
      dates.push({ 
        day: days[d.getDay()], 
        date: d.getDate().toString(), 
        month: months[d.getMonth()],
        fullDate: localDateStr 
      });
    }
  }
  return dates;
};
const DATES = generateDates();

const timeToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// ============================================================================
// ANIMACIONES WIZARD
// ============================================================================
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }, exit: { opacity: 0, y: -20, transition: { duration: 0.2 } } };
const slideLeft: Variants = { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }, exit: { opacity: 0, x: -50, transition: { duration: 0.2 } } };

// ============================================================================
// COMPONENTE PRINCIPAL DEL CLIENTE (Contenido)
// ============================================================================
function ClientDashboardContent() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Estados Globales (Corregido nombre de appointments para TS)
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vipBenefits, setVipBenefits] = useState<VIPBenefit[]>([]); 
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Estados de UI
  const [activeTab, setActiveTab] = useState<TabType>("AGENDAR");
  
  // Estados del Wizard (Reserva Sincronizada)
  const [step, setStep] = useState<BookingStep>(1);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<any>(null); 
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientNotes, setClientNotes] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Lógica de Horarios Dinámicos
  const [bookedSlots, setBookedSlots] = useState<{time: string, duration: number}[]>([]);
  const [barberSchedule, setBarberSchedule] = useState<Schedule[]>([]);

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

      // 1. Historial 
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

      if (dbAppointments) setAppointments(dbAppointments as unknown as Appointment[]);

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

      // Usamos el puntaje mayor: El calculado o el forzado manualmente por admin
      const puntosFinales = profile.points > puntosCalculados ? profile.points : puntosCalculados;

      // 3. Beneficios VIP
      const { data: dbBenefits } = await supabase.from('ClientBenefits').select('*').order('required_points', { ascending: true });
      let loadedBenefits: VIPBenefit[] = [];
      if (dbBenefits) {
         loadedBenefits = dbBenefits;
         setVipBenefits(loadedBenefits);
      }

      let currentTier = "Nuevo";
      for (const benefit of loadedBenefits) {
         if (puntosFinales >= benefit.required_points) {
             currentTier = benefit.tier_name; 
         }
      }

      setClientProfile({ ...profile, points: puntosFinales, tier: currentTier });

      // 4. Barberos (Activos y Ordenados)
      const { data: dbBarbers } = await supabase.from('Barbers').select('*').eq('status', 'ACTIVE').order('order_index', { ascending: true });
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

      // 5. Servicios Ordenados
      const { data: dbServices } = await supabase.from('Services').select('*').order('order_index', { ascending: true }).order('price', { ascending: true });
      if (dbServices) {
         setServices(dbServices);
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
  // LÓGICA ROBUSTA DE HORARIOS Y BLOQUEOS
  // ============================================================================
  
  // Cargar horario del barbero seleccionado
  useEffect(() => {
    if (selectedBarber) {
      const fetchSchedule = async () => {
        const { data } = await supabase.from('barber_schedules').select('*').eq('barber_id', selectedBarber.id);
        if (data) setBarberSchedule(data);
      };
      fetchSchedule();
    }
  }, [selectedBarber, supabase]);

  const fetchBookedSlots = useCallback(async () => {
    if (selectedBarber && selectedDate) {
      try {
        const { data: rawAppts } = await supabase
          .from('Appointments') 
          .select('time, service_id')
          .eq('barber_id', selectedBarber.id)
          .eq('date', selectedDate.fullDate)
          .neq('status', 'CANCELLED');
          
        const { data: srvs } = await supabase.from('Services').select('id, duration');

        if (rawAppts) {
          const mappedSlots = rawAppts.map((a: any) => {
            const srv = srvs?.find(s => s.id === a.service_id);
            return { time: a.time, duration: srv?.duration || 60 };
          });
          setBookedSlots(mappedSlots);
        }
      } catch (error) {
        console.error("Error al leer slots ocupados:", error);
        setBookedSlots([]);
      }
    }
  }, [selectedBarber, selectedDate, supabase]);

  useEffect(() => {
    fetchBookedSlots();
  }, [fetchBookedSlots]);

  // Realtime Anti-Colisiones
  useEffect(() => {
    if (!selectedBarber || !selectedDate) return;
    
    const channel = supabase.channel(`client-appts-${selectedBarber.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'Appointments',
        filter: `barber_id=eq.${selectedBarber.id}` 
      }, () => {
        fetchBookedSlots();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedBarber, selectedDate, fetchBookedSlots, supabase]);

  // Generación dinámica del horario
  const dynamicTimeSlots = useMemo(() => {
    if (!selectedDate) return { manana: [], tarde: [], noche: [] };

    if (barberSchedule.length === 0) return FALLBACK_TIME_SLOTS;

    const dateObj = new Date(selectedDate.fullDate + 'T00:00:00');
    const currentDayName = DAYS_OF_WEEK[dateObj.getDay()];

    const todaySchedule = barberSchedule.find(s => s.day_of_week === currentDayName);

    if (!todaySchedule || !todaySchedule.is_active) {
      return { manana: [], tarde: [], noche: [] };
    }

    const startHour = parseInt(todaySchedule.start_time.split(':')[0]);
    const endHour = parseInt(todaySchedule.end_time.split(':')[0]);
    const breakStart = parseInt(todaySchedule.break_start.split(':')[0]);
    const breakEnd = parseInt(todaySchedule.break_end.split(':')[0]);

    const slots = [];
    for (let i = startHour; i < endHour; i++) {
      if (i >= breakStart && i < breakEnd) continue;
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }

    return {
      manana: slots.filter(t => parseInt(t.split(':')[0]) < 14),
      tarde: slots.filter(t => parseInt(t.split(':')[0]) >= 14 && parseInt(t.split(':')[0]) < 18),
      noche: slots.filter(t => parseInt(t.split(':')[0]) >= 18)
    };
  }, [selectedDate, barberSchedule]);

  // Motor de colisiones 
  const isSlotUnavailable = useCallback((timeStr: string) => {
    if (!selectedDate || !selectedService) return true;

    const now = new Date();
    const [year, month, day] = selectedDate.fullDate.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const slotDate = new Date(year, month - 1, day, hours, minutes);
    
    const diffHours = (slotDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < 2) return true;

    const slotStart = timeToMinutes(timeStr);
    const slotEnd = slotStart + (selectedService.duration || 60);

    if (barberSchedule.length > 0) {
      const currentDayName = DAYS_OF_WEEK[slotDate.getDay()];
      const todaySchedule = barberSchedule.find(s => s.day_of_week === currentDayName);
      
      if (todaySchedule) {
        const shiftEndMinutes = timeToMinutes(todaySchedule.end_time);
        if (slotEnd > shiftEndMinutes) return true;
      }
    }

    for (const booked of bookedSlots) {
       const bStart = timeToMinutes(booked.time);
       const bEnd = bStart + booked.duration;

       if (slotStart < bEnd && slotEnd > bStart) {
          return true; 
       }
    }

    return false; 
  }, [selectedDate, selectedService, bookedSlots, barberSchedule]);


  // ============================================================================
  // ACCIONES DEL WIZARD Y CRUD
  // ============================================================================
  const handleNextStep = () => setStep((prev) => (prev < 4 ? prev + 1 : prev) as BookingStep);
  const handlePrevStep = () => setStep((prev) => (prev > 1 ? prev - 1 : prev) as BookingStep);

  const handleConfirmBooking = async () => {
    if (!clientProfile || !selectedBarber || !selectedService || !selectedDate || !selectedTime) return;
    setIsConfirming(true);
    
    try {
      const appointmentData = {
        barber_id: selectedBarber.id,
        barber_name: selectedBarber.name,
        service_id: selectedService.id,
        service_name: selectedService.name,
        date: selectedDate.fullDate,
        time: selectedTime,
        client_name: clientProfile.name,
        client_phone: clientProfile.phone,
        notes: clientNotes ? `Nota del cliente: ${clientNotes}` : `Reserva desde App. Duración: ${selectedService.duration || 60} min`
      };

      const result = await createAppointment(appointmentData);
      
      if (!result.success) throw new Error(result.error);

      await loadClientData(); 
      setIsSuccess(true);
    } catch (error: any) {
      alert(error.message || "Error al procesar reserva. El horario podría ya no estar disponible.");
    } finally {
      setIsConfirming(false);
    }
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedBarber(null);
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedTime("");
    setClientNotes("");
    setIsSuccess(false);
  };

  const handleCancelAppointment = async (id: string, date: string, time: string) => {
    // Comprobar tiempo de anticipación para cancelar
    const now = new Date();
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const apptDate = new Date(year, month - 1, day, hours, minutes);
    
    const diffHours = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 2 && diffHours > 0) {
      alert("No puedes cancelar una cita con menos de 2 horas de anticipación. Por favor, comunícate directo con el barbero.");
      return;
    }

    if(!window.confirm("¿Seguro que deseas cancelar esta reserva? El barbero será notificado de tu cancelación.")) return;
    
    try {
      // Usamos la Server Action que dispara el WhatsApp al barbero
      const result = await deleteAppointment(id);
      if(result.success) {
         loadClientData();
         alert("Reserva cancelada correctamente.");
      } else {
         throw new Error("No se pudo cancelar.");
      }
    } catch (error) {
      alert("Error al cancelar la reserva.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Variables calculadas para Historial (Con los tipos correctos para evitar el error de TS)
  const upcomingCuts = appointments.filter((a: Appointment) => a.date >= TODAY_DATE && (a.status === 'PENDING' || a.status === 'CONFIRMED'));
  const pastCuts = appointments.filter((a: Appointment) => a.date < TODAY_DATE || a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'NO_SHOW');

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-amber-500 gap-4 p-4 text-center">
        <Loader2 className="animate-spin h-10 w-10 mb-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.5em]">Cargando Portal...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] min-h-screen pb-24 md:pb-20 pt-4 md:pt-8 px-4 md:px-10 relative selection:bg-amber-500 selection:text-black">
      
      {/* OCULTAR SIDEBAR (MOBILE FRIENDLY) */}
      <style dangerouslySetInnerHTML={{__html: `
        aside, nav[class*="sidebar" i], [class*="SideBar" i], [class*="Sidebar" i], #sidebar {
          display: none !important;
        }
        main, body, html, [class*="content" i], [class*="layout" i], .md\\:ml-64 {
          margin-left: 0 !important;
          padding-left: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          background-color: #050505 !important;
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* HEADER DEL CLIENTE (MOBILE FIRST) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4 bg-zinc-900/40 p-6 rounded-[2rem] border border-zinc-800 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-20 -right-20 w-48 h-48 md:w-64 md:h-64 bg-amber-500/10 blur-[60px] md:blur-[80px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
          <div className="relative group shrink-0">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-zinc-950 border-2 border-amber-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(217,119,6,0.3)] overflow-hidden">
              <span className="text-2xl md:text-4xl font-black text-amber-500">{clientProfile?.name?.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase font-serif leading-none">
              Hola, <span className="text-amber-500">{clientProfile?.name.split(' ')[0]}</span>
            </h1>
            <p className="text-zinc-400 mt-1 font-medium text-[9px] md:text-sm flex items-center gap-1.5 uppercase tracking-widest">
              <Star size={12} className="text-amber-500" /> Bienvenido a tu portal imperial.
            </p>
          </div>
        </div>

        {/* Tarjeta de Puntos VIP y Settings */}
        <div className="flex items-center gap-2 w-full md:w-auto relative z-10 mt-2 md:mt-0">
          <div className="bg-zinc-950 border border-zinc-800 p-3 md:p-4 rounded-xl md:rounded-2xl flex items-center gap-3 flex-1 shadow-inner">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500/10 text-amber-500 rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
              <Crown size={20} />
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Nivel Actual</p>
              <p className="text-sm md:text-xl font-bold text-white flex items-center gap-2 leading-none">
                {clientProfile?.tier} <span className="text-black text-[9px] md:text-xs bg-amber-500 px-1.5 py-0.5 rounded font-black">{clientProfile?.points} pts</span>
              </p>
            </div>
          </div>
          
          <div className="relative h-full flex shrink-0">
            <button onClick={() => setShowSettings(!showSettings)} className="w-16 md:w-16 bg-zinc-950 text-zinc-400 hover:text-amber-500 rounded-xl md:rounded-2xl border border-zinc-800 transition-colors flex items-center justify-center shadow-lg active:scale-95" title="Ajustes de Perfil">
              <Settings size={20} />
            </button>
            {showSettings && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-48 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-4 text-red-500 hover:bg-red-500/10 font-bold text-[10px] uppercase tracking-widest transition-colors text-left">
                  <LogOut size={16} /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN (SWIPEABLE) */}
      <div className="flex gap-2 mb-8 border-b border-zinc-800/50 pb-4 overflow-x-auto hide-scrollbar scroll-smooth -mx-4 px-4 md:mx-0 md:px-0 relative z-10 snap-x">
        {(["AGENDAR", "HISTORIAL", "BENEFICIOS"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); resetBooking(); }}
            className={`px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[9px] md:text-xs tracking-widest uppercase transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-2 snap-center ${
              activeTab === tab 
                ? "bg-amber-500 text-black shadow-[0_5px_20px_rgba(217,119,6,0.3)]" 
                : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800"
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
        {/* TAB 1: AGENDAR CITA (WIZARD CLON DEL PÚBLICO Y MOBILE FIRST) */}
        {/* =================================================================== */}
        {activeTab === "AGENDAR" && (
          <motion.div key="agendar" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="bg-transparent md:bg-zinc-900/30 md:border border-zinc-800 rounded-[2rem] md:rounded-[3rem] p-0 md:p-12 relative overflow-hidden">
            
            {isSuccess ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-10 md:py-16">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
                  <CheckCircle2 size={40} className="md:w-12 md:h-12" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-4 font-serif">¡Reserva Confirmada!</h2>
                <p className="text-zinc-400 max-w-md mx-auto mb-10 text-sm md:text-lg leading-relaxed">
                  Tu trono está asegurado. Te esperamos el <strong className="text-white bg-zinc-800 px-2 py-1 rounded mx-1">{selectedDate.fullDate}</strong> a las <strong className="text-white bg-zinc-800 px-2 py-1 rounded mx-1">{selectedTime}</strong> con <strong className="text-amber-500 mx-1">{selectedBarber?.name}</strong>.
                </p>
                <button onClick={resetBooking} className="px-6 py-4 md:px-8 md:py-5 bg-zinc-950 hover:bg-zinc-800 text-white font-black rounded-xl transition-colors border border-zinc-700 uppercase tracking-widest text-[10px] md:text-xs shadow-xl active:scale-95">
                  Agendar otra cita
                </button>
              </motion.div>
            ) : (
              <>
                {/* PROGRESO WIZARD */}
                <div className="flex items-center justify-between mb-8 md:mb-12 relative max-w-3xl mx-auto px-2">
                  <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-1 bg-zinc-800 z-0 rounded-full"></div>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 h-1 bg-amber-500 z-0 rounded-full transition-all duration-500" style={{ width: `calc(${((step - 1) / 3) * 100}% - 4px)` }}></div>
                  
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`relative z-10 w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-xs md:text-sm transition-all duration-300 ${step >= i ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(217,119,6,0.5)] scale-110' : 'bg-zinc-900 text-zinc-600 border-2 border-zinc-800'}`}>
                      {step > i ? <CheckCircle2 size={16} className="md:w-6 md:h-6" /> : i}
                    </div>
                  ))}
                </div>

                {step > 1 && (
                  <button onClick={handlePrevStep} className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 transition-colors mb-6 md:mb-8 text-[9px] md:text-xs font-black uppercase tracking-widest bg-zinc-950 px-3 md:px-4 py-2 rounded-lg border border-zinc-800 w-max active:scale-95">
                    <ArrowLeft size={14} /> Volver
                  </button>
                )}

                <div className="min-h-[300px]">
                  <AnimatePresence mode="wait">
                    
                    {/* PASO 1: ELEGIR BARBERO */}
                    {step === 1 && (
                      <motion.div key="step1" variants={slideLeft} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-2xl md:text-3xl font-black text-white mb-6 font-serif italic tracking-tight">1. Elige a tu Maestro</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                          {barbers.map(b => (
                            <button 
                              key={b.id} 
                              onClick={() => { setSelectedBarber(b); handleNextStep(); }}
                              className={`group relative overflow-hidden rounded-2xl md:rounded-[2rem] border-2 transition-all duration-300 aspect-[3/4] md:aspect-square flex flex-col justify-end text-left active:scale-95 ${selectedBarber?.id === b.id ? 'border-amber-500 bg-zinc-900/80 shadow-[0_0_20px_rgba(217,119,6,0.3)] scale-105' : 'border-zinc-800 bg-zinc-950 hover:border-amber-500/50'}`}
                            >
                              <div className="absolute inset-0 z-0">
                                {b.img ? (
                                  <Image src={b.img} fill alt={b.name} className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500" unoptimized />
                                ) : (
                                  <UserCircle2 className="w-full h-full p-6 text-zinc-800 bg-zinc-950" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>
                              </div>
                              <div className="relative z-10 p-3 md:p-6 w-full">
                                <span className="px-2 py-1 bg-amber-500 text-black text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded mb-1 md:mb-2 inline-block shadow-md">{b.tag || b.role || 'Barbero'}</span>
                                <h4 className="text-base md:text-xl font-black text-white uppercase leading-tight truncate">{b.name.split(' ')[0]}</h4>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* PASO 2: ELEGIR SERVICIO */}
                    {step === 2 && (
                      <motion.div key="step2" variants={slideLeft} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-2xl md:text-3xl font-black text-white mb-6 font-serif italic tracking-tight">2. ¿Qué te haremos hoy?</h3>
                        <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
                          {services.map(s => (
                            <button 
                              key={s.id} 
                              onClick={() => { setSelectedService(s); handleNextStep(); }}
                              className={`flex flex-col p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 text-left transition-all duration-300 active:scale-[0.98] ${selectedService?.id === s.id ? 'border-amber-500 bg-zinc-900 shadow-[0_0_15px_rgba(217,119,6,0.15)]' : 'border-zinc-800 bg-zinc-950 hover:border-amber-500/50 hover:-translate-y-1'}`}
                            >
                              <div className="flex gap-3 md:gap-4 items-start mb-3 md:mb-4">
                                <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md ${selectedService?.id === s.id ? 'bg-amber-500 text-black' : 'bg-black border border-zinc-800 text-amber-500'}`}>
                                  <DynamicIcon name={s.iconName || "Scissors"} size={20} />
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                  <h4 className="text-sm md:text-lg font-black text-white uppercase tracking-tight leading-tight truncate">{s.name}</h4>
                                  <p className="text-[10px] md:text-xs text-zinc-500 mt-0.5 md:mt-1 line-clamp-2 leading-relaxed">{s.desc}</p>
                                </div>
                              </div>
                              <div className="flex items-end justify-between border-t border-zinc-800/50 pt-3 mt-auto w-full">
                                <span className="text-[9px] md:text-xs font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1"><Clock size={12}/> {s.time}</span>
                                <span className="text-lg md:text-2xl font-black text-amber-500 tracking-tighter">{formatMoney(s.price)}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* PASO 3: FECHA Y HORA */}
                    {step === 3 && (
                      <motion.div key="step3" variants={slideLeft} initial="hidden" animate="visible" exit="exit" className="pb-24 md:pb-0">
                        <h3 className="text-2xl md:text-3xl font-black text-white mb-6 font-serif italic tracking-tight leading-tight">3. Tu Momento con {selectedBarber?.name.split(' ')[0]}</h3>
                        
                        <div className="space-y-6 md:space-y-10">
                          {/* FECHA SCROLLABLE HORIZONTAL */}
                          <div className="bg-zinc-950 border border-zinc-800 p-4 md:p-8 rounded-2xl md:rounded-[2rem] shadow-inner">
                            <label className="block text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 pl-1">Selecciona el Día</label>
                            
                            <div className="flex gap-2 md:gap-3 overflow-x-auto pb-4 hide-scrollbar -mx-2 px-2 md:mx-0 md:px-0 snap-x">
                              {DATES.map((d, i) => (
                                <button 
                                  key={i}
                                  onClick={() => { setSelectedDate(d); setSelectedTime(""); }}
                                  className={`flex-shrink-0 w-[4.5rem] md:w-20 h-20 md:h-24 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all snap-center border active:scale-95 ${selectedDate?.fullDate === d.fullDate ? 'bg-amber-500 border-amber-400 text-black shadow-[0_5px_15px_rgba(217,119,6,0.4)]' : 'bg-zinc-900 border-zinc-700 text-white'}`}
                                >
                                  <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] ${selectedDate?.fullDate === d.fullDate ? 'text-black/60' : 'text-zinc-500'}`}>{d.day}</span>
                                  <span className="text-xl md:text-3xl font-black tracking-tighter">{d.date}</span>
                                  <span className={`text-[8px] md:text-[9px] font-bold ${selectedDate?.fullDate === d.fullDate ? 'text-black/80' : 'text-zinc-600'}`}>{d.month}</span>
                                </button>
                              ))}
                            </div>
                            
                            <label className="block text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-4 mb-2 pl-1 flex items-center gap-1.5">
                              <MessageSquare size={12} /> Notas (Opcional)
                            </label>
                            <textarea 
                              placeholder="Ej: Llegaré 5 mins tarde..."
                              value={clientNotes}
                              onChange={(e) => setClientNotes(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none resize-none h-20 text-xs md:text-sm shadow-inner placeholder:text-zinc-600"
                            ></textarea>
                          </div>

                          {/* HORAS DINÁMICAS (Sincronizadas con SQL) */}
                          <div>
                            {selectedDate ? (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-950 border border-zinc-800 p-4 md:p-8 rounded-2xl md:rounded-[2rem] shadow-inner">
                                <label className="block text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 pl-1">Horas Disponibles</label>
                                
                                {dynamicTimeSlots.manana.length === 0 && dynamicTimeSlots.tarde.length === 0 && dynamicTimeSlots.noche.length === 0 ? (
                                   <div className="text-center py-8">
                                     <CalendarDays size={32} className="mx-auto text-zinc-700 mb-2" />
                                     <p className="text-zinc-500 font-bold text-xs">El maestro no atiende este día.</p>
                                   </div>
                                ) : (
                                  <div className="space-y-6">
                                    {[
                                      { title: "Mañana", slots: dynamicTimeSlots.manana },
                                      { title: "Tarde", slots: dynamicTimeSlots.tarde },
                                      { title: "Noche", slots: dynamicTimeSlots.noche }
                                    ].filter(s => s.slots.length > 0).map((section, idx) => (
                                      <div key={idx}>
                                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-3 pl-1 border-b border-zinc-800 pb-1 inline-block">{section.title}</p>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:gap-4">
                                          {section.slots.map(time => {
                                            const isUnavailable = isSlotUnavailable(time);
                                            return (
                                              <button
                                                key={time}
                                                disabled={isUnavailable}
                                                onClick={() => setSelectedTime(time)}
                                                className={`py-3 md:py-4 rounded-xl text-[10px] md:text-sm font-black uppercase transition-all border active:scale-[0.98] flex flex-col items-center justify-center gap-0.5 relative overflow-hidden ${
                                                  isUnavailable 
                                                    ? 'bg-zinc-900 border-zinc-800/50 text-zinc-700 cursor-not-allowed' 
                                                    : selectedTime === time 
                                                      ? 'bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
                                                      : 'bg-zinc-950 border-zinc-700 text-zinc-300 hover:border-amber-500 hover:text-white'
                                                }`}
                                              >
                                                {isUnavailable && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Lock size={12} className="text-zinc-800"/></div>}
                                                <span className={`${isUnavailable ? 'opacity-30 line-through' : ''}`}>{time}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            ) : (
                              <div className="h-40 flex flex-col items-center justify-center text-zinc-700 border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center">
                                <CalendarDays size={32} className="mb-2 opacity-50" />
                                <p className="font-bold text-[10px] md:text-xs">Selecciona una fecha en el<br/>calendario de arriba.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botón flotante Continuar */}
                        <AnimatePresence>
                          {selectedTime && (
                            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-6 left-4 right-4 md:static md:mt-8 z-50">
                              <button onClick={handleNextStep} className="w-full py-4 md:py-6 bg-amber-500 text-black font-black text-sm md:text-base uppercase tracking-[0.2em] rounded-xl md:rounded-2xl flex justify-center items-center gap-3 hover:bg-white transition-all shadow-[0_15px_30px_rgba(217,119,6,0.4)] active:scale-95">
                                Continuar <ChevronRight size={20} />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}

                    {/* PASO 4: CONFIRMACIÓN Y TICKET (Pre-llenado con cuenta) */}
                    {step === 4 && selectedBarber && selectedService && selectedDate && (
                      <motion.div key="step4" variants={slideLeft} initial="hidden" animate="visible" exit="exit" className="max-w-xl mx-auto">
                        <h3 className="text-2xl md:text-3xl font-black text-white mb-6 text-center font-serif italic">4. Confirma tu Trono</h3>
                        
                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden shadow-2xl mb-6">
                          <div className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 bg-[#050505] rounded-full border-r border-zinc-800"></div>
                          <div className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 bg-[#050505] rounded-full border-l border-zinc-800"></div>
                          
                          <div className="border-b-2 border-dashed border-zinc-800 pb-6 mb-6 text-center">
                            <h4 className="font-serif font-black text-2xl md:text-3xl text-white tracking-tighter uppercase mb-1 md:mb-2">TICKET DE RESERVA</h4>
                            <p className="text-amber-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] truncate">{clientProfile?.name}</p>
                          </div>

                          <div className="space-y-4 md:space-y-5 text-[11px] md:text-sm">
                            <div className="flex justify-between items-center bg-zinc-900/50 p-3 md:p-4 rounded-xl">
                              <span className="text-zinc-500 font-bold uppercase tracking-widest shrink-0">Servicio</span>
                              <span className="text-white font-black text-right uppercase pl-4 truncate">{selectedService.name}</span>
                            </div>
                            <div className="flex justify-between items-center bg-zinc-900/50 p-3 md:p-4 rounded-xl">
                              <span className="text-zinc-500 font-bold uppercase tracking-widest shrink-0">Master</span>
                              <span className="text-white font-black flex items-center gap-1.5 truncate pl-4"><Star size={12} className="text-amber-500 shrink-0"/> {selectedBarber.name}</span>
                            </div>
                            <div className="flex justify-between items-center bg-zinc-900/50 p-3 md:p-4 rounded-xl">
                              <span className="text-zinc-500 font-bold uppercase tracking-widest shrink-0">Horario</span>
                              <span className="text-black font-black bg-amber-500 px-3 py-1 md:px-4 md:py-1.5 rounded-lg ml-4 text-right leading-tight">
                                {selectedDate.date} {selectedDate.month} / {selectedTime}
                              </span>
                            </div>
                          </div>

                          <div className="mt-8 pt-6 md:mt-10 md:pt-8 border-t border-zinc-800 flex justify-between items-end">
                            <span className="text-zinc-500 font-black uppercase text-[9px] md:text-[10px] tracking-widest leading-none pb-1">A pagar en local</span>
                            <span className="text-3xl md:text-5xl font-black text-amber-500 tracking-tighter leading-none">{formatMoney(selectedService.price)}</span>
                          </div>
                        </div>

                        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3">
                           <UserCircle2 className="text-green-500 shrink-0" size={24} />
                           <p className="text-[10px] md:text-xs text-green-500 font-bold uppercase tracking-widest leading-tight">Tus datos están guardados automáticamente para agilizar la reserva.</p>
                        </div>

                        <button 
                          onClick={handleConfirmBooking}
                          disabled={isConfirming}
                          className="w-full mt-6 md:mt-8 py-5 md:py-6 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-sm rounded-xl md:rounded-2xl transition-all shadow-[0_15px_40px_rgba(217,119,6,0.3)] flex justify-center items-center gap-3 disabled:opacity-70 disabled:hover:bg-amber-500 active:scale-95"
                        >
                          {isConfirming ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                          {isConfirming ? "Registrando en Sistema..." : "Confirmar Reserva"}
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
        {/* TAB 2: HISTORIAL Y CANCELACIÓN */}
        {/* =================================================================== */}
        {activeTab === "HISTORIAL" && (
          <motion.div key="historial" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="space-y-10">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight border-b border-zinc-800 pb-3"><Clock className="text-amber-500" size={20}/> Próximos Cortes</h2>
              {upcomingCuts.length > 0 ? (
                <div className="grid gap-4 md:gap-6">
                  {upcomingCuts.map((cut: Appointment) => (
                    <div key={cut.id} className="bg-gradient-to-r from-amber-500/10 to-zinc-950 border border-amber-500/30 rounded-2xl md:rounded-[2rem] p-5 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 relative overflow-hidden shadow-lg">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none"></div>
                      <div className="flex items-center gap-4 md:gap-6 relative z-10 w-full md:w-auto">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-500 rounded-xl md:rounded-2xl flex flex-col items-center justify-center text-black shadow-[0_0_20px_rgba(217,119,6,0.3)] shrink-0">
                          <span className="font-black text-xl md:text-2xl leading-none">{cut.time.split(':')[0]}</span>
                          <span className="text-[10px] md:text-sm font-bold leading-none">{cut.time.split(':')[1]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight mb-1 truncate">{cut.service?.name}</h4>
                          <p className="text-[10px] md:text-sm text-zinc-400 flex flex-wrap items-center gap-2 font-bold">
                            <CalendarDays size={12} className="shrink-0"/> {cut.date} <span className="text-zinc-700 hidden sm:inline">•</span> <Star size={12} className="text-amber-500 sm:ml-2 shrink-0"/> <span className="truncate">{cut.barber?.name}</span>
                          </p>
                          <span className="inline-block mt-2 md:mt-3 px-2 md:px-3 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/50 rounded-md md:rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                            {cut.status === 'CONFIRMED' ? 'Confirmado' : 'Pendiente de confirmación'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end w-full md:w-auto relative z-10 border-t border-zinc-800/50 pt-4 md:border-0 md:pt-0 mt-1 md:mt-0">
                        <button onClick={() => handleCancelAppointment(cut.id, cut.date, cut.time)} className="w-full md:w-auto px-6 py-3 md:py-4 bg-zinc-950 border border-zinc-800 hover:border-red-500 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 text-center">
                          Cancelar Reserva
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 text-center"><p className="text-zinc-500 font-medium text-xs md:text-sm">No tienes citas agendadas próximamente.</p></div>
              )}
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight border-b border-zinc-800 pb-3"><History className="text-zinc-500" size={20}/> Historial Completo</h2>
              {pastCuts.length > 0 ? (
                <div className="grid gap-3 md:gap-4">
                  {pastCuts.map((cut: Appointment) => (
                    <div key={cut.id} className="bg-zinc-900/40 border border-zinc-800 rounded-xl md:rounded-[2rem] p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 hover:bg-zinc-900/80 transition-colors">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${cut.status === 'COMPLETED' ? 'bg-zinc-950 border border-green-500/30 text-green-500' : 'bg-zinc-950 border border-red-500/30 text-red-500'}`}>
                          {cut.status === 'COMPLETED' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm md:text-lg font-bold text-white uppercase truncate">{cut.service?.name}</h4>
                          <p className="text-[10px] md:text-sm text-zinc-500 flex flex-wrap items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1 font-medium"><CalendarDays size={12} className="shrink-0"/> {cut.date} <span className="hidden sm:inline">•</span> <Star size={12} className="text-zinc-600 sm:ml-1 shrink-0"/> <span className="truncate">{cut.barber?.name}</span></p>
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-zinc-800/50 pt-3 sm:pt-0 mt-1 sm:mt-0">
                        <span className="text-base md:text-xl font-black text-white tracking-tighter">{formatMoney(cut.service?.price as number)}</span>
                        <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded md:mt-2 ${cut.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {cut.status === 'COMPLETED' ? 'Realizado' : 'Cancelado / Falta'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 font-medium text-xs md:text-sm text-center p-8 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">Aún no tienes historial registrado.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: BENEFICIOS VIP DINÁMICOS */}
        {/* =================================================================== */}
        {activeTab === "BENEFICIOS" && (
          <motion.div key="beneficios" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="space-y-6 md:space-y-8">
            
            {/* Banner VIP Resumen */}
            <div className="bg-gradient-to-br from-amber-500/20 to-zinc-950 border border-amber-500/30 rounded-3xl md:rounded-[3rem] p-6 md:p-16 relative overflow-hidden shadow-2xl">
              <Crown className="absolute -bottom-10 -right-10 text-amber-500/10 w-48 h-48 md:w-80 md:h-80 pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 text-center md:text-left">
                <div className="w-24 h-24 md:w-36 md:h-36 bg-amber-500 rounded-2xl md:rounded-[2.5rem] flex flex-col items-center justify-center text-black shadow-[0_0_30px_rgba(217,119,6,0.4)] md:shadow-[0_0_50px_rgba(217,119,6,0.5)] shrink-0 md:rotate-3 border-2 border-amber-300">
                  <span className="text-3xl md:text-5xl font-black">{clientProfile?.points}</span>
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest mt-1">Puntos</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-2 md:mb-3 font-serif italic">Nivel: {clientProfile?.tier}</h3>
                  <p className="text-zinc-300 mb-2 md:mb-8 font-medium text-xs md:text-lg leading-relaxed max-w-lg">Acumulas <strong className="text-amber-500">1 punto por cada $100 gastados</strong> en tus cortes. Sigue subiendo de nivel para desbloquear los beneficios exclusivos de la barbería.</p>
                </div>
              </div>
            </div>

            {/* Listado Dinámico de Beneficios */}
            <div>
              <h3 className="text-xl md:text-2xl font-black text-white mb-6 flex items-center gap-2 uppercase border-b border-zinc-800 pb-3"><Gift className="text-amber-500 shrink-0" size={20}/> Catálogo de Recompensas</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {vipBenefits.length === 0 ? (
                  <div className="col-span-full p-8 md:p-10 border-2 border-dashed border-zinc-800 rounded-3xl text-center bg-zinc-900/30">
                    <p className="text-zinc-500 font-bold text-xs md:text-sm">Aún no hay beneficios VIP publicados. ¡Pronto habrá sorpresas!</p>
                  </div>
                ) : (
                  vipBenefits.map(benefit => {
                    const isUnlocked = (clientProfile?.points || 0) >= benefit.required_points;
                    
                    return (
                      <div key={benefit.id} className={`bg-zinc-900/40 border ${isUnlocked ? 'border-green-500/30' : 'border-zinc-800'} rounded-2xl md:rounded-[2rem] p-6 md:p-8 flex flex-col justify-between transition-colors relative overflow-hidden ${!isUnlocked && 'opacity-60 grayscale-[50%]'}`}>
                        
                        {/* Cinta de estado */}
                        <div className={`absolute top-0 right-0 px-3 py-1 md:px-4 md:py-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded-bl-lg md:rounded-bl-xl shadow-sm ${isUnlocked ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                          {isUnlocked ? 'Desbloqueado' : 'Bloqueado'}
                        </div>

                        <div>
                          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center mb-5 md:mb-6 ${isUnlocked ? 'bg-green-500/10 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' : 'bg-zinc-950 border border-zinc-800 text-zinc-600'}`}>
                            {isUnlocked ? <Zap size={20} className="md:w-6 md:h-6" /> : <Lock size={20} className="md:w-6 md:h-6" />}
                          </div>
                          
                          <h4 className="font-black text-lg md:text-xl text-white mb-1 uppercase tracking-tight pr-16">{benefit.tier_name}</h4>
                          <p className="text-[9px] md:text-[10px] font-bold font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded inline-block mb-3 md:mb-4">Requiere: {benefit.required_points} PTS</p>
                          <p className="text-xs md:text-sm text-zinc-400 mb-6 font-medium leading-relaxed">{benefit.reward_desc}</p>
                        </div>

                        <button 
                          disabled={!isUnlocked} 
                          onClick={() => isUnlocked && alert('Muéstrale esta pantalla a tu barbero o en recepción al momento de pagar tu próximo corte para aplicar tu beneficio.')}
                          className={`w-full py-3.5 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex justify-center items-center gap-2 active:scale-95 ${
                            isUnlocked 
                              ? 'bg-zinc-950 border border-green-500 hover:bg-green-500 hover:text-black text-white shadow-[0_5px_15px_rgba(34,197,94,0.2)]' 
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