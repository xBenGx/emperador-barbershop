// components/Footer.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image"; // IMPORTANTE: next/image para optimización
import { motion, Variants } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { Instagram, Lock, MapPin, CheckCircle } from "lucide-react";

// Variante de animación para el CTA
const popUp: Variants = { 
  hidden: { opacity: 0, y: 50, scale: 0.95 }, 
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 20 } } 
};

export default function Footer() {
  return (
    <footer className="bg-[#020202] pt-24 pb-6 px-6 relative overflow-hidden border-t border-zinc-900">
      {/* Resplandor de fondo Ámbar */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[300px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />
      
      {/* CTA PRINCIPAL (Domina el Trono) */}
      <div className="max-w-[1400px] mx-auto text-center mb-20 relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={popUp}>
          <div className="mx-auto w-20 h-20 md:w-28 md:h-28 mb-8 rounded-full overflow-hidden border border-amber-500/50 shadow-[0_0_30px_rgba(217,119,6,0.2)] relative bg-black p-2 hover:scale-105 transition-transform duration-500">
             <div className="relative w-full h-full rounded-full overflow-hidden">
               <Image src="/logo.png" alt="Emperador Logo Final" fill className="object-cover bg-[#050505]" />
             </div>
          </div>
          
          <h2 className="text-5xl md:text-[6rem] lg:text-[7rem] font-serif font-black text-white leading-[0.85] tracking-tighter uppercase mb-10 drop-shadow-xl">
            DOMINA EL <br /> <span className="text-amber-500">TRONO.</span>
          </h2>
          <Link href="/reservar" className="px-10 md:px-12 py-4 md:py-5 bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-xs md:text-sm rounded-2xl hover:bg-white hover:scale-110 transition-all duration-300 shadow-[0_0_40px_rgba(217,119,6,0.3)] inline-flex items-center gap-4 group">
            Agenda Tu Cita <CheckCircle size={20} className="group-hover:text-green-600 transition-colors" />
          </Link>
        </motion.div>
      </div>

      {/* ESTRUCTURA FOOTER AVANZADA (Estilo BAYX) */}
      <div className="max-w-[1400px] mx-auto border-t border-zinc-900 pt-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          
          {/* Columna 1: Brand Info (EL CAMBIO ESTÁ AQUÍ) */}
          <div className="flex flex-col gap-6">
            
            {/* FIX: Logo mucho más grande y con escalado responsivo */}
            <Link href="/" className="block relative h-24 w-24 md:h-32 md:w-32 rounded-full overflow-hidden border-2 border-zinc-800 shadow-2xl bg-black hover:border-amber-500/50 transition-colors group">
              <Image 
                src="/logo.png" 
                alt="Emperador Barbershop Logo" 
                fill
                sizes="(max-width: 768px) 96px, 128px"
                className="object-contain p-2 group-hover:scale-105 transition-transform duration-500" 
                priority
              />
            </Link>
            {/* FIN DEL FIX */}
            
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs font-medium mt-2">
              La barbería no es un trámite, es un ritual. Disfruta de la mejor experiencia de grooming, atención premium, PS5 y mesa de Pool.
            </p>
            <div className="flex items-center gap-5 mt-2">
               <a href="https://www.instagram.com/emperador_barbershop/?hl=es" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-amber-500 transition-colors"><Instagram size={20} /></a>
               <a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors"><LucideIcons.Facebook size={20} /></a>
               <a href="#" className="text-zinc-500 hover:text-amber-500 transition-colors"><LucideIcons.Twitter size={20} /></a>
            </div>
          </div>

          {/* Columna 2: Servicios */}
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-widest mb-6">Servicios</h4>
            <ul className="flex flex-col gap-4 text-zinc-400 text-sm font-medium">
              <li><Link href="/servicios" className="hover:text-amber-500 transition-colors">Cortes Clásicos & Fades</Link></li>
              <li><Link href="/servicios" className="hover:text-amber-500 transition-colors">Ritual de Barba & Vapor</Link></li>
              <li><Link href="/servicios" className="hover:text-amber-500 transition-colors">Tratamientos Capilares</Link></li>
              <li><Link href="/servicios" className="hover:text-amber-500 transition-colors">Colorimetría Premium</Link></li>
              <li><Link href="/tienda" className="hover:text-amber-500 transition-colors">Emperador Store</Link></li>
            </ul>
          </div>

          {/* Columna 3: La Barbería */}
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-widest mb-6">La Compañía</h4>
            <ul className="flex flex-col gap-4 text-zinc-400 text-sm font-medium">
              <li><Link href="/sobrenosotros" className="hover:text-amber-500 transition-colors">Nuestra Historia</Link></li>
              <li><Link href="/#squad" className="hover:text-amber-500 transition-colors">El Team</Link></li>
              <li><Link href="/#flow" className="hover:text-amber-500 transition-colors">VIP Room</Link></li>
              <li><Link href="/#faq" className="hover:text-amber-500 transition-colors">Preguntas Frecuentes</Link></li>
              <li><Link href="/login" className="flex items-center gap-2 hover:text-amber-500 transition-colors"><Lock size={14}/> Acceso Staff</Link></li>
            </ul>
          </div>

          {/* Columna 4: Contacto Hub */}
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-widest mb-6">Contacto Hub</h4>
            <ul className="flex flex-col gap-5 text-zinc-400 text-sm font-medium">
              <li className="flex items-start gap-3 group">
                <MapPin size={18} className="text-amber-500 shrink-0 mt-0.5 group-hover:animate-bounce" />
                <span className="leading-snug">Peña 666, Piso 2.<br/>Curicó, Chile.</span>
              </li>
              <li className="flex items-center gap-3 group">
                <LucideIcons.Mail size={18} className="text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                <span>contacto@emperador.cl</span>
              </li>
              <li className="flex items-center gap-3 group">
                <LucideIcons.Phone size={18} className="text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
                <span>+56 9 1234 5678</span>
              </li>
            </ul>
          </div>
        </div>

        {/* BARRA INFERIOR: Copyright, Legales y Firma BAYX */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8 border-t border-zinc-900 pt-8 mt-12">
          
          {/* Copyright & Enlaces Legales */}
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 text-center md:text-left">
            <p>© {new Date().getFullYear()} EMPERADOR BARBERSHOP. TODOS LOS DERECHOS RESERVADOS.</p>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-white transition-colors">Privacidad</Link>
              <Link href="#" className="hover:text-white transition-colors">Términos</Link>
              <Link href="#" className="hover:text-white transition-colors">Sitemap</Link>
            </div>
          </div>

          {/* FIRMA DE AGENCIA (POWERED BY BAYX) */}
          <a href="https://bayx.pro" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 bg-zinc-950 border border-zinc-800/50 hover:border-[#00f0ff]/50 px-5 py-2.5 rounded-2xl transition-all duration-500 shadow-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.1)]">
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] group-hover:text-zinc-400 transition-colors">Engineered By</span>
            </div>
            <div className="w-px h-6 bg-zinc-800 group-hover:bg-zinc-700 transition-colors"></div>
            <div className="flex items-center gap-2">
              <span className="text-[#00f0ff] font-bold font-mono text-sm group-hover:animate-pulse">{"</>"}</span>
              <span className="text-white font-black tracking-widest text-sm">BAYX</span>
            </div>
          </a>

        </div>
      </div>
      
      {/* MARCA DE AGUA GIGANTE FINAL */}
      <div className="text-center text-zinc-900/40 font-black text-[11vw] uppercase leading-none select-none relative z-0 overflow-hidden pointer-events-none mt-12 md:mt-4">
         EMPERADOR
      </div>
    </footer>
  );
}