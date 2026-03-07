"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { 
  Users, Plus, Edit3, Trash2, X, Save, UploadCloud, 
  ShieldAlert, Clock, ArrowLeft, UserCircle2, KeyRound, Lock, Heart
} from "lucide-react";
import { createBarberAccount } from "@/app/actions/admin";

// ============================================================================
// INTERFAZ DE DATOS (Solución raíz al error ts2339)
// ============================================================================
export interface Barber {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE" | string;
  role: string;
  tag: string;
  img: string;
}

export default function AdminUsersPage() {
  const supabase = createClient();
  const router = useRouter();

  // Estados de Base de Datos
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [authError, setAuthError] = useState(false);

  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // FIX CRÍTICO: Definimos explícitamente que puede ser Barber o null
  const [editingItem, setEditingItem] = useState<Barber | null>(null);
  
  // Estados de Imágenes
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // ============================================================================
  // SEGURIDAD Y CARGA DE DATOS
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
        router.push('/login?error=Acceso Denegado.');
        return;
      }

      const { data: dbBarbers } = await supabase.from('Barbers').select('*').order('created_at', { ascending: false });
      if (dbBarbers) setBarbers(dbBarbers as Barber[]);

    } catch (error) {
      router.push('/login');
    } finally {
      setIsFetching(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    verifyAdminAndFetchData();
    const channel = supabase.channel('admin-users-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Barbers' }, () => verifyAdminAndFetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [verifyAdminAndFetchData, supabase]);

  // ============================================================================
  // MANEJADORES DE ACCIONES
  // ============================================================================
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const openModal = (item: Barber | null = null) => {
    setEditingItem(item);
    setImagePreview(item?.img || null);
    setSelectedImage(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este barbero permanentemente? Perderá el acceso al sistema.")) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('Barbers').delete().eq('id', id);
      if (error) throw error;
      verifyAdminAndFetchData();
    } catch (error: any) {
      alert(`Error al eliminar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      let imageUrl = editingItem?.img || ""; 
      
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `barber_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('barber-profiles').upload(fileName, selectedImage);
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('barber-profiles').getPublicUrl(fileName);
          imageUrl = publicUrlData.publicUrl;
        }
      }

      if (editingItem && editingItem.id) {
        // MODO EDICIÓN
        const updateData = {
          name: formData.get("name") as string,
          phone: formData.get("phone") as string,
          role: formData.get("role") as string,
          tag: formData.get("tag") as string,
          status: formData.get("status") as string || "ACTIVE",
          img: imageUrl
        };
        const { error } = await supabase.from('Barbers').update(updateData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        // MODO CREACIÓN
        const newBarberData = {
          name: formData.get("name") as string,
          email: formData.get("email") as string,
          password: formData.get("password") as string,
          phone: formData.get("phone") as string,
          role: formData.get("role") as string,
          tag: formData.get("tag") as string,
          status: formData.get("status") as string || "ACTIVE",
          img: imageUrl
        };
        const result = await createBarberAccount(newBarberData);
        if (result.error) throw new Error(result.error);
      }

      setIsModalOpen(false);
      verifyAdminAndFetchData(); 
      alert("¡Operación exitosa!");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (authError) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-black tracking-widest uppercase">Acceso Denegado</div>;

  return (
    <div className="max-w-[1400px] mx-auto pb-20 p-6 md:p-10">
      
      <button onClick={() => router.push('/dashboards/admin')} className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 font-bold uppercase tracking-widest text-xs mb-8 transition-colors group w-max">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver al Panel Central
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase font-serif flex items-center gap-4">
            <Users className="text-amber-500 w-10 h-10" /> Staff & <span className="text-amber-500">Usuarios</span>
          </h1>
          <p className="text-zinc-400 mt-2 font-medium tracking-wide">Administra los accesos privados de tus barberos.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {isFetching && <span className="text-amber-500 text-xs font-black uppercase tracking-widest animate-pulse flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-xl"><Clock size={16} /> Sync...</span>}
          <button onClick={() => openModal(null)} className="flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_10px_30px_rgba(217,119,6,0.3)] active:scale-95">
            <Plus size={18} /> Crear Usuario
          </button>
        </div>
      </div>

      {/* TABLA DE USUARIOS */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-[0.2em] border-b border-zinc-800 text-zinc-500">
              <tr>
                <th className="px-8 py-6">Perfil</th>
                <th className="px-6 py-6">Especialidad</th>
                <th className="px-6 py-6">Acceso</th>
                <th className="px-6 py-6 text-center">Estado</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {barbers.map(b => (
                <tr key={b.id} className="hover:bg-zinc-800/20 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-800">
                        {b.img ? <Image src={b.img} alt={b.name} fill className="object-cover" unoptimized /> : <UserCircle2 className="w-full h-full p-2 text-zinc-500" />}
                      </div>
                      <div>
                        <span className="font-black text-white text-base block">{b.name}</span>
                        <span className="text-[9px] uppercase font-black text-amber-500 bg-amber-500/10 px-2 rounded">{b.tag}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-bold text-white uppercase tracking-tight">{b.role}</td>
                  <td className="px-6 py-5 font-mono text-xs"><KeyRound size={14} className="inline mr-2 text-amber-500"/>{b.email}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${b.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500'}`}>
                      {b.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-3">
                        <button onClick={() => openModal(b)} className="p-3 bg-zinc-950 rounded-xl text-zinc-500 hover:text-white border border-zinc-800 transition-colors"><Edit3 size={18} /></button>
                        <button onClick={() => handleDelete(b.id)} className="p-3 bg-zinc-950 rounded-xl text-zinc-500 hover:text-red-500 border border-zinc-800 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL MAESTRO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#0a0a0a] border border-zinc-800 rounded-[3rem] p-8 md:p-12 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white bg-zinc-900 p-2 rounded-full transition-colors"><X size={20}/></button>
              
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-8">
                {editingItem ? "Editar Perfil" : "Nueva Cuenta Staff"}
              </h3>
              
              <form onSubmit={handleSaveAction} className="space-y-6">
                
                {/* 1. Foto */}
                <div className="flex justify-center mb-8">
                  <div className="relative w-36 h-36 rounded-[2.5rem] border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-amber-500 group transition-colors shadow-inner" onClick={() => fileInputRef.current?.click()}>
                    {imagePreview ? (
                      <Image src={imagePreview} alt="Preview" fill className="object-cover" unoptimized />
                    ) : editingItem?.img ? (
                      <Image src={editingItem.img} alt="Current" fill className="object-cover grayscale group-hover:grayscale-0 transition-all" unoptimized />
                    ) : (
                      <>
                        <UploadCloud className="text-zinc-600 mb-3 group-hover:text-amber-500" size={32} />
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest group-hover:text-amber-500">Subir Foto</span>
                      </>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm"><UploadCloud className="text-white" size={32} /></div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                </div>

                {/* 2. Datos Generales */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Nombre Público</label>
                  <input name="name" defaultValue={editingItem?.name || ""} required placeholder="Ej. Cesar Luna" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-colors" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Especialidad</label>
                    <input name="role" defaultValue={editingItem?.role || ""} required placeholder="Master Barber" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Etiqueta Destacada</label>
                    <input name="tag" defaultValue={editingItem?.tag || ""} required placeholder="El Arquitecto" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none" />
                  </div>
                </div>

                {/* 3. Accesos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest pl-2">Email Login</label>
                    <input name="email" type="email" defaultValue={editingItem?.email || ""} disabled={!!editingItem} placeholder="ejemplo@emperador.cl" className={`w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none transition-colors shadow-inner ${editingItem ? 'opacity-50 cursor-not-allowed' : ''}`} required />
                  </div>
                  
                  {!editingItem ? (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest pl-2">Contraseña Temporal</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                        <input name="password" type="text" placeholder="Min. 6 caracteres" minLength={6} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-10 pr-6 py-4 text-white focus:border-amber-500 outline-none" required />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Teléfono</label>
                      <input name="phone" defaultValue={editingItem?.phone || ""} placeholder="+56 9..." className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none" />
                    </div>
                  )}
                </div>

                {!editingItem && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Teléfono</label>
                    <input name="phone" defaultValue={editingItem?.phone || ""} placeholder="+56 9..." className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none" />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Estado en App</label>
                  <select name="status" defaultValue={editingItem?.status || "ACTIVE"} className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:border-amber-500 outline-none font-bold cursor-pointer">
                    <option value="ACTIVE">Activo y Visible</option>
                    <option value="INACTIVE">Suspendido / Deshabilitado</option>
                  </select>
                </div>

                <div className="pt-8 border-t border-zinc-800 mt-8">
                  <button type="submit" disabled={isLoading} className="w-full py-5 text-black font-black uppercase tracking-[0.2em] text-sm bg-amber-500 hover:bg-amber-400 rounded-2xl transition-all shadow-[0_10px_30px_rgba(217,119,6,0.3)] active:scale-95 flex justify-center items-center gap-3">
                    {isLoading ? <Clock className="animate-spin" /> : <><Save size={20}/> Guardar Cambios</>}
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