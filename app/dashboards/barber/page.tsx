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
  Image as ImageIcon, Smartphone, ShieldAlert, LogOut, BellRing
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

const generateDates = () => {
  const dates = [];
  const today = new Date();
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
  for(let i = 0; i < 7; i++) {
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
  // CARGA MAESTRA CON SEGURIDAD BLINDADA Y CERO JOINS
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
  // GENERACIÓN DINÁMICA DE HORARIO (CRÍTICO PARA SINCRONIZACIÓN SQL)
  // ============================================================================
  const dynamicTimeline = useMemo(() => {
    // Obtenemos qué día es en la fecha seleccionada (ej: 0 = Domingo, 1 = Lunes)
    const dateObj = new Date(selectedDateFilter + 'T00:00:00');
    const dayIndex = dateObj.getDay();
    const currentDayName = DAYS_OF_WEEK[dayIndex]; // Ej: "Martes"

    // Buscamos si el barbero guardó configuración para este día
    const todaySchedule = schedules.find(s => s.day_of_week === currentDayName);

    // Fallback por defecto si nunca ha configurado su horario
    if (!todaySchedule) return ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
    
    // Si marcó el día como inactivo, devolvemos un array vacío (Día Libre)
    if (!todaySchedule.is_active) return [];

    // Generamos los bloques basándonos en la SQL real
    const startHour = parseInt(todaySchedule.start_time.split(':')[0]);
    const endHour = parseInt(todaySchedule.end_time.split(':')[0]);

    const slots = [];
    for (let i = startHour; i <= endHour; i++) {
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
    // Usamos el Server Action que ya tiene integrado el aviso al bot
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

    // Usamos el Server Action que inyecta la edición y dispara el bot
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

  // 4. BLOQUEO DE ESPACIOS (No avisa al WhatsApp, solo gestiona la agenda local del barbero)
  const handleToggleBlockSlot = async (time: string, isBlocked: boolean, existingId?: string) => {
    setIsLoading(true);
    try {
      if (isBlocked && existingId) {
        await supabase.from('Appointments').delete().eq('id', existingId);
      } else {
        await supabase.from('Appointments').insert({
          date: selectedDateFilter,
          time: time,
          status: 'BLOCKED',
          barber_id: barber?.id,
          barber_name: barber?.name, 
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
      // Excluimos "Domingo" porque DAYS_OF_WEEK empieza el Lunes visualmente, pero aseguraremos todos.
      // Modificamos a iterar por los días reales guardados arriba.
      const upsertData = DAYS_OF_WEEK.map(day => {
        // En el form están como active_Lunes, etc.
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
      PENDING: <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm animate-pulse"><Clock size={12}/> Nueva</span>,
      CONFIRMED: <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm"><CheckCircle2 size={12}/> Confirmado</span>,
      COMPLETED: <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/40 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm"><Check size={12}/> Terminado</span>,
      CANCELLED: <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm"><XCircle size={12}/> Cancelado</span>,
      NO_SHOW: <span className="px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/40 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm"><AlertCircle size={12}/> Falta</span>,
      BLOCKED: <span className="px-3 py-1 bg-zinc-800 text-zinc-300 border border-zinc-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm"><Lock size={12}/> Bloqueado</span>,
    };
    return badges[status] || badges.PENDING;
  };

  const filteredAppointments = appointments.filter(a => a.date === selectedDateFilter && (a.client?.name || a.client_name || "").toLowerCase().includes(searchQuery.toLowerCase()));

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-amber-500 gap-4">
        <Loader2 className="animate-spin" size={40} />
        <p className="font-black uppercase tracking-widest text-xs text-white">Preparando tu estación...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-red-500 gap-4">
        <ShieldAlert size={60} className="animate-pulse" />
        <h1 className="text-2xl font-black uppercase tracking-widest text-white">Acceso Restringido</h1>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto pb-20 pt-8 px-6 md:px-10 relative">
      
      {/* ALERTA FLOTANTE CUANDO ENTRA NUEVA CITA EN VIVO */}
      <AnimatePresence>
        {newApptNotification && (
          <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-amber-500 text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_10px_40px_rgba(217,119,6,0.6)] flex items-center gap-3 border border-amber-300">
            <BellRing size={20} className="animate-bounce" /> ¡Nueva Reserva Recibida!
          </motion.div>
        )}
      </AnimatePresence>

      {/* OCULTAR SIDEBAR (CSS INYECTADO) */}
      <style dangerouslySetInnerHTML={{__html: `
        aside, nav[class*="sidebar" i], [class*="SideBar" i], [class*="Sidebar" i], #sidebar {
          display: none !important;
        }
        main, body, html, [class*="content" i], [class*="layout" i], .md\\:ml-64 {
          margin-left: 0 !important;
          padding-left: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          background-color: #0a0a0a !important;
        }
      `}} />

      {/* HEADER DEL BARBERO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 bg-zinc-900/60 p-6 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-6">
           <div className="relative w-20 h-20 rounded-full bg-zinc-800 border-2 border-amber-500 overflow-hidden shadow-[0_0_20px_rgba(217,119,6,0.5)] shrink-0">
              {barber?.img ? (
                <Image src={barber.img} alt="Perfil" fill className="object-cover" unoptimized />
              ) : (
                <Scissors className="text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={32}/>
              )}
           </div>
           <div>
             <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase font-serif flex items-center gap-3">
               Hola, <span className="text-amber-500">{barber?.name?.split(' ')[0] || 'Maestro'}</span>
               {isFetching && <Loader2 className="animate-spin text-amber-500" size={20} />}
             </h1>
             <p className="text-zinc-300 mt-1 flex items-center gap-2 font-medium text-sm">
               <CalendarDays size={16} className="text-amber-500" />
               Hoy es {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
             </p>
           </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={copyUniqueLink}
            className={`flex-1 md:flex-none px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl ${copySuccess ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-zinc-800 border border-zinc-700 text-white hover:border-amber-500'}`}
          >
            {copySuccess ? <Check size={16} /> : <LinkIcon size={16} />}
            {copySuccess ? '¡Enlace Copiado!' : 'Mi Link de Reservas'}
          </button>
          <button onClick={handleLogout} className="p-4 bg-zinc-800 border border-zinc-700 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-md" title="Cerrar Sesión">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* TABS NAVEGACIÓN */}
      <div className="flex gap-3 mb-8 border-b border-zinc-800 pb-4 overflow-x-auto hide-scrollbar scroll-smooth">
        {(["RESUMEN", "MIS_CORTES", "CLIENTES", "FINANZAS", "HORARIO", "MI_ESTACION"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3.5 rounded-xl font-black text-[11px] tracking-[0.2em] uppercase transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-2 shadow-sm ${
              activeTab === tab 
                ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(217,119,6,0.3)]" 
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-700"
            }`}
          >
            {tab === "RESUMEN" && <LayoutDashboard size={16}/>}
            {tab === "MIS_CORTES" && <CalendarDays size={16}/>}
            {tab === "CLIENTES" && <Users size={16}/>}
            {tab === "FINANZAS" && <Wallet size={16}/>}
            {tab === "HORARIO" && <Clock size={16}/>}
            {tab === "MI_ESTACION" && <Armchair size={16}/>}
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* =================================================================== */}
        {/* TAB 1: RESUMEN / PRÓXIMO CORTE */}
        {/* =================================================================== */}
        {activeTab === "RESUMEN" && (
          <motion.div key="resumen" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            
            <div className="bg-gradient-to-r from-amber-500/20 to-zinc-900 border border-amber-500/40 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/30 blur-[100px] rounded-full pointer-events-none"></div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3 relative z-10">
                <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>
                Tu Próximo Cliente
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
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
                      <div className="flex items-center gap-6 bg-black/40 p-6 rounded-3xl border border-zinc-700/50 backdrop-blur-md w-full lg:w-auto shadow-inner">
                        <div className="w-24 h-24 bg-amber-500 text-black rounded-[2rem] flex flex-col items-center justify-center font-black leading-none shadow-[0_10px_30px_rgba(217,119,6,0.5)] border border-amber-400">
                          <span className="text-3xl">{nextAppt.time.split(':')[0]}</span>
                          <span className="text-sm">{nextAppt.time.split(':')[1]}</span>
                        </div>
                        <div>
                          <h4 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">{nextAppt.client?.name || nextAppt.client_name || 'Anónimo'}</h4>
                          <p className="text-zinc-200 font-bold flex items-center gap-2 text-lg"><Scissors size={18} className="text-amber-500"/> {nextAppt.service?.name}</p>
                          <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mt-2 bg-zinc-900 px-3 py-1 rounded-md inline-block border border-zinc-800 shadow-inner">
                            Para el {new Date(nextAppt.date + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                          {nextAppt.notes && <p className="text-amber-400 text-xs font-bold mt-2 bg-amber-500/20 inline-block px-3 py-1 rounded-md border border-amber-500/30 ml-2">Nota: {nextAppt.notes}</p>}
                        </div>
                      </div>
                      <div className="flex gap-3 w-full lg:w-auto">
                         {nextAppt.status === 'PENDING' && (
                           <button onClick={() => handleUpdateStatus(nextAppt.id, "CONFIRMED")} disabled={isLoading} className="flex-1 lg:flex-none px-8 py-5 bg-blue-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-blue-400 transition-all shadow-[0_10px_20px_rgba(59,130,246,0.3)] border border-blue-400">Confirmar Llegada</button>
                         )}
                         <button onClick={() => handleUpdateStatus(nextAppt.id, "COMPLETED")} disabled={isLoading} className="flex-1 lg:flex-none px-8 py-5 bg-green-500 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-green-400 transition-all shadow-[0_10px_20px_rgba(34,197,94,0.4)] border border-green-400">Completar & Cobrar</button>
                      </div>
                    </div>
                  );
                } else {
                  return <p className="text-amber-500/90 font-bold relative z-10 text-xl bg-black/40 inline-block px-6 py-4 rounded-2xl border border-amber-500/20">No tienes cortes pendientes próximamente. ¡Promociona tu link para atraer clientes!</p>;
                }
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard icon={<DollarSign size={24} />} title="Generado Hoy" value={formatMoney(kpis.todayEarnings)} statusColor="text-green-400" />
              <KpiCard icon={<TrendingUp size={24} />} title="Proyección Mes" value={formatMoney(kpis.monthEarnings)} statusColor="text-blue-400" />
              <KpiCard icon={<Scissors size={24} />} title="Citas Hoy" value={kpis.todayAppointments} statusColor="text-amber-500" />
              <KpiCard icon={<Users size={24} />} title="Tus Clientes" value={kpis.totalClients} statusColor="text-white" />
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: MIS CORTES (AGENDA CON ALTO CONTRASTE) */}
        {/* =================================================================== */}
        {activeTab === "MIS_CORTES" && (
          <motion.div key="mis_cortes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {DATES.map((d, i) => (
                <button 
                  key={i}
                  onClick={() => setSelectedDateFilter(d.fullDate)}
                  className={`flex-shrink-0 w-24 h-28 rounded-3xl flex flex-col items-center justify-center gap-1 transition-all duration-300 border ${selectedDateFilter === d.fullDate ? 'bg-amber-500 border-amber-400 text-black shadow-[0_10px_30px_rgba(217,119,6,0.5)]' : 'bg-zinc-900 border-zinc-700 text-white hover:border-amber-500/80 shadow-md'}`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${selectedDateFilter === d.fullDate ? 'text-black/70' : 'text-zinc-400'}`}>{d.day}</span>
                  <span className="text-3xl font-black tracking-tighter">{d.date}</span>
                </button>
              ))}
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-[3rem] p-6 md:p-10 shadow-2xl">
              <h3 className="text-2xl font-black text-white mb-10 border-b border-zinc-700 pb-6 uppercase tracking-tighter flex justify-between items-center">
                Mi Agenda
                <span className="text-sm text-zinc-400 font-bold bg-zinc-800 px-4 py-2 rounded-xl border border-zinc-600">{new Date(selectedDateFilter + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </h3>
              
              {dynamicTimeline.length === 0 ? (
                <div className="text-center text-zinc-400 py-16 font-bold text-lg border-2 border-dashed border-zinc-700 rounded-xl mt-6 bg-zinc-800/30">
                  <CalendarDays size={40} className="mx-auto mb-4 text-zinc-500" />
                  Tienes este día configurado como Libre en tu horario.
                </div>
              ) : (
                <div className="space-y-2">
                  {dynamicTimeline.map(time => {
                    const appAtThisTime = filteredAppointments.find(a => a.time.startsWith(time.split(':')[0]));
                    const isPast = selectedDateFilter === TODAY_DATE && time < currentHour;
                    const isBlocked = appAtThisTime?.status === 'BLOCKED' || (!appAtThisTime && isPast);

                    if (appAtThisTime && appAtThisTime.status !== 'BLOCKED') {
                      return (
                        <div key={time} className="flex gap-6 items-stretch group">
                          <div className="w-16 flex flex-col items-center">
                            <span className={`font-black text-lg ${appAtThisTime.status === 'COMPLETED' ? 'text-green-400' : 'text-amber-500'}`}>{time}</span>
                            <div className={`w-1 h-full my-2 rounded-full group-last:hidden ${appAtThisTime.status === 'COMPLETED' ? 'bg-green-500/40' : 'bg-amber-500/40'}`}></div>
                          </div>
                          
                          <div className={`flex-1 border-2 hover:border-amber-500 rounded-3xl p-6 mb-6 shadow-lg transition-colors relative overflow-hidden ${appAtThisTime.status === 'COMPLETED' ? 'border-green-500/60 bg-green-500/5' : appAtThisTime.status === 'PENDING' ? 'border-amber-500/80 bg-amber-500/5' : 'border-zinc-600 bg-zinc-800/80'}`}>
                             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                               <div>
                                 <div className="flex items-center gap-3 mb-2">
                                   <h4 className="text-2xl font-black text-white uppercase">{appAtThisTime.client?.name || appAtThisTime.client_name || 'Anónimo'}</h4>
                                   {getStatusBadge(appAtThisTime.status)}
                                 </div>
                                 <p className="text-base font-bold text-zinc-300 flex items-center gap-2">
                                   <Scissors size={16} className="text-amber-500"/> {appAtThisTime.service?.name || appAtThisTime.service_name || 'Servicio General'} • <span className="text-white bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-700">{formatMoney(appAtThisTime.service?.price as number)}</span>
                                 </p>
                                 {appAtThisTime.notes && <p className="text-xs text-zinc-400 mt-2 font-mono break-words">{appAtThisTime.notes}</p>}
                               </div>
                             </div>

                             <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-zinc-700">
                               {appAtThisTime.status === "PENDING" && (
                                 <>
                                   <button onClick={() => handleUpdateStatus(appAtThisTime.id, "CONFIRMED")} disabled={isLoading} className="px-6 py-3 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/40 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Confirmar</button>
                                   <button onClick={() => handleUpdateStatus(appAtThisTime.id, "CANCELLED")} disabled={isLoading} className="px-6 py-3 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/40 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Rechazar</button>
                                 </>
                               )}
                               {appAtThisTime.status === "CONFIRMED" && (
                                 <button onClick={() => handleUpdateStatus(appAtThisTime.id, "COMPLETED")} disabled={isLoading} className="px-8 py-3 bg-green-500 text-black hover:bg-green-400 border border-green-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_5px_15px_rgba(34,197,94,0.4)]">Cobrar</button>
                               )}
                               {appAtThisTime.status === "COMPLETED" && (
                                 <p className="text-green-400 text-sm font-black uppercase tracking-widest flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/20"><Check size={18} /> Cobro Registrado</p>
                               )}
                               <div className="flex-1"></div>
                               
                               {appAtThisTime.status !== "COMPLETED" && (
                                 <>
                                   <button onClick={() => openModal("EDIT_APPT", appAtThisTime)} className="p-3 text-zinc-300 hover:text-white bg-zinc-700 hover:bg-zinc-600 rounded-xl transition-colors border border-zinc-600 shadow-sm" title="Reprogramar y Avisar"><Edit3 size={18}/></button>
                                   <button onClick={() => handleDeleteAppt(appAtThisTime.id)} className="p-3 text-zinc-300 hover:text-red-400 bg-zinc-700 hover:bg-zinc-600 rounded-xl transition-colors border border-zinc-600 shadow-sm" title="Eliminar Cita y Avisar"><Trash2 size={18}/></button>
                                 </>
                               )}
                               <button onClick={() => handleUpdateStatus(appAtThisTime.id, "NO_SHOW")} className="p-3 text-zinc-300 hover:text-yellow-400 bg-zinc-700 hover:bg-zinc-600 rounded-xl transition-colors border border-zinc-600 shadow-sm" title="Faltó (No Show)"><AlertCircle size={18}/></button>
                             </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={time} className={`flex gap-6 items-stretch group transition-opacity ${isBlocked ? 'opacity-40' : 'opacity-80 hover:opacity-100'}`}>
                          <div className="w-16 flex flex-col items-center">
                            <span className={`font-bold ${isBlocked ? 'text-zinc-600 line-through' : 'text-zinc-400'}`}>{time}</span>
                            <div className="w-0.5 h-full bg-zinc-700 my-2 group-last:hidden"></div>
                          </div>
                          <div className={`flex-1 border-2 border-dashed rounded-3xl flex items-center justify-between px-8 mb-6 min-h-[100px] shadow-sm ${isBlocked ? 'border-zinc-800 bg-[#0a0a0a]' : 'border-zinc-600 bg-zinc-800/40 hover:bg-zinc-800/60'}`}>
                             <p className={`font-black text-sm uppercase tracking-widest flex items-center gap-2 ${isBlocked ? 'text-zinc-500' : 'text-zinc-300'}`}>
                               {isPast ? <><Clock size={16}/> Hora Pasada</> : isBlocked ? <><Lock size={16}/> Bloqueado por ti</> : 'Espacio Libre'}
                             </p>
                             {!isPast && (
                               <button 
                                 onClick={() => handleToggleBlockSlot(time, isBlocked, appAtThisTime?.id)}
                                 className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${isBlocked ? 'bg-zinc-700 text-white hover:bg-zinc-600 border border-zinc-600' : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/40'}`}
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
          <motion.div key="clientes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">Gestión de Clientes</h2>
            </div>
            
            <div className="relative mb-8">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={24} />
              <input 
                type="text" 
                placeholder="Buscar cliente por nombre o teléfono..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full bg-zinc-900 border-2 border-zinc-700 rounded-2xl pl-14 pr-4 py-5 text-white text-lg focus:border-amber-500 outline-none transition-all shadow-lg placeholder:text-zinc-500"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.phone && c.phone.includes(searchQuery))).map(client => {
                
                const clientAppts = appointments.filter(a => a.client?.id === client.id || a.client?.name === client.name);
                const completedAppts = clientAppts.filter(a => a.status === 'COMPLETED');
                const totalSpent = completedAppts.reduce((sum, a) => sum + Number(a.service?.price || 0), 0);
                const lastVisit = completedAppts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

                return (
                  <div key={client.id || client.name} className="bg-zinc-900 border border-zinc-700 rounded-[2rem] overflow-hidden hover:border-amber-500 transition-colors shadow-xl group flex flex-col">
                    <div className="p-6 border-b border-zinc-700 flex items-start gap-4">
                      <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-amber-500 font-black text-3xl border border-zinc-600 group-hover:bg-amber-500 group-hover:text-black transition-colors shrink-0 shadow-md">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-2xl font-black text-white uppercase tracking-tight truncate">{client.name}</h4>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs font-mono text-zinc-300 bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-600"><Smartphone size={14} className="text-amber-500"/> {client.phone || "Sin teléfono"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 bg-zinc-800/30 grid grid-cols-2 gap-4 flex-1">
                      <div className="space-y-1">
                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Cortes Completados</p>
                        <p className="text-2xl font-black text-white">{completedAppts.length}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Ingresos Generados</p>
                        <p className="text-2xl font-black text-green-400">{formatMoney(totalSpent)}</p>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Última Visita</p>
                        <p className="text-base font-bold text-zinc-200 flex items-center gap-2 bg-zinc-900 p-3 rounded-xl border border-zinc-700 mt-1">
                          <CalendarDays size={18} className="text-amber-500"/>
                          {lastVisit ? `${lastVisit.date} • ${lastVisit.service?.name}` : 'Aún no tiene cortes completados'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-5 border-t border-zinc-700 bg-zinc-900 flex gap-2">
                      <a href={`https://wa.me/${client.phone?.replace(/[^0-9]/g, '')}?text=Hola%20${client.name},%20te%20escribo%20de%20parte%20de%20tu%20barbero%20${barber?.name}...`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-black uppercase tracking-widest bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366] hover:text-black rounded-xl transition-all border border-[#25D366]/40 shadow-sm">
                        <MessageCircle size={18} /> Escribir WhatsApp
                      </a>
                    </div>
                  </div>
                )
              })}
              {clients.length === 0 && (
                <div className="col-span-full text-center py-20 bg-zinc-900 border-2 border-zinc-700 border-dashed rounded-3xl">
                  <Users size={64} className="mx-auto text-zinc-600 mb-6"/>
                  <p className="text-zinc-400 font-bold text-xl">Aún no hay clientes en tu agenda.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- TAB 4: FINANZAS Y COMISIONES --- */}
        {activeTab === "FINANZAS" && (
          <motion.div key="finanzas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900 border border-zinc-700 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-xl">
                <Wallet className="absolute -bottom-4 -right-4 text-zinc-800" size={140} />
                <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2 relative z-10">Producción Total Hoy</h4>
                <p className="text-5xl font-black text-white relative z-10">{formatMoney(kpis.todayEarnings)}</p>
              </div>
              
              <div className="bg-amber-500 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-[0_20px_50px_rgba(217,119,6,0.4)] border border-amber-400">
                <PieChart className="absolute -bottom-4 -right-4 text-amber-600/50" size={140} />
                <h4 className="text-amber-900 font-black uppercase tracking-widest text-sm mb-2 relative z-10">Ingreso Íntegro (100%)</h4>
                <p className="text-6xl font-black text-black relative z-10">{formatMoney(kpis.todayEarnings)}</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-700 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-xl">
                <CheckCircle2 className="absolute -bottom-4 -right-4 text-zinc-800" size={140} />
                <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2 relative z-10">Cortes Terminados</h4>
                <p className="text-6xl font-black text-green-400 relative z-10">{appointments.filter(a => a.status === 'COMPLETED' && a.date === TODAY_DATE).length}</p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-[2.5rem] overflow-hidden p-8 shadow-2xl">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 border-b border-zinc-700 pb-6 flex items-center gap-3">
                <Receipt className="text-amber-500"/> Detalle Liquidación de Hoy
              </h3>
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="text-xs text-zinc-400 font-black uppercase tracking-[0.2em] bg-zinc-800 border-b border-zinc-600">
                  <tr>
                    <th className="px-6 py-5 rounded-tl-xl">Hora</th>
                    <th className="px-6 py-5">Cliente</th>
                    <th className="px-6 py-5">Servicio</th>
                    <th className="px-6 py-5 text-amber-500 text-right rounded-tr-xl">Ingreso (100%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700/80">
                  {appointments.filter(a => a.status === "COMPLETED" && a.date === TODAY_DATE).map((app, i) => (
                    <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-6 font-black text-white text-lg">{app.time}</td>
                      <td className="px-6 py-6 uppercase font-bold text-zinc-200 text-base">{app.client?.name || app.client_name || 'Anónimo'}</td>
                      <td className="px-6 py-6 font-bold text-zinc-400">{app.service?.name}</td>
                      <td className="px-6 py-6 font-black text-green-400 text-right text-xl bg-green-500/5">{formatMoney(Number(app.service?.price || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {appointments.filter(a => a.status === "COMPLETED" && a.date === TODAY_DATE).length === 0 && (
                <div className="text-center text-zinc-400 py-16 font-bold text-lg border-2 border-dashed border-zinc-700 rounded-xl mt-6 bg-zinc-800/30">
                  <DollarSign size={40} className="mx-auto mb-4 text-zinc-500" />
                  Aún no has completado cortes hoy.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- TAB 5: HORARIO --- */}
        {activeTab === "HORARIO" && (
          <motion.div key="horario" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="bg-amber-500/20 border border-amber-500/40 p-8 rounded-[2rem] flex items-start gap-6 mb-10 shadow-lg">
              <AlertCircle className="text-amber-500 flex-shrink-0" size={36} />
              <div>
                <h4 className="text-amber-400 font-black text-2xl uppercase tracking-tighter mb-2">Disponibilidad Semanal</h4>
                <p className="text-amber-500/90 font-bold text-base">Establece tus días y horas de trabajo. Esto determinará qué bloques ven los clientes al intentar agendar contigo en la web pública.</p>
              </div>
            </div>

            <form onSubmit={handleSaveSchedule} className="bg-zinc-900 border border-zinc-700 rounded-[2.5rem] p-8 md:p-10 space-y-6 shadow-2xl">
              {DAYS_OF_WEEK.map(day => {
                const sched = schedules.find(s => s.day_of_week === day);
                return (
                  <div key={day} className="flex flex-col md:flex-row items-center gap-6 p-6 bg-zinc-950 border border-zinc-700 rounded-2xl shadow-inner hover:border-amber-500/50 transition-colors">
                    <div className="w-full md:w-36 flex items-center gap-4">
                      <input type="checkbox" name={`active_${day}`} defaultChecked={sched?.is_active ?? true} className="w-6 h-6 accent-amber-500" />
                      <span className="text-white font-black uppercase tracking-widest text-sm">{day}</span>
                    </div>
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block mb-2">Inicio Turno</label>
                        <input type="time" name={`start_${day}`} defaultValue={sched?.start_time || "10:00"} className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-5 py-4 text-white font-bold text-lg focus:border-amber-500 outline-none shadow-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block mb-2">Fin Turno</label>
                        <input type="time" name={`end_${day}`} defaultValue={sched?.end_time || "20:00"} className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-5 py-4 text-white font-bold text-lg focus:border-amber-500 outline-none shadow-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block mb-2">Inicio Colación</label>
                        <input type="time" name={`bstart_${day}`} defaultValue={sched?.break_start || "14:00"} className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-5 py-4 text-white font-bold text-lg focus:border-amber-500 outline-none shadow-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block mb-2">Fin Colación</label>
                        <input type="time" name={`bend_${day}`} defaultValue={sched?.break_end || "15:00"} className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-5 py-4 text-white font-bold text-lg focus:border-amber-500 outline-none shadow-sm" />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="pt-8 border-t border-zinc-700 mt-8">
                <button type="submit" disabled={isLoading} className="w-full py-6 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] text-sm rounded-2xl transition-all shadow-[0_10px_30px_rgba(217,119,6,0.4)] flex justify-center items-center gap-3">
                  {isLoading ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24}/> Actualizar Horarios en Sistema</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* --- TAB 6: MI ESTACIÓN --- */}
        {activeTab === "MI_ESTACION" && (
          <motion.div key="mi_estacion" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="bg-gradient-to-r from-amber-500/20 to-zinc-900 border border-amber-500/40 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl">
              <Armchair className="absolute -right-10 -bottom-10 text-amber-500/10 w-96 h-96 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-5xl font-black text-white uppercase tracking-tighter font-serif mb-4 drop-shadow-lg">
                  {myChair ? myChair.name : 'Estación no asignada'}
                </h3>
                <p className="text-zinc-300 font-bold text-lg mb-10 max-w-2xl">Este es tu espacio de trabajo oficial en la barbería asignado por la administración. Procura mantenerlo limpio.</p>
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="bg-zinc-950/80 border border-zinc-700 p-8 rounded-3xl flex-1 shadow-inner">
                    <p className="text-[11px] text-zinc-400 uppercase font-black tracking-widest mb-2">Estado de Arriendo</p>
                    <p className="text-white font-bold text-xl flex items-center gap-3">
                      <CheckCircle2 size={24} className="text-green-400"/> {myChair ? 'Sillón Activo y Operativo' : 'Sin sillón vinculado'}
                    </p>
                  </div>
                  <div className="bg-zinc-950/80 border border-zinc-700 p-8 rounded-3xl flex-1 shadow-inner">
                    <p className="text-[11px] text-zinc-400 uppercase font-black tracking-widest mb-2">Próxima Fecha de Pago</p>
                    <p className="text-amber-500 font-black text-3xl">
                      {myChair?.payment_due_date ? new Date(myChair.payment_due_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric'}) : 'No registrado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL DE REPROGRAMACIÓN */}
      {/* =================================================================== */}
      <AnimatePresence>
        {modalType === "EDIT_APPT" && selectedAppt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalType(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#121212] border border-zinc-700 rounded-[3rem] p-10 w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 font-serif italic text-center">Reprogramar Cita</h3>
              
              <form onSubmit={handleEditApptSave} className="space-y-6">
                <div>
                  <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2 pl-2">Cliente Asociado</label>
                  <input type="text" disabled value={selectedAppt.client?.name || selectedAppt.client_name || 'Anónimo'} className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-5 text-white text-lg font-bold cursor-not-allowed shadow-inner" />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2 pl-2">Nueva Fecha</label>
                    <input type="date" name="date" defaultValue={selectedAppt.date} className="w-full bg-zinc-800 border border-zinc-600 rounded-2xl px-5 py-5 text-white font-bold text-lg focus:border-amber-500 outline-none transition-colors shadow-inner" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-2 pl-2">Nueva Hora</label>
                    <input type="time" name="time" defaultValue={selectedAppt.time} className="w-full bg-zinc-800 border border-zinc-600 rounded-2xl px-5 py-5 text-white font-bold text-lg focus:border-amber-500 outline-none transition-colors shadow-inner" required />
                  </div>
                </div>
                
                <div className="flex gap-4 pt-8 border-t border-zinc-700 mt-8">
                  <button type="button" onClick={() => setModalType(null)} className="flex-1 py-5 text-zinc-300 font-black text-sm uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-2xl transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isLoading} className="flex-1 py-5 text-black font-black uppercase tracking-widest text-sm bg-amber-500 hover:bg-amber-400 rounded-2xl transition-all shadow-[0_10px_20px_rgba(217,119,6,0.4)]">
                    {isLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Confirmar y Avisar'}
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
    <div className="bg-zinc-900 border border-zinc-700 rounded-[2.5rem] p-8 hover:border-amber-500/60 transition-colors relative overflow-hidden group shadow-xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
      <div className={`w-16 h-16 bg-zinc-950 border border-zinc-700 rounded-2xl flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform ${statusColor}`}>{icon}</div>
      <p className="text-zinc-400 text-[11px] font-black uppercase tracking-widest mb-1">{title}</p>
      <h4 className={`text-4xl md:text-5xl font-black tracking-tighter ${statusColor === 'text-amber-500' ? 'text-white' : statusColor}`}>{value}</h4>
    </div>
  );
}