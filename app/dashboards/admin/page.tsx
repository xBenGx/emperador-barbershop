"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Users, Scissors, Tag, 
  DollarSign, TrendingUp, UserPlus, Edit3, Trash2, 
  Search, Plus, CheckCircle2, Clock, X, Save, AlertCircle,
  Armchair, Crown, Percent, UserCircle2, Upload, ImageIcon
} from "lucide-react";
import Image from "next/image";

// Importamos el cliente de Supabase
import { createClient } from "@/utils/supabase/client";

// ============================================================================
// TIPADOS
// ============================================================================
type TabType = "RESUMEN" | "SILLONES" | "STAFF" | "SERVICIOS" | "CLIENTES" | "PROMOCIONES";

interface Barber { id: string; name: string; email: string; phone: string; status: "ACTIVE" | "INACTIVE"; cutsToday: number; role: string; tag: string; img: string; }
interface Service { id: string; name: string; desc: string; price: number; duration: number; }
interface Client { id: string; name: string; phone: string; visits: number; lastVisit: string; totalSpent: number; }
interface Promotion { id: string; title: string; discount: string; status: "ACTIVE" | "EXPIRED"; expiresAt: string; }
interface Chair { id: string; name: string; status: "OCCUPIED" | "FREE"; barber?: string; client?: string; timeRemaining?: string; }

// ============================================================================
// MOCK DATA (Fallbacks si la DB falla o está vacía)
// ============================================================================
const MOCK_BARBERS: Barber[] = [
  { id: "b1", name: "Cesar Luna", email: "cesar@emperador.cl", phone: "+56912345678", status: "ACTIVE", cutsToday: 5, role: "Master Barber", tag: "El Arquitecto", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop" },
  { id: "b2", name: "Jack Guerra", email: "jack@emperador.cl", phone: "+56987654321", status: "ACTIVE", cutsToday: 4, role: "Fade Specialist", tag: "Rey del Fade", img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop" },
];

const MOCK_SERVICES: Service[] = [
  { id: "s1", name: "Corte Clásico / Degradado", desc: "El corte que define tu estilo. Clean, fresh.", price: 12000, duration: 60 },
  { id: "s2", name: "Corte + Perfilado de Cejas", desc: "Sube de nivel tu mirada.", price: 14000, duration: 60 },
];

const MOCK_CHAIRS: Chair[] = [
  { id: "ch1", name: "Sillón 1 (Master)", status: "OCCUPIED", barber: "Cesar Luna", client: "Matías Rojas", timeRemaining: "15 min" },
  { id: "ch2", name: "Sillón 2", status: "FREE" },
];

const MOCK_CLIENTS: Client[] = [
  { id: "c1", name: "Matías Rojas", phone: "+56912345678", visits: 12, lastVisit: "Hoy", totalSpent: 154000 },
];

const MOCK_PROMOS: Promotion[] = [
  { id: "p1", title: "Promo Lunes: Corte + Barba", discount: "20% OFF", status: "ACTIVE", expiresAt: "2026-06-30" },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function AdminDashboard() {
  const supabase = createClient();
  
  const [activeTab, setActiveTab] = useState<TabType>("RESUMEN");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Estados de Datos Reales
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [chairs, setChairs] = useState<Chair[]>(MOCK_CHAIRS); // Mantengo mock por ahora para el ejemplo visual
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS); // Idem
  const [promos, setPromos] = useState<Promotion[]>(MOCK_PROMOS); // Idem

  // Estados para Modales y Formularios
  const [modalType, setModalType] = useState<"SERVICE" | "BARBER" | "PROMO" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const formatMoney = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      // 1. Fetch Barberos
      const { data: dbBarbers, error: errBarbers } = await supabase.from('Barbers').select('*');
      if (errBarbers) throw errBarbers;
      if (dbBarbers && dbBarbers.length > 0) {
        setBarbers(dbBarbers);
      } else {
        setBarbers(MOCK_BARBERS); // Fallback si está vacío
      }

      // 2. Fetch Servicios
      const { data: dbServices, error: errServices } = await supabase.from('Services').select('*');
      if (errServices) throw errServices;
      if (dbServices && dbServices.length > 0) {
        setServices(dbServices);
      } else {
        setServices(MOCK_SERVICES); // Fallback
      }

    } catch (error) {
      console.error("Error cargando datos de Supabase:", error);
      // Usar fallbacks en caso de error
      setBarbers(MOCK_BARBERS);
      setServices(MOCK_SERVICES);
    } finally {
      setIsFetching(false);
    }
  };

  // Manejo de la selección de imagen para el Barbero
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Función genérica para guardar datos
  const handleSimulateAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      if (modalType === "BARBER") {
        let imageUrl = "";

        // 1. Subir imagen a Supabase Storage si se seleccionó una
        if (selectedImage) {
          const fileExt = selectedImage.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `barbers/${fileName}`;

          const { error: uploadError, data } = await supabase.storage
            .from('barber-profiles') // ¡ASEGÚRATE DE CREAR ESTE BUCKET!
            .upload(filePath, selectedImage);

          if (uploadError) throw uploadError;

          // Obtener URL pública
          const { data: publicUrlData } = supabase.storage.from('barber-profiles').getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;
        }

        // 2. Insertar registro en la base de datos
        const newBarber = {
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          role: formData.get("role"),
          tag: formData.get("tag"),
          status: "ACTIVE",
          cutsToday: 0,
          img: imageUrl || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop" // Fallback genérico
        };

        const { error: dbError } = await supabase.from('Barbers').insert([newBarber]);
        if (dbError) throw dbError;
        
        alert("Barbero guardado correctamente.");
        fetchData(); // Recargar datos
      }

      // Lógica similar para Servicios y Promos...
      if (modalType === "SERVICE") {
         const newService = {
            name: formData.get("name"),
            price: Number(formData.get("price")),
            duration: Number(formData.get("duration")),
            desc: formData.get("desc")
         };
         const { error } = await supabase.from('Services').insert([newService]);
         if(error) throw error;
         alert("Servicio guardado.");
         fetchData();
      }

      setModalType(null);
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error: any) {
      console.error("Error en la operación:", error);
      alert(`Error: ${error.message || 'Ocurrió un problema al guardar.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-20 p-6 md:p-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase font-serif flex items-center gap-4">
            <Crown className="text-amber-500 w-10 h-10 md:w-12 md:h-12" />
            <span>Panel <span className="text-amber-500">Admin</span></span>
          </h1>
          <p className="text-zinc-400 mt-2 font-medium">Control total de Emperador Barbershop (BAYX)</p>
        </div>
        {isFetching && <span className="text-amber-500 text-sm font-bold animate-pulse">Sincronizando con Supabase...</span>}
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex gap-2 mb-8 border-b border-zinc-800 pb-4 overflow-x-auto hide-scrollbar scroll-smooth">
        {(["RESUMEN", "SILLONES", "STAFF", "SERVICIOS", "CLIENTES", "PROMOCIONES"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 rounded-xl font-bold text-[11px] tracking-widest uppercase transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-2 ${
              activeTab === tab 
                ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(217,119,6,0.3)]" 
                : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-white border border-zinc-800"
            }`}
          >
            {tab === "RESUMEN" && <LayoutDashboard size={16}/>}
            {tab === "SILLONES" && <Armchair size={16}/>}
            {tab === "STAFF" && <Users size={16}/>}
            {tab === "SERVICIOS" && <Scissors size={16}/>}
            {tab === "CLIENTES" && <Search size={16}/>}
            {tab === "PROMOCIONES" && <Tag size={16}/>}
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENEDOR DE PESTAÑAS */}
      <AnimatePresence mode="wait">
        
        {/* =================================================================== */}
        {/* TAB 1: RESUMEN (KPIs Generales) */}
        {/* =================================================================== */}
        {activeTab === "RESUMEN" && (
          <motion.div key="resumen" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard icon={<DollarSign />} title="Ingresos Totales (Hoy)" value={formatMoney(245000)} trend="+8% vs ayer" />
              <KpiCard icon={<Scissors />} title="Cortes Realizados (Hoy)" value={15} />
              <KpiCard icon={<Armchair />} title="Sillones Ocupados" value="2 / 4" statusColor="text-green-500" />
              <KpiCard icon={<Users />} title="Nuevos Clientes (Mes)" value={42} trend="+12% vs mes pasado" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Barberos */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold text-white mb-6 border-b border-zinc-800 pb-4">Top Barberos (Hoy)</h3>
                <div className="space-y-4">
                  {[...barbers].sort((a,b) => b.cutsToday - a.cutsToday).slice(0,3).map((b, i) => (
                    <div key={b.id} className="flex justify-between items-center bg-zinc-950 p-4 rounded-2xl border border-zinc-800/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center font-black">
                          #{i+1}
                        </div>
                        <span className="font-bold text-white">{b.name}</span>
                      </div>
                      <span className="text-amber-500 font-bold">{b.cutsToday} Cortes</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Servicios más vendidos */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold text-white mb-6 border-b border-zinc-800 pb-4">Servicios Populares</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-zinc-400"><span className="text-white font-bold">Corte Clásico</span> <span>45% de las reservas</span></div>
                  <div className="w-full bg-zinc-950 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full" style={{width: '45%'}}></div></div>
                  
                  <div className="flex justify-between text-sm text-zinc-400 mt-4"><span className="text-white font-bold">Barba + Vapor</span> <span>30% de las reservas</span></div>
                  <div className="w-full bg-zinc-950 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full" style={{width: '30%'}}></div></div>

                  <div className="flex justify-between text-sm text-zinc-400 mt-4"><span className="text-white font-bold">Servicio VIP</span> <span>15% de las reservas</span></div>
                  <div className="w-full bg-zinc-950 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full" style={{width: '15%'}}></div></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: SILLONES (Monitoreo en Vivo) */}
        {/* =================================================================== */}
        {activeTab === "SILLONES" && (
          <motion.div key="sillones" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Monitoreo en Tiempo Real</h2>
                <p className="text-zinc-500">Visualiza el estado de la barbería en este momento.</p>
              </div>
              <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Ocupado</span>
                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> Libre</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {chairs.map(chair => (
                <div key={chair.id} className={`p-8 rounded-[2rem] border relative overflow-hidden transition-all duration-500 ${chair.status === 'OCCUPIED' ? 'bg-zinc-900 border-red-500/30' : 'bg-zinc-950 border-green-500/30'}`}>
                  {/* Glow effect */}
                  <div className={`absolute -top-10 -right-10 w-40 h-40 blur-[60px] rounded-full pointer-events-none ${chair.status === 'OCCUPIED' ? 'bg-red-500/20' : 'bg-green-500/10'}`}></div>
                  
                  <div className="flex justify-between items-start mb-8">
                    <Armchair size={40} className={chair.status === 'OCCUPIED' ? 'text-red-500' : 'text-green-500'} />
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${chair.status === 'OCCUPIED' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                      {chair.status === 'OCCUPIED' ? 'Ocupado' : 'Disponible'}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-black text-white mb-4">{chair.name}</h3>
                  
                  {chair.status === 'OCCUPIED' ? (
                    <div className="space-y-3">
                      <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Barbero a cargo</p>
                        <p className="text-white font-bold flex items-center gap-2"><Scissors size={14} className="text-amber-500"/> {chair.barber}</p>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Cliente actual</p>
                        <p className="text-white font-bold flex items-center gap-2"><UserCircle2 size={14} className="text-amber-500"/> {chair.client}</p>
                      </div>
                      <p className="text-red-400 font-bold text-sm mt-4 flex items-center gap-2 animate-pulse"><Clock size={16} /> Faltan aprox. {chair.timeRemaining}</p>
                    </div>
                  ) : (
                    <p className="text-zinc-500 mt-4">Listo para recibir al siguiente cliente.</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: STAFF (Barberos) */}
        {/* =================================================================== */}
        {activeTab === "STAFF" && (
          <motion.div key="staff" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Equipo de Barberos</h2>
              <button onClick={() => setModalType("BARBER")} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                <UserPlus size={16} /> Añadir Barbero
              </button>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950 text-xs uppercase tracking-widest border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-5">Perfil</th>
                    <th className="px-6 py-5">Rol / Tag</th>
                    <th className="px-6 py-5">Contacto</th>
                    <th className="px-6 py-5">Estado</th>
                    <th className="px-6 py-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {barbers.map(b => (
                    <tr key={b.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800">
                            {b.img ? (
                              <Image src={b.img} alt={b.name} fill className="object-cover grayscale hover:grayscale-0 transition-all" />
                            ) : (
                               <UserCircle2 className="w-full h-full p-2 text-zinc-500" />
                            )}
                          </div>
                          <span className="font-bold text-white text-base">{b.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-bold">{b.role}</p>
                        <span className="inline-block px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] uppercase font-black rounded-md mt-1">{b.tag}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p>{b.email}</p>
                        <p className="text-xs text-zinc-500 mt-1">{b.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${b.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {b.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-zinc-500 hover:text-amber-500 transition-colors"><Edit3 size={18} /></button>
                        <button className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: SERVICIOS */}
        {/* =================================================================== */}
        {activeTab === "SERVICIOS" && (
          <motion.div key="servicios" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Menú de Servicios</h2>
              <button onClick={() => setModalType("SERVICE")} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                <Plus size={16} /> Nuevo Servicio
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {services.map(s => (
                <div key={s.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 hover:border-amber-500/50 transition-colors relative group">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-zinc-950 text-zinc-400 hover:text-amber-500 rounded-lg"><Edit3 size={16}/></button>
                    <button className="p-2 bg-zinc-950 text-zinc-400 hover:text-red-500 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                  <h3 className="text-xl font-bold text-white pr-16 mb-2">{s.name}</h3>
                  <p className="text-sm text-zinc-400 mb-6 h-10">{s.desc}</p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-zinc-800/50">
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                      <Clock size={16} className="text-amber-500"/> {s.duration} min
                    </div>
                    <span className="text-2xl font-black text-amber-500">{formatMoney(s.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: CLIENTES */}
        {/* =================================================================== */}
        {activeTab === "CLIENTES" && (
          <motion.div key="clientes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar cliente por nombre o teléfono..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-white focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950 text-xs uppercase tracking-widest border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-5">Cliente</th>
                    <th className="px-6 py-5">Teléfono</th>
                    <th className="px-6 py-5 text-center">Visitas Totales</th>
                    <th className="px-6 py-5">Última Visita</th>
                    <th className="px-6 py-5 text-right text-amber-500">Valor Histórico</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                    <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{c.name}</td>
                      <td className="px-6 py-4">{c.phone}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-zinc-800 text-white px-3 py-1 rounded-full text-xs font-bold">{c.visits}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{c.lastVisit}</td>
                      <td className="px-6 py-4 text-right font-bold text-amber-500">{formatMoney(c.totalSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: PROMOCIONES */}
        {/* =================================================================== */}
        {activeTab === "PROMOCIONES" && (
          <motion.div key="promociones" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Promociones Activas</h2>
              <button onClick={() => setModalType("PROMO")} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                <Plus size={16} /> Crear Promoción
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {promos.map(p => (
                <div key={p.id} className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group">
                  {p.status === 'EXPIRED' && <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-[2px]"><span className="border-2 border-red-500 text-red-500 font-black uppercase text-xl px-4 py-2 rotate-[-15deg] opacity-80">Expirada</span></div>}
                  
                  <div className="w-14 h-14 bg-amber-500 text-black rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(217,119,6,0.4)]">
                    <Percent size={28} className="font-black" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{p.title}</h3>
                  <p className="text-amber-500 font-black text-2xl tracking-tighter mb-4">{p.discount}</p>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest border-t border-zinc-800/50 pt-4">Válido hasta: {p.expiresAt}</p>
                  
                  <div className="absolute top-4 right-4 flex gap-2 z-20">
                    <button className="p-2 bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODALES REUTILIZABLES (CRUD) */}
      {/* =================================================================== */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalType(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-zinc-950 border border-zinc-800 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto hide-scrollbar">
              <button onClick={() => setModalType(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={24}/></button>
              
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-6 font-serif">
                {modalType === "SERVICE" && "Nuevo Servicio"}
                {modalType === "BARBER" && "Añadir Staff (Inicio)"}
                {modalType === "PROMO" && "Crear Promoción"}
              </h3>
              
              <form onSubmit={handleSimulateAction} className="space-y-5">
                
                {/* ----------------- FORMULARIO: BARBERO (Con Foto) ----------------- */}
                {modalType === "BARBER" && (
                  <>
                    <div className="flex justify-center mb-6">
                      <div 
                        className="relative w-32 h-32 rounded-3xl border-2 border-dashed border-zinc-700 bg-zinc-900 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-amber-500 transition-colors group"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {imagePreview ? (
                          <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                        ) : (
                          <>
                            <Upload className="text-zinc-500 mb-2 group-hover:text-amber-500 transition-colors" />
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center px-2 group-hover:text-amber-500">Subir Foto</span>
                          </>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Edit3 className="text-white" />
                        </div>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleImageChange}
                      />
                    </div>

                    <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nombre Completo</label><input name="name" type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required /></div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Rol (Ej: Master Barber)</label><input name="role" type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required /></div>
                      <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Etiqueta (Ej: El Arquitecto)</label><input name="tag" type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required /></div>
                    </div>

                    <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Correo Electrónico (Login)</label><input name="email" type="email" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required /></div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Teléfono</label><input name="phone" type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required /></div>
                      <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Contraseña Inicial</label><input name="password" type="password" placeholder="••••••••" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required /></div>
                    </div>
                  </>
                )}

                {/* ----------------- FORMULARIO: SERVICIO ----------------- */}
                {modalType === "SERVICE" && (
                  <>
                    <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nombre del Servicio</label><input name="name" type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Precio ($)</label><input name="price" type="number" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required /></div>
                      <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Duración (Min)</label><input name="duration" type="number" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required /></div>
                    </div>
                    <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Descripción</label><textarea name="desc" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" rows={3} required></textarea></div>
                  </>
                )}

                {/* ----------------- FORMULARIO: PROMOCIÓN ----------------- */}
                {modalType === "PROMO" && (
                  <>
                    <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Título de Promoción</label><input name="title" type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Descuento (Ej: 20% o $5000)</label><input name="discount" type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required /></div>
                      <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Válido Hasta</label><input name="expires" type="date" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required /></div>
                    </div>
                  </>
                )}

                <div className="pt-6 border-t border-zinc-800 mt-6">
                  <button type="submit" disabled={isLoading} className="w-full py-4 text-black font-black uppercase tracking-widest text-xs bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)] flex justify-center items-center gap-2">
                    {isLoading ? "Procesando en Supabase..." : <><Save size={16}/> Guardar Datos</>}
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

// Componente para Tarjetas de KPI
function KpiCard({ icon, title, value, trend, statusColor = "text-amber-500" }: { icon: React.ReactNode, title: string, value: string | number, trend?: string, statusColor?: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 hover:border-amber-500/50 transition-colors">
      <div className={`w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center mb-4 ${statusColor}`}>
        {icon}
      </div>
      <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-1">{title}</p>
      <h4 className={`text-3xl font-black tracking-tighter ${statusColor === 'text-amber-500' ? 'text-white' : statusColor}`}>{value}</h4>
      {trend && <p className="text-green-500 text-xs font-bold mt-2 bg-green-500/10 inline-block px-2 py-1 rounded-md">{trend}</p>}
    </div>
  );
}