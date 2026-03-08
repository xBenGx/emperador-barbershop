"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

// IMPORTACIONES
import { 
  LayoutDashboard, Users, Scissors, Tag, 
  DollarSign, TrendingUp, UserPlus, Edit3, Trash2, 
  Search, Plus, CheckCircle2, Clock, X, Save, AlertCircle,
  Armchair, Crown, Percent, UserCircle2, Upload, Image as ImageIcon,
  Package, Boxes, BadgePercent, BarChart3, ShoppingBag,
  Disc, Music, UploadCloud, Volume2, VolumeX, Volume1,
  MessageCircle, CalendarDays, KeyRound, Smartphone, ShieldAlert, XCircle,
  LogOut, RefreshCw, Lock, Video, Star, HelpCircle, Instagram, Heart, Link2, RotateCcw
} from "lucide-react";

import * as LucideIcons from "lucide-react";

// ============================================================================
// TIPADOS REALES EXTENDIDOS
// ============================================================================
type TabType = "RESUMEN" | "CITAS" | "SILLONES" | "USUARIOS" | "CLIENTES" | "SERVICIOS" | "INVENTARIO" | "WEB_HOME" | "MUSICA";
type ModalType = "SERVICE" | "BARBER" | "PRODUCT" | "CLIENT" | "CHAIR" | "HERO_SLIDE" | "STORE_PROMO" | "REEL" | "REVIEW" | "FAQ" | null;

interface Barber { id: string; name: string; email?: string; phone?: string; status: "ACTIVE" | "INACTIVE"; cutsToday: number; role: string; tag: string; img: string; }
interface Service { id: string; name: string; desc: string; price: string | number; time: string; duration?: number; iconName: string; }
interface Client { id: string; name: string; phone: string; email?: string; visits: number; last_visit: string; total_spent: number; points: number; }
interface Chair { id: string; name: string; status: "OCCUPIED" | "FREE"; current_barber_id?: string; payment_due_date?: string; }
interface Product { id: string; name: string; subtitle: string; description: string; price: number; old_price?: number; discount_code?: string; stock: number; tag: string; image_url: string; category: string; sku: string; status: "ACTIVE" | "HIDDEN"; }

interface Appointment { 
  id: string; 
  date: string; 
  time: string; 
  status: string; 
  notes: string;
  client?: Client; 
  barber?: Barber; 
  service?: Service; 
  client_name?: string; 
  client_phone?: string; 
  barber_name?: string; 
  service_name?: string; 
}

interface HeroSlide { id: string; media_type: string; media_url: string; order_index: number; }
interface StorePromo { id: string; tag: string; title_left: string; subtitle_left: string; price_left: string; old_price_left: string; title_right: string; subtitle_right: string; price_right: string; old_price_right: string; media_type: string; media_url: string; promo_text: string; promo_highlight: string; promo_end: string; }
interface Reel { id: string; type: string; media_type: string; media_url: string; likes: string; comments: string; link: string; }
interface Review { id: string; name: string; text: string; rating: number; }
interface Faq { id: string; q: string; a: string; }

// ============================================================================
// FUNCIONES DE APOYO Y FORMATEO
// ============================================================================
const DynamicIcon = ({ name, size = 24, className = "" }: { name: string, size?: number, className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Scissors;
  return <IconComponent size={size} className={className} />;
};

// Función global de formateo de moneda a Peso Chileno
const formatMoney = (amount: number | string) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '$0';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(numericAmount);
};

const isValidUUID = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

