"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  CalendarDays, Search, Trash2, ShieldAlert, ArrowLeft,
  Clock, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";

// ============================================================================
// TIPADOS REALES (CON RELACIONES DE TABLAS)
// ============================================================================
interface Appointment {
  id: string;
  date: string;
  time: string;
  status: string;
  client: { name: string; phone: string };
  barber: { name: string };
  service: { name: string; price: number };
}

const formatMoney = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0);

// ============================================================================
// COMPONENTE PRINCIPAL (AGENDA GLOBAL)
// ============================================================================
export default function AdminTodasLasCitasPage() {
  const supabase = createClient();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [authError, setAuthError] = useState(false);

  // ============================================================================
  // ESCUDO Y CARGA DE DATOS MAESTROS
  // ============================================================================
  const verifyAdminAndFetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      // 1. Verificamos la Sesión actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user || userError) throw new Error("No session");

      // 2. Verificamos el Rol del Usuario (Escudo Anti-Intrusos)
      const { data: userProfile } = await supabase.from('User').select('role').eq('id', user.id).single();
      
      if (userProfile?.role !== 'ADMIN') {
        setAuthError(true);
        await supabase.auth.signOut();
        router.push('/login?error=Acceso Denegado. Se requiere nivel Administrador.');
        return;
      }

      // 3. Extraemos todas las citas y sus relaciones cruzadas
      const { data } = await supabase
        .from('appointments')
        .select(`
          id, date, time, status,
          client:client_id (name, phone),
          barber:barber_id (name),
          service:service_id (name, price)
        `)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (data) setAppointments(data as unknown as Appointment[]);

    } catch (error) {
      console.error("Error crítico:", error);
      router.push('/login');
    } finally {
      setIsFetching(false);
    }
  }, [supabase, router]);

  // ============================================================================
  // SINCRONIZACIÓN EN TIEMPO REAL (WEBSOCKETS)
  // ============================================================================
  useEffect(() => {
    verifyAdminAndFetchData();

    // Nos suscribimos a cualquier cambio en la tabla de citas
    const channel = supabase.channel('agenda-global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        verifyAdminAndFetchData(); // Si hay un cambio, recargamos la tabla automáticamente
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [verifyAdminAndFetchData, supabase]);

  // ============================================================================
  // ACCIONES CRUD
  // ============================================================================
  const handleDelete = async (id: string) => {
    if (!window.confirm("ATENCIÓN: ¿Seguro que deseas eliminar esta cita globalmente del sistema de forma permanente?")) return;
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      
      // Eliminación optimista en la UI para ser más rápido
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (error: any) {
      alert(`Error al eliminar: ${error.message}`);
    }
  };

  // ============================================================================
  // AYUDANTES VISUALES
  // ============================================================================
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING': return <span className="text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Clock size={12}/> Pendiente</span>;
      case 'CONFIRMED': return <span className="text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><CheckCircle2 size={12}/> Confirmado</span>;
      case 'COMPLETED': return <span className="text-green-500 bg-green-500/10 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><CheckCircle2 size={12}/> Cobrado</span>;
      case 'CANCELLED': return <span className="text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><XCircle size={12}/> Cancelado</span>;
      default: return <span className="text-zinc-500 bg-zinc-500/10 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><AlertCircle size={12}/> {status}</span>;
    }
  };

  // Pantalla de Error Crítico (Intrusos)
  if (authError) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-red-500 gap-4">
        <ShieldAlert size={60} className="animate-pulse" />
        <h1 className="text-2xl font-black uppercase tracking-widest">Acceso Denegado</h1>
        <p className="text-zinc-500">Volviendo al sistema central...</p>
      </div>
    );
  }

  // ============================================================================
  // RENDER UI 
  // ============================================================================
  return (
    <div className="max-w-[1400px] mx-auto pb-20 p-6 md:p-10">
      
      {/* Botón de Navegación Rápida */}
      <button onClick={() => router.push('/dashboards/admin')} className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 font-bold uppercase tracking-widest text-xs mb-8 transition-colors group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Volver al Panel Central
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase font-serif flex items-center gap-4">
            <CalendarDays className="text-amber-500 w-10 h-10 md:w-12 md:h-12" /> Agenda <span className="text-amber-500">Maestra</span>
          </h1>
          <p className="text-zinc-400 mt-2 font-medium">Registro histórico y futuro de todas las reservas de la barbería.</p>
        </div>
        
        {/* Indicador de Carga/Sincronización */}
        {isFetching && (
          <span className="text-amber-500 text-xs font-black uppercase tracking-widest animate-pulse flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-xl">
            <Clock size={16} /> Sincronizando...
          </span>
        )}
      </div>

      {/* Buscador Global Avanzado */}
      <div className="relative mb-8">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por cliente, barbero o fecha exacta (Ej. 2026-03-06)..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-16 pr-6 py-5 text-white focus:border-amber-500 outline-none transition-all shadow-inner"
        />
      </div>

      {/* Tabla de Datos Premium */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-[0.2em] border-b border-zinc-800 text-zinc-500">
              <tr>
                <th className="px-8 py-6">Fecha y Hora</th>
                <th className="px-6 py-6">Cliente y Servicio</th>
                <th className="px-6 py-6">Staff Asignado</th>
                <th className="px-6 py-6">Estado / Valor</th>
                <th className="px-8 py-6 text-right">Acción Global</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {appointments.filter(a => 
                (a.client?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                (a.barber?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.date.includes(searchQuery)
              ).map(app => (
                <tr key={app.id} className="hover:bg-zinc-800/20 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="font-bold text-white text-base">{app.date}</p>
                    <p className="text-amber-500 font-black text-xl">{app.time}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-bold text-white text-lg">{app.client?.name || 'Cliente Eliminado'}</p>
                    <p className="text-sm text-zinc-500 font-medium">{app.service?.name}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-md font-bold text-xs uppercase tracking-widest">
                      {app.barber?.name || 'No asignado'}
                    </span>
                  </td>
                  <td className="px-6 py-5 space-y-2">
                    {getStatusBadge(app.status)}
                    <p className="font-black text-white ml-1">{formatMoney(app.service?.price)}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDelete(app.id)} 
                      className="p-3 bg-zinc-950 rounded-xl text-zinc-500 hover:text-white hover:bg-red-500 border border-zinc-800 hover:border-red-500 transition-all shadow-sm" 
                      title="Borrar Cita del Sistema"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
              
              {/* Estado Vacío */}
              {appointments.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <CalendarDays size={48} className="mx-auto text-zinc-700 mb-4" />
                    <p className="text-zinc-500 font-medium text-lg">No hay registros en la agenda maestra.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}