"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// IMPORTACIONES: Todos los iconos importados explícitamente
import * as LucideIcons from "lucide-react";
import { 
  CalendarDays, Clock, DollarSign, Users, TrendingUp, 
  CheckCircle2, XCircle, Edit3, Trash2, Scissors, 
  Phone, Mail, Search, AlertCircle, Check,
  Wallet, PieChart, Receipt, Link as LinkIcon, Loader2,
  LayoutDashboard, MessageCircle, Crown, UserCircle2,
  Armchair, Boxes, Music, Disc, Volume2, VolumeX, Volume1,
  UploadCloud, Package, Tag, UserPlus, Plus, X, Save,
  Image as ImageIcon, Smartphone 
} from "lucide-react";

import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

// ============================================================================
// TIPADOS (Alineados con la Base de Datos)
// ============================================================================
type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
type TabType = "RESUMEN" | "RESERVAS" | "CLIENTES" | "FINANZAS" | "HORARIO" | "SILLONES" | "STAFF" | "SERVICIOS" | "INVENTARIO" | "MUSICA" | "PROMOCIONES";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  points?: number;
}

interface Service {
  id: string;
  name: string;
  price: number;
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
  img?: string;
  role?: string;
}

interface Schedule {
  id: string;
  day_of_week: string;
  is_active: boolean;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
}

interface Chair { id: string; name: string; status: "OCCUPIED" | "FREE"; current_barber_id?: string; payment_due_date?: string; }
interface Product { id: string; name: string; subtitle: string; description: string; price: number; old_price?: number; discount_code?: string; stock: number; tag: string; image_url: string; category: string; sku: string; status: "ACTIVE" | "HIDDEN"; }

// ============================================================================
// UTILIDADES (Fechas y Moneda)
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
const TIMELINE_SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const isValidUUID = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

