"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { 
  LayoutDashboard, Users, Scissors, Tag, 
  DollarSign, TrendingUp, UserPlus, Edit3, Trash2, 
  Search, Plus, CheckCircle2, Clock, X, Save, AlertCircle,
  Armchair, Crown, Percent, UserCircle2, Upload, ImageIcon,
  Package, Boxes, BadgePercent, BarChart3, ShoppingBag,
  Disc, Music, UploadCloud, Volume2, VolumeX, Volume1,
  MessageCircle, CalendarDays, KeyRound, Smartphone
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

// ============================================================================
// TIPADOS REALES (Sincronizados con SQL)
// ============================================================================
type TabType = "RESUMEN" | "SILLONES" | "STAFF" | "SERVICIOS" | "CLIENTES" | "PROMOCIONES" | "INVENTARIO" | "MUSICA";

interface Barber { id: string; name: string; email?: string; phone?: string; status: "ACTIVE" | "INACTIVE"; cutsToday: number; role: string; tag: string; img: string; }
interface Service { id: string; name: string; desc: string; price: string | number; time: string; duration?: number; iconName: string; }
interface Client { id: string; name: string; phone: string; email?: string; visits: number; last_visit: string; total_spent: number; points: number; }
interface Promotion { id: string; titleLeft: string; subtitleLeft: string; priceLeft: string; oldPriceLeft: string; titleRight: string; subtitleRight: string; priceRight: string; oldPriceRight: string; tag: string; promoText: string; promoHighlight: string; promoEnd: string; sku: string; image: string; status: "ACTIVE" | "EXPIRED"; }
interface Chair { id: string; name: string; status: "OCCUPIED" | "FREE"; current_barber_id?: string; payment_due_date?: string; }
interface Product { id: string; name: string; subtitle: string; description: string; price: number; old_price?: number; discount_code?: string; stock: number; tag: string; image_url: string; category: string; sku: string; status: "ACTIVE" | "HIDDEN"; }

// ============================================================================
// FUNCIONES DE APOYO
// ============================================================================
const DynamicIcon = ({ name, size = 24, className = "" }: { name: string, size?: number, className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Scissors;
  return <IconComponent size={size} className={className} />;
};

const formatMoney = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0);

const isValidUUID = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

