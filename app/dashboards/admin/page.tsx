"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
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

interface Barber { id: string; name: string; email?: string; phone?: string; status: "ACTIVE" | "INACTIVE"; cutsToday: number; role: string; tag: string; img: string; }
interface Service { id: string; name: string; desc: string; price: string | number; time: string; duration?: number; iconName: string; }
interface Client { id: string; name: string; phone: string; visits: number; lastVisit: string; totalSpent: number; }
interface Promotion { id: string; titleLeft: string; subtitleLeft: string; priceLeft: string; oldPriceLeft: string; titleRight: string; subtitleRight: string; priceRight: string; oldPriceRight: string; tag: string; promoText: string; promoHighlight: string; promoEnd: string; sku: string; image: string; status: "ACTIVE" | "EXPIRED"; }
interface Chair { id: string; name: string; status: "OCCUPIED" | "FREE"; barber?: string; client?: string; timeRemaining?: string; }

// ============================================================================
// MOCK DATA (Fallbacks visuales)
// ============================================================================
const FALLBACK_BARBERS: Barber[] = [
  { id: "cesar", name: "Cesar Luna", email: "cesar@emperador.cl", phone: "+56912345678", status: "ACTIVE", cutsToday: 5, role: "Master Barber", tag: "El Arquitecto", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop" },
  { id: "jack", name: "Jack Guerra", email: "jack@emperador.cl", phone: "+56987654321", status: "ACTIVE", cutsToday: 4, role: "Fade Specialist", tag: "Rey del Fade", img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop" },
  { id: "jhonn", name: "Jhonn Prado", email: "jhonn@emperador.cl", phone: "+56911223344", status: "ACTIVE", cutsToday: 6, role: "Beard Expert", tag: "Precisión", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop" },
  { id: "marcos", name: "Marcos Peña", email: "marcos@emperador.cl", phone: "+56955556666", status: "ACTIVE", cutsToday: 3, role: "Senior Barber", tag: "Versatilidad", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop" },
];

const FALLBACK_SERVICES: Service[] = [
  { id: "s1", name: "Corte Clásico / Degradado", time: "1 hrs", price: "$12.000", desc: "El corte que define tu estilo. Clean, fresh, de líneas perfectas.", iconName: "Scissors", duration: 60 },
  { id: "s2", name: "Corte + Perfilado de Cejas", time: "1 hrs", price: "$14.000", desc: "Sube de nivel tu mirada. Detalles quirúrgicos que marcan la diferencia.", iconName: "Crosshair", duration: 60 },
];

const FALLBACK_STORE: Promotion[] = [
  {
    id: "promo1", tag: "LAST DAY!", titleLeft: "Wahl Magic Clip", subtitleLeft: "Edición Gold Cordless", priceLeft: "$149.990", oldPriceLeft: "$189.990", titleRight: "Detailer Li", subtitleRight: "Trimmer Gold", priceRight: "$119.990", oldPriceRight: "$149.990", image: "https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=2000&auto=format&fit=crop", promoText: "Por la compra de una Wahl Magic Clip en LastDay!,", promoHighlight: "+$19.990", promoEnd: "lleva un set de peines premium.", sku: "SKU: WAHL-GOLD-PACK", status: "ACTIVE"
  }
];

const MOCK_CHAIRS: Chair[] = [
  { id: "ch1", name: "Sillón 1 (Master)", status: "OCCUPIED", barber: "Cesar Luna", client: "Matías Rojas", timeRemaining: "15 min" },
  { id: "ch2", name: "Sillón 2", status: "FREE" },
  { id: "ch3", name: "Sillón 3", status: "FREE" },
  { id: "ch4", name: "Sillón 4", status: "FREE" },
];

const MOCK_CLIENTS: Client[] = [
  { id: "c1", name: "Matías Rojas", phone: "+56912345678", visits: 12, lastVisit: "Hoy", totalSpent: 154000 },
  { id: "c2", name: "Carlos Díaz", phone: "+56987654321", visits: 5, lastVisit: "Hace 2 días", totalSpent: 60000 },
];

// Helpers
const DynamicIcon = ({ name, size = 24, className = "" }: { name: string, size?: number, className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Scissors;
  return <IconComponent size={size} className={className} />;
};

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

// VALIDADOR INTELIGENTE: Verifica si un ID es un UUID real de Supabase o un texto falso como "cesar"
const isValidUUID = (uuid: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
};

// ============================================================================
// COMPONENTE PRINCIPAL (ADMIN DASHBOARD)
// ============================================================================
export default function AdminDashboard() {
  const supabase = createClient();
  
  const [activeTab, setActiveTab] = useState<TabType>("STAFF");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Estados de Datos Reales
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [storePromos, setStorePromos] = useState<Promotion[]>([]);
  const [chairs] = useState<Chair[]>(MOCK_CHAIRS); 
  const [clients] = useState<Client[]>(MOCK_CLIENTS); 

  // Estados Modales
  const [modalType, setModalType] = useState<"SERVICE" | "BARBER" | "PROMO" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para Edición
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Efecto Inicial: Carga los datos al iniciar la página
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const { data: dbBarbers, error: errBarbers } = await supabase.from('Barbers').select('*').order('created_at', { ascending: false });
      if (!errBarbers && dbBarbers && dbBarbers.length > 0) {
        setBarbers(dbBarbers);
      } else {
        setBarbers(FALLBACK_BARBERS); 
      }

      const { data: dbServices, error: errServices } = await supabase.from('Services').select('*');
      if (!errServices && dbServices && dbServices.length > 0) setServices(dbServices);
      else setServices(FALLBACK_SERVICES);

      const { data: dbStore, error: errStore } = await supabase.from('StoreProducts').select('*');
      if (!errStore && dbStore && dbStore.length > 0) setStorePromos(dbStore);
      else setStorePromos(FALLBACK_STORE);

    } catch (error) {
      console.error("Modo desarrollo: usando mock data", error);
      setBarbers(FALLBACK_BARBERS);
      setServices(FALLBACK_SERVICES);
      setStorePromos(FALLBACK_STORE);
    } finally {
      setIsFetching(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const openBarberModal = (barber: Barber | null = null) => {
    setEditingBarber(barber);
    setImagePreview(null);
    setSelectedImage(null);
    setModalType("BARBER");
  };

  const handleDeleteBarber = async (id: string) => {
    const isConfirmed = window.confirm("¿Estás seguro de que deseas eliminar a este barbero?");
    if (!isConfirmed) return;

    try {
      // Solo intentamos borrar en la BD si es un ID válido de Supabase
      if (isValidUUID(id)) {
        const { error } = await supabase.from('Barbers').delete().eq('id', id);
        if (error) throw error;
      }
      
      setBarbers(prev => prev.filter(b => b.id !== id));
      alert("Barbero eliminado correctamente.");
    } catch (error: any) {
      console.error("Error eliminando:", error);
      alert(`No se pudo eliminar: ${error.message}`);
    }
  };

  const handleSaveAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      if (modalType === "BARBER") {
        let imageUrl = editingBarber?.img || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=800&auto=format&fit=crop"; 
        
        if (selectedImage) {
          const fileExt = selectedImage.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `barbers/${fileName}`;
          
          const { error: uploadError } = await supabase.storage.from('barber-profiles').upload(filePath, selectedImage);
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('barber-profiles').getPublicUrl(filePath);
            imageUrl = publicUrlData.publicUrl;
          } else {
             throw new Error(`Storage Error: ${uploadError.message}`);
          }
        }

        const barberData = {
          name: formData.get("name") as string,
          email: formData.get("email") as string,
          phone: formData.get("phone") as string,
          role: formData.get("role") as string,
          tag: formData.get("tag") as string,
          status: (formData.get("status") || "ACTIVE") as "ACTIVE" | "INACTIVE",
          cutsToday: editingBarber ? editingBarber.cutsToday : 0,
          img: imageUrl
        };

        // Si estamos editando Y el ID es un UUID válido de la Base de datos
        if (editingBarber && isValidUUID(editingBarber.id)) {
          const { data, error } = await supabase.from('Barbers').update(barberData).eq('id', editingBarber.id).select();
          if (error) throw new Error(`Database Error: ${error.message}`);
          
          if (data && data.length > 0) {
            setBarbers(prev => prev.map(b => b.id === editingBarber.id ? data[0] : b));
          }
          alert("¡Barbero actualizado exitosamente!");
        } else {
          // Si estamos creando uno nuevo, o si estamos "editando" un mock data (como 'cesar') lo guardamos como nuevo
          const { data, error } = await supabase.from('Barbers').insert([barberData]).select();
          if (error) throw new Error(`Database Error: ${error.message}`);

          if (data && data.length > 0) {
            // Si estábamos sobrescribiendo un mock, lo quitamos de la vista y ponemos el real
            if (editingBarber && !isValidUUID(editingBarber.id)) {
               setBarbers(prev => [data[0], ...prev.filter(b => b.id !== editingBarber.id)]);
            } else {
               setBarbers(prev => [data[0], ...prev]);
            }
          }
          alert("¡Barbero guardado en la base de datos correctamente!");
        }
      }

      if (modalType === "SERVICE") {
         const newService = {
            name: formData.get("name") as string,
            price: formData.get("price") as string,
            time: formData.get("time") as string,
            desc: formData.get("desc") as string,
            iconName: (formData.get("iconName") as string) || "Scissors"
         };
         
         const { data, error } = await supabase.from('Services').insert([newService]).select();
         if (error) throw new Error(`Database Error: ${error.message}`);
         
         if (data && data.length > 0) {
           setServices(prev => [data[0], ...prev]);
         }
         alert("¡Servicio guardado exitosamente!");
      }

      setModalType(null);
      setEditingBarber(null);
      setSelectedImage(null);
      setImagePreview(null);
      
    } catch (error: any) {
      console.error("Error guardando:", error);
      alert(`Error al procesar: ${error.message}`);
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
          <p className="text-zinc-400 mt-2 font-medium">Control total de la web y datos de Emperador Barbershop</p>
        </div>
        {isFetching && <span className="text-amber-500 text-sm font-bold animate-pulse bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20">Sincronizando Base de Datos...</span>}
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
        {/* TAB 1: RESUMEN */}
        {/* =================================================================== */}
        {activeTab === "RESUMEN" && (
          <motion.div key="resumen" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard icon={<DollarSign />} title="Ingresos Totales (Hoy)" value="$245.000" trend="+8% vs ayer" />
              <KpiCard icon={<Scissors />} title="Cortes Realizados (Hoy)" value={15} />
              <KpiCard icon={<Armchair />} title="Sillones Ocupados" value="1 / 4" statusColor="text-green-500" />
              <KpiCard icon={<Users />} title="Nuevos Clientes (Mes)" value={42} trend="+12% vs mes pasado" />
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl flex items-center gap-4 text-amber-500">
              <AlertCircle size={24} />
              <p className="text-sm font-bold">Asegúrate de agregar Políticas de RLS en Supabase (Storage y Base de datos) para permitir guardar cambios.</p>
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: SILLONES */}
        {/* =================================================================== */}
        {activeTab === "SILLONES" && (
          <motion.div key="sillones" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Monitoreo en Tiempo Real</h2>
                <p className="text-zinc-500">Visualiza el estado de la barbería en este momento.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {chairs.map(chair => (
                <div key={chair.id} className={`p-8 rounded-[2rem] border relative overflow-hidden transition-all duration-500 ${chair.status === 'OCCUPIED' ? 'bg-zinc-900 border-red-500/30' : 'bg-zinc-950 border-green-500/30'}`}>
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
        {/* TAB 3: STAFF */}
        {/* =================================================================== */}
        {activeTab === "STAFF" && (
          <motion.div key="staff" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Equipo de Barberos</h2>
                <p className="text-sm text-zinc-500">Crea, edita o elimina barberos. Se refleja en "Team Emperador" en la web.</p>
              </div>
              <button onClick={() => openBarberModal(null)} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                <UserPlus size={16} /> Añadir Barbero
              </button>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950 text-xs uppercase tracking-widest border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-5">Perfil (Web)</th>
                    <th className="px-6 py-5">Rol / Etiqueta</th>
                    <th className="px-6 py-5">Estado</th>
                    <th className="px-6 py-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {barbers.map(b => (
                    <tr key={b.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800">
                            {b.img ? (
                              <Image src={b.img} alt={b.name} fill className="object-cover grayscale hover:grayscale-0 transition-all" unoptimized />
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
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${b.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {b.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openBarberModal(b)} className="p-2 text-zinc-500 hover:text-amber-500 transition-colors" title="Editar">
                          <Edit3 size={18} />
                        </button>
                        <button onClick={() => handleDeleteBarber(b.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {barbers.length === 0 && (
                 <div className="p-8 text-center text-zinc-500">No hay barberos registrados.</div>
              )}
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: SERVICIOS */}
        {/* =================================================================== */}
        {activeTab === "SERVICIOS" && (
          <motion.div key="servicios" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
             <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Menú de Servicios</h2>
                <p className="text-sm text-zinc-500">Administra los servicios y precios que ven los clientes.</p>
              </div>
              <button onClick={() => setModalType("SERVICE")} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                <Plus size={16} /> Nuevo Servicio
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {services.map(s => (
                <div key={s.id} className="bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-6 hover:border-amber-500/50 transition-colors relative group">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-zinc-950 text-zinc-400 hover:text-amber-500 rounded-lg"><Edit3 size={16}/></button>
                    <button className="p-2 bg-zinc-950 text-zinc-400 hover:text-red-500 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                  
                  <div className="w-12 h-12 bg-black border border-zinc-800 rounded-xl flex items-center justify-center text-amber-500 mb-4">
                    <DynamicIcon name={s.iconName || "Scissors"} size={20} />
                  </div>

                  <h3 className="text-xl font-bold text-white pr-16 mb-2 leading-tight">{s.name}</h3>
                  <p className="text-sm text-zinc-400 mb-6 h-12 line-clamp-2">{s.desc}</p>
                  
                  <div className="flex justify-between items-end pt-4 border-t border-zinc-800/50">
                    <div>
                      <span className="block text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">{s.time}</span>
                      <span className="text-2xl font-black text-amber-500">{s.price}</span>
                    </div>
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
            <div className="relative flex-1 mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="text" 
                placeholder="Buscar cliente por nombre o teléfono..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-white focus:border-amber-500 outline-none"
              />
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950 text-xs uppercase tracking-widest border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-5">Cliente</th>
                    <th className="px-6 py-5">Teléfono</th>
                    <th className="px-6 py-5 text-center">Visitas</th>
                    <th className="px-6 py-5 text-right text-amber-500">Gasto Total</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                    <tr key={c.id} className="border-b border-zinc-800/50">
                      <td className="px-6 py-4 font-bold text-white">{c.name}</td>
                      <td className="px-6 py-4">{c.phone}</td>
                      <td className="px-6 py-4 text-center"><span className="bg-zinc-800 text-white px-3 py-1 rounded-full text-xs font-bold">{c.visits}</span></td>
                      <td className="px-6 py-4 text-right font-bold text-amber-500">{formatMoney(c.totalSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: PROMOCIONES / TIENDA */}
        {/* =================================================================== */}
        {activeTab === "PROMOCIONES" && (
          <motion.div key="promociones" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Destacados de Tienda (Inicio)</h2>
                <p className="text-sm text-zinc-500">Controla los productos que aparecen en el Hero de la web.</p>
              </div>
              <button onClick={() => setModalType("PROMO")} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                <Plus size={16} /> Crear Diapositiva
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {storePromos.map(p => (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                  <div className="relative h-40 w-full rounded-xl overflow-hidden mb-4">
                    <Image src={p.image} alt="Promo" fill className="object-cover opacity-50" unoptimized />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-amber-500 text-black px-4 py-1 rounded-full font-black text-xs uppercase">{p.tag}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white font-bold">{p.titleLeft}</p>
                      <p className="text-amber-500 font-black">{p.priceLeft}</p>
                    </div>
                    <div>
                      <p className="text-white font-bold">{p.titleRight}</p>
                      <p className="text-amber-500 font-black">{p.priceRight}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODALES REUTILIZABLES (CREACIÓN / EDICIÓN) */}
      {/* =================================================================== */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalType(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-zinc-950 border border-zinc-800 rounded-[2rem] p-8 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto hide-scrollbar">
              <button onClick={() => setModalType(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={24}/></button>
              
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-6 font-serif">
                {modalType === "SERVICE" && "Servicio Web"}
                {modalType === "BARBER" && (editingBarber ? "Editar Barbero" : "Añadir Barbero")}
                {modalType === "PROMO" && "Crear Destacado de Tienda"}
              </h3>
              
              <form onSubmit={handleSaveAction} className="space-y-5">
                
                {/* ----------------- FORMULARIO: BARBERO ----------------- */}
                {modalType === "BARBER" && (
                  <>
                    <div className="flex justify-center mb-6">
                      <div 
                        className="relative w-32 h-32 rounded-3xl border-2 border-dashed border-zinc-700 bg-zinc-900 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-amber-500 transition-colors group"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {imagePreview ? (
                          <Image src={imagePreview} alt="Preview" fill className="object-cover" unoptimized />
                        ) : editingBarber?.img ? (
                          <Image src={editingBarber.img} alt="Current" fill className="object-cover grayscale group-hover:grayscale-0 transition-all" unoptimized />
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
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nombre Mostrado</label>
                      <input name="name" defaultValue={editingBarber?.name || ""} type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required placeholder="Ej: Cesar Luna" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Rol</label>
                        <input name="role" defaultValue={editingBarber?.role || ""} type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required placeholder="Ej: Master Barber" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Etiqueta Naranja</label>
                        <input name="tag" defaultValue={editingBarber?.tag || ""} type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required placeholder="Ej: El Arquitecto" />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800">
                      <p className="text-xs text-amber-500 mb-4 font-bold">Datos Opcionales (Uso Interno)</p>
                      <div>
                        <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                        <input name="email" defaultValue={editingBarber?.email || ""} type="email" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" />
                      </div>
                    </div>
                    
                    {editingBarber && (
                      <div className="pt-2">
                        <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Estado</label>
                        <select name="status" defaultValue={editingBarber.status} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none appearance-none">
                          <option value="ACTIVE">Activo en la web</option>
                          <option value="INACTIVE">Oculto / Inactivo</option>
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* ----------------- FORMULARIO: SERVICIO ----------------- */}
                {modalType === "SERVICE" && (
                  <>
                    <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Título del Servicio</label><input name="name" type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required placeholder="Ej: Corte + Perfilado de Cejas" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Precio Formateado</label><input name="price" type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required placeholder="Ej: $14.000" /></div>
                      <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Tiempo Aprox.</label><input name="time" type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required placeholder="Ej: 1 hrs" /></div>
                    </div>
                    <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nombre Icono (Lucide)</label><input name="iconName" type="text" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" required placeholder="Ej: Scissors, Flame, Zap, Crown..." /></div>
                    <div><label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Descripción Corta</label><textarea name="desc" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none" rows={2} required></textarea></div>
                  </>
                )}

                <div className="pt-6 border-t border-zinc-800 mt-6">
                  <button type="submit" disabled={isLoading} className="w-full py-4 text-black font-black uppercase tracking-widest text-xs bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)] flex justify-center items-center gap-2">
                    {isLoading ? "Guardando..." : <><Save size={16}/> Guardar y Publicar en Web</>}
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

// Componente KpiCard
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