const DynamicIcon = ({ name, size = 24, className = "" }: { name: string, size?: number, className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Scissors;
  return <IconComponent size={size} className={className} />;
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function BarberDashboard() {
  const supabase = createClient();
  
  // Estados Globales
  const [barber, setBarber] = useState<BarberProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [kpis, setKpis] = useState({ todayEarnings: 0, monthEarnings: 0, todayAppointments: 0, totalClients: 0, stockTotal: 0 });
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Estados Admin Extras
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]); 
  const [clients, setClients] = useState<Client[]>([]); 
  const [musicUrl, setMusicUrl] = useState<string>("");

  // Estados de UI
  const [activeTab, setActiveTab] = useState<TabType>("RESUMEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(TODAY_DATE);
  
  // Modales
  const [modalType, setModalType] = useState<"SERVICE" | "BARBER" | "PROMO" | "PRODUCT" | "CLIENT" | "CHAIR" | "EDIT_APPT" | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Referencias
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);

  // ============================================================================
  // CARGA DE DATOS CENTRALIZADA
  // ============================================================================
  const loadDashboardData = useCallback(async () => {
    try {
      setIsFetching(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) return;

      const { data: profile } = await supabase.from('Barbers').select('*').eq('id', user.id).single();
      if (profile) setBarber(profile);
      else setBarber({ id: user.id, name: user.user_metadata?.full_name || "Usuario" });

      const { data: dbBarbers } = await supabase.from('Barbers').select('*').order('created_at', { ascending: false });
      if (dbBarbers) setBarbers(dbBarbers);

      const { data: apptsData } = await supabase
        .from('appointments')
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
        
        const todayAppts = typedAppts.filter(a => a.date === TODAY_DATE);
        const todayCompleted = todayAppts.filter(a => a.status === 'COMPLETED');
        const todayEarnings = todayCompleted.reduce((acc, curr) => acc + Number(curr.service?.price || 0), 0);
        const uniqueClients = new Set(typedAppts.map(a => a.client?.id)).size;

        setKpis(prev => ({
          ...prev,
          todayEarnings,
          monthEarnings: todayEarnings * 24, 
          todayAppointments: todayAppts.length,
          totalClients: uniqueClients
        }));
      }

      const { data: dbServices } = await supabase.from('Services').select('*');
      if (dbServices) setServices(dbServices);

      const { data: dbInventory } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
      if (dbInventory) {
        setInventory(dbInventory);
        setKpis(prev => ({ ...prev, stockTotal: dbInventory.reduce((acc, item) => acc + item.stock, 0) }));
      }

      const { data: dbClients } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (dbClients) {
        setClients(dbClients);
        setKpis(prev => ({ ...prev, clientesTotales: dbClients.length }));
      }

      const { data: dbChairs } = await supabase.from('chairs').select('*').order('name', { ascending: true });
      if (dbChairs) setChairs(dbChairs);

      const { data: dbSettings } = await supabase.from('settings').select('*').eq('key', 'background_music').single();
      if (dbSettings) setMusicUrl(dbSettings.value);

      const { data: schedData } = await supabase.from('barber_schedules').select('*').eq('barber_id', user.id);
      if (schedData) setSchedules(schedData);

    } catch (error) {
      console.error("Error inicializando Dashboard:", error);
    } finally {
      setIsAppLoading(false);
      setIsFetching(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadDashboardData();

    let channel: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase.channel('barber-appointments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `barber_id=eq.${user.id}` }, 
        () => {
          loadDashboardData(); 
        }).subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadDashboardData, supabase]);

  // ============================================================================
  // ACCIONES Y CRUD (Guardado)
  // ============================================================================
  const handleUpdateStatus = async (id: string, newStatus: AppointmentStatus) => {
    setIsLoading(true);
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setAppointments(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
      loadDashboardData(); 
    }
    setIsLoading(false);
  };

  const handleEditApptSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;
    
    setIsLoading(true);
    const form = e.target as HTMLFormElement;
    const newDate = (form.elements.namedItem('date') as HTMLInputElement).value;
    const newTime = (form.elements.namedItem('time') as HTMLInputElement).value;

    const { error } = await supabase.from('appointments').update({ date: newDate, time: newTime }).eq('id', selectedAppt.id);

    if (!error) {
      loadDashboardData();
      setModalType(null);
      alert("Reserva modificada con éxito.");
    } else {
      alert("Error al modificar reserva.");
    }
    setIsLoading(false);
  };

  const handleDelete = async (table: string, id: string) => {
    if(!window.confirm("¿Estás seguro de eliminar este registro permanentemente?")) return;
    setIsLoading(true);
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
      if (table === 'appointments') setAppointments(prev => prev.filter(a => a.id !== id));
      loadDashboardData();
      alert("Registro eliminado.");
    } else {
      alert(`No se pudo eliminar: ${error.message}`);
    }
    setIsLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploadingMusic(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `vibe_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('music').upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('music').getPublicUrl(fileName);
        setMusicUrl(publicUrlData.publicUrl);
        alert("¡Música subida correctamente! Recuerda darle a Guardar Configuración.");
      } catch (error: any) {
        alert(`Error subiendo música: ${error.message}`);
      } finally {
        setIsUploadingMusic(false);
      }
    }
  };

  const saveMusicSettings = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('settings').upsert({ key: 'background_music', value: musicUrl });
      if (error) throw error;
      alert("¡Configuración de música actualizada en toda la web!");
    } catch (error: any) {
      alert(`Error guardando configuración: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      let imageUrl = editingItem?.img || editingItem?.image_url || ""; 
      if (selectedImage) {
        const bucket = modalType === "BARBER" ? 'barber-profiles' : 'inventory';
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, selectedImage);
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        } else {
          console.warn("Storage Error:", uploadError.message);
        }
      }

      if (modalType === "BARBER") {
        const data = {
          name: formData.get("name") as string,
          email: formData.get("email") as string,
          phone: formData.get("phone") as string,
          role: formData.get("role") as string,
          tag: formData.get("tag") as string,
          status: (formData.get("status") || "ACTIVE") as "ACTIVE" | "INACTIVE",
          cutsToday: editingItem ? editingItem.cutsToday : 0,
          img: imageUrl
        };
        if (editingItem && isValidUUID(editingItem.id)) await supabase.from('Barbers').update(data).eq('id', editingItem.id);
        else await supabase.from('Barbers').insert([data]);
      }

      if (modalType === "SERVICE") {
         const data = {
            name: formData.get("name") as string,
            price: formData.get("price") as string,
            time: formData.get("time") as string,
            desc: formData.get("desc") as string,
            iconName: (formData.get("iconName") as string) || "Scissors"
         };
         if (editingItem && isValidUUID(editingItem.id)) await supabase.from('Services').update(data).eq('id', editingItem.id);
         else await supabase.from('Services').insert([data]);
      }

      if (modalType === "PRODUCT") {
        const data = {
          name: formData.get("name"),
          subtitle: formData.get("subtitle"),
          description: formData.get("description"),
          price: parseFloat(formData.get("price") as string),
          old_price: formData.get("old_price") ? parseFloat(formData.get("old_price") as string) : null,
          discount_code: formData.get("discount_code"),
          stock: parseInt(formData.get("stock") as string) || 0,
          tag: formData.get("tag"),
          sku: formData.get("sku"),
          category: formData.get("category") || "Tienda",
          image_url: imageUrl,
          status: formData.get("status") || "ACTIVE"
        };
        if (editingItem && isValidUUID(editingItem.id)) await supabase.from('inventory').update(data).eq('id', editingItem.id);
        else await supabase.from('inventory').insert([data]);
      }

      if (modalType === "CLIENT") {
        const data = {
          name: formData.get("name"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          points: parseInt(formData.get("points") as string) || 0,
        };
        if (editingItem && isValidUUID(editingItem.id)) await supabase.from('clients').update(data).eq('id', editingItem.id);
        else await supabase.from('clients').insert([data]);
      }

      if (modalType === "CHAIR") {
        const data = {
          name: formData.get("name"),
          status: formData.get("status"),
          current_barber_id: formData.get("barber_id") || null,
          payment_due_date: formData.get("payment_due_date") || null,
        };
        if (editingItem && isValidUUID(editingItem.id)) await supabase.from('chairs').update(data).eq('id', editingItem.id);
        else await supabase.from('chairs').insert([data]);
      }

      setModalType(null);
      loadDashboardData(); // <-- FIX APLICADO AQUÍ (antes decía fetchData())
      alert("¡Base de datos actualizada con éxito!");
      
    } catch (error: any) {
      console.error("Error guardando:", error);
      alert(`Error al procesar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); alert("Horarios actualizados."); }, 1000);
  };

  const openModal = (type: any, item: any = null) => {
    setEditingItem(item);
    setImagePreview(item?.img || item?.image_url || null);
    setSelectedImage(null);
    setModalType(type);
    if(type === "EDIT_APPT") setSelectedAppt(item);
  };

  const copyUniqueLink = () => {
    if (!barber) return;
    const link = `${window.location.origin}/reservar?barber=${barber.id}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // ============================================================================
  // RENDERIZADO DE BADGES Y UI
  // ============================================================================
  const getStatusBadge = (status: AppointmentStatus) => {
    const badges = {
      PENDING: <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Clock size={12}/> Pendiente</span>,
      CONFIRMED: <span className="px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Confirmado</span>,
      COMPLETED: <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Check size={12}/> Terminado</span>,
      CANCELLED: <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><XCircle size={12}/> Cancelado</span>,
      NO_SHOW: <span className="px-3 py-1 bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><AlertCircle size={12}/> Falta</span>,
    };
    return badges[status] || badges.PENDING;
  };

  const filteredAppointments = appointments.filter(a => a.date === selectedDateFilter && (a.client?.name || "").toLowerCase().includes(searchQuery.toLowerCase()));

  // Pantalla de Carga Inicial
  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-amber-500 gap-4">
        <Loader2 className="animate-spin" size={40} />
        <p className="font-black uppercase tracking-widest text-xs">Conectando a Supabase...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto pb-20 pt-8 px-6 md:px-10">
      
      {/* HEADER PERSONALIZADO DEL BARBERO */}
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
        
        <button 
          onClick={copyUniqueLink}
          className={`px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl ${copySuccess ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-zinc-900 border border-zinc-800 text-white hover:border-amber-500'}`}
        >
          {copySuccess ? <Check size={16} /> : <LinkIcon size={16} />}
          {copySuccess ? '¡Enlace Copiado!' : 'Mi Link de Reservas'}
        </button>
      </div>

      {/* NAVEGACIÓN SUPERIOR (MÚLTIPLES PESTAÑAS) */}
      <div className="flex gap-2 mb-8 border-b border-zinc-800 pb-4 overflow-x-auto hide-scrollbar scroll-smooth">
        {(["RESUMEN", "RESERVAS", "CLIENTES", "FINANZAS", "HORARIO", "SILLONES", "STAFF", "SERVICIOS", "INVENTARIO", "MUSICA"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3.5 rounded-xl font-black text-[11px] tracking-[0.2em] uppercase transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-2 ${
              activeTab === tab 
                ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(217,119,6,0.3)]" 
                : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800/50"
            }`}
          >
            {tab === "RESUMEN" && <LayoutDashboard size={18}/>}
            {tab === "RESERVAS" && <CalendarDays size={18}/>}
            {tab === "CLIENTES" && <Users size={18}/>}
            {tab === "FINANZAS" && <Wallet size={18}/>}
            {tab === "HORARIO" && <Clock size={18}/>}
            {tab === "SILLONES" && <Armchair size={18}/>}
            {tab === "STAFF" && <Crown size={18}/>}
            {tab === "SERVICIOS" && <Scissors size={18}/>}
            {tab === "INVENTARIO" && <Boxes size={18}/>}
            {tab === "MUSICA" && <Music size={18}/>}
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENIDO PRINCIPAL DINÁMICO */}
      <AnimatePresence mode="wait">
        
        {/* =================================================================== */}
        {/* TAB 1: RESUMEN / PRÓXIMA CITA */}
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
                const now = new Date().toTimeString().split(' ')[0].substring(0,5);
                const nextAppt = appointments
                  .filter(a => a.date === TODAY_DATE && (a.status === "CONFIRMED" || a.status === "PENDING") && a.time >= now)
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
                  return <p className="text-amber-500/80 font-medium relative z-10 text-lg">No tienes cortes programados a continuación. ¡A descansar o a captar clientes!</p>;
                }
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard icon={<DollarSign size={24} />} title="Generado Hoy" value={formatMoney(kpis.todayEarnings)} statusColor="text-green-500" />
              <KpiCard icon={<TrendingUp size={24} />} title="Estimado Mes" value={formatMoney(kpis.monthEarnings)} />
              <KpiCard icon={<Scissors size={24} />} title="Citas Hoy" value={kpis.todayAppointments} statusColor="text-amber-500" />
              <KpiCard icon={<Users size={24} />} title="Clientes Únicos" value={kpis.totalClients} />
            </div>
          </motion.div>
        )}

        {/* --- TAB 2: RESERVAS --- */}
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
              <h3 className="text-2xl font-black text-white mb-10 border-b border-zinc-800 pb-6 uppercase tracking-tighter">Agenda de Citas</h3>
              
              <div className="space-y-2">
                {TIMELINE_SLOTS.map(time => {
                  const appAtThisTime = filteredAppointments.find(a => a.time.startsWith(time.split(':')[0]));

                  if (appAtThisTime) {
                    return (
                      <div key={time} className="flex gap-6 items-stretch group">
                        <div className="w-16 flex flex-col items-center">
                          <span className="text-amber-500 font-black text-lg">{time}</span>
                          <div className="w-0.5 h-full bg-amber-500/20 my-2 group-last:hidden"></div>
                        </div>
                        
                        <div className="flex-1 bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 rounded-3xl p-6 mb-6 shadow-lg transition-colors relative overflow-hidden">
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                             <div>
                               <div className="flex items-center gap-3 mb-2">
                                 <h4 className="text-xl font-black text-white uppercase">{appAtThisTime.client?.name}</h4>
                                 {getStatusBadge(appAtThisTime.status)}
                               </div>
                               <p className="text-sm font-bold text-zinc-400 flex items-center gap-2">
                                 <Scissors size={14} className="text-amber-500"/> {appAtThisTime.service?.name} • <span className="text-white">{formatMoney(appAtThisTime.service?.price as number)}</span>
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
                               <button onClick={() => handleUpdateStatus(appAtThisTime.id, "COMPLETED")} disabled={isLoading} className="px-8 py-3 bg-green-500 text-black hover:bg-green-400 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_5px_15px_rgba(34,197,94,0.2)]">Completar</button>
                             )}
                             <div className="flex-1"></div>
                             <button onClick={() => openModal("EDIT_APPT", appAtThisTime)} className="p-3 text-zinc-500 hover:text-white bg-zinc-900 rounded-xl transition-colors"><Edit3 size={16}/></button>
                             <button onClick={() => handleDelete('appointments', appAtThisTime.id)} className="p-3 text-zinc-500 hover:text-red-500 bg-zinc-900 rounded-xl transition-colors"><Trash2 size={16}/></button>
                           </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={time} className="flex gap-6 items-stretch group opacity-40 hover:opacity-100 transition-opacity">
                        <div className="w-16 flex flex-col items-center">
                          <span className="text-zinc-600 font-bold">{time}</span>
                          <div className="w-px h-full bg-zinc-800 my-2 group-last:hidden"></div>
                        </div>
                        <div className="flex-1 border-2 border-dashed border-zinc-800 rounded-3xl flex items-center justify-center mb-6 min-h-[100px] bg-zinc-950/30">
                           <p className="text-zinc-600 font-black text-xs uppercase tracking-widest">Espacio Libre</p>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* --- TAB: FINANZAS --- */}
        {activeTab === "FINANZAS" && (
          <motion.div key="finanzas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
                <Wallet className="absolute -bottom-4 -right-4 text-zinc-800" size={140} />
                <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2 relative z-10">Producción Hoy</h4>
                <p className="text-5xl font-black text-white relative z-10">{formatMoney(kpis.todayEarnings)}</p>
              </div>
              <div className="bg-amber-500 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-[0_20px_50px_rgba(217,119,6,0.3)]">
                <PieChart className="absolute -bottom-4 -right-4 text-amber-600/50" size={140} />
                <h4 className="text-amber-900 font-black uppercase tracking-widest text-sm mb-2 relative z-10">Comisión (60%)</h4>
                <p className="text-5xl font-black text-black relative z-10">{formatMoney(kpis.todayEarnings * 0.6)}</p>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
                <CheckCircle2 className="absolute -bottom-4 -right-4 text-zinc-800" size={140} />
                <h4 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-2 relative z-10">Cortes Terminados</h4>
                <p className="text-5xl font-black text-green-500 relative z-10">{appointments.filter(a => a.status === 'COMPLETED' && a.date === TODAY_DATE).length}</p>
              </div>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden p-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 border-b border-zinc-800 pb-6 flex items-center gap-3">
                <Receipt className="text-amber-500"/> Detalle de Hoy
              </h3>
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] bg-zinc-950/50 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-5">Hora</th>
                    <th className="px-6 py-5">Cliente</th>
                    <th className="px-6 py-5">Servicio</th>
                    <th className="px-6 py-5 text-amber-500 text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {appointments.filter(a => a.status === "COMPLETED" && a.date === TODAY_DATE).map((app, i) => (
                    <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-5 font-bold text-white text-base">{app.time}</td>
                      <td className="px-6 py-5 uppercase font-bold text-zinc-300">{app.client?.name}</td>
                      <td className="px-6 py-5">{app.service?.name}</td>
                      <td className="px-6 py-5 font-black text-amber-500 text-right text-lg">{formatMoney(Number(app.service?.price) * 0.6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TABS DE ADMINISTRADOR (Sillones, Clientes, Inventario, Música, Staff) */}
        {/* =================================================================== */}

        {activeTab === "SILLONES" && (
          <motion.div key="sillones" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Administración de Sillones</h2>
                <p className="text-zinc-500 text-sm">Gestiona la ocupación y las fechas de arriendo de los 10 sillones.</p>
              </div>
              <button onClick={() => openModal("CHAIR", null)} className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all">
                <Plus size={16} /> Agregar Sillón
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {chairs.map(chair => {
                const assignedBarber = barbers.find(b => b.id === chair.current_barber_id);
                return (
                  <div key={chair.id} className={`p-8 rounded-[2rem] border relative overflow-hidden transition-all duration-500 group ${chair.status === 'OCCUPIED' ? 'bg-zinc-900/80 border-amber-500/40 shadow-[0_0_30px_rgba(217,119,6,0.1)]' : 'bg-zinc-950 border-zinc-800'}`}>
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal("CHAIR", chair)} className="p-2 bg-black text-zinc-400 hover:text-amber-500 rounded-lg"><Edit3 size={14}/></button>
                    </div>

                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${chair.status === 'OCCUPIED' ? 'bg-amber-500 text-black shadow-lg' : 'bg-zinc-900 text-zinc-600'}`}>
                        <Armchair size={28} />
                      </div>
                      <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${chair.status === 'OCCUPIED' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-zinc-800 text-zinc-500'}`}>
                        {chair.status === 'OCCUPIED' ? 'Arrendado' : 'Disponible'}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-black text-white mb-4 tracking-tight">{chair.name}</h3>
                    
                    {chair.status === 'OCCUPIED' ? (
                      <div className="space-y-4">
                        <div className="bg-black/50 border border-zinc-800/50 p-4 rounded-xl">
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><UserCircle2 size={12}/> Barbero a cargo</p>
                          <p className="text-white font-bold text-sm truncate">{assignedBarber ? assignedBarber.name : "Sin asignar"}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-zinc-600 text-sm font-medium">Estación libre para arrendar.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === "CLIENTES" && (
          <motion.div key="clientes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Base de Datos de Clientes</h2>
                <p className="text-zinc-500 text-sm">Gestiona la fidelidad, puntos y envía recordatorios por WhatsApp.</p>
              </div>
              <button onClick={() => openModal("CLIENT", null)} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                <UserPlus size={16} /> Nuevo Cliente
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input type="text" placeholder="Buscar cliente por nombre o celular..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-amber-500 outline-none transition-all shadow-inner" />
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-[0.2em] border-b border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-8 py-6">Cliente</th>
                    <th className="px-6 py-6">Contacto</th>
                    <th className="px-6 py-6 text-center">Puntos</th>
                    <th className="px-6 py-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)).map(c => (
                    <tr key={c.id} className="hover:bg-zinc-800/20 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="font-black text-white text-base">{c.name}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-mono text-xs text-white flex items-center gap-2"><Smartphone size={14} className="text-zinc-500"/> {c.phone}</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm">
                          {c.points || 0} PTS
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}?text=Hola%20${c.name},%20te%20escribimos%20de%20Emperador%20Barbershop%20para%20recordarte%20tu%20corte.`} target="_blank" rel="noopener noreferrer" className="p-2 text-green-500 hover:bg-green-500 hover:text-black rounded-lg transition-colors">
                            <MessageCircle size={18} />
                          </a>
                          <button onClick={() => openModal("CLIENT", c)} className="p-2 text-zinc-500 hover:text-white transition-colors"><Edit3 size={18}/></button>
                          <button onClick={() => handleDelete('clients', c.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === "STAFF" && (
          <motion.div key="staff" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
              <div><h2 className="text-2xl font-bold text-white mb-1">Usuarios y Barberos</h2></div>
              <button onClick={() => openModal("BARBER", null)} className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-xl"><UserPlus size={16} /> Añadir Barbero</button>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-[0.2em] border-b border-zinc-800">
                  <tr><th className="px-8 py-6">Perfil</th><th className="px-6 py-6">Rol</th><th className="px-6 py-6">Estado</th><th className="px-8 py-6 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {barbers.map(b => (
                    <tr key={b.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-8 py-5 flex items-center gap-4">
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700">
                           {b.img ? <Image src={b.img} alt={b.name} fill className="object-cover" unoptimized /> : <UserCircle2 className="w-full h-full p-2 text-zinc-500" />}
                        </div>
                        <span className="font-bold text-white text-base">{b.name}</span>
                      </td>
                      <td className="px-6 py-5"><p className="text-white font-bold">{b.role}</p></td>
                      <td className="px-6 py-5"><span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-500">Visible</span></td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => openModal("BARBER", b)} className="p-2 text-zinc-500 hover:text-white transition-colors"><Edit3 size={18} /></button>
                        <button onClick={() => handleDelete('Barbers', b.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === "SERVICIOS" && (
          <motion.div key="servicios" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Menú de Servicios</h2>
              <button onClick={() => openModal("SERVICE", null)} className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white font-black text-xs uppercase tracking-widest rounded-xl"><Plus size={16} /> Nuevo</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {services.map(s => (
                <div key={s.id} className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 relative group">
                  <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal("SERVICE", s)} className="p-2 bg-black text-zinc-400 hover:text-amber-500 rounded-lg"><Edit3 size={16}/></button>
                    <button onClick={() => handleDelete('Services', s.id)} className="p-2 bg-black text-zinc-400 hover:text-red-500 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                  <h3 className="text-xl font-black text-white pr-16 mb-3 uppercase">{s.name}</h3>
                  <span className="text-3xl font-black text-amber-500 tracking-tighter">{typeof s.price === 'number' ? formatMoney(s.price) : s.price}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "INVENTARIO" && (
          <motion.div key="inventario" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Inventario Emperador Store</h2>
              <button onClick={() => openModal("PRODUCT", null)} className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-xl"><Plus size={16} /> Añadir Producto</button>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-[0.2em] border-b border-zinc-800">
                  <tr><th className="px-8 py-6">Producto</th><th className="px-6 py-6">SKU</th><th className="px-6 py-6">Precio</th><th className="px-6 py-6 text-center">Stock</th><th className="px-8 py-6 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {inventory.map(p => (
                    <tr key={p.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-8 py-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-zinc-800 relative overflow-hidden border border-zinc-700">
                          {p.image_url ? <Image src={p.image_url} alt={p.name} fill className="object-cover" unoptimized /> : <Package className="w-full h-full p-3 text-zinc-600"/>}
                        </div>
                        <p className="font-bold text-white text-base">{p.name}</p>
                      </td>
                      <td className="px-6 py-5 font-mono text-xs">{p.sku}</td>
                      <td className="px-6 py-5 font-black text-amber-500 text-lg">{formatMoney(p.price)}</td>
                      <td className="px-6 py-5 text-center"><span className="px-3 py-1 rounded-lg font-black text-xs bg-zinc-800 text-white">{p.stock}</span></td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => openModal("PRODUCT", p)} className="p-2 text-zinc-500 hover:text-white transition-colors"><Edit3 size={18}/></button>
                        <button onClick={() => handleDelete('inventory', p.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === "MUSICA" && (
          <motion.div key="musica" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <h2 className="text-2xl font-bold text-white mb-6">Reproductor de Música Global</h2>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-10 max-w-4xl shadow-xl">
               <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Enlace del Audio MP3 o WAV</label>
               <div className="flex flex-col md:flex-row gap-4 mb-8">
                 <input type="text" value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none" />
                 <button onClick={() => musicInputRef.current?.click()} className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase flex gap-3"><UploadCloud size={18} /> Subir MP3</button>
                 <input type="file" accept="audio/*" className="hidden" ref={musicInputRef} onChange={handleMusicUpload} />
               </div>
               <button onClick={saveMusicSettings} disabled={isLoading || isUploadingMusic} className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl flex justify-center items-center gap-3">
                 {isLoading ? "Guardando..." : <><Save size={18}/> Guardar y Transmitir a la Web</>}
               </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL MAESTRO REUTILIZABLE (CREACIÓN / EDICIÓN) */}
      {/* =================================================================== */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalType(null)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#0a0a0a] border border-zinc-800 rounded-[3rem] p-8 md:p-12 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setModalType(null)} className="absolute top-8 right-8 text-zinc-500 hover:text-white bg-zinc-900 p-2 rounded-full transition-colors"><X size={20}/></button>
              
              <div className="mb-8">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                  {modalType === "BARBER" && (editingItem ? "Editar Perfil Staff" : "Nuevo Usuario / Barbero")}
                  {modalType === "CHAIR" && (editingItem ? "Configurar Sillón" : "Nuevo Sillón")}
                  {modalType === "CLIENT" && (editingItem ? "Ficha de Cliente" : "Registrar Cliente")}
                  {modalType === "PRODUCT" && (editingItem ? "Editar Producto" : "Cargar Inventario")}
                  {modalType === "SERVICE" && "Configurar Servicio"}
                  {modalType === "EDIT_APPT" && "Modificar Reserva"}
                </h3>
              </div>
              
              <form onSubmit={modalType === 'EDIT_APPT' ? handleEditApptSave : handleSaveAction} className="space-y-6">
                
                {/* --- SUBIDA DE FOTO --- */}
                {(modalType === "BARBER" || modalType === "PRODUCT") && (
                  <div className="flex justify-center mb-8">
                    <div 
                      className={`relative rounded-[2.5rem] border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-amber-500 transition-colors group ${modalType === 'PRODUCT' ? 'w-full h-48' : 'w-36 h-36'}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? (
                        <Image src={imagePreview} alt="Preview" fill className={modalType === 'PRODUCT' ? 'object-contain p-4' : 'object-cover'} unoptimized />
                      ) : editingItem?.img || editingItem?.image_url ? (
                        <Image src={editingItem.img || editingItem.image_url} alt="Current" fill className="object-cover grayscale group-hover:grayscale-0 transition-all" unoptimized />
                      ) : (
                        <>
                          <ImageIcon className="text-zinc-600 mb-3" size={32} />
                          <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest text-center px-2 group-hover:text-amber-500">Subir Fotografía</span>
                        </>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <UploadCloud className="text-white" size={32} />
                      </div>
                    </div>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                  </div>
                )}

                {/* --- FORMULARIO: MODIFICAR CITA --- */}
                {modalType === "EDIT_APPT" && selectedAppt && (
                  <>
                    <InputField label="Cliente" name="client" defaultValue={selectedAppt.client?.name} disabled />
                    <div className="grid grid-cols-2 gap-5">
                      <InputField label="Fecha" name="date" type="date" defaultValue={selectedAppt.date} required />
                      <InputField label="Hora" name="time" type="time" defaultValue={selectedAppt.time} required />
                    </div>
                  </>
                )}

                {/* --- FORMULARIO: USUARIO/BARBERO --- */}
                {modalType === "BARBER" && (
                  <>
                    <InputField label="Nombre Completo" name="name" defaultValue={editingItem?.name} required placeholder="Ej: Jack Guerra" />
                    <div className="grid grid-cols-2 gap-5">
                      <InputField label="Especialidad (Rol)" name="role" defaultValue={editingItem?.role} required placeholder="Ej: Fade Specialist" />
                      <InputField label="Etiqueta Visual" name="tag" defaultValue={editingItem?.tag} required placeholder="Ej: Rey del Fade" />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <InputField label="Email (Acceso)" name="email" type="email" defaultValue={editingItem?.email} placeholder="jack@emperador.cl" />
                      <InputField label="Teléfono" name="phone" defaultValue={editingItem?.phone} placeholder="+56 9..." />
                    </div>
                  </>
                )}

                {/* --- FORMULARIO: SILLÓN --- */}
                {modalType === "CHAIR" && (
                  <>
                    <InputField label="Identificador del Sillón" name="name" defaultValue={editingItem?.name} required placeholder="Ej: Sillón Imperial 1" />
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">Estado Actual</label>
                        <select name="status" defaultValue={editingItem?.status || "FREE"} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none appearance-none font-bold">
                          <option value="FREE">Libre</option>
                          <option value="OCCUPIED">Arrendado / Ocupado</option>
                        </select>
                      </div>
                      <div>
                         <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">Asignar Barbero</label>
                         <select name="barber_id" defaultValue={editingItem?.current_barber_id || ""} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none appearance-none">
                           <option value="">Ninguno</option>
                           {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                         </select>
                      </div>
                    </div>
                    <InputField label="Fecha Cobro Arriendo" name="payment_due_date" type="date" defaultValue={editingItem?.payment_due_date} />
                  </>
                )}

                {/* --- FORMULARIO: CLIENTE --- */}
                {modalType === "CLIENT" && (
                  <>
                    <InputField label="Nombre del Cliente" name="name" defaultValue={editingItem?.name} required placeholder="Ej: Andrés Muñoz" />
                    <div className="grid grid-cols-2 gap-5">
                      <InputField label="WhatsApp / Celular" name="phone" defaultValue={editingItem?.phone} required placeholder="+569..." />
                      <InputField label="Puntos Acumulados" name="points" type="number" defaultValue={editingItem?.points || 0} required />
                    </div>
                    <InputField label="Correo Electrónico (Opcional)" name="email" type="email" defaultValue={editingItem?.email} />
                  </>
                )}

                {/* --- FORMULARIO: PRODUCTO --- */}
                {modalType === "PRODUCT" && (
                  <>
                    <div className="grid grid-cols-2 gap-5">
                      <InputField label="Nombre" name="name" defaultValue={editingItem?.name} required placeholder="Wahl Magic Clip" />
                      <InputField label="Categoría" name="category" defaultValue={editingItem?.category} required placeholder="Máquinas" />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <InputField label="Precio Venta" name="price" type="number" defaultValue={editingItem?.price} required />
                      <InputField label="Precio Anterior (Tachado)" name="old_price" type="number" defaultValue={editingItem?.old_price} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <InputField label="SKU" name="sku" defaultValue={editingItem?.sku} />
                      <InputField label="Stock" name="stock" type="number" defaultValue={editingItem?.stock} required />
                      <InputField label="Badge Visual" name="tag" defaultValue={editingItem?.tag} placeholder="OFERTA" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">Descripción Larga</label>
                      <textarea name="description" defaultValue={editingItem?.description} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none resize-none" rows={3} required></textarea>
                    </div>
                  </>
                )}

                {/* --- FORMULARIO: SERVICIO --- */}
                {modalType === "SERVICE" && (
                  <>
                    <InputField label="Título" name="name" defaultValue={editingItem?.name} required placeholder="Corte + Cejas" />
                    <div className="grid grid-cols-2 gap-5">
                      <InputField label="Precio a Mostrar" name="price" defaultValue={editingItem?.price} required placeholder="$14.000" />
                      <InputField label="Duración Estimada" name="time" defaultValue={editingItem?.time} required placeholder="45 min" />
                    </div>
                    <InputField label="Icono Base de Datos" name="iconName" defaultValue={editingItem?.iconName} required placeholder="Scissors" />
                  </>
                )}

                <div className="pt-8 border-t border-zinc-800 mt-8">
                  <button type="submit" disabled={isLoading} className="w-full py-5 text-black font-black uppercase tracking-[0.2em] text-sm bg-amber-500 hover:bg-amber-400 rounded-2xl transition-all shadow-[0_10px_30px_rgba(217,119,6,0.3)] active:scale-95 flex justify-center items-center gap-3">
                    {isLoading ? <Loader2 className="animate-spin" /> : <><Save size={20}/> Guardar Cambios</>}
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
// COMPONENTES UI REUTILIZABLES
// ============================================================================
function InputField({ label, name, type = "text", defaultValue, required = false, placeholder = "", disabled = false }: any) {
  return (
    <div>
      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">{label}</label>
      <input 
        name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder} disabled={disabled}
        className={`w-full border rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all placeholder:text-zinc-700 ${disabled ? 'bg-zinc-950/50 border-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-zinc-950 border-zinc-800'}`} 
      />
    </div>
  );
}

function KpiCard({ icon, title, value, trend, statusColor = "text-amber-500" }: { icon: React.ReactNode, title: string, value: string | number, trend?: string, statusColor?: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 hover:border-amber-500/50 transition-colors group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
      <div className={`w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform ${statusColor}`}>
        {icon}
      </div>
      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <h4 className={`text-4xl font-black tracking-tighter ${statusColor === 'text-amber-500' ? 'text-white' : statusColor}`}>{value}</h4>
      {trend && (
        <div className="mt-4 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg">
          <TrendingUp size={14} className="text-green-500" />
          <span className="text-green-500 text-[10px] font-black uppercase">{trend}</span>
        </div>
      )}
    </div>
  );
}