// ============================================================================
// COMPONENTE PRINCIPAL DEL DASHBOARD
// ============================================================================
function AdminDashboardContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Estados de Navegación y UI
  const [activeTab, setActiveTab] = useState<TabType>("RESUMEN");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estados de Datos Base
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]); 
  const [clients, setClients] = useState<Client[]>([]); 
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [musicUrl, setMusicUrl] = useState<string>("");

  // Estados de la Web (Landing Page)
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [storePromos, setStorePromos] = useState<StorePromo[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);

  const [kpis, setKpis] = useState({ totalIngresos: 0, cortesHoy: 0, stockTotal: 0, clientesTotales: 0 });

  const [modalType, setModalType] = useState<ModalType>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab") as TabType;
    if (tab && tab !== "CITAS") setActiveTab(tab);
  }, [searchParams]);

  // ============================================================================
  // ESCUDO DE SEGURIDAD Y CARGA DE DATOS
  // ============================================================================
  const verifyAdminAndFetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user || userError) throw new Error("No session");

      const { data: userProfile } = await supabase.from('User').select('role').eq('id', user.id).single();
      
      if (userProfile?.role !== 'ADMIN') {
        setAuthError(true);
        await supabase.auth.signOut();
        router.push('/login?error=Acceso Denegado. Área exclusiva de Administración.');
        return;
      }

      const [
        dbBarbers, dbServices, dbInventory, dbClients, dbChairs, dbSettings, dbAppts,
        dbHero, dbPromos, dbReels, dbReviews, dbFaqs
      ] = await Promise.all([
        supabase.from('Barbers').select('*').order('created_at', { ascending: false }),
        supabase.from('Services').select('*').order('price', { ascending: true }),
        supabase.from('inventory').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('chairs').select('*').order('name', { ascending: true }),
        supabase.from('settings').select('*').eq('key', 'background_music').single(),
        supabase.from('Appointments').select(`id, date, time, status, notes, client_name, client_phone, barber_name, service_name, client:client_id (id, name, phone), barber:barber_id (id, name, email), service:service_id (id, name, price)`).order('date', { ascending: false }).order('time', { ascending: false }),
        supabase.from('HeroSlides').select('*').order('order_index', { ascending: true }),
        supabase.from('StorePromos').select('*').order('created_at', { ascending: false }),
        supabase.from('InstagramReels').select('*').order('created_at', { ascending: false }),
        supabase.from('Reviews').select('*').order('created_at', { ascending: false }),
        supabase.from('Faqs').select('*').order('created_at', { ascending: true })
      ]);

      if (dbBarbers.data) setBarbers(dbBarbers.data);
      if (dbServices.data) setServices(dbServices.data);
      if (dbChairs.data) setChairs(dbChairs.data);
      if (dbSettings.data) setMusicUrl(dbSettings.data.value);
      
      if (dbHero.data) setHeroSlides(dbHero.data);
      if (dbPromos.data) setStorePromos(dbPromos.data);
      if (dbReels.data) setReels(dbReels.data);
      if (dbReviews.data) setReviews(dbReviews.data);
      if (dbFaqs.data) setFaqs(dbFaqs.data);

      if (dbInventory.data) {
        setInventory(dbInventory.data);
        setKpis(prev => ({ ...prev, stockTotal: dbInventory.data.reduce((acc, item) => acc + item.stock, 0) }));
      }

      if (dbClients.data) {
        setClients(dbClients.data);
        setKpis(prev => ({ ...prev, clientesTotales: dbClients.data.length }));
      }

      if (dbAppts.data) {
        setAppointments(dbAppts.data as unknown as Appointment[]);
        const todayStr = new Date().toISOString().split('T')[0];
        const todayAppts = dbAppts.data.filter(a => a.date === todayStr && a.status === 'COMPLETED');
        
        // Sumamos los ingresos (ahora es el 100% de lo cobrado o arrendado)
        const ingresosHoy = todayAppts.reduce((acc, curr) => acc + Number((curr.service as any)?.price || 0), 0);
        
        setKpis(prev => ({ ...prev, cortesHoy: todayAppts.length, totalIngresos: ingresosHoy }));
      }

    } catch (error) {
      console.error("Error crítico de seguridad o red:", error);
      router.push('/login');
    } finally {
      setIsFetching(false);
    }
  }, [supabase, router]);

  // Sincronización en tiempo real
  useEffect(() => {
    verifyAdminAndFetchData();
    const channel = supabase.channel('admin-sync-master')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Services' }, verifyAdminAndFetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Appointments' }, verifyAdminAndFetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, verifyAdminAndFetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, verifyAdminAndFetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chairs' }, verifyAdminAndFetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Barbers' }, verifyAdminAndFetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'HeroSlides' }, verifyAdminAndFetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'StorePromos' }, verifyAdminAndFetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'InstagramReels' }, verifyAdminAndFetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [verifyAdminAndFetchData, supabase]);

  // Autoguardado de Música
  useEffect(() => {
    if (musicUrl && !isFetching) {
      const timer = setTimeout(async () => {
        await supabase.from('settings').upsert({ key: 'background_music', value: musicUrl });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [musicUrl, isFetching, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleTabClick = (tab: TabType) => {
    if (tab === "CITAS") {
      router.push('/dashboards/admin/todaslascitas');
      return;
    }
    setActiveTab(tab);
    setSearchQuery(""); 
    router.push(`/dashboards/admin?tab=${tab}`, { scroll: false });
  };

  const handleResetSection = () => {
    setSearchQuery("");
    verifyAdminAndFetchData(); 
  };

  const handleCopyLink = (id: string, name: string) => {
    const formattedName = name.toLowerCase().replace(/\s+/g, '-');
    const url = `${window.location.origin}/reservar?barber=${formattedName}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-red-500 gap-4">
        <ShieldAlert size={60} className="animate-pulse" />
        <h1 className="text-2xl font-black uppercase tracking-widest">Acceso Restringido</h1>
        <p className="text-zinc-500">Redirigiendo a zona segura...</p>
      </div>
    );
  }

  // ============================================================================
  // MANEJADORES DE ACCIONES Y MULTIMEDIA
  // ============================================================================
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploadingMusic(true);
      try {
        const fileExt = e.target.files[0].name.split('.').pop();
        const fileName = `vibe_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('music').upload(fileName, e.target.files[0]);
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('music').getPublicUrl(fileName);
        setMusicUrl(publicUrlData.publicUrl);
        alert("¡Música subida correctamente! Se ha autoguardado.");
      } catch (error: any) {
        alert(`Error: ${error.message}`);
      } finally {
        setIsUploadingMusic(false);
      }
    }
  };

  const openModal = (type: ModalType, item: any = null) => {
    setEditingItem(item);
    setImagePreview(item?.img || item?.image_url || item?.media_url || null);
    setSelectedImage(null);
    setModalType(type);
  };

  const handleDelete = async (table: string, id: string) => {
    if (!window.confirm("¿Confirmas la eliminación permanente de este registro?")) return;
    try {
      if (table === 'Barbers') {
        const response = await fetch('/api/admin/delete-barber', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        
        if (!response.ok) {
          const resError = await response.json();
          throw new Error(resError.error || 'Error al eliminar usuario Auth');
        }
      }

      if (isValidUUID(id)) await supabase.from(table).delete().eq('id', id);
      
      verifyAdminAndFetchData(); 
    } catch (error: any) {
      alert(`No se pudo eliminar: ${error.message}`);
    }
  };

  // ============================================================================
  // MOTOR CRUD UNIVERSAL
  // ============================================================================
  const handleSaveAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      let mediaUrl = editingItem?.img || editingItem?.image_url || editingItem?.media_url || ""; 
      let mediaType = editingItem?.media_type || "image";

      if (selectedImage) {
        const bucket = modalType === "BARBER" ? 'barber-profiles' : 'media';
        const fileExt = selectedImage.name.split('.').pop()?.toLowerCase();
        mediaType = (fileExt === 'mp4' || fileExt === 'mov' || fileExt === 'webm') ? 'video' : 'image';
        
        const fileName = `${mediaType}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error } = await supabase.storage.from(bucket).upload(fileName, selectedImage);
        if (!error) mediaUrl = supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
      }

      if (modalType === "BARBER") {
        const emailInput = formData.get("email") as string;
        const passwordInput = formData.get("password") as string;
        
        const payload = { 
          id: editingItem?.id, 
          name: formData.get("name") as string, 
          phone: formData.get("phone") as string, 
          role: formData.get("role") as string, 
          tag: formData.get("tag") as string, 
          status: formData.get("status") as string || "ACTIVE", 
          img: mediaUrl,
          email: emailInput,
          password: passwordInput
        };

        const response = await fetch('/api/admin/create-barber', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        
        if (!response.ok) {
           throw new Error(result.error || "Error al procesar el Barbero.");
        }
      }

      if (modalType === "SERVICE") {
         const data = { 
           name: formData.get("name") as string, 
           price: parseFloat(formData.get("price") as string), 
           time: formData.get("time") as string, 
           duration: parseInt(formData.get("duration") as string) || 60, // Sincronizado
           desc: formData.get("desc") as string, 
           iconName: (formData.get("iconName") as string) || "Scissors" 
         };
         if (editingItem && isValidUUID(editingItem.id)) await supabase.from('Services').update(data).eq('id', editingItem.id);
         else await supabase.from('Services').insert([data]);
      }

      if (modalType === "PRODUCT") {
        const data = { name: formData.get("name"), category: formData.get("category"), price: parseFloat(formData.get("price") as string), old_price: formData.get("old_price") ? parseFloat(formData.get("old_price") as string) : null, stock: parseInt(formData.get("stock") as string) || 0, sku: formData.get("sku"), tag: formData.get("tag"), description: formData.get("description"), image_url: mediaUrl };
        if (editingItem && isValidUUID(editingItem.id)) await supabase.from('inventory').update(data).eq('id', editingItem.id);
        else await supabase.from('inventory').insert([data]);
      }

      if (modalType === "CLIENT") {
        const data = { name: formData.get("name"), phone: formData.get("phone"), email: formData.get("email"), points: parseInt(formData.get("points") as string) || 0 };
        if (editingItem && isValidUUID(editingItem.id)) await supabase.from('clients').update(data).eq('id', editingItem.id);
        else await supabase.from('clients').insert([data]);
      }

      if (modalType === "CHAIR") {
        const data = { name: formData.get("name"), status: formData.get("status"), current_barber_id: formData.get("barber_id") || null, payment_due_date: formData.get("payment_due_date") || null };
        if (editingItem && isValidUUID(editingItem.id)) await supabase.from('chairs').update(data).eq('id', editingItem.id);
        else await supabase.from('chairs').insert([data]);
      }

      if (modalType === "HERO_SLIDE") {
        const data = { media_url: mediaUrl, media_type: mediaType, order_index: parseInt(formData.get("order_index") as string) || 0 };
        if (editingItem && isValidUUID(editingItem.id)) await supabase.from('HeroSlides').update(data).eq('id', editingItem.id);
        else await supabase.from('HeroSlides').insert([data]);
      }

      if (modalType === "STORE_PROMO") {
        const data = { 
          tag: formData.get("tag"), title_left: formData.get("title_left"), subtitle_left: formData.get("subtitle_left"), price_left: formData.get("price_left"), old_price_left: formData.get("old_price_left"),
          title_right: formData.get("title_right"), subtitle_right: formData.get("subtitle_right"), price_right: formData.get("price_right"), old_price_right: formData.get("old_price_right"),
          media_url: mediaUrl, media_type: mediaType, promo_text: formData.get("promo_text"), promo_highlight: formData.get("promo_highlight"), promo_end: formData.get("promo_end")
        };
        if (editingItem && isValidUUID(editingItem.id)) await supabase.from('StorePromos').update(data).eq('id', editingItem.id);
        else await supabase.from('StorePromos').insert([data]);
      }

      if (modalType === "REEL") {
        const data = { type: formData.get("type"), likes: formData.get("likes"), comments: formData.get("comments"), link: formData.get("link"), media_url: mediaUrl, media_type: mediaType };
        if (editingItem && isValidUUID(editingItem.id)) await supabase.from('InstagramReels').update(data).eq('id', editingItem.id);
        else await supabase.from('InstagramReels').insert([data]);
      }

      if (modalType === "REVIEW") {
        const data = { name: formData.get("name"), text: formData.get("text"), rating: parseInt(formData.get("rating") as string) || 5 };
        if (editingItem && isValidUUID(editingItem.id)) await supabase.from('Reviews').update(data).eq('id', editingItem.id);
        else await supabase.from('Reviews').insert([data]);
      }

      if (modalType === "FAQ") {
        const data = { q: formData.get("q"), a: formData.get("a") };
        if (editingItem && isValidUUID(editingItem.id)) await supabase.from('Faqs').update(data).eq('id', editingItem.id);
        else await supabase.from('Faqs').insert([data]);
      }

      setModalType(null);
      verifyAdminAndFetchData(); 
      alert("¡Base de datos actualizada correctamente!");
      
    } catch (error: any) {
      alert(`Error al procesar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING': return <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">Pendiente</span>;
      case 'CONFIRMED': return <span className="text-blue-500 bg-blue-500/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">Confirmado</span>;
      case 'COMPLETED': return <span className="text-green-500 bg-green-500/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">Pagado</span>;
      case 'CANCELLED': return <span className="text-red-500 bg-red-500/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">Cancelado</span>;
      default: return <span className="text-zinc-500 bg-zinc-500/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">{status}</span>;
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] pt-[140px] md:pt-[180px] pb-24 text-white relative">
      
      <style dangerouslySetInnerHTML={{__html: `
        aside, [class*="sidebar" i], [class*="SideBar" i] {
          padding-top: 140px !important;
          z-index: 50 !important;
        }
        @media (min-width: 768px) {
          aside, [class*="sidebar" i], [class*="SideBar" i] {
            padding-top: 180px !important;
          }
        }
      `}} />

      {/* Fondo de patrón */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 relative z-10">
        
        {/* HEADER DINÁMICO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4 bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-800/50 backdrop-blur-sm shadow-2xl">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase font-serif flex items-center gap-4">
              <Crown className="text-amber-500 w-10 h-10 md:w-12 md:h-12" />
              <span>Emperador <span className="text-amber-500">System</span></span>
            </h1>
            <p className="text-zinc-400 mt-2 font-medium tracking-wide">Acceso Nivel Dios: Control y Administración Global</p>
          </div>
          
          <div className="flex items-center gap-3">
            {isFetching && <span className="text-amber-500 text-xs font-black uppercase tracking-widest animate-pulse px-4 hidden md:flex"><Clock size={16} className="mr-2"/> Sync...</span>}
            
            <button onClick={verifyAdminAndFetchData} className="flex items-center gap-2 px-5 py-3 bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-amber-500 hover:border-amber-500 rounded-xl transition-all shadow-inner font-bold text-xs uppercase tracking-widest" title="Actualizar Base de Datos">
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} /> <span className="hidden md:block">Sincronizar</span>
            </button>
            
            <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-3 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all">
              <LogOut size={16} /> <span className="hidden md:block">Salir</span>
            </button>
          </div>
        </div>

        {/* TABS DE NAVEGACIÓN */}
        <div className="flex gap-2 mb-8 border-b border-zinc-800 pb-4 overflow-x-auto hide-scrollbar scroll-smooth">
          {[
            { id: "RESUMEN", icon: <LayoutDashboard size={18}/> },
            { id: "CITAS", icon: <CalendarDays size={18}/> },
            { id: "USUARIOS", icon: <Users size={18}/> },
            { id: "CLIENTES", icon: <Search size={18}/> },
            { id: "SILLONES", icon: <Armchair size={18}/> },
            { id: "SERVICIOS", icon: <Scissors size={18}/> },
            { id: "INVENTARIO", icon: <Boxes size={18}/> },
            { id: "WEB_HOME", icon: <LayoutDashboard size={18}/> },
            { id: "MUSICA", icon: <Music size={18}/> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id as TabType)}
              className={`px-6 py-3.5 rounded-xl font-black text-[11px] tracking-[0.2em] uppercase transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-2 ${
                activeTab === tab.id 
                  ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(217,119,6,0.3)]" 
                  : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800/50"
              }`}
            >
              {tab.icon} {tab.id.replace('_', ' ')}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          
          {/* --- TAB: RESUMEN --- */}
          {activeTab === "RESUMEN" && (
            <motion.div key="resumen" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Rendimiento en Tiempo Real</h2>
                <button onClick={handleResetSection} className="flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors text-xs font-bold uppercase tracking-widest"><RotateCcw size={14}/> Limpiar Datos</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard icon={<DollarSign />} title="Ingresos Totales (Hoy)" value={formatMoney(kpis.totalIngresos)} statusColor="text-green-500" />
                <KpiCard icon={<Scissors />} title="Cortes Generales Hoy" value={kpis.cortesHoy} />
                <KpiCard icon={<Boxes />} title="Productos en Stock" value={kpis.stockTotal} statusColor="text-amber-500" />
                <KpiCard icon={<Users />} title="Total Clientes Registrados" value={kpis.clientesTotales} />
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-[2rem] flex items-center gap-6">
                 <div className="w-16 h-16 bg-amber-500 text-black rounded-2xl flex items-center justify-center shrink-0 shadow-lg"><ShieldAlert size={32}/></div>
                 <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Escudo Administrador Activo</h3>
                    <p className="text-zinc-400 text-sm mt-1">Este panel está protegido. Solo los usuarios con rol 'ADMIN' en la base de datos pueden visualizar o modificar esta información.</p>
                 </div>
              </div>
            </motion.div>
          )}

          {/* --- TAB: USUARIOS / STAFF --- */}
          {activeTab === "USUARIOS" && (
            <motion.div key="usuarios" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Gestión de Usuarios y Staff</h2>
                  <p className="text-sm text-zinc-500">Administra los perfiles, accesos privados y enlaces de reserva únicos.</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={handleResetSection} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"><RotateCcw size={14}/> Recargar</button>
                  <button onClick={() => openModal("BARBER", null)} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                    <UserPlus size={16} /> Crear Barbero
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-[0.2em] border-b border-zinc-800">
                    <tr><th className="px-8 py-6">Perfil (Web)</th><th className="px-6 py-6">Rol / Etiqueta</th><th className="px-6 py-6">Estado App</th><th className="px-8 py-6 text-right">Configuración & Link</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {barbers.map(b => (
                      <tr key={b.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0">
                              {b.img ? <Image src={b.img} alt={b.name} fill className="object-cover" unoptimized /> : <UserCircle2 className="w-full h-full p-2 text-zinc-500" />}
                            </div>
                            <div>
                              <span className="font-bold text-white text-base block">{b.name}</span>
                              <span className={`text-[10px] font-mono flex items-center gap-1 mt-1 ${b.email ? 'text-green-500' : 'text-zinc-500'}`}>
                                <KeyRound size={10}/> {b.email ? 'Acceso Habilitado' : 'Sin Acceso'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5"><p className="text-white font-bold mb-1">{b.role}</p><span className="inline-block px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] uppercase font-black rounded">{b.tag}</span></td>
                        <td className="px-6 py-5"><span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${b.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{b.status === 'ACTIVE' ? 'Visible' : 'Oculto'}</span></td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end items-center gap-4">
                            <button 
                              onClick={() => handleCopyLink(b.id, b.name)} 
                              className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                              title="El enlace dirige al cliente directo a la agenda de este barbero"
                            >
                              {copiedId === b.id ? <><CheckCircle2 size={14}/> Copiado</> : <><Link2 size={14}/> Link Reserva</>}
                            </button>

                            <div className="h-6 w-px bg-zinc-800"></div>

                            <button onClick={() => openModal("BARBER", b)} className="p-2 text-zinc-500 hover:text-white transition-colors" title="Editar Perfil"><Edit3 size={18} /></button>
                            <button onClick={() => handleDelete('Barbers', b.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors" title="Borrar Barbero"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* --- TAB: SILLONES --- */}
          {activeTab === "SILLONES" && (
            <motion.div key="sillones" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="flex justify-between items-center mb-6">
                <div><h2 className="text-2xl font-bold text-white mb-1">Arriendo de Sillones</h2></div>
                <div className="flex gap-4">
                  <button onClick={handleResetSection} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"><RotateCcw size={14}/> Recargar</button>
                  <button onClick={() => openModal("CHAIR", null)} className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs uppercase tracking-widest rounded-xl"><Plus size={16} /> Crear Estación</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {chairs.map(chair => {
                  const assignedBarber = barbers.find(b => b.id === chair.current_barber_id);
                  return (
                    <div key={chair.id} className={`p-8 rounded-[2rem] border relative overflow-hidden transition-all duration-500 group ${chair.status === 'OCCUPIED' ? 'bg-zinc-900/80 border-amber-500/40 shadow-[0_0_30px_rgba(217,119,6,0.1)]' : 'bg-zinc-950 border-zinc-800'}`}>
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openModal("CHAIR", chair)} className="p-2 bg-black text-zinc-400 hover:text-amber-500 rounded-lg"><Edit3 size={14}/></button></div>
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${chair.status === 'OCCUPIED' ? 'bg-amber-500 text-black shadow-lg' : 'bg-zinc-900 text-zinc-600'}`}><Armchair size={28} /></div>
                        <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${chair.status === 'OCCUPIED' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-zinc-800 text-zinc-500'}`}>{chair.status === 'OCCUPIED' ? 'Arrendado' : 'Disponible'}</span>
                      </div>
                      <h3 className="text-xl font-black text-white mb-4 tracking-tight">{chair.name}</h3>
                      {chair.status === 'OCCUPIED' ? (
                        <div className="space-y-4">
                          <div className="bg-black/50 border border-zinc-800/50 p-4 rounded-xl">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><UserCircle2 size={12}/> Barbero Asignado</p>
                            <p className="text-white font-bold text-sm truncate">{assignedBarber ? assignedBarber.name : "Sin asignar"}</p>
                          </div>
                          {chair.payment_due_date && <div className="flex items-center gap-2 text-xs font-bold text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20"><CalendarDays size={16} /> Pago: {new Date(chair.payment_due_date).toLocaleDateString('es-CL')}</div>}
                        </div>
                      ) : (<p className="text-zinc-600 text-sm font-medium">Estación libre lista para arriendo.</p>)}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* --- TAB: CLIENTES --- */}
          {activeTab === "CLIENTES" && (
            <motion.div key="clientes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="flex justify-between items-center mb-6">
                <div><h2 className="text-2xl font-bold text-white mb-1">Cartera de Clientes</h2></div>
                <div className="flex gap-4">
                  <button onClick={handleResetSection} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"><RotateCcw size={14}/> Limpiar Búsqueda</button>
                  <button onClick={() => openModal("CLIENT", null)} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-xl"><UserPlus size={16} /> Nuevo Cliente</button>
                </div>
              </div>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input type="text" placeholder="Buscar cliente por nombre o celular..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-amber-500 outline-none transition-all shadow-inner" />
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2rem] overflow-hidden">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-[0.2em] border-b border-zinc-800 text-zinc-500">
                    <tr><th className="px-8 py-6">Cliente</th><th className="px-6 py-6">Contacto</th><th className="px-6 py-6 text-center">Puntos VIP</th><th className="px-8 py-6 text-right">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery)).map(c => (
                      <tr key={c.id} className="hover:bg-zinc-800/20 transition-colors group">
                        <td className="px-8 py-5"><p className="font-black text-white text-base">{c.name}</p></td>
                        <td className="px-6 py-5"><p className="font-mono text-xs text-white flex items-center gap-2"><Smartphone size={14} className="text-zinc-500"/> {c.phone}</p></td>
                        <td className="px-6 py-5 text-center"><span className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm">{c.points || 0} PTS</span></td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-3">
                            <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}?text=Hola%20${c.name}...`} target="_blank" rel="noreferrer" className="p-2 text-green-500 hover:bg-green-500 hover:text-black rounded-lg transition-colors"><MessageCircle size={18} /></a>
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

          {/* --- TAB: SERVICIOS --- */}
          {activeTab === "SERVICIOS" && (
            <motion.div key="servicios" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
               <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Menú de Servicios Públicos</h2>
                <div className="flex gap-4">
                  <button onClick={handleResetSection} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"><RotateCcw size={14}/> Recargar</button>
                  <button onClick={() => openModal("SERVICE", null)} className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white font-black text-xs uppercase tracking-widest rounded-xl"><Plus size={16} /> Nuevo</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {services.map(s => (
                  <div key={s.id} className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 relative group hover:border-amber-500/40 transition-colors">
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal("SERVICE", s)} className="p-2 bg-black text-zinc-400 hover:text-amber-500 rounded-lg"><Edit3 size={16}/></button>
                      <button onClick={() => handleDelete('Services', s.id)} className="p-2 bg-black text-zinc-400 hover:text-red-500 rounded-lg"><Trash2 size={16}/></button>
                    </div>
                    <div className="w-14 h-14 bg-black border border-zinc-800 rounded-2xl flex items-center justify-center text-amber-500 mb-6 shadow-lg"><DynamicIcon name={s.iconName || "Scissors"} size={24} /></div>
                    <h3 className="text-xl font-black text-white pr-16 mb-3 uppercase">{s.name}</h3>
                    <p className="text-sm text-zinc-400 mb-8 line-clamp-2">{s.desc}</p>
                    <div className="flex justify-between items-end pt-6 border-t border-zinc-800/80">
                      <div>
                        <span className="block text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={12}/> {s.time} ({s.duration || 60} MIN REA)</span>
                        <span className="text-3xl font-black text-amber-500 tracking-tighter">{formatMoney(s.price)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* --- TAB: INVENTARIO --- */}
          {activeTab === "INVENTARIO" && (
            <motion.div key="inventario" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Inventario Tienda</h2>
                <div className="flex gap-4">
                  <button onClick={handleResetSection} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"><RotateCcw size={14}/> Recargar</button>
                  <button onClick={() => openModal("PRODUCT", null)} className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-xl"><Plus size={16} /> Añadir Producto</button>
                </div>
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

          {/* --- TAB: WEB & HOME ADMIN --- */}
          {activeTab === "WEB_HOME" && (
            <motion.div key="web_home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              
              <div className="flex justify-end">
                <button onClick={handleResetSection} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"><RotateCcw size={14}/> Recargar Web</button>
              </div>

              {/* Hero / Portada */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2"><Video className="text-amber-500"/> Multimedia Portada (Hero)</h3>
                  <button onClick={() => openModal("HERO_SLIDE", null)} className="px-4 py-2 bg-zinc-800 text-white text-xs font-bold uppercase rounded-lg hover:bg-amber-500 hover:text-black transition-colors">Añadir Archivo</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {heroSlides.map(slide => (
                    <div key={slide.id} className="relative aspect-[9/16] bg-zinc-900 rounded-2xl overflow-hidden group border border-zinc-800">
                      {slide.media_type === 'video' ? (
                        <video src={slide.media_url} className="w-full h-full object-cover" muted loop autoPlay />
                      ) : (
                        <Image src={slide.media_url} fill alt="Hero" className="object-cover" unoptimized />
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => openModal("HERO_SLIDE", slide)} className="p-2 bg-zinc-800 text-white rounded-lg hover:text-amber-500"><Edit3 size={16}/></button>
                        <button onClick={() => handleDelete('HeroSlides', slide.id)} className="p-2 bg-zinc-800 text-white rounded-lg hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Promociones Store */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2"><ShoppingBag className="text-amber-500"/> Promociones Tienda Web</h3>
                  <button onClick={() => openModal("STORE_PROMO", null)} className="px-4 py-2 bg-zinc-800 text-white text-xs font-bold uppercase rounded-lg hover:bg-amber-500 hover:text-black transition-colors">Añadir Promo</button>
                </div>
                <div className="space-y-4">
                  {storePromos.map(promo => (
                    <div key={promo.id} className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden relative">
                          <Image src={promo.media_url} fill alt="Promo" className="object-cover" unoptimized />
                        </div>
                        <div>
                          <h4 className="font-bold text-white uppercase">{promo.tag}</h4>
                          <p className="text-xs text-zinc-500">{promo.title_left} & {promo.title_right}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openModal("STORE_PROMO", promo)} className="p-2 text-zinc-400 hover:text-white"><Edit3 size={18}/></button>
                        <button onClick={() => handleDelete('StorePromos', promo.id)} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid Instagram */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2"><Instagram className="text-amber-500"/> Grid Instagram Web</h3>
                  <button onClick={() => openModal("REEL", null)} className="px-4 py-2 bg-zinc-800 text-white text-xs font-bold uppercase rounded-lg hover:bg-amber-500 hover:text-black transition-colors">Añadir Post/Reel</button>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {reels.map(reel => (
                    <div key={reel.id} className="relative aspect-square bg-zinc-900 overflow-hidden group">
                      {reel.media_type === 'video' ? <video src={reel.media_url} className="w-full h-full object-cover" muted /> : <Image src={reel.media_url} fill alt="Reel" className="object-cover" unoptimized />}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <span className="text-[10px] font-bold text-white"><Heart size={10} className="inline"/> {reel.likes}</span>
                        <button onClick={() => handleDelete('InstagramReels', reel.id)} className="text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews y FAQs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Star className="text-amber-500"/> Reseñas (Testimonios)</h3>
                    <button onClick={() => openModal("REVIEW", null)} className="px-3 py-1.5 bg-zinc-800 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-amber-500 hover:text-black">Añadir</button>
                  </div>
                  <div className="space-y-2">
                    {reviews.map(r => (
                      <div key={r.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex justify-between items-start">
                        <div><p className="font-bold text-white text-sm">{r.name} <span className="text-amber-500 ml-2">({r.rating}⭐)</span></p><p className="text-xs text-zinc-400 mt-1 line-clamp-1">{r.text}</p></div>
                        <button onClick={() => handleDelete('Reviews', r.id)} className="text-zinc-500 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><HelpCircle className="text-amber-500"/> Preguntas Frecuentes</h3>
                    <button onClick={() => openModal("FAQ", null)} className="px-3 py-1.5 bg-zinc-800 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-amber-500 hover:text-black">Añadir</button>
                  </div>
                  <div className="space-y-2">
                    {faqs.map(f => (
                      <div key={f.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex justify-between items-start">
                        <div><p className="font-bold text-white text-sm">{f.q}</p><p className="text-xs text-zinc-400 mt-1 line-clamp-1">{f.a}</p></div>
                        <button onClick={() => handleDelete('Faqs', f.id)} className="text-zinc-500 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* --- TAB: MUSICA --- */}
          {activeTab === "MUSICA" && (
            <motion.div key="musica" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Reproductor de Música Global</h2>
                <button onClick={handleResetSection} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"><RotateCcw size={14}/> Recargar Estado</button>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-10 max-w-4xl shadow-xl">
                 <label className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   Enlace del Audio MP3 
                   <span className="bg-green-500/10 border border-green-500/20 text-green-500 px-2 py-0.5 rounded-lg text-[9px] flex items-center gap-1"><Clock size={10}/> Autoguardado</span>
                 </label>
                 <div className="flex flex-col md:flex-row gap-4 mb-8">
                   <input type="text" value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none" />
                   <button onClick={() => musicInputRef.current?.click()} className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase flex gap-3"><UploadCloud size={18} /> Subir MP3</button>
                   <input type="file" accept="audio/*" className="hidden" ref={musicInputRef} onChange={handleMusicUpload} />
                 </div>
                 {musicUrl && <audio src={musicUrl} controls className="w-full mt-4" />}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* =================================================================== */}
      {/* MODAL MAESTRO MULTIPROPÓSITO */}
      {/* =================================================================== */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalType(null)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#0a0a0a] border border-zinc-800 rounded-[3rem] p-8 md:p-12 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar z-10">
              <button onClick={() => setModalType(null)} className="absolute top-8 right-8 text-zinc-500 hover:text-white bg-zinc-900 p-2 rounded-full"><X size={20}/></button>
              
              <div className="mb-8">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Configuración</h3>
              </div>
              
              <form onSubmit={handleSaveAction} className="space-y-6">
                
                {/* UPLOADER DE ARCHIVOS GENERAL */}
                {(modalType === "BARBER" || modalType === "PRODUCT" || modalType === "HERO_SLIDE" || modalType === "STORE_PROMO" || modalType === "REEL") && (
                  <div className="flex justify-center mb-8">
                    <div className={`relative rounded-[2.5rem] border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-amber-500 group ${modalType === 'PRODUCT' ? 'w-full h-48' : 'w-36 h-36'}`} onClick={() => fileInputRef.current?.click()}>
                      {imagePreview ? (
                        imagePreview.includes('.mp4') ? <video src={imagePreview} className="object-cover w-full h-full" autoPlay muted loop /> : <Image src={imagePreview} alt="Preview" fill className={modalType === 'PRODUCT' ? 'object-contain p-4' : 'object-cover'} unoptimized />
                      ) : editingItem?.img || editingItem?.image_url || editingItem?.media_url ? (
                        (editingItem.img || editingItem.image_url || editingItem.media_url).includes('.mp4') ? <video src={editingItem.img || editingItem.image_url || editingItem.media_url} className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all" autoPlay muted loop /> : <Image src={editingItem.img || editingItem.image_url || editingItem.media_url} alt="Current" fill className="object-cover grayscale group-hover:grayscale-0 transition-all" unoptimized />
                      ) : (
                        <><UploadCloud className="text-zinc-600 mb-3 group-hover:text-amber-500" size={32} /><span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest text-center px-2 group-hover:text-amber-500">Subir Archivo</span></>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><UploadCloud className="text-white" size={32} /></div>
                    </div>
                    <input type="file" accept="image/*,video/mp4" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                  </div>
                )}

                {/* --- FORMULARIO: SERVICIO --- */}
                {modalType === "SERVICE" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <InputField label="Nombre del Servicio" name="name" defaultValue={editingItem?.name || ""} required />
                      <InputField label="Icono (Ej: Scissors, Star, Tag)" name="iconName" defaultValue={editingItem?.iconName || "Scissors"} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <InputField label="Precio" name="price" type="number" defaultValue={editingItem?.price || ""} required />
                      <InputField label="Etiqueta Visual (Ej: 60 Min)" name="time" defaultValue={editingItem?.time || ""} required />
                      <InputField label="Minutos Reales (Agenda)" name="duration" type="number" defaultValue={editingItem?.duration || 60} required />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Descripción</label>
                      <textarea name="desc" defaultValue={editingItem?.desc || ""} required className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none focus:border-amber-500 transition-colors" rows={3} />
                    </div>
                  </>
                )}

                {/* --- FORMULARIO: BARBERO --- */}
                {modalType === "BARBER" && (
                  <>
                    <InputField label="Nombre Completo" name="name" defaultValue={editingItem?.name || ""} required />
                    <div className="grid grid-cols-2 gap-5"><InputField label="Especialidad (Rol)" name="role" defaultValue={editingItem?.role || ""} required /><InputField label="Etiqueta Visual" name="tag" defaultValue={editingItem?.tag || ""} required /></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <InputField label="Email (Acceso)" name="email" type="email" defaultValue={editingItem?.email || ""} disabled={!!editingItem?.email} />
                      
                      {(!editingItem || !editingItem.email) ? (
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest pl-2">Contraseña Temporal</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                            <input name="password" type="text" minLength={6} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-10 pr-6 py-4 text-white focus:border-amber-500 outline-none" required={!editingItem} placeholder={editingItem ? "Obligatorio para dar acceso" : ""} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <InputField label="Teléfono" name="phone" defaultValue={editingItem?.phone || ""} />
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Estado</label>
                        <select name="status" defaultValue={editingItem?.status || "ACTIVE"} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-bold">
                          <option value="ACTIVE">Activo</option>
                          <option value="INACTIVE">Inactivo</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* --- FORMULARIOS RESTANTES --- */}
                {modalType === "CHAIR" && (
                  <>
                    <InputField label="Nombre del Sillón" name="name" defaultValue={editingItem?.name || ""} required />
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2"><label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">Estado</label><select name="status" defaultValue={editingItem?.status || "FREE"} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white"><option value="FREE">Libre</option><option value="OCCUPIED">Arrendado</option></select></div>
                      <div className="space-y-2"><label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 pl-2">Asignar A</label><select name="barber_id" defaultValue={editingItem?.current_barber_id || ""} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white"><option value="">Ninguno</option>{barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                    </div>
                    <InputField label="Fecha Pago" name="payment_due_date" type="date" defaultValue={editingItem?.payment_due_date || ""} />
                  </>
                )}

                {modalType === "PRODUCT" && (
                  <>
                    <div className="grid grid-cols-2 gap-5"><InputField label="Nombre" name="name" defaultValue={editingItem?.name || ""} required /><InputField label="Categoría" name="category" defaultValue={editingItem?.category || ""} required /></div>
                    <div className="grid grid-cols-2 gap-5"><InputField label="Precio Venta" name="price" type="number" defaultValue={editingItem?.price || ""} required /><InputField label="Precio Anterior" name="old_price" type="number" defaultValue={editingItem?.old_price || ""} /></div>
                    <div className="grid grid-cols-3 gap-4"><InputField label="SKU" name="sku" defaultValue={editingItem?.sku || ""} /><InputField label="Stock" name="stock" type="number" defaultValue={editingItem?.stock || 0} required /><InputField label="Badge" name="tag" defaultValue={editingItem?.tag || ""} /></div>
                  </>
                )}

                {modalType === "HERO_SLIDE" && (
                  <InputField label="Orden de Aparición" name="order_index" type="number" defaultValue={editingItem?.order_index || 1} required />
                )}

                {modalType === "STORE_PROMO" && (
                  <>
                    <InputField label="Tag Superior" name="tag" defaultValue={editingItem?.tag || ""} placeholder="LAST DAY!" required />
                    <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4"><div className="space-y-2"><p className="text-amber-500 text-xs font-bold">Lado Izquierdo</p><InputField label="Título" name="title_left" defaultValue={editingItem?.title_left || ""} /><InputField label="Subtítulo" name="subtitle_left" defaultValue={editingItem?.subtitle_left || ""} /><InputField label="Precio" name="price_left" defaultValue={editingItem?.price_left || ""} /><InputField label="Precio Antiguo" name="old_price_left" defaultValue={editingItem?.old_price_left || ""} /></div><div className="space-y-2"><p className="text-amber-500 text-xs font-bold">Lado Derecho</p><InputField label="Título" name="title_right" defaultValue={editingItem?.title_right || ""} /><InputField label="Subtítulo" name="subtitle_right" defaultValue={editingItem?.subtitle_right || ""} /><InputField label="Precio" name="price_right" defaultValue={editingItem?.price_right || ""} /><InputField label="Precio Antiguo" name="old_price_right" defaultValue={editingItem?.old_price_right || ""} /></div></div>
                  </>
                )}

                {modalType === "REEL" && (
                  <>
                    <div className="grid grid-cols-2 gap-5"><div className="space-y-2"><label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Tipo</label><select name="type" defaultValue={editingItem?.type || "post"} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white"><option value="post">Post Normal</option><option value="reel">Reel de Video</option></select></div><InputField label="Link Oficial Instagram" name="link" defaultValue={editingItem?.link || ""} /></div>
                    <div className="grid grid-cols-2 gap-5"><InputField label="Likes (Ej: 12.4k)" name="likes" defaultValue={editingItem?.likes || ""} /><InputField label="Comentarios" name="comments" defaultValue={editingItem?.comments || ""} /></div>
                  </>
                )}

                {modalType === "REVIEW" && (
                  <><InputField label="Nombre Cliente" name="name" defaultValue={editingItem?.name || ""} required /><InputField label="Estrellas (1-5)" name="rating" type="number" defaultValue={editingItem?.rating || 5} required /><div className="space-y-2"><label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Testimonio</label><textarea name="text" defaultValue={editingItem?.text || ""} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none" rows={3} required></textarea></div></>
                )}

                {modalType === "FAQ" && (
                  <><InputField label="Pregunta" name="q" defaultValue={editingItem?.q || ""} required /><div className="space-y-2"><label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Respuesta</label><textarea name="a" defaultValue={editingItem?.a || ""} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white outline-none" rows={4} required></textarea></div></>
                )}

                <div className="pt-8 border-t border-zinc-800 mt-8">
                  <button type="submit" disabled={isLoading} className="w-full py-5 text-black font-black uppercase tracking-[0.2em] text-sm bg-amber-500 hover:bg-amber-400 rounded-2xl transition-all active:scale-95 flex justify-center items-center gap-3">
                    {isLoading ? <Clock className="animate-spin" /> : <><Save size={20}/> Procesar y Guardar</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

// ============================================================================
// COMPONENTES UI REUTILIZABLES
// ============================================================================
function InputField({ label, name, type = "text", defaultValue, required = false, placeholder = "", disabled = false }: any) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder} disabled={disabled} className={`w-full rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-all placeholder:text-zinc-700 ${disabled ? 'bg-zinc-950/50 border border-zinc-800/50 text-zinc-500 cursor-not-allowed' : 'bg-zinc-950 border border-zinc-800 shadow-inner'}`} />
    </div>
  );
}

function KpiCard({ icon, title, value, trend, statusColor = "text-amber-500" }: { icon: React.ReactNode, title: string, value: string | number, trend?: string, statusColor?: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 hover:border-amber-500/50 transition-colors group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
      <div className={`w-14 h-14 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform ${statusColor}`}>{icon}</div>
      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <h4 className={`text-4xl font-black tracking-tighter ${statusColor === 'text-amber-500' ? 'text-white' : statusColor}`}>{value}</h4>
      {trend && <div className="mt-4 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg"><TrendingUp size={14} className="text-green-500" /><span className="text-green-500 text-[10px] font-black uppercase">{trend}</span></div>}
    </div>
  );
}

// Wrapper con Suspense para Next.js
export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center text-amber-500"><Clock className="animate-spin" size={32}/></div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}