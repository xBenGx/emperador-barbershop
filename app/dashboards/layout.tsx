"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Scissors, CalendarDays, Users, Settings, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Dependiendo de la URL, sabremos en qué dashboard estamos
  const isClient = pathname.startsWith("/client");
  const isBarber = pathname.startsWith("/barber");
  const isAdmin = pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-[#050505] flex text-zinc-300 font-sans">
      
      {/* SIDEBAR (Menú Lateral) */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col hidden md:flex">
        <div className="h-20 flex items-center justify-center border-b border-zinc-900">
          <Link href="/" className="font-serif font-black text-xl text-white tracking-tighter uppercase">
            EMPERADOR <span className="text-amber-500">.</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {/* Links Dinámicos según el Rol */}
          {isAdmin && (
            <>
              <SidebarLink href="/admin" icon={<LayoutDashboard size={20} />} text="Resumen" active={pathname === "/admin"} />
              <SidebarLink href="/admin/appointments" icon={<CalendarDays size={20} />} text="Todas las Citas" active={pathname.includes("/appointments")} />
              <SidebarLink href="/admin/users" icon={<Users size={20} />} text="Usuarios" active={pathname.includes("/users")} />
              <SidebarLink href="/admin/services" icon={<Settings size={20} />} text="Servicios" active={pathname.includes("/services")} />
            </>
          )}

          {isBarber && (
            <>
              <SidebarLink href="/barber" icon={<LayoutDashboard size={20} />} text="Mi Agenda" active={pathname === "/barber"} />
              <SidebarLink href="/barber/history" icon={<Scissors size={20} />} text="Mis Cortes" active={pathname.includes("/history")} />
            </>
          )}

          {isClient && (
            <>
              <SidebarLink href="/client/book" icon={<CalendarDays size={20} />} text="Agendar Hora" active={pathname === "/client/book"} />
              <SidebarLink href="/client/history" icon={<Scissors size={20} />} text="Mis Cortes" active={pathname.includes("/history")} />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-zinc-900">
          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-3 text-zinc-500 hover:text-red-500 transition-colors w-full px-4 py-3 rounded-xl hover:bg-zinc-900 font-bold text-sm"
          >
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">
        {/* Header Superior (Mobile) */}
        <header className="h-20 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 flex items-center px-8 justify-between md:justify-end sticky top-0 z-50">
           <div className="md:hidden font-serif font-black text-xl text-white">EMP<span className="text-amber-500">.</span></div>
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full border border-amber-500 flex items-center justify-center bg-zinc-900 text-amber-500 font-bold">
                 {/* Aquí luego pondremos la inicial del usuario */}
                 R
              </div>
           </div>
        </header>

        {/* Aquí se inyectan las páginas (page.tsx) */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// Componente auxiliar para los botones del menú
function SidebarLink({ href, icon, text, active }: { href: string, icon: React.ReactNode, text: string, active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
        active 
          ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(217,119,6,0.3)]" 
          : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
      }`}
    >
      {icon} {text}
    </Link>
  );
}