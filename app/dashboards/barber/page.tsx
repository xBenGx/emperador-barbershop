"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client"; // IMPORTANTE: Tu cliente de Supabase
import { 
  CalendarDays, Clock, DollarSign, Users, TrendingUp, 
  CheckCircle2, XCircle, Edit3, Trash2, Scissors, 
  Phone, Mail, Search, AlertCircle, Check,
  Wallet, CalendarRange, PieChart, Receipt, Coffee, UserCircle, Link as LinkIcon, Copy
} from "lucide-react";

// ============================================================================
// TIPADOS 
// ============================================================================
type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
type TabType = "RESUMEN" | "RESERVAS" | "CLIENTES" | "FINANZAS" | "HORARIO";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalVisits?: number;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string;
  client: Client;
  service: Service;
}

interface BarberProfile {
  id: string;
  name: string;
}

interface Schedule {
  day: string;
  active: boolean;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
}

// ============================================================================
// UTILS
// ============================================================================
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
const TIMELINE_SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

export default function BarberDashboard() {
  const supabase = createClient();
  
  // Estados Globales Reales
  const [barber, setBarber] = useState<BarberProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [kpis, setKpis] = useState({ todayEarnings: 0, monthEarnings: 0, todayAppointments: 0, totalClients: 0 });
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Estados de UI
  const [activeTab, setActiveTab] = useState<TabType>("RESERVAS");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(TODAY_DATE);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // ============================================================================
  // CARGA DE DATOS (SUPABASE)
  // ============================================================================
  const loadDashboardData = useCallback(async () => {
    try {
      // 1. Obtener sesión actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Redirigir a login idealmente

      // 2. Obtener perfil del barbero
      const { data: profile } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', user.id)
        .single();
      
      if (profile) setBarber(profile);

      // 3. Obtener citas cruzando tablas (Asumiendo relaciones FK en BD)
      const { data: apptsData, error: apptsError } = await supabase
        .from('appointments')
        .select(`
          id, date, time, status, notes,
          client:client_id (id, name, phone, email),
          service:service_id (id, name, price, duration)
        `)
        .eq('barber_id', user.id)
        .gte('date', TODAY_DATE); // Solo traer de hoy en adelante para rendimiento

      if (apptsData) {
        // Formatear datos si es necesario
        setAppointments(apptsData as unknown as Appointment[]);
        
        // Calcular KPIs reales
        const todayAppts = apptsData.filter(a => a.date === TODAY_DATE);
        const todayCompleted = todayAppts.filter(a => a.status === 'COMPLETED');
        const todayEarnings = todayCompleted.reduce((acc, curr) => acc + (curr.service as any).price, 0);
        
        // Clientes únicos
        const uniqueClients = new Set(apptsData.map(a => (a.client as any).id)).size;

        setKpis({
          todayEarnings,
          monthEarnings: todayEarnings * 20, // Simulando mes temporalmente, requiere query aparte
          todayAppointments: todayAppts.length,
          totalClients: uniqueClients
        });
      }

      // 4. Obtener Horario configurado
      const { data: scheduleData } = await supabase
        .from('barber_schedules')
        .select('*')
        .eq('barber_id', user.id);
        
      if (scheduleData && scheduleData.length > 0) {
        setSchedules(scheduleData);
      }

    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setIsAppLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadDashboardData();

    // ============================================================================
    // SINCRONIZACIÓN EN TIEMPO REAL
    // ============================================================================
    let channel: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase.channel('custom-all-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'appointments', filter: `barber_id=eq.${user.id}` },
          (payload) => {
            console.log('Cambio detectado en citas!', payload);
            loadDashboardData(); // Recarga la data cuando alguien agenda o cancela
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadDashboardData, supabase]);

  // ============================================================================
  // ACCIONES CON SUPABASE
  // ============================================================================
  const handleUpdateStatus = async (id: string, newStatus: AppointmentStatus) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);
      
    if (!error) {
      setAppointments(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("¿Estás seguro de cancelar y eliminar esta reserva permanentemente?")) return;
    setIsLoading(true);
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (!error) {
      setAppointments(prev => prev.filter(app => app.id !== id));
    }
    setIsLoading(false);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;
    
    setIsLoading(true);
    const form = e.target as HTMLFormElement;
    const newDate = (form.elements.namedItem('date') as HTMLInputElement).value;
    const newTime = (form.elements.namedItem('time') as HTMLInputElement).value;

    const { error } = await supabase
      .from('appointments')
      .update({ date: newDate, time: newTime })
      .eq('id', selectedAppt.id);

    if (!error) {
      loadDashboardData(); // Recargar para traer todo fresco
      setIsEditModalOpen(false);
      alert("Reserva modificada con éxito.");
    } else {
      alert("Error al modificar reserva.");
    }
    setIsLoading(false);
  };

  const copyUniqueLink = () => {
    if (!barber) return;
    // Genera el link apuntando a tu vista de clientes
    const link = `${window.location.origin}/client/book?barber=${barber.id}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // Helpers UI
  const formatMoney = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  
  const getStatusBadge = (status: AppointmentStatus) => {
    const badges = {
      PENDING: <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={12}/> Pendiente</span>,
      CONFIRMED: <span className="px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Confirmado</span>,
      COMPLETED: <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs font-bold flex items-center gap-1"><Check size={12}/> Completado</span>,
      CANCELLED: <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={12}/> Cancelado</span>,
      NO_SHOW: <span className="px-3 py-1 bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/> No Asistió</span>,
    };
    return badges[status] || badges.PENDING;
  };

  const filteredAppointments = appointments.filter(a => a.date === selectedDateFilter && a.client?.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isAppLoading) return <div className="min-h-screen flex items-center justify-center text-amber-500"><Clock className="animate-spin" size={32}/></div>;

  return (
    <div className="max-w-7xl mx-auto pb-20 pt-8 px-4 sm:px-6 lg:px-8">
      
      {/* HEADER PERSONALIZADO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase font-serif">
            Hola, <span className="text-amber-500">{barber?.name || 'Barbero'}</span>
          </h1>
          <p className="text-zinc-400 mt-2 flex items-center gap-2 font-medium">
            <CalendarDays size={16} className="text-amber-500" />
            Hoy es {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button 
            onClick={copyUniqueLink}
            className={`px-5 py-3 border rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${copySuccess ? 'bg-green-500/10 text-green-500 border-green-500' : 'bg-zinc-900 border-zinc-800 text-white hover:border-amber-500'}`}
          >
            {copySuccess ? <Check size={16} /> : <LinkIcon size={16} />}
            {copySuccess ? 'Enlace Copiado!' : 'Copiar Mi Enlace'}
          </button>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN EXTENDIDAS */}
      <div className="flex gap-3 mb-8 border-b border-zinc-800 pb-4 overflow-x-auto hide-scrollbar scroll-smooth">
        {(["RESUMEN", "RESERVAS", "CLIENTES", "FINANZAS", "HORARIO"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl font-bold text-sm tracking-widest uppercase transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === tab 
                ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(217,119,6,0.3)]" 
                : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-white border border-zinc-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENIDO DE LAS TABS */}
      <AnimatePresence mode="wait">
        
        {/* =================================================================== */}
        {/* TAB 1: RESUMEN (KPIs) */}
        {/* =================================================================== */}
        {activeTab === "RESUMEN" && (
          <motion.div key="resumen" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard icon={<DollarSign size={24} />} title="Generado Hoy" value={formatMoney(kpis.todayEarnings)} />
              <KpiCard icon={<TrendingUp size={24} />} title="Generado Mes" value={formatMoney(kpis.monthEarnings)} />
              <KpiCard icon={<Scissors size={24} />} title="Citas Hoy" value={kpis.todayAppointments} />
              <KpiCard icon={<Users size={24} />} title="Mis Clientes" value={kpis.totalClients} />
            </div>

            {/* PRÓXIMA CITA WIDGET */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none"></div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3 relative z-10">
                <Clock className="text-amber-500" /> Tu Próximo Corte
              </h3>
              
              {(() => {
                const nextAppt = appointments
                  .filter(a => a.date === TODAY_DATE && (a.status === "CONFIRMED" || a.status === "PENDING"))
                  .sort((a, b) => a.time.localeCompare(b.time))[0];

                if (nextAppt) {
                  return (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-950 border border-zinc-800 p-6 rounded-2xl relative z-10">
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="w-16 h-16 bg-amber-500 text-black rounded-2xl flex flex-col items-center justify-center font-black leading-none shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                          <span className="text-xl">{nextAppt.time.split(':')[0]}</span>
                          <span className="text-xs">{nextAppt.time.split(':')[1]}</span>
                        </div>
                        <div>
                          <h4 className="text-2xl font-bold text-white">{nextAppt.client.name}</h4>
                          <p className="text-zinc-400 font-medium">{nextAppt.service.name}</p>
                        </div>
                      </div>
                      <button onClick={() => handleUpdateStatus(nextAppt.id, "COMPLETED")} disabled={isLoading} className="w-full md:w-auto px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50">
                        Marcar Completado
                      </button>
                    </div>
                  );
                } else {
                  return <p className="text-zinc-500 font-medium relative z-10">No tienes cortes próximos para hoy.</p>;
                }
              })()}
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: GESTOR DE RESERVAS (Agenda Sincronizada) */}
        {/* =================================================================== */}
        {activeTab === "RESERVAS" && (
          <motion.div key="reservas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            
            {/* Filtro de Fechas */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {DATES.map((d, i) => (
                <button 
                  key={i}
                  onClick={() => setSelectedDateFilter(d.fullDate)}
                  className={`flex-shrink-0 w-20 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all duration-300 ${selectedDateFilter === d.fullDate ? 'bg-amber-500 text-black border-amber-400 shadow-[0_10px_20px_-10px_rgba(217,119,6,0.6)]' : 'bg-zinc-900/50 border-zinc-800 text-white hover:border-amber-500/50'}`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${selectedDateFilter === d.fullDate ? 'text-black/60' : 'text-zinc-500'}`}>{d.day}</span>
                  <span className="text-2xl font-black tracking-tighter">{d.date}</span>
                </button>
              ))}
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="text" 
                placeholder="Buscar cliente en este día..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
              />
            </div>

            {/* Línea de Tiempo Visual (Timeline) */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-8 border-b border-zinc-800 pb-4">Agenda: {DATES.find(d => d.fullDate === selectedDateFilter)?.day} {DATES.find(d => d.fullDate === selectedDateFilter)?.date}</h3>
              
              <div className="space-y-4">
                {TIMELINE_SLOTS.map(time => {
                  const appAtThisTime = filteredAppointments.find(a => a.time.startsWith(time.split(':')[0]));

                  if (appAtThisTime) {
                    // SLOT OCUPADO
                    return (
                      <div key={time} className="flex gap-4 items-stretch group">
                        <div className="w-16 flex flex-col items-center">
                          <span className="text-amber-500 font-black">{time}</span>
                          <div className="w-px h-full bg-amber-500/30 my-2 group-last:hidden"></div>
                        </div>
                        
                        <div className="flex-1 bg-zinc-950 border border-amber-500/30 rounded-2xl p-5 mb-4 shadow-[0_0_15px_rgba(217,119,6,0.05)] relative overflow-hidden">
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                             <div>
                               <div className="flex items-center gap-3 mb-1">
                                 <h4 className="text-lg font-bold text-white">{appAtThisTime.client?.name}</h4>
                                 {getStatusBadge(appAtThisTime.status)}
                               </div>
                               <p className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                 <Scissors size={14}/> {appAtThisTime.service?.name} • <span className="text-amber-500">{formatMoney(appAtThisTime.service?.price)}</span>
                               </p>
                             </div>
                             {appAtThisTime.notes && (
                               <div className="bg-amber-500/10 text-amber-500 px-3 py-2 rounded-lg text-xs font-bold italic flex items-center gap-2">
                                 <AlertCircle size={12}/> "{appAtThisTime.notes}"
                               </div>
                             )}
                           </div>

                           <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-800/50">
                             {appAtThisTime.status === "PENDING" && (
                               <>
                                 <button onClick={() => handleUpdateStatus(appAtThisTime.id, "CONFIRMED")} disabled={isLoading} className="px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all">Confirmar</button>
                                 <button onClick={() => handleUpdateStatus(appAtThisTime.id, "CANCELLED")} disabled={isLoading} className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all">Rechazar</button>
                               </>
                             )}
                             {appAtThisTime.status === "CONFIRMED" && (
                               <button onClick={() => handleUpdateStatus(appAtThisTime.id, "COMPLETED")} disabled={isLoading} className="px-5 py-2 bg-green-500 text-black hover:bg-green-400 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(34,197,94,0.3)]">Cobrar</button>
                             )}
                             
                             <div className="flex-1"></div>
                             
                             <button onClick={() => { setSelectedAppt(appAtThisTime); setIsEditModalOpen(true); }} className="p-2 text-zinc-500 hover:text-amber-500 transition-colors"><Edit3 size={16}/></button>
                             <button onClick={() => handleDelete(appAtThisTime.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                           </div>
                        </div>
                      </div>
                    );
                  } else {
                    // SLOT LIBRE
                    return (
                      <div key={time} className="flex gap-4 items-stretch group opacity-50 hover:opacity-100 transition-opacity">
                        <div className="w-16 flex flex-col items-center">
                          <span className="text-zinc-500 font-bold">{time}</span>
                          <div className="w-px h-full bg-zinc-800 my-2 group-last:hidden"></div>
                        </div>
                        
                        <div className="flex-1 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center mb-4 min-h-[80px] bg-zinc-950/30">
                           <p className="text-zinc-600 font-bold text-sm uppercase tracking-widest">Espacio Libre</p>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: CLIENTES */}
        {/* =================================================================== */}
        {activeTab === "CLIENTES" && (
          <motion.div key="clientes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from(new Set(appointments.map(a => a.client?.id))).map(clientId => {
              const client = appointments.find(a => a.client?.id === clientId)?.client;
              if(!client) return null;
              
              return (
                <div key={client.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 hover:border-amber-500/50 transition-colors">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-amber-500 font-black text-xl border border-zinc-700">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">{client.name}</h4>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <a href={`https://wa.me/${client.phone?.replace('+','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-zinc-400 hover:text-white transition-colors bg-zinc-950 p-3 rounded-xl border border-zinc-800 hover:border-amber-500">
                      <Phone size={16} className="text-green-500"/> {client.phone || 'Sin número'}
                    </a>
                    <div className="flex items-center gap-3 text-sm text-zinc-400 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <Mail size={16} className="text-amber-500"/> {client.email || 'Sin correo'}
                    </div>
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: FINANZAS & LIQUIDACIÓN */}
        {/* =================================================================== */}
        {activeTab === "FINANZAS" && (
          <motion.div key="finanzas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
                <Wallet className="absolute -bottom-4 -right-4 text-zinc-800" size={120} />
                <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2 relative z-10">Generado Total (Día)</h4>
                <p className="text-4xl font-black text-white relative z-10">{formatMoney(kpis.todayEarnings)}</p>
              </div>
              <div className="bg-amber-500 border border-amber-400 rounded-3xl p-8 relative overflow-hidden">
                <PieChart className="absolute -bottom-4 -right-4 text-amber-600/50" size={120} />
                <h4 className="text-amber-900 font-black uppercase tracking-widest text-sm mb-2 relative z-10">Tu Comisión (60%)</h4>
                <p className="text-4xl font-black text-black relative z-10">{formatMoney(kpis.todayEarnings * 0.6)}</p>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
                <DollarSign className="absolute -bottom-4 -right-4 text-zinc-800" size={120} />
                <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2 relative z-10">Citas Terminadas</h4>
                <p className="text-4xl font-black text-green-500 relative z-10">{appointments.filter(a => a.status === 'COMPLETED' && a.date === TODAY_DATE).length}</p>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8">
              <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Receipt size={20} className="text-amber-500"/> Historial de Cortes de Hoy</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50">
                    <tr>
                      <th className="px-4 py-3 rounded-l-xl">Hora</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Servicio</th>
                      <th className="px-4 py-3">Valor Total</th>
                      <th className="px-4 py-3 text-amber-500 rounded-r-xl">Tu Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.filter(a => a.status === "COMPLETED" && a.date === TODAY_DATE).map((app, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-4 font-bold text-white">{app.time}</td>
                        <td className="px-4 py-4">{app.client?.name}</td>
                        <td className="px-4 py-4">{app.service?.name}</td>
                        <td className="px-4 py-4 font-medium">{formatMoney(app.service?.price)}</td>
                        <td className="px-4 py-4 font-bold text-amber-500">{formatMoney(app.service?.price * 0.6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: HORARIO DE TRABAJO (Disponibilidad) */}
        {/* =================================================================== */}
        {activeTab === "HORARIO" && (
          <motion.div key="horario" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex items-start gap-4 mb-8">
              <AlertCircle className="text-amber-500 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-amber-500 font-bold mb-1">Configuración de Disponibilidad</h4>
                <p className="text-zinc-400 text-sm">Próximamente: Estos horarios se sincronizarán para determinar qué espacios ven los clientes disponibles en tu perfil.</p>
              </div>
            </div>
            {/* Aquí puedes mapear 'schedules' de tu BD tal como mapeabas MOCK_SCHEDULE */}
            <p className="text-zinc-500">Módulo de horarios en desarrollo dinámico...</p>
          </motion.div>
        )}

      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL DE MODIFICACIÓN DE RESERVA */}
      {/* =================================================================== */}
      <AnimatePresence>
        {isEditModalOpen && selectedAppt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-zinc-950 border border-zinc-800 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-6 font-serif">Modificar Reserva</h3>
              <form onSubmit={handleEditSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Cliente</label>
                  <input type="text" disabled value={selectedAppt.client?.name} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Fecha</label>
                    <input type="date" name="date" defaultValue={selectedAppt.date} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Hora</label>
                    <input type="time" name="time" defaultValue={selectedAppt.time} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required />
                  </div>
                </div>
                
                <div className="flex gap-4 pt-6 border-t border-zinc-800 mt-6">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 text-white font-bold text-sm bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isLoading} className="flex-1 py-4 text-black font-black uppercase tracking-widest text-xs bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
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

function KpiCard({ icon, title, value }: { icon: React.ReactNode, title: string, value: string | number }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 hover:border-amber-500/50 transition-colors">
      <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center text-amber-500 mb-4">
        {icon}
      </div>
      <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-3xl font-black text-white tracking-tighter">{value}</h4>
    </div>
  );
}