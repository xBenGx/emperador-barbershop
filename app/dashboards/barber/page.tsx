"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";

// IMPORTACIONES
import * as LucideIcons from "lucide-react";
import { 
  CalendarDays, Clock, DollarSign, Users, TrendingUp, 
  CheckCircle2, XCircle, Edit3, Trash2, Scissors, 
  Phone, Mail, Search, AlertCircle, Check, Lock,
  Wallet, PieChart, Receipt, Link as LinkIcon, Loader2,
  LayoutDashboard, MessageCircle, Crown, UserCircle2,
  Armchair, Boxes, Music, Disc, Volume2, VolumeX, Volume1,
  UploadCloud, Package, Tag, UserPlus, Plus, X, Save,
  Image as ImageIcon, Smartphone, ShieldAlert, LogOut
} from "lucide-react";

// ============================================================================
// TIPADOS
// ============================================================================
type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "BLOCKED";
type TabType = "RESUMEN" | "RESERVAS" | "CLIENTES" | "FINANZAS" | "HORARIO" | "MI_ESTACION";
type ModalType = "EDIT_APPT" | null;

interface Client { id: string; name: string; phone: string; email: string; points?: number; }
interface Service { id: string; name: string; price: number; }
interface Appointment { id: string; date: string; time: string; status: AppointmentStatus; notes?: string; client: Client; service: Service; }
interface BarberProfile { id: string; name: string; img?: string; role?: string; tag?: string; }
interface Chair { id: string; name: string; status: string; payment_due_date?: string; }
interface Schedule { id: string; day_of_week: string; is_active: boolean; start_time: string; end_time: string; break_start: string; break_end: string; }

// ============================================================================
// UTILIDADES
// ============================================================================
const formatMoney = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0);

const generateDates = () => {
  const dates = [];
  const today = new Date();
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
  for(let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({ 
      day: days[d.getDay()], 
      date: d.getDate().toString(), 
      month: months[d.getMonth()],
      fullDate: d.toISOString().split('T')[0] 
    });
  }
  return dates;
};