// ============================================================================
// COMPONENTE PRINCIPAL (ADMIN DASHBOARD)
// ============================================================================
export default function AdminDashboard() {
  const supabase = createClient();
  
  // Estados de Navegación y UI
  const [activeTab, setActiveTab] = useState<TabType>("RESUMEN");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Estados de Datos de la Base de Datos
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [storePromos, setStorePromos] = useState<Promotion[]>([]);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]); 
  const [clients, setClients] = useState<Client[]>([]); 
  const [musicUrl, setMusicUrl] = useState<string>("");

  // KPIs Calculados
  const [kpis, setKpis] = useState({ totalIngresos: 0, cortesHoy: 0, stockTotal: 0, clientesTotales: 0 });

  // Estados Modales
  const [modalType, setModalType] = useState<"SERVICE" | "BARBER" | "PROMO" | "PRODUCT" | "CLIENT" | "CHAIR" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  
  // Estados de Edición Activa
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);

  // ============================================================================
  // CARGA MAESTRA DE DATOS (FETCH)
  // ============================================================================
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      // 1. Staff (Usuarios/Barberos)
      const { data: dbBarbers } = await supabase.from('Barbers').select('*').order('created_at', { ascending: false });
      if (dbBarbers) setBarbers(dbBarbers);

      // 2. Servicios
      const { data: dbServices } = await supabase.from('Services').select('*');
      if (dbServices) setServices(dbServices);

      // 3. Inventario
      const { data: dbInventory } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
      if (dbInventory) {
        setInventory(dbInventory);
        setKpis(prev => ({ ...prev, stockTotal: dbInventory.reduce((acc, item) => acc + item.stock, 0) }));
      }

      // 4. Promociones
      const { data: dbStore } = await supabase.from('StoreProducts').select('*');
      if (dbStore) setStorePromos(dbStore);

      // 5. Ajustes de Música
      const { data: dbSettings } = await supabase.from('settings').select('*').eq('key', 'background_music').single();
      if (dbSettings) setMusicUrl(dbSettings.value);

      // 6. Clientes Reales
      const { data: dbClients } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (dbClients) {
        setClients(dbClients);
        setKpis(prev => ({ ...prev, clientesTotales: dbClients.length }));
      }

      // 7. Sillones
      const { data: dbChairs } = await supabase.from('chairs').select('*').order('name', { ascending: true });
      if (dbChairs) setChairs(dbChairs);

    } catch (error) {
      console.error("Error crítico de red:", error);
    } finally {
      setIsFetching(false);
    }
  };

  // ============================================================================
  // MANEJADORES DE ARCHIVOS
  // ============================================================================
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

  // ============================================================================
  // CRUD GLOBAL
  // ============================================================================
  const openModal = (type: any, item: any = null) => {
    setEditingItem(item);
    setImagePreview(item?.img || item?.image_url || null);
    setSelectedImage(null);
    setModalType(type);
  };

  const handleDelete = async (table: string, id: string) => {
    const isConfirmed = window.confirm("¿Estás seguro de que deseas eliminar este registro de la base de datos de Emperador?");
    if (!isConfirmed) return;

    try {
      if (isValidUUID(id)) {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
      }
      fetchData();
      alert("Registro eliminado exitosamente.");
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
      // 1. Subida de Imagen Compartida
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

      // 2. Guardar BARBERO / STAFF
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

      // 3. Guardar SERVICIO
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

      // 4. Guardar PRODUCTO (INVENTARIO)
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

      // 5. Guardar CLIENTE
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

      // 6. Guardar SILLÓN (Asignación)
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
      fetchData(); // Sincroniza datos visuales
      alert("¡Base de datos actualizada con éxito!");
      
    } catch (error: any) {
      console.error("Error guardando:", error);
      alert(`Error al procesar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-20 p-6 md:p-10">
      
      {/* =================================================================== */}
      {/* HEADER DINÁMICO */}
      {/* =================================================================== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase font-serif flex items-center gap-4">
            <Crown className="text-amber-500 w-10 h-10 md:w-12 md:h-12" />
            <span>Emperador <span className="text-amber-500">System</span></span>
          </h1>
          <p className="text-zinc-400 mt-2 font-medium tracking-wide">Centro de Control y Administración de Base de Datos</p>
        </div>
        {isFetching && (
          <span className="text-amber-500 text-xs font-black uppercase tracking-widest animate-pulse bg-amber-500/10 px-5 py-2 rounded-full border border-amber-500/20 flex items-center gap-2">
            <Clock size={16}/> Sincronizando...
          </span>
        )}
      </div>

      {/* =================================================================== */}
      {/* NAVEGACIÓN DE TABS */}
      {/* =================================================================== */}
      <div className="flex gap-2 mb-8 border-b border-zinc-800 pb-4 overflow-x-auto hide-scrollbar scroll-smooth">
        {(["RESUMEN", "SILLONES", "CLIENTES", "STAFF", "SERVICIOS", "INVENTARIO", "MUSICA"] as TabType[]).map((tab) => (
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
            {tab === "SILLONES" && <Armchair size={18}/>}
            {tab === "STAFF" && <Users size={18}/>}
            {tab === "SERVICIOS" && <Scissors size={18}/>}
            {tab === "INVENTARIO" && <Boxes size={18}/>}
            {tab === "CLIENTES" && <Search size={18}/>}
            {tab === "MUSICA" && <Music size={18}/>}
            {tab}
          </button>
        ))}
      </div>

      {/* =================================================================== */}
      {/* VISTAS DE PESTAÑAS */}
      {/* =================================================================== */}
      <AnimatePresence mode="wait">
        
        {/* --- TAB: RESUMEN MATEMÁTICO REAL --- */}
        {activeTab === "RESUMEN" && (
          <motion.div key="resumen" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard icon={<DollarSign />} title="Ingresos Tienda (Test)" value={formatMoney(kpis.totalIngresos)} statusColor="text-green-500" />
              <KpiCard icon={<Scissors />} title="Sillones Activos" value={chairs.filter(c => c.status === 'OCCUPIED').length} />
              <KpiCard icon={<Boxes />} title="Productos en Stock" value={kpis.stockTotal} statusColor="text-amber-500" />
              <KpiCard icon={<Users />} title="Clientes Registrados" value={kpis.clientesTotales} trend="+ Nuevo hoy" />
            </div>
            
            <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-[2rem] flex items-center gap-6">
               <div className="w-16 h-16 bg-amber-500 text-black rounded-2xl flex items-center justify-center shrink-0 shadow-lg"><TrendingUp size={32}/></div>
               <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Rendimiento Imperial Activo</h3>
                  <p className="text-zinc-400 text-sm mt-1">El sistema está conectado a Supabase. Todos los cambios realizados aquí se reflejarán en la web pública instantáneamente.</p>
               </div>
            </div>
          </motion.div>
        )}

        {/* --- TAB: GESTIÓN DE SILLONES (ARRIENDOS) --- */}
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
                // Buscamos el nombre del barbero asignado si existe
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
                        {chair.payment_due_date && (
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                            <CalendarDays size={16} /> Pago: {new Date(chair.payment_due_date).toLocaleDateString('es-CL')}
                          </div>
                        )}
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

        {/* --- TAB: CLIENTES Y PUNTOS --- */}
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
              <input 
                type="text" 
                placeholder="Buscar cliente por nombre o celular..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-amber-500 outline-none transition-all shadow-inner"
              />
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-[0.2em] border-b border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-8 py-6">Cliente</th>
                    <th className="px-6 py-6">Contacto</th>
                    <th className="px-6 py-6 text-center">Puntos (Fidelidad)</th>
                    <th className="px-6 py-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)).map(c => (
                    <tr key={c.id} className="hover:bg-zinc-800/20 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="font-black text-white text-base">{c.name}</p>
                        <p className="text-[10px] text-zinc-500 uppercase mt-1">Última visita: {c.last_visit ? new Date(c.last_visit).toLocaleDateString('es-CL') : 'Nuevo'}</p>
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
                          <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}?text=Hola%20${c.name},%20te%20escribimos%20de%20Emperador%20Barbershop%20para%20recordarte%20tu%20corte.`} target="_blank" rel="noopener noreferrer" className="p-2 text-green-500 hover:bg-green-500 hover:text-black rounded-lg transition-colors" title="WhatsApp Recordatorio">
                            <MessageCircle size={18} />
                          </a>
                          <button onClick={() => openModal("CLIENT", c)} className="p-2 text-zinc-500 hover:text-white transition-colors" title="Editar"><Edit3 size={18}/></button>
                          <button onClick={() => handleDelete('clients', c.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors" title="Eliminar"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {clients.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-zinc-500">No hay clientes registrados en la base de datos.</td></tr>}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* --- TAB: INVENTARIO (TIENDA ONLINE) --- */}
        {activeTab === "INVENTARIO" && (
          <motion.div key="inventario" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Inventario Emperador Store</h2>
                <p className="text-sm text-zinc-500">Sincronizado en tiempo real con la web de compras.</p>
              </div>
              <button onClick={() => openModal("PRODUCT", null)} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                <Plus size={16} /> Añadir Producto
              </button>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-[0.2em] border-b border-zinc-800">
                  <tr>
                    <th className="px-8 py-6">Producto / Foto</th>
                    <th className="px-6 py-6 text-center">SKU</th>
                    <th className="px-6 py-6">Precio Público</th>
                    <th className="px-6 py-6 text-center">Stock</th>
                    <th className="px-8 py-6 text-right">Config</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {inventory.map(p => (
                    <tr key={p.id} className="hover:bg-zinc-800/20 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden relative border border-zinc-700">
                            {p.image_url ? <Image src={p.image_url} alt={p.name} fill className="object-cover" unoptimized /> : <Package className="w-full h-full p-3 text-zinc-600"/>}
                          </div>
                          <div>
                            <p className="font-bold text-white text-base">{p.name}</p>
                            <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-black mt-1 inline-block uppercase">{p.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-mono text-xs">{p.sku || '---'}</td>
                      <td className="px-6 py-5">
                        <p className="font-black text-amber-500 text-lg">{formatMoney(p.price)}</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                         <span className={`px-3 py-1 rounded-lg font-black text-xs ${p.stock < 3 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-zinc-800 text-white'}`}>
                           {p.stock} uds.
                         </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openModal("PRODUCT", p)} className="p-2 text-zinc-500 hover:text-white transition-colors"><Edit3 size={18}/></button>
                          <button onClick={() => handleDelete('inventory', p.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* --- TAB: STAFF (BARBEROS / USUARIOS) --- */}
        {activeTab === "STAFF" && (
          <motion.div key="staff" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Usuarios y Barberos</h2>
                <p className="text-sm text-zinc-500">Crea accesos para el equipo y edita cómo se ven en la web.</p>
              </div>
              <button onClick={() => openModal("BARBER", null)} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                <UserPlus size={16} /> Añadir Barbero
              </button>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-[0.2em] border-b border-zinc-800">
                  <tr>
                    <th className="px-8 py-6">Perfil (Web)</th>
                    <th className="px-6 py-6">Rol / Etiqueta</th>
                    <th className="px-6 py-6">Estado App</th>
                    <th className="px-8 py-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {barbers.map(b => (
                    <tr key={b.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-800">
                            {b.img ? <Image src={b.img} alt={b.name} fill className="object-cover" unoptimized /> : <UserCircle2 className="w-full h-full p-2 text-zinc-500" />}
                          </div>
                          <div>
                             <span className="font-bold text-white text-base block">{b.name}</span>
                             <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 mt-1"><KeyRound size={10}/> Acceso Habilitado</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-white font-bold mb-1">{b.role}</p>
                        <span className="inline-block px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] uppercase font-black rounded">{b.tag}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${b.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500'}`}>
                          {b.status === 'ACTIVE' ? 'Visible' : 'Oculto'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                           <button onClick={() => openModal("BARBER", b)} className="p-2 text-zinc-500 hover:text-white transition-colors"><Edit3 size={18} /></button>
                           <button onClick={() => handleDelete('Barbers', b.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* --- TAB: SERVICIOS --- */}
        {activeTab === "SERVICIOS" && (
          <motion.div key="servicios" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
             <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Menú de Servicios Públicos</h2>
                <p className="text-sm text-zinc-500">Administra los servicios, precios y duraciones mostradas a clientes.</p>
              </div>
              <button onClick={() => openModal("SERVICE", null)} className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white hover:text-amber-500 font-black text-xs uppercase tracking-widest rounded-xl transition-all border border-zinc-700">
                <Plus size={16} /> Nuevo Servicio
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {services.map(s => (
                <div key={s.id} className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 hover:border-amber-500/40 transition-colors relative group">
                  <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal("SERVICE", s)} className="p-2 bg-black text-zinc-400 hover:text-amber-500 rounded-lg"><Edit3 size={16}/></button>
                    <button onClick={() => handleDelete('Services', s.id)} className="p-2 bg-black text-zinc-400 hover:text-red-500 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                  
                  <div className="w-14 h-14 bg-black border border-zinc-800 rounded-2xl flex items-center justify-center text-amber-500 mb-6 shadow-lg">
                    <DynamicIcon name={s.iconName || "Scissors"} size={24} />
                  </div>

                  <h3 className="text-xl font-black text-white pr-16 mb-3 leading-tight uppercase">{s.name}</h3>
                  <p className="text-sm text-zinc-400 mb-8 h-12 line-clamp-2">{s.desc}</p>
                  
                  <div className="flex justify-between items-end pt-6 border-t border-zinc-800/80">
                    <div>
                      <span className="block text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={12}/> {s.time}</span>
                      <span className="text-3xl font-black text-amber-500 tracking-tighter">{typeof s.price === 'number' ? formatMoney(s.price) : s.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* --- TAB: MUSICA GLOBAL --- */}
        {activeTab === "MUSICA" && (
          <motion.div key="musica" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Reproductor Ambiental</h2>
                <p className="text-sm text-zinc-500">Sube el track que ambientará la experiencia web del usuario.</p>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-10 max-w-4xl shadow-xl">
               <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Enlace del Audio MP3 o WAV</label>
               <div className="flex flex-col md:flex-row gap-4 mb-8">
                 <input 
                   type="text" 
                   value={musicUrl} 
                   onChange={(e) => setMusicUrl(e.target.value)}
                   className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all shadow-inner" 
                   placeholder="https://.../vibe.mp3" 
                 />
                 <button onClick={() => musicInputRef.current?.click()} className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 transition-colors shrink-0">
                    <UploadCloud size={18} /> Subir MP3
                 </button>
                 <input type="file" accept="audio/mp3,audio/wav" className="hidden" ref={musicInputRef} onChange={handleMusicUpload} />
               </div>
               
               <button onClick={saveMusicSettings} disabled={isLoading || isUploadingMusic} className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-[0_10px_30px_rgba(217,119,6,0.3)] flex items-center justify-center gap-3">
                 {isLoading ? "Guardando..." : isUploadingMusic ? "Subiendo pista al servidor..." : <><Save size={18}/> Guardar y Transmitir a la Web</>}
               </button>

               {musicUrl && (
                 <div className="mt-10 p-8 bg-zinc-950 border border-zinc-800 rounded-3xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] rounded-full pointer-events-none"></div>
                    <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center text-black shrink-0 relative overflow-hidden shadow-[0_0_20px_rgba(217,119,6,0.4)]">
                      <Disc size={32} className="animate-[spin_4s_linear_infinite]" />
                      <div className="absolute w-4 h-4 bg-zinc-950 rounded-full border border-black"></div>
                    </div>
                    <div className="flex-1 text-center md:text-left overflow-hidden relative z-10">
                      <p className="text-white font-black text-lg uppercase tracking-tight mb-1">Track Oficial Activo</p>
                      <p className="text-zinc-500 text-xs font-mono truncate">{musicUrl}</p>
                    </div>
                    <audio src={musicUrl} controls className="w-full md:w-auto relative z-10 custom-audio" />
                 </div>
               )}
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
                </h3>
                <p className="text-zinc-500 text-sm mt-1">Modifica los parámetros en la base de datos de Emperador.</p>
              </div>
              
              <form onSubmit={handleSaveAction} className="space-y-6">
                
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

                {/* --- FORMULARIO: USUARIO/BARBERO --- */}
                {modalType === "BARBER" && (
                  <div className="space-y-5">
                    <InputField label="Nombre Completo" name="name" defaultValue={editingItem?.name} required placeholder="Ej: Jack Guerra" />
                    <div className="grid grid-cols-2 gap-5">
                      <InputField label="Especialidad (Rol)" name="role" defaultValue={editingItem?.role} required placeholder="Ej: Fade Specialist" />
                      <InputField label="Etiqueta Visual" name="tag" defaultValue={editingItem?.tag} required placeholder="Ej: Rey del Fade" />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <InputField label="Email (Acceso)" name="email" type="email" defaultValue={editingItem?.email} placeholder="jack@emperador.cl" />
                      <InputField label="Teléfono" name="phone" defaultValue={editingItem?.phone} placeholder="+56 9..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">Estado en Plataforma</label>
                      <select name="status" defaultValue={editingItem?.status || "ACTIVE"} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none appearance-none font-bold">
                        <option value="ACTIVE">Activo y Público en Web</option>
                        <option value="INACTIVE">Inactivo / Cuenta Suspendida</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* --- FORMULARIO: SILLÓN --- */}
                {modalType === "CHAIR" && (
                  <div className="space-y-5">
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
                  </div>
                )}

                {/* --- FORMULARIO: CLIENTE --- */}
                {modalType === "CLIENT" && (
                  <div className="space-y-5">
                    <InputField label="Nombre del Cliente" name="name" defaultValue={editingItem?.name} required placeholder="Ej: Andrés Muñoz" />
                    <div className="grid grid-cols-2 gap-5">
                      <InputField label="WhatsApp / Celular" name="phone" defaultValue={editingItem?.phone} required placeholder="+569..." />
                      <InputField label="Puntos Acumulados" name="points" type="number" defaultValue={editingItem?.points || 0} required />
                    </div>
                    <InputField label="Correo Electrónico (Opcional)" name="email" type="email" defaultValue={editingItem?.email} />
                  </div>
                )}

                {/* --- FORMULARIO: PRODUCTO --- */}
                {modalType === "PRODUCT" && (
                  <div className="space-y-5">
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
                    <InputField label="Código Promo Activo" name="discount_code" defaultValue={editingItem?.discount_code} placeholder="VERANO20" />
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">Descripción Larga</label>
                      <textarea name="description" defaultValue={editingItem?.description} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none resize-none" rows={3} required></textarea>
                    </div>
                  </div>
                )}

                {/* --- FORMULARIO: SERVICIO --- */}
                {modalType === "SERVICE" && (
                  <div className="space-y-5">
                    <InputField label="Título" name="name" defaultValue={editingItem?.name} required placeholder="Corte + Cejas" />
                    <div className="grid grid-cols-2 gap-5">
                      <InputField label="Precio a Mostrar" name="price" defaultValue={editingItem?.price} required placeholder="$14.000" />
                      <InputField label="Duración Estimada" name="time" defaultValue={editingItem?.time} required placeholder="45 min" />
                    </div>
                    <InputField label="Icono Base de Datos" name="iconName" defaultValue={editingItem?.iconName} required placeholder="Scissors" />
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">Detalles del Servicio</label>
                      <textarea name="desc" defaultValue={editingItem?.desc} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none resize-none" rows={2} required></textarea>
                    </div>
                  </div>
                )}

                <div className="pt-8 border-t border-zinc-800 mt-8">
                  <button type="submit" disabled={isLoading} className="w-full py-5 text-black font-black uppercase tracking-[0.2em] text-sm bg-amber-500 hover:bg-amber-400 rounded-2xl transition-all shadow-[0_10px_30px_rgba(217,119,6,0.3)] active:scale-95 flex justify-center items-center gap-3">
                    {isLoading ? <Clock className="animate-spin" /> : <><Save size={20}/> Procesar y Guardar Base de Datos</>}
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
function InputField({ label, name, type = "text", defaultValue, required = false, placeholder = "" }: any) {
  return (
    <div>
      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">{label}</label>
      <input 
        name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all placeholder:text-zinc-700" 
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