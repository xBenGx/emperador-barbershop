"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";

// IMPORTAMOS LAS ACCIONES DEL SERVIDOR QUE CONECTAN AL BOT DE WHATSAPP
import { updateAppointment, deleteAppointment } from "@/app/actions/appointment";

// IMPORTACIONES DE ICONOS
import * as LucideIcons from "lucide-react";
import { 
  CalendarDays, Clock, DollarSign, Users, TrendingUp, 
  CheckCircle2, XCircle, Edit3, Trash2, Scissors, 
  Phone, Mail, Search, AlertCircle, Check, Lock,
  Wallet, PieChart, Receipt, Link as LinkIcon, Loader2,
  LayoutDashboard, MessageCircle, Crown, UserCircle2,
  Armchair, Boxes, Music, Disc, Volume2, VolumeX, Volume1,
  UploadCloud, Package, Tag, UserPlus, Plus, X, Save,
  Image as ImageIcon, Smartphone, ShieldAlert, LogOut, BellRing,
  MoreVertical, Calendar
} from "lucide-react";

// ============================================================================
// TIPADOS
// ============================================================================
type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "BLOCKED";
type TabType = "RESUMEN" | "MIS_CORTES" | "CLIENTES" | "FINANZAS" | "HORARIO" | "MI_ESTACION";
type ModalType = "EDIT_APPT" | null;

interface Client { id: string; name: string; phone: string; email: string; points?: number; }
interface Service { id: string; name: string; price: number; duration?: number; }

interface Appointment { 
  id: string; 
  date: string; 
  time: string; 
  status: AppointmentStatus; 
  notes?: string; 
  client_name?: string; 
  client_phone?: string; 
  client_id?: string;
  service_id?: string;
  service_name?: string;
  barber_id?: string;
  barber_name?: string;
  client?: Client; 
  service?: Service; 
}

interface BarberProfile { id: string; name: string; img?: string; role?: string; tag?: string; }
interface Chair { id: string; name: string; status: string; payment_due_date?: string; }
interface Schedule { id: string; day_of_week: string; is_active: boolean; start_time: string; end_time: string; break_start: string; break_end: string; }

// ============================================================================
// UTILIDADES Y CONSTANTES
// ============================================================================
const formatMoney = (amount: number | string) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(numericAmount || 0);
};

const getLocalTodayDate = () => {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().split('T')[0];
};

const TODAY_DATE = getLocalTodayDate();

// CAMBIO APLICADO: Generador extendido a 30 días (Mes completo)
const generateDates = () => {
  const dates = [];
  const today = new Date();
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
  for(let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const localDateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    dates.push({ day: days[d.getDay()], date: d.getDate().toString(), month: months[d.getMonth()], fullDate: localDateStr });
  }
  return dates;
};

const DATES = generateDates();
const DAYS_OF_WEEK = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// ============================================================================
// COMPONENTE PRINCIPAL DEL BARBERO
// ============================================================================
export default function BarberDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  
  // Estados Generales
  const [barber, setBarber] = useState<BarberProfile | null>(null);
  const [myChair, setMyChair] = useState<Chair | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]); 
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [kpis, setKpis] = useState({ todayEarnings: 0, monthEarnings: 0, todayAppointments: 0, totalClients: 0 });
  
  // Estados de Control
  const [activeTab, setActiveTab] = useState<TabType>("RESUMEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(TODAY_DATE);
  const [newApptNotification, setNewApptNotification] = useState(false);
  
  // Modales
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentHour, setCurrentHour] = useState("");

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3'); 
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio silenciado por el navegador."));
    } catch (error) {}
  };

  useEffect(() => {
    const updateHour = () => {
      const now = new Date();
      setCurrentHour(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    };
    updateHour();
    const interval = setInterval(updateHour, 60000); 
    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // CARGA MAESTRA CON SEGURIDAD BLINDADA
  // ============================================================================
  const loadDashboardData = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) {
        router.push('/login');
        return;
      }

      // 1. VERIFICACIÓN BLINDADA
      const { data: barberData } = await supabase.from('Barbers').select('*').eq('id', user.id).single();

      if (!barberData) {
        const { data: userProfile } = await supabase.from('User').select('role').eq('id', user.id).single();
        if (userProfile?.role !== 'ADMIN') {
          setAuthError(true);
          await supabase.auth.signOut();
          router.push('/login?error=Acceso%20Denegado.');
          return;
        }
      }

      const activeBarber = barberData || { id: user.id, name: "Administrador" };
      setBarber(activeBarber);

      // 2. Sillón
      const { data: chairData } = await supabase.from('chairs').select('*').eq('current_barber_id', user.id).single();
      if (chairData) setMyChair(chairData);

      // 3. LECTURA DE CITAS SEGURA
      const { data: rawAppts, error: apptError } = await supabase
        .from('Appointments')
        .select('*') 
        .eq('barber_id', user.id);
        
      if (apptError) {
        console.error("Error leyendo citas de supabase:", apptError.message);
      }

      const { data: allServices } = await supabase.from('Services').select('*');

      if (rawAppts && !apptError) {
        const mappedAppts: Appointment[] = rawAppts.map((a: any) => {
          const matchedService = allServices?.find(s => s.id === a.service_id) || null;
          
          const safeDate = a.date ? String(a.date).substring(0, 10) : TODAY_DATE;
          const safeTime = a.time ? String(a.time).substring(0, 5) : "00:00";

          return {
            ...a,
            date: safeDate,
            time: safeTime,
            client: { 
              id: a.client_id, 
              name: a.client_name || 'Anónimo', 
              phone: a.client_phone || '', 
              email: '' 
            },
            service: matchedService || { name: a.service_name || 'Servicio General', price: 0, duration: 60 }
          };
        });

        const futureAppts = mappedAppts.filter(a => a.date >= TODAY_DATE).sort((a,b) => {
           if (a.date === b.date) return a.time.localeCompare(b.time);
           return a.date.localeCompare(b.date);
        });
        
        setAppointments(futureAppts);
        
        const uniqueClientsMap = new Map();
        mappedAppts.forEach(a => { 
          const clientKey = a.client?.id || a.client?.phone || a.client?.name;
          if (clientKey && !uniqueClientsMap.has(clientKey)) {
            uniqueClientsMap.set(clientKey, a.client);
          }
        });
        setClients(Array.from(uniqueClientsMap.values()));

        const todayAppts = mappedAppts.filter(a => a.date === TODAY_DATE);
        const todayCompleted = todayAppts.filter(a => a.status === 'COMPLETED');
        const todayEarnings = todayCompleted.reduce((acc, curr) => acc + Number(curr.service?.price || 0), 0);
        
        setKpis({ todayEarnings, monthEarnings: todayEarnings * 24, todayAppointments: todayAppts.length, totalClients: uniqueClientsMap.size });
      }

      // 4. Horarios
      const { data: schedData } = await supabase.from('barber_schedules').select('*').eq('barber_id', user.id);
      if (schedData) setSchedules(schedData);

    } catch (error) {
      console.error("Error al cargar datos del Barbero:", error);
      router.push('/login');
    } finally {
      setIsAppLoading(false);
      setIsFetching(false);
    }
  }, [supabase, router]);

  // ============================================================================
  // GENERACIÓN DINÁMICA DE HORARIO BASADO EN SQL
  // ============================================================================
  const dynamicTimeline = useMemo(() => {
    const dateObj = new Date(selectedDateFilter + 'T00:00:00');
    const dayIndex = dateObj.getDay();
    const currentDayName = DAYS_OF_WEEK[dayIndex];

    const todaySchedule = schedules.find(s => s.day_of_week === currentDayName);

    if (!todaySchedule) return ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
    if (!todaySchedule.is_active) return [];

    const startHour = parseInt(todaySchedule.start_time.split(':')[0]);
    const endHour = parseInt(todaySchedule.end_time.split(':')[0]);
    const breakStart = parseInt(todaySchedule.break_start.split(':')[0]);
    const breakEnd = parseInt(todaySchedule.break_end.split(':')[0]);

    const slots = [];
    for (let i = startHour; i < endHour; i++) {
      // Excluir la hora de colación de la vista del barbero también
      if (i >= breakStart && i < breakEnd) continue;
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, [selectedDateFilter, schedules]);


  // ============================================================================
  // SUSCRIPCIÓN EN TIEMPO REAL
  // ============================================================================
  useEffect(() => {
    loadDashboardData();
    let channel: any;
    
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      channel = supabase.channel(`barber-sync-${user.id}`)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'Appointments',
            filter: `barber_id=eq.${user.id}` 
        }, (payload) => {
           if (payload.eventType === 'INSERT') {
             playNotificationSound();
             setNewApptNotification(true);
             setTimeout(() => setNewApptNotification(false), 5000);
           }
           loadDashboardData();
        })
        .subscribe();
    };
    
    setupRealtime();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [loadDashboardData, supabase]);

  // ============================================================================
  // ACCIONES CRUD Y NAVEGACIÓN (INTEGRADAS CON EL BOT DE WHATSAPP)
  // ============================================================================

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    } finally {
      window.location.href = '/login';
    }
  };

  const copyUniqueLink = () => {
    if (!barber || !barber.name) return;
    const formattedName = barber.name.trim().toLowerCase().replace(/\s+/g, '-');
    const link = `${window.location.origin}/reservar?barber=${formattedName}`;
    
    navigator.clipboard.writeText(link).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  // 1. ACTUALIZAR ESTADO (CONFIRMAR, RECHAZAR, COMPLETAR) -> AVISA AL WHATSAPP
  const handleUpdateStatus = async (id: string, newStatus: AppointmentStatus) => {
    setIsLoading(true);
    const result = await updateAppointment(id, { status: newStatus });
    if(result.success){
       loadDashboardData(); 
    } else {
       alert("Error al actualizar la cita.");
    }
    setIsLoading(false);
  };

  // 2. ELIMINAR CITA -> AVISA AL WHATSAPP
  const handleDeleteAppt = async (id: string) => {
    if(!confirm("¿Estás seguro de eliminar esta reserva? Se enviará un WhatsApp de cancelación automática al cliente.")) return;
    setIsLoading(true);
    const result = await deleteAppointment(id);
    if(result.success){
       loadDashboardData();
    } else {
       alert("Error al eliminar la cita.");
    }
    setIsLoading(false);
  }

  // 3. EDITAR CITA (REPROGRAMAR) -> AVISA AL WHATSAPP
  const handleEditApptSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;
    setIsLoading(true);
    
    const form = e.target as HTMLFormElement;
    const newDate = (form.elements.namedItem('date') as HTMLInputElement).value;
    const newTime = (form.elements.namedItem('time') as HTMLInputElement).value;

    const result = await updateAppointment(selectedAppt.id, { date: newDate, time: newTime });
    
    if (result.success) {
      loadDashboardData();
      setModalType(null);
      alert("Reserva reprogramada exitosamente. Se ha notificado al cliente.");
    } else {
      alert("Error al reprogramar: " + result.error);
    }
    setIsLoading(false);
  };

  // 4. BLOQUEO MANUAL DE ESPACIOS
  // Inserta una cita "falsa" con el estado BLOCKED para ocupar la hora.
  const handleToggleBlockSlot = async (time: string, isBlocked: boolean, existingId?: string) => {
    setIsLoading(true);
    try {
      if (isBlocked && existingId) {
        // Desbloquear: borramos la cita falsa
        await supabase.from('Appointments').delete().eq('id', existingId);
      } else {
        // Bloquear: creamos la cita falsa
        await supabase.from('Appointments').insert({
          date: selectedDateFilter,
          time: time,
          status: 'BLOCKED',
          barber_id: barber?.id,
          barber_name: barber?.name,
          client_name: 'Bloqueo Manual', // Campo requerido
          service_name: 'No Disponible', // Campo requerido
        });
      }
      loadDashboardData();
    } catch (error) {
      alert("Error al modificar el bloque de tiempo.");
    } finally {
      setIsLoading(false);
    }
  };

  // 5. GUARDAR CONFIGURACIÓN DEL HORARIO DEL BARBERO EN SQL
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barber) return;
    setIsLoading(true);
    
    try {
      const form = e.target as HTMLFormElement;
      const upsertData = DAYS_OF_WEEK.map(day => {
        const isActiveNode = form.elements.namedItem(`active_${day}`) as HTMLInputElement;
        const isActive = isActiveNode ? isActiveNode.checked : false;
        
        const startNode = form.elements.namedItem(`start_${day}`) as HTMLInputElement;
        const start = startNode ? startNode.value : "10:00";
        
        const endNode = form.elements.namedItem(`end_${day}`) as HTMLInputElement;
        const end = endNode ? endNode.value : "20:00";
        
        const bStartNode = form.elements.namedItem(`bstart_${day}`) as HTMLInputElement;
        const bStart = bStartNode ? bStartNode.value : "14:00";
        
        const bEndNode = form.elements.namedItem(`bend_${day}`) as HTMLInputElement;
        const bEnd = bEndNode ? bEndNode.value : "15:00";

        return {
          barber_id: barber.id,
          day_of_week: day,
          is_active: isActive,
          start_time: start,
          end_time: end,
          break_start: bStart,
          break_end: bEnd
        };
      });

      await supabase.from('barber_schedules').upsert(upsertData, { onConflict: 'barber_id, day_of_week' });
      loadDashboardData();
      alert("Horarios de trabajo actualizados en el sistema de agenda online.");
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (type: ModalType, item: any = null) => {
    setModalType(type);
    if (type === "EDIT_APPT") setSelectedAppt(item);
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    const badges = {
      PENDING: <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm animate-pulse whitespace-nowrap"><Clock size={10}/> Nueva</span>,
      CONFIRMED: <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm whitespace-nowrap"><CheckCircle2 size={10}/> Confir.</span>,
      COMPLETED: <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/40 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm whitespace-nowrap"><Check size={10}/> Listo</span>,
      CANCELLED: <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm whitespace-nowrap"><XCircle size={10}/> Cancel.</span>,
      NO_SHOW: <span className="px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/40 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm whitespace-nowrap"><AlertCircle size={10}/> Falta</span>,
      BLOCKED: <span className="px-2 py-1 bg-zinc-800 text-zinc-300 border border-zinc-600 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm whitespace-nowrap"><Lock size={10}/> Bloq.</span>,
    };
    return badges[status] || badges.PENDING;
  };

  const filteredAppointments = appointments.filter(a => a.date === selectedDateFilter && (a.client?.name || a.client_name || "").toLowerCase().includes(searchQuery.toLowerCase()));

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-amber-500 gap-4 p-4 text-center">
        <Loader2 className="animate-spin" size={40} />
        <p className="font-black uppercase tracking-widest text-xs text-white">Preparando tu estación...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-red-500 gap-4 p-4 text-center">
        <ShieldAlert size={60} className="animate-pulse" />
        <h1 className="text-2xl font-black uppercase tracking-widest text-white">Acceso Restringido</h1>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] min-h-screen pb-24 md:pb-20 pt-4 md:pt-8 px-4 md:px-10 relative selection:bg-amber-500 selection:text-black">
      
      {/* ALERTA FLOTANTE CUANDO ENTRA NUEVA CITA EN VIVO */}
      <AnimatePresence>
        {newApptNotification && (
          <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 z-[200] bg-amber-500 text-black px-4 py-3 md:px-6 md:py-4 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-sm shadow-[0_10px_40px_rgba(217,119,6,0.6)] flex items-center justify-center gap-3 border border-amber-300">
            <BellRing size={16} className="animate-bounce" /> ¡Nueva Reserva Recibida!
          </motion.div>
        )}
      </AnimatePresence>

      {/* OCULTAR SIDEBAR */}
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
        /* Ocultar barra de scroll en navegacion tactil pero permitir scroll */
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />

      {/* HEADER DEL BARBERO (Mobile First) */}
      <div className="flex flex-col mb-6 md:mb-10 gap-4 bg-zinc-900/60 p-5 md:p-6 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-4 relative z-10">
           <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-zinc-800 border-2 border-amber-500 overflow-hidden shadow-[0_0_15px_rgba(217,119,6,0.5)] shrink-0">
              {barber?.img ? (
                <Image src={barber.img} alt="Perfil" fill className="object-cover" unoptimized />
              ) : (
                <Scissors className="text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={24}/>
              )}
           </div>
           <div>
             <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase font-serif flex items-center gap-2">
               Hola, <span className="text-amber-500">{barber?.name?.split(' ')[0] || 'Maestro'}</span>
             </h1>
             <p className="text-zinc-400 mt-0.5 flex items-center gap-1.5 font-medium text-[10px] md:text-sm uppercase tracking-widest">
               <CalendarDays size={12} className="text-amber-500" />
               {new Date().toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
               {isFetching && <Loader2 className="animate-spin text-amber-500 ml-2" size={12} />}
             </p>
           </div>
        </div>
        
        <div className="flex items-center gap-2 w-full mt-2 relative z-10">
          <button 
            onClick={copyUniqueLink}
            className={`flex-1 px-3 py-3 rounded-xl text-[9px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${copySuccess ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-950 border border-zinc-800 text-white hover:border-amber-500 active:scale-95'}`}
          >
            {copySuccess ? <Check size={14} /> : <LinkIcon size={14} />}
            {copySuccess ? 'Copiado!' : 'Compartir Link'}
          </button>
          <button onClick={handleLogout} className="p-3 bg-zinc-950 border border-zinc-800 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-md active:scale-95">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* TABS NAVEGACIÓN (SWIPEABLE MOBILE) */}
      <div className="flex gap-2 mb-6 border-b border-zinc-800/50 pb-4 overflow-x-auto hide-scrollbar scroll-smooth -mx-4 px-4 md:mx-0 md:px-0 relative z-10 snap-x">
        {(["RESUMEN", "MIS_CORTES", "CLIENTES", "FINANZAS", "HORARIO", "MI_ESTACION"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl font-black text-[9px] md:text-[11px] tracking-[0.2em] uppercase transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-2 snap-center ${
              activeTab === tab 
                ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(217,119,6,0.3)]" 
                : "bg-zinc-900/80 text-zinc-400 border border-zinc-800"
            }`}
          >
            {tab === "RESUMEN" && <LayoutDashboard size={14}/>}
            {tab === "MIS_CORTES" && <CalendarDays size={14}/>}
            {tab === "CLIENTES" && <Users size={14}/>}
            {tab === "FINANZAS" && <Wallet size={14}/>}
            {tab === "HORARIO" && <Clock size={14}/>}
            {tab === "MI_ESTACION" && <Armchair size={14}/>}
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* =================================================================== */}
        {/* TAB 1: RESUMEN / PRÓXIMO CORTE */}
        {/* =================================================================== */}
        {activeTab === "RESUMEN" && (
          <motion.div key="resumen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            
            {/* WIDGET PRÓXIMO CLIENTE (SUPER COMPACTO) */}
            <div className="bg-gradient-to-br from-zinc-900 to-[#0a0a0a] border border-amber-500/20 rounded-3xl p-5 md:p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 blur-[60px] rounded-full pointer-events-none"></div>
              <h3 className="text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>
                Próximo Turno
              </h3>
              
              {(() => {
                const nextAppt = appointments
                  .filter(a => 
                    (a.status === "CONFIRMED" || a.status === "PENDING") &&
                    (a.date > TODAY_DATE || (a.date === TODAY_DATE && a.time >= currentHour))
                  )
                  .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))[0];

                if (nextAppt) {
                  return (
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-500 text-black rounded-2xl flex flex-col items-center justify-center font-black leading-none shadow-lg border border-amber-400 shrink-0">
                          <span className="text-xl md:text-2xl">{nextAppt.time.split(':')[0]}</span>
                          <span className="text-[10px] md:text-xs">{nextAppt.time.split(':')[1]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter truncate">{nextAppt.client?.name || nextAppt.client_name || 'Anónimo'}</h4>
                          <p className="text-zinc-300 font-bold flex items-center gap-1.5 text-[11px] md:text-sm mt-1 truncate"><Scissors size={12} className="text-amber-500"/> {nextAppt.service?.name}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full">
                         {nextAppt.status === 'PENDING' && (
                           <button onClick={() => handleUpdateStatus(nextAppt.id, "CONFIRMED")} disabled={isLoading} className="flex-1 py-3.5 bg-blue-500/10 text-blue-400 font-black uppercase text-[9px] md:text-xs tracking-widest rounded-xl hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20 active:scale-95">Confirmar</button>
                         )}
                         <button onClick={() => handleUpdateStatus(nextAppt.id, "COMPLETED")} disabled={isLoading} className="flex-1 py-3.5 bg-green-500 text-black font-black uppercase text-[9px] md:text-xs tracking-widest rounded-xl hover:bg-green-400 transition-all shadow-[0_5px_15px_rgba(34,197,94,0.3)] border border-green-400 active:scale-95">Terminar y Cobrar</button>
                      </div>
                    </div>
                  );
                } else {
                  return <p className="text-amber-500/80 font-bold text-sm md:text-base relative z-10 bg-black/40 inline-block px-4 py-3 rounded-xl border border-amber-500/10">No hay turnos pendientes en este momento.</p>;
                }
              })()}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <KpiCard icon={<DollarSign size={18} />} title="Hoy" value={formatMoney(kpis.todayEarnings)} statusColor="text-green-400" />
              <KpiCard icon={<Scissors size={18} />} title="Citas" value={kpis.todayAppointments} statusColor="text-amber-500" />
              <KpiCard icon={<TrendingUp size={18} />} title="Mes" value={formatMoney(kpis.monthEarnings)} statusColor="text-blue-400" />
              <KpiCard icon={<Users size={18} />} title="Clientes" value={kpis.totalClients} statusColor="text-white" />
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: MIS CORTES (AGENDA OPTIMIZADA PARA PULGAR) */}
        {/* =================================================================== */}
        {activeTab === "MIS_CORTES" && (
          <motion.div key="mis_cortes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            
            {/* Fechas Swipeables (Mes Completo) */}
            <div className="flex gap-2 md:gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 snap-x">
              {DATES.map((d, i) => (
                <button 
                  key={i}
                  onClick={() => setSelectedDateFilter(d.fullDate)}
                  className={`flex-shrink-0 w-[4.5rem] md:w-24 h-20 md:h-24 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all snap-center border ${selectedDateFilter === d.fullDate ? 'bg-amber-500 border-amber-400 text-black shadow-[0_5px_20px_rgba(217,119,6,0.4)] scale-105' : 'bg-zinc-900 border-zinc-800 text-white active:bg-zinc-800'}`}
                >
                  <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] ${selectedDateFilter === d.fullDate ? 'text-black/60' : 'text-zinc-500'}`}>{d.day}</span>
                  <span className="text-xl md:text-3xl font-black tracking-tighter">{d.date}</span>
                </button>
              ))}
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-4 md:p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6 border-b border-zinc-800/50 pb-4">
                <h3 className="text-lg md:text-2xl font-black text-white uppercase tracking-tighter">Mi Agenda</h3>
                <span className="text-[10px] md:text-xs text-amber-500 font-bold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">{new Date(selectedDateFilter + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              </div>
              
              {dynamicTimeline.length === 0 ? (
                <div className="text-center text-zinc-500 py-10 font-bold text-sm md:text-base border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/50">
                  <CalendarDays size={32} className="mx-auto mb-3 opacity-50" />
                  Día Libre / Sin Horario Activo.
                </div>
              ) : (
                <div className="space-y-3">
                  {dynamicTimeline.map(time => {
                    const appAtThisTime = filteredAppointments.find(a => a.time.startsWith(time.split(':')[0]));
                    const isPast = selectedDateFilter === TODAY_DATE && time < currentHour;
                    const isBlocked = appAtThisTime?.status === 'BLOCKED' || (!appAtThisTime && isPast);

                    if (appAtThisTime && appAtThisTime.status !== 'BLOCKED') {
                      return (
                        <div key={time} className="flex gap-3 md:gap-6 items-stretch">
                          <div className="w-12 md:w-16 flex flex-col items-center pt-3">
                            <span className={`font-black text-xs md:text-base ${appAtThisTime.status === 'COMPLETED' ? 'text-green-500' : 'text-amber-500'}`}>{time}</span>
                            <div className={`w-0.5 h-full my-1 rounded-full ${appAtThisTime.status === 'COMPLETED' ? 'bg-green-500/20' : 'bg-amber-500/20'}`}></div>
                          </div>
                          
                          <div className={`flex-1 border rounded-2xl p-4 md:p-6 shadow-md relative overflow-hidden ${appAtThisTime.status === 'COMPLETED' ? 'border-green-500/30 bg-green-500/5' : appAtThisTime.status === 'PENDING' ? 'border-amber-500/50 bg-amber-500/10' : 'border-zinc-700 bg-zinc-900/80'}`}>
                             <div className="flex justify-between items-start mb-3 md:mb-4">
                               <div className="flex-1 min-w-0 pr-2">
                                 <h4 className="text-base md:text-xl font-black text-white uppercase truncate">{appAtThisTime.client?.name || appAtThisTime.client_name || 'Anónimo'}</h4>
                                 <p className="text-zinc-400 font-bold flex items-center gap-1.5 text-[10px] md:text-xs mt-0.5 truncate">
                                   <Scissors size={10} className="text-amber-500 shrink-0"/> {appAtThisTime.service?.name || appAtThisTime.service_name} • <span className="text-amber-500">{formatMoney(appAtThisTime.service?.price as number)}</span>
                                 </p>
                               </div>
                               {getStatusBadge(appAtThisTime.status)}
                             </div>

                             <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-4 border-t border-zinc-800/60">
                               {appAtThisTime.status === "PENDING" && (
                                 <>
                                   <button onClick={() => handleUpdateStatus(appAtThisTime.id, "CONFIRMED")} disabled={isLoading} className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-md active:scale-95">Confirmar</button>
                                   <button onClick={() => handleUpdateStatus(appAtThisTime.id, "CANCELLED")} disabled={isLoading} className="flex-1 py-2.5 bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest active:scale-95">Rechazar</button>
                                 </>
                               )}
                               {appAtThisTime.status === "CONFIRMED" && (
                                 <button onClick={() => handleUpdateStatus(appAtThisTime.id, "COMPLETED")} disabled={isLoading} className="flex-1 py-2.5 bg-green-500 text-black rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-md active:scale-95">Cobrar</button>
                               )}
                               {appAtThisTime.status === "COMPLETED" && (
                                 <p className="text-green-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Check size={12} /> Pagado</p>
                               )}
                               <div className="flex-1"></div>
                               
                               {appAtThisTime.status !== "COMPLETED" && (
                                 <div className="flex gap-1 shrink-0">
                                   <button onClick={() => openModal("EDIT_APPT", appAtThisTime)} className="p-2 md:p-2.5 text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-lg active:scale-95" title="Reprogramar"><Edit3 size={14}/></button>
                                   <button onClick={() => handleDeleteAppt(appAtThisTime.id)} className="p-2 md:p-2.5 text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-lg active:scale-95" title="Eliminar"><Trash2 size={14}/></button>
                                   <button onClick={() => handleUpdateStatus(appAtThisTime.id, "NO_SHOW")} className="p-2 md:p-2.5 text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-lg active:scale-95" title="Faltó"><AlertCircle size={14}/></button>
                                 </div>
                               )}
                             </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={time} className={`flex gap-3 md:gap-6 items-stretch ${isBlocked ? 'opacity-40' : 'opacity-100'}`}>
                          <div className="w-12 md:w-16 flex flex-col items-center pt-4">
                            <span className={`font-bold text-xs md:text-base ${isBlocked ? 'text-zinc-700 line-through' : 'text-zinc-500'}`}>{time}</span>
                            <div className="w-0.5 h-full bg-zinc-800/50 my-1 group-last:hidden"></div>
                          </div>
                          <div className={`flex-1 border border-dashed rounded-2xl flex items-center justify-between p-4 shadow-sm ${isBlocked ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-700 bg-zinc-900/30'}`}>
                             <p className={`font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-1.5 ${isBlocked ? 'text-zinc-600' : 'text-zinc-400'}`}>
                               {isPast ? <><Clock size={12}/> Pasó</> : isBlocked ? <><Lock size={12}/> Bloqueado</> : 'Disponible'}
                             </p>
                             {!isPast && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleToggleBlockSlot(time, isBlocked, appAtThisTime?.id); }}
                                 className={`relative z-50 px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest active:scale-95 cursor-pointer ${isBlocked ? 'bg-zinc-800 text-white border border-zinc-600' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                               >
                                 {isBlocked ? 'Liberar' : 'Bloquear'}
                               </button>
                             )}
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- TAB 3: CLIENTES AVANZADO --- */}
        {activeTab === "CLIENTES" && (
          <motion.div key="clientes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nombre o teléfono..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 md:py-4 text-white text-sm md:text-base focus:border-amber-500 outline-none transition-all shadow-inner"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.phone && c.phone.includes(searchQuery))).map(client => {
                const clientAppts = appointments.filter(a => a.client?.id === client.id || a.client?.name === client.name);
                const completedAppts = clientAppts.filter(a => a.status === 'COMPLETED');
                const lastVisit = completedAppts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

                return (
                  <div key={client.id || client.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-md">
                    <div className="p-4 border-b border-zinc-800/50 flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-amber-500 font-black text-xl shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-black text-white uppercase truncate">{client.name}</h4>
                        <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 mt-0.5 truncate"><Smartphone size={10}/> {client.phone || "Sin teléfono"}</span>
                      </div>
                      <a href={`https://wa.me/${client.phone?.replace(/[^0-9]/g, '')}?text=Hola%20${client.name}...`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-[#25D366]/10 text-[#25D366] rounded-xl shrink-0 active:scale-95"><MessageCircle size={18} /></a>
                    </div>
                    <div className="p-4 bg-black/20 flex justify-between items-center text-[10px] md:text-xs">
                      <div className="space-y-0.5">
                        <p className="text-zinc-500 font-black uppercase tracking-widest">Última Visita</p>
                        <p className="text-white font-bold">{lastVisit ? `${lastVisit.date}` : 'Sin registro'}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-zinc-500 font-black uppercase tracking-widest">Cortes</p>
                        <p className="text-amber-500 font-black text-base">{completedAppts.length}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              {clients.length === 0 && (
                <div className="col-span-full text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
                  <Users size={32} className="mx-auto text-zinc-600 mb-3"/>
                  <p className="text-zinc-500 text-sm font-bold">No se encontraron clientes.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- TAB 4: FINANZAS Y COMISIONES --- */}
        {activeTab === "FINANZAS" && (
          <motion.div key="finanzas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-amber-500 rounded-[2rem] p-6 relative overflow-hidden shadow-[0_10px_30px_rgba(217,119,6,0.3)] border border-amber-400">
              <Wallet className="absolute -bottom-4 -right-4 text-amber-600/30" size={100} />
              <h4 className="text-amber-900 font-black uppercase tracking-widest text-[10px] md:text-xs mb-1 relative z-10">Generado Hoy (100%)</h4>
              <p className="text-4xl md:text-5xl font-black text-black relative z-10">{formatMoney(kpis.todayEarnings)}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-lg">
              <h3 className="text-sm font-black text-white uppercase tracking-widest p-5 border-b border-zinc-800 flex items-center gap-2">
                <Receipt size={16} className="text-amber-500"/> Liquidación Hoy
              </h3>
              <div className="divide-y divide-zinc-800/50">
                {appointments.filter(a => a.status === "COMPLETED" && a.date === TODAY_DATE).map((app, i) => (
                  <div key={i} className="p-4 md:p-5 flex justify-between items-center bg-zinc-950/50">
                    <div>
                      <p className="font-black text-white text-sm md:text-base">{app.time.substring(0,5)} • <span className="uppercase text-zinc-300">{app.client?.name || app.client_name || 'Anónimo'}</span></p>
                      <p className="text-[10px] md:text-xs text-zinc-500 font-bold mt-0.5">{app.service?.name}</p>
                    </div>
                    <span className="font-black text-green-500 text-base md:text-lg">{formatMoney(Number(app.service?.price || 0))}</span>
                  </div>
                ))}
                {appointments.filter(a => a.status === "COMPLETED" && a.date === TODAY_DATE).length === 0 && (
                  <div className="text-center py-10 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                    Sin cortes cobrados hoy.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* --- TAB 5: HORARIO --- */}
        {activeTab === "HORARIO" && (
          <motion.div key="horario" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-start gap-4 mb-6 shadow-md">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <p className="text-zinc-400 font-medium text-[11px] md:text-sm leading-relaxed">Establece tus horas de trabajo reales. Esto sincroniza tu agenda web para que los clientes no puedan agendarte cuando estás fuera.</p>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3 md:space-y-4 pb-8">
              {DAYS_OF_WEEK.map(day => {
                const sched = schedules.find(s => s.day_of_week === day);
                return (
                  <div key={day} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 p-4 border-b border-zinc-800/50 bg-zinc-900/80">
                      <input type="checkbox" name={`active_${day}`} defaultChecked={sched?.is_active ?? true} className="w-5 h-5 accent-amber-500 rounded" />
                      <span className="text-white font-black uppercase tracking-widest text-xs md:text-sm">{day}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-zinc-800/50">
                      <div className="bg-zinc-950 p-3 md:p-4">
                        <label className="block text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1.5">Apertura</label>
                        <input type="time" name={`start_${day}`} defaultValue={sched?.start_time || "10:00"} className="w-full bg-transparent text-white font-bold text-sm md:text-base outline-none" />
                      </div>
                      <div className="bg-zinc-950 p-3 md:p-4">
                        <label className="block text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1.5">Cierre</label>
                        <input type="time" name={`end_${day}`} defaultValue={sched?.end_time || "20:00"} className="w-full bg-transparent text-white font-bold text-sm md:text-base outline-none" />
                      </div>
                      <div className="bg-zinc-950 p-3 md:p-4">
                        <label className="block text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1.5">Ini. Colación</label>
                        <input type="time" name={`bstart_${day}`} defaultValue={sched?.break_start || "14:00"} className="w-full bg-transparent text-amber-500 font-bold text-sm md:text-base outline-none" />
                      </div>
                      <div className="bg-zinc-950 p-3 md:p-4">
                        <label className="block text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1.5">Fin Colación</label>
                        <input type="time" name={`bend_${day}`} defaultValue={sched?.break_end || "15:00"} className="w-full bg-transparent text-amber-500 font-bold text-sm md:text-base outline-none" />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-4 sticky bottom-4 z-50">
                <button type="submit" disabled={isLoading} className="w-full py-4 md:py-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] text-xs md:text-sm rounded-xl transition-all shadow-[0_10px_20px_rgba(217,119,6,0.4)] flex justify-center items-center gap-2 active:scale-95">
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18}/> Guardar Horario</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* --- TAB 6: MI ESTACIÓN --- */}
        {activeTab === "MI_ESTACION" && (
          <motion.div key="mi_estacion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-gradient-to-br from-zinc-900 to-[#050505] border border-amber-500/30 rounded-3xl p-8 relative overflow-hidden shadow-xl text-center">
              <Armchair className="text-amber-500/20 w-32 h-32 mx-auto mb-4" />
              <div className="relative z-10">
                <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter font-serif mb-2 drop-shadow-md">
                  {myChair ? myChair.name : 'Sin Asignar'}
                </h3>
                <p className="text-zinc-400 font-medium text-xs md:text-sm mb-6 max-w-sm mx-auto">Espacio oficial de trabajo asignado por la administración.</p>
                
                <div className="bg-black/40 border border-zinc-800 p-5 rounded-2xl mb-4">
                   <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Estado</p>
                   <p className="text-white font-bold text-sm flex items-center justify-center gap-2">
                     <CheckCircle2 size={16} className="text-green-500"/> {myChair ? 'Sillón Activo y Operativo' : 'Sin sillón vinculado'}
                   </p>
                </div>
                <div className="bg-black/40 border border-zinc-800 p-5 rounded-2xl">
                   <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Próxima Fecha de Pago</p>
                   <p className="text-amber-500 font-black text-xl">
                     {myChair?.payment_due_date ? new Date(myChair.payment_due_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric'}) : 'No registrado'}
                   </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL DE REPROGRAMACIÓN (MOBILE OPTIMIZED) */}
      {/* =================================================================== */}
      <AnimatePresence>
        {modalType === "EDIT_APPT" && selectedAppt && (
          <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalType(null)} className="absolute inset-0" />
            
            <motion.div initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative bg-[#121212] border-t md:border border-zinc-800 rounded-t-3xl md:rounded-3xl p-6 md:p-10 w-full max-w-lg shadow-[0_-20px_60px_rgba(0,0,0,0.8)] md:shadow-2xl">
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6 md:hidden"></div>
              
              <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter mb-6 font-serif italic text-center">Reprogramar</h3>
              
              <form onSubmit={handleEditApptSave} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">Cliente</label>
                  <input type="text" disabled value={selectedAppt.client?.name || selectedAppt.client_name || 'Anónimo'} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-400 text-sm font-bold cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">Nueva Fecha</label>
                    <input type="date" name="date" defaultValue={selectedAppt.date} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-3 text-white font-bold text-sm focus:border-amber-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">Nueva Hora</label>
                    <input type="time" name="time" defaultValue={selectedAppt.time} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-3 text-white font-bold text-sm focus:border-amber-500 outline-none" required />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-6 mt-2">
                  <button type="button" onClick={() => setModalType(null)} className="w-1/3 py-4 text-zinc-400 font-black text-[10px] uppercase tracking-widest bg-zinc-900 rounded-xl active:scale-95 transition-transform">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isLoading} className="w-2/3 py-4 text-black font-black uppercase tracking-widest text-[10px] bg-amber-500 rounded-xl shadow-[0_5px_15px_rgba(217,119,6,0.3)] active:scale-95 transition-transform flex justify-center items-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Guardar y Avisar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// COMPONENTE KPI
// ============================================================================
function KpiCard({ icon, title, value, trend, statusColor = "text-amber-500" }: { icon: React.ReactNode, title: string, value: string | number, trend?: string, statusColor?: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-4 md:p-6 relative overflow-hidden shadow-md">
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[30px] rounded-full pointer-events-none"></div>
      <div className="flex items-center gap-3 mb-2 md:mb-3">
         <div className={`w-8 h-8 md:w-12 md:h-12 bg-black border border-zinc-800 rounded-xl flex items-center justify-center shadow-inner ${statusColor}`}>{icon}</div>
         <p className="text-zinc-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-tight">{title}</p>
      </div>
      <h4 className={`text-2xl md:text-3xl font-black tracking-tighter ${statusColor === 'text-amber-500' ? 'text-white' : statusColor}`}>{value}</h4>
    </div>
  );
}