const DATES = generateDates();
const TODAY_DATE = DATES[0].fullDate;
const TIMELINE_SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// ============================================================================
// COMPONENTE PRINCIPAL DEL BARBERO
// ============================================================================
export default function BarberDashboard() {
  const supabase = createClient();
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
  
  // Modales
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentHour, setCurrentHour] = useState("");

  // Reloj en tiempo real
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

      // 1. 🛡️ VERIFICACIÓN BLINDADA: Consultar directamente la tabla Barbers
      const { data: barberData } = await supabase.from('Barbers').select('*').eq('id', user.id).single();

      // Si el usuario no existe en la tabla de Barberos, verificamos si es Administrador.
      if (!barberData) {
        const { data: userProfile } = await supabase.from('User').select('role').eq('id', user.id).single();
        if (userProfile?.role !== 'ADMIN') {
          // Si no es ni barbero ni admin, LO EXPULSAMOS.
          setAuthError(true);
          await supabase.auth.signOut();
          router.push('/login?error=Acceso%20Denegado.');
          return;
        }
      }

      // Si llegó hasta aquí, ESTÁ AUTORIZADO. Cargamos sus datos.
      if (barberData) {
        setBarber(barberData);
      } else {
        setBarber({ id: user.id, name: "Administrador" }); // Vista de admin
      }

      // 2. Sillón
      const { data: chairData } = await supabase.from('chairs').select('*').eq('current_barber_id', user.id).single();
      if (chairData) setMyChair(chairData);

      // 3. Citas
      const { data: apptsData } = await supabase
        .from('Appointments')
        .select(`
          id, date, time, status, notes,
          client:client_id (id, name, phone, email, points),
          service:service_id (id, name, price)
        `)
        .eq('barber_id', user.id)
        .gte('date', TODAY_DATE)
        .order('time', { ascending: true });

      if (apptsData) {
        const typedAppts = apptsData as unknown as Appointment[];
        setAppointments(typedAppts);
        
        const uniqueClientsMap = new Map();
        typedAppts.forEach(a => {
          if (a.client && !uniqueClientsMap.has(a.client.id)) {
            uniqueClientsMap.set(a.client.id, a.client);
          }
        });
        setClients(Array.from(uniqueClientsMap.values()));

        const todayAppts = typedAppts.filter(a => a.date === TODAY_DATE);
        const todayCompleted = todayAppts.filter(a => a.status === 'COMPLETED');
        const todayEarnings = todayCompleted.reduce((acc, curr) => acc + Number(curr.service?.price || 0), 0);
        
        setKpis({
          todayEarnings,
          monthEarnings: todayEarnings * 24, 
          todayAppointments: todayAppts.length,
          totalClients: uniqueClientsMap.size
        });
      }

      // 4. Horarios
      const { data: schedData } = await supabase.from('barber_schedules').select('*').eq('barber_id', user.id);
      if (schedData) setSchedules(schedData);

    } catch (error) {
      console.error(error);
      router.push('/login');
    } finally {
      setIsAppLoading(false);
      setIsFetching(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadDashboardData();

    let channel: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase.channel('barber-sync-station')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Appointments', filter: `barber_id=eq.${user.id}` }, 
        () => loadDashboardData()).subscribe();
    };
    setupRealtime();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [loadDashboardData, supabase]);

  const handleLogout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ============================================================================
  // ACCIONES CRUD
  // ============================================================================
  const handleUpdateStatus = async (id: string, newStatus: AppointmentStatus) => {
    setIsLoading(true);
    const { error } = await supabase.from('Appointments').update({ status: newStatus }).eq('id', id);
    if (!error) loadDashboardData(); 
    setIsLoading(false);
  };

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
        });
      }
      loadDashboardData();
    } catch (error) {
      alert("Error al modificar el bloque de tiempo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditApptSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;
    setIsLoading(true);
    const form = e.target as HTMLFormElement;
    const newDate = (form.elements.namedItem('date') as HTMLInputElement).value;
    const newTime = (form.elements.namedItem('time') as HTMLInputElement).value;

    const { error } = await supabase.from('Appointments').update({ date: newDate, time: newTime }).eq('id', selectedAppt.id);
    if (!error) {
      loadDashboardData();
      setModalType(null);
      alert("Reserva reprogramada exitosamente.");
    }
    setIsLoading(false);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barber) return;
    setIsLoading(true);
    
    try {
      const form = e.target as HTMLFormElement;
      
      const upsertData = DAYS_OF_WEEK.map(day => {
        const isActive = (form.elements.namedItem(`active_${day}`) as HTMLInputElement).checked;
        const start = (form.elements.namedItem(`start_${day}`) as HTMLInputElement).value;
        const end = (form.elements.namedItem(`end_${day}`) as HTMLInputElement).value;
        const bStart = (form.elements.namedItem(`bstart_${day}`) as HTMLInputElement).value;
        const bEnd = (form.elements.namedItem(`bend_${day}`) as HTMLInputElement).value;

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

      const { error } = await supabase.from('barber_schedules').upsert(upsertData, { onConflict: 'barber_id, day_of_week' });
      
      if (error) throw error;
      
      loadDashboardData();
      alert("Horarios de trabajo actualizados en el sistema.");
    } catch (error: any) {
      console.error(error);
      alert("Error al guardar los horarios: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyUniqueLink = () => {
    if (!barber) return;
    const link = `${window.location.origin}/reservar?barber=${barber.id}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const openModal = (type: ModalType, item: any = null) => {
    setModalType(type);
    if (type === "EDIT_APPT") setSelectedAppt(item);
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    const badges = {
      PENDING: <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Clock size={12}/> Pendiente</span>,
      CONFIRMED: <span className="px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Confirmado</span>,
      COMPLETED: <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Check size={12}/> Terminado</span>,
      CANCELLED: <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><XCircle size={12}/> Cancelado</span>,
      NO_SHOW: <span className="px-3 py-1 bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><AlertCircle size={12}/> Falta</span>,
      BLOCKED: <span className="px-3 py-1 bg-zinc-900 text-zinc-500 border border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Lock size={12}/> Bloqueado</span>,
    };
    return badges[status] || badges.PENDING;
  };

  const filteredAppointments = appointments.filter(a => a.date === selectedDateFilter && (a.client?.name || "").toLowerCase().includes(searchQuery.toLowerCase()));

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-amber-500 gap-4">
        <Loader2 className="animate-spin" size={40} />
        <p className="font-black uppercase tracking-widest text-xs">Preparando tu estación...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-red-500 gap-4">
        <ShieldAlert size={60} className="animate-pulse" />
        <h1 className="text-2xl font-black uppercase tracking-widest">Acceso Restringido</h1>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto pb-20 pt-8 px-6 md:px-10">
      
      {/* HEADER DEL BARBERO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div className="flex items-center gap-6">
           <div className="relative w-20 h-20 rounded-full bg-zinc-900 border-2 border-amber-500 overflow-hidden shadow-[0_0_20px_rgba(217,119,6,0.3)] shrink-0">
              {barber?.img ? (
                <Image src={barber.img} alt="Perfil" fill className="object-cover" unoptimized />
              ) : (
                <Scissors className="text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size={32}/>
              )}
           </div>
           <div>
             <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase font-serif flex items-center gap-3">
               Hola, <span className="text-amber-500">{barber?.name?.split(' ')[0] || 'Maestro'}</span>
               {isFetching && <Loader2 className="animate-spin text-zinc-600" size={20} />}
             </h1>
             <p className="text-zinc-400 mt-1 flex items-center gap-2 font-medium text-sm">
               <CalendarDays size={14} className="text-amber-500" />
               Hoy es {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
             </p>
           </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={copyUniqueLink}
            className={`flex-1 md:flex-none px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl ${copySuccess ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-zinc-900 border border-zinc-800 text-white hover:border-amber-500'}`}
          >
            {copySuccess ? <Check size={16} /> : <LinkIcon size={16} />}
            {copySuccess ? '¡Enlace Copiado!' : 'Mi Link de Reservas'}
          </button>
          <button onClick={handleLogout} className="p-4 bg-zinc-900 border border-zinc-800 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all" title="Cerrar Sesión">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* TABS NAVEGACIÓN */}
      <div className="flex gap-2 mb-8 border-b border-zinc-800 pb-4 overflow-x-auto hide-scrollbar scroll-smooth">
        {(["RESUMEN", "RESERVAS", "CLIENTES", "FINANZAS", "HORARIO", "MI_ESTACION"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3.5 rounded-xl font-black text-[11px] tracking-[0.2em] uppercase transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-2 ${
              activeTab === tab 
                ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(217,119,6,0.3)]" 
                : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800/50"
            }`}
          >
            {tab === "RESUMEN" && <LayoutDashboard size={16}/>}
            {tab === "RESERVAS" && <CalendarDays size={16}/>}
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
            
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none"></div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3 relative z-10">
                <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>
                Tu Próximo Cliente
              </h3>
              
              {(() => {
                const nextAppt = appointments
                  .filter(a => a.date === TODAY_DATE && (a.status === "CONFIRMED" || a.status === "PENDING") && a.time >= currentHour)
                  .sort((a, b) => a.time.localeCompare(b.time))[0];

                if (nextAppt) {
                  return (
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-amber-500 text-black rounded-[2rem] flex flex-col items-center justify-center font-black leading-none shadow-[0_10px_30px_rgba(217,119,6,0.4)]">
                          <span className="text-3xl">{nextAppt.time.split(':')[0]}</span>
                          <span className="text-sm">{nextAppt.time.split(':')[1]}</span>
                        </div>
                        <div>
                          <h4 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">{nextAppt.client?.name}</h4>
                          <p className="text-zinc-400 font-bold flex items-center gap-2"><Scissors size={16} className="text-amber-500"/> {nextAppt.service?.name}</p>
                          {nextAppt.notes && <p className="text-amber-500 text-xs font-bold mt-2 bg-amber-500/10 inline-block px-3 py-1 rounded-md">Nota: {nextAppt.notes}</p>}
                        </div>
                      </div>
                      <div className="flex gap-3 w-full lg:w-auto">
                         {nextAppt.status === 'PENDING' && (
                           <button onClick={() => handleUpdateStatus(nextAppt.id, "CONFIRMED")} disabled={isLoading} className="flex-1 lg:flex-none px-8 py-5 bg-blue-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-blue-400 transition-all shadow-[0_10px_20px_rgba(59,130,246,0.3)]">Confirmar</button>
                         )}
                         <button onClick={() => handleUpdateStatus(nextAppt.id, "COMPLETED")} disabled={isLoading} className="flex-1 lg:flex-none px-8 py-5 bg-green-500 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-green-400 transition-all shadow-[0_10px_20px_rgba(34,197,94,0.3)]">Completar & Cobrar</button>
                      </div>
                    </div>
                  );
                } else {
                  return <p className="text-amber-500/80 font-medium relative z-10 text-lg">No tienes cortes pendientes próximamente. ¡Promociona tu link para atraer clientes!</p>;
                }
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard icon={<DollarSign size={24} />} title="Generado Hoy" value={formatMoney(kpis.todayEarnings)} statusColor="text-green-500" />
              <KpiCard icon={<TrendingUp size={24} />} title="Proyección Mes" value={formatMoney(kpis.monthEarnings)} />
              <KpiCard icon={<Scissors size={24} />} title="Citas Hoy" value={kpis.todayAppointments} statusColor="text-amber-500" />
              <KpiCard icon={<Users size={24} />} title="Tus Clientes" value={kpis.totalClients} />
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: RESERVAS */}
        {/* =================================================================== */}
        {activeTab === "RESERVAS" && (
          <motion.div key="reservas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {DATES.map((d, i) => (
                <button 
                  key={i}
                  onClick={() => setSelectedDateFilter(d.fullDate)}
                  className={`flex-shrink-0 w-24 h-28 rounded-3xl flex flex-col items-center justify-center gap-1 transition-all duration-300 ${selectedDateFilter === d.fullDate ? 'bg-amber-500 text-black shadow-[0_10px_30px_rgba(217,119,6,0.4)]' : 'bg-zinc-900/50 border border-zinc-800 text-white hover:border-amber-500/50'}`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${selectedDateFilter === d.fullDate ? 'text-black/60' : 'text-zinc-500'}`}>{d.day}</span>
                  <span className="text-3xl font-black tracking-tighter">{d.date}</span>
                </button>
              ))}
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[3rem] p-6 md:p-10">
              <h3 className="text-2xl font-black text-white mb-10 border-b border-zinc-800 pb-6 uppercase tracking-tighter">Mi Agenda</h3>
              
              <div className="space-y-2">
                {TIMELINE_SLOTS.map(time => {
                  const appAtThisTime = filteredAppointments.find(a => a.time.startsWith(time.split(':')[0]));
                  const isPast = selectedDateFilter === TODAY_DATE && time < currentHour;
                  const isBlocked = appAtThisTime?.status === 'BLOCKED' || (!appAtThisTime && isPast);

                  if (appAtThisTime && appAtThisTime.status !== 'BLOCKED') {
                    return (
                      <div key={time} className="flex gap-6 items-stretch group">
                        <div className="w-16 flex flex-col items-center">
                          <span className={`font-black text-lg ${appAtThisTime.status === 'COMPLETED' ? 'text-green-500' : 'text-amber-500'}`}>{time}</span>
                          <div className={`w-0.5 h-full my-2 group-last:hidden ${appAtThisTime.status === 'COMPLETED' ? 'bg-green-500/20' : 'bg-amber-500/20'}`}></div>
                        </div>
                        
                        <div className={`flex-1 bg-zinc-950 border hover:border-amber-500/50 rounded-3xl p-6 mb-6 shadow-lg transition-colors relative overflow-hidden ${appAtThisTime.status === 'COMPLETED' ? 'border-green-500/30' : 'border-zinc-800'}`}>
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                             <div>
                               <div className="flex items-center gap-3 mb-2">
                                 <h4 className="text-xl font-black text-white uppercase">{appAtThisTime.client?.name || 'Anónimo'}</h4>
                                 {getStatusBadge(appAtThisTime.status)}
                               </div>
                               <p className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                                 <Scissors size={14} className="text-amber-500"/> {appAtThisTime.service?.name || 'Servicio General'} • <span className="text-white">{formatMoney(appAtThisTime.service?.price as number)}</span>
                               </p>
                             </div>
                           </div>

                           <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-zinc-800/50">
                             {appAtThisTime.status === "PENDING" && (
                               <>
                                 <button onClick={() => handleUpdateStatus(appAtThisTime.id, "CONFIRMED")} disabled={isLoading} className="px-6 py-3 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Confirmar</button>
                                 <button onClick={() => handleUpdateStatus(appAtThisTime.id, "CANCELLED")} disabled={isLoading} className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Rechazar</button>
                               </>
                             )}
                             {appAtThisTime.status === "CONFIRMED" && (
                               <button onClick={() => handleUpdateStatus(appAtThisTime.id, "COMPLETED")} disabled={isLoading} className="px-8 py-3 bg-green-500 text-black hover:bg-green-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_5px_15px_rgba(34,197,94,0.2)]">Cobrar</button>
                             )}
                             {appAtThisTime.status === "COMPLETED" && (
                               <p className="text-green-500 text-xs font-black uppercase tracking-widest flex items-center gap-1"><Check size={14} /> Cobro Registrado</p>
                             )}
                             <div className="flex-1"></div>
                             
                             {appAtThisTime.status !== "COMPLETED" && (
                               <button onClick={() => openModal("EDIT_APPT", appAtThisTime)} className="p-3 text-zinc-500 hover:text-white bg-zinc-900 rounded-xl transition-colors" title="Reprogramar"><Edit3 size={16}/></button>
                             )}
                             <button onClick={() => handleUpdateStatus(appAtThisTime.id, "NO_SHOW")} className="p-3 text-zinc-500 hover:text-yellow-500 bg-zinc-900 rounded-xl transition-colors" title="Faltó (No Show)"><AlertCircle size={16}/></button>
                           </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={time} className={`flex gap-6 items-stretch group transition-opacity ${isBlocked ? 'opacity-30' : 'opacity-60 hover:opacity-100'}`}>
                        <div className="w-16 flex flex-col items-center">
                          <span className={`font-bold ${isBlocked ? 'text-zinc-700 line-through' : 'text-zinc-500'}`}>{time}</span>
                          <div className="w-px h-full bg-zinc-800 my-2 group-last:hidden"></div>
                        </div>
                        <div className={`flex-1 border-2 border-dashed rounded-3xl flex items-center justify-between px-8 mb-6 min-h-[100px] ${isBlocked ? 'border-zinc-900 bg-black' : 'border-zinc-800 bg-zinc-950/30'}`}>
                           <p className="text-zinc-600 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                             {isPast ? <><Clock size={14}/> Hora Pasada</> : isBlocked ? <><Lock size={14}/> Bloqueado por ti</> : 'Espacio Libre'}
                           </p>
                           {!isPast && (
                             <button 
                               onClick={() => handleToggleBlockSlot(time, isBlocked, appAtThisTime?.id)}
                               className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isBlocked ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20'}`}
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
            </div>
          </motion.div>
        )}

        {/* --- TAB 3: CLIENTES DEL BARBERO --- */}
        {activeTab === "CLIENTES" && (
          <motion.div key="clientes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">Mis Clientes</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map(client => {
                const clientAppts = appointments.filter(a => a.client?.id === client.id);
                return (
                  <div key={client.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 hover:border-amber-500/50 transition-colors group">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-zinc-950 rounded-2xl flex items-center justify-center text-amber-500 font-black text-2xl border border-zinc-800 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white uppercase tracking-tight">{client.name}</h4>
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Cortes contigo: {clientAppts.length}</p>
                      </div>
                    </div>
                    <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                      <a href={`https://wa.me/${client.phone?.replace(/[^0-9]/g, '')}?text=Hola%20${client.name},%20te%20escribo%20de%20parte%20de%20tu%20barbero%20${barber?.name}...`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full py-4 text-sm text-green-500 font-bold bg-green-500/10 rounded-xl border border-green-500/20 hover:bg-green-500 hover:text-black transition-colors">
                        <MessageCircle size={18} /> Escribir WhatsApp
                      </a>
                    </div>
                  </div>
                )
              })}
              {clients.length === 0 && <p className="text-zinc-500 font-medium col-span-full text-center py-10">Aún no has registrado clientes en tu agenda.</p>}
            </div>
          </motion.div>
        )}

        {/* --- TAB 4: FINANZAS Y COMISIONES --- */}
        {activeTab === "FINANZAS" && (
          <motion.div key="finanzas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
                <Wallet className="absolute -bottom-4 -right-4 text-zinc-800" size={140} />
                <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2 relative z-10">Producción Total Hoy</h4>
                <p className="text-5xl font-black text-white relative z-10">{formatMoney(kpis.todayEarnings)}</p>
              </div>
              
              <div className="bg-amber-500 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-[0_20px_50px_rgba(217,119,6,0.3)]">
                <PieChart className="absolute -bottom-4 -right-4 text-amber-600/50" size={140} />
                <h4 className="text-amber-900 font-black uppercase tracking-widest text-sm mb-2 relative z-10">Ingreso Íntegro (100%)</h4>
                <p className="text-5xl font-black text-black relative z-10">{formatMoney(kpis.todayEarnings)}</p>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
                <CheckCircle2 className="absolute -bottom-4 -right-4 text-zinc-800" size={140} />
                <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2 relative z-10">Cortes Terminados</h4>
                <p className="text-5xl font-black text-green-500 relative z-10">{appointments.filter(a => a.status === 'COMPLETED' && a.date === TODAY_DATE).length}</p>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden p-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 border-b border-zinc-800 pb-6 flex items-center gap-3">
                <Receipt className="text-amber-500"/> Detalle Liquidación de Hoy
              </h3>
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] bg-zinc-950/50 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-5">Hora</th>
                    <th className="px-6 py-5">Cliente</th>
                    <th className="px-6 py-5">Servicio</th>
                    <th className="px-6 py-5 text-amber-500 text-right">Ingreso (100%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {appointments.filter(a => a.status === "COMPLETED" && a.date === TODAY_DATE).map((app, i) => (
                    <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-5 font-bold text-white text-base">{app.time}</td>
                      <td className="px-6 py-5 uppercase font-bold text-zinc-300">{app.client?.name}</td>
                      <td className="px-6 py-5">{app.service?.name}</td>
                      <td className="px-6 py-5 font-black text-amber-500 text-right text-lg">{formatMoney(Number(app.service?.price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {appointments.filter(a => a.status === "COMPLETED" && a.date === TODAY_DATE).length === 0 && (
                <p className="text-center text-zinc-500 py-10 font-medium">Aún no has completado cortes hoy.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* --- TAB 5: HORARIO --- */}
        {activeTab === "HORARIO" && (
          <motion.div key="horario" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="bg-amber-500/10 border border-amber-500/20 p-8 rounded-[2rem] flex items-start gap-6 mb-10">
              <AlertCircle className="text-amber-500 flex-shrink-0" size={32} />
              <div>
                <h4 className="text-amber-500 font-black text-xl uppercase tracking-tighter mb-2">Disponibilidad Semanal</h4>
                <p className="text-amber-500/80 font-medium text-sm">Establece tus días y horas de trabajo. Esto determinará qué bloques ven los clientes al intentar agendar contigo en la web pública.</p>
              </div>
            </div>

            <form onSubmit={handleSaveSchedule} className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 space-y-6">
              {DAYS_OF_WEEK.map(day => {
                const sched = schedules.find(s => s.day_of_week === day);
                return (
                  <div key={day} className="flex flex-col md:flex-row items-center gap-6 p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
                    <div className="w-full md:w-32 flex items-center gap-3">
                      <input type="checkbox" name={`active_${day}`} defaultChecked={sched?.is_active ?? true} className="w-5 h-5 accent-amber-500" />
                      <span className="text-white font-bold uppercase tracking-widest text-xs">{day}</span>
                    </div>
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Inicio Turno</label>
                        <input type="time" name={`start_${day}`} defaultValue={sched?.start_time || "10:00"} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Fin Turno</label>
                        <input type="time" name={`end_${day}`} defaultValue={sched?.end_time || "20:00"} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Inicio Colación</label>
                        <input type="time" name={`bstart_${day}`} defaultValue={sched?.break_start || "14:00"} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Fin Colación</label>
                        <input type="time" name={`bend_${day}`} defaultValue={sched?.break_end || "15:00"} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="pt-6 border-t border-zinc-800 mt-6">
                <button type="submit" disabled={isLoading} className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-[0_10px_30px_rgba(217,119,6,0.3)] flex justify-center items-center gap-2">
                  {isLoading ? <Loader2 className="animate-spin" /> : <><Save size={18}/> Actualizar Horarios en Sistema</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* --- TAB 6: MI ESTACIÓN --- */}
        {activeTab === "MI_ESTACION" && (
          <motion.div key="mi_estacion" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="bg-gradient-to-r from-amber-500/10 to-zinc-900 border border-amber-500/30 rounded-[3rem] p-10 relative overflow-hidden">
              <Armchair className="absolute -right-10 -bottom-10 text-amber-500/5 w-96 h-96 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-4xl font-black text-white uppercase tracking-tighter font-serif mb-2">
                  {myChair ? myChair.name : 'Estación no asignada'}
                </h3>
                <p className="text-zinc-400 font-medium mb-10">Este es tu espacio de trabajo oficial en la barbería asignado por la administración.</p>
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex-1">
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Estado de Arriendo</p>
                    <p className="text-white font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500"/> {myChair ? 'Sillón Activo y Operativo' : 'Sin sillón vinculado'}
                    </p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex-1">
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Próxima Fecha de Pago</p>
                    <p className="text-amber-500 font-black text-xl">
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
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#0a0a0a] border border-zinc-800 rounded-[3rem] p-10 w-full max-w-lg shadow-2xl">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 font-serif italic">Reprogramar Cita</h3>
              
              <form onSubmit={handleEditApptSave} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">Cliente Asociado</label>
                  <input type="text" disabled value={selectedAppt.client?.name} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-500 font-bold cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">Nueva Fecha</label>
                    <input type="date" name="date" defaultValue={selectedAppt.date} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-colors" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">Nueva Hora</label>
                    <input type="time" name="time" defaultValue={selectedAppt.time} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-colors" required />
                  </div>
                </div>
                
                <div className="flex gap-4 pt-8 border-t border-zinc-800 mt-8">
                  <button type="button" onClick={() => setModalType(null)} className="flex-1 py-5 text-white font-black text-xs uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 rounded-2xl transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isLoading} className="flex-1 py-5 text-black font-black uppercase tracking-widest text-xs bg-amber-500 hover:bg-amber-400 rounded-2xl transition-all shadow-[0_10px_20px_rgba(217,119,6,0.3)]">
                    {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Confirmar'}
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
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 hover:border-amber-500/50 transition-colors relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
      <div className={`w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform ${statusColor}`}>
        {icon}
      </div>
      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <h4 className={`text-4xl font-black tracking-tighter ${statusColor === 'text-amber-500' ? 'text-white' : statusColor}`}>{value}</h4>
    </div>
  );
}