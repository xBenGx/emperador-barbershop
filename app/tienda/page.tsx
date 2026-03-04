"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
// ¡AQUÍ ESTÁ LA SOLUCIÓN! Se agregó 'X' a la lista de importaciones
import { 
  ShoppingCart, Search, Zap, Package, 
  CreditCard, Truck, Sparkles, Star, Tag, Percent, AlertCircle, X 
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// ============================================================================
// TIPADOS (Sincronizados con tabla 'inventory' del Admin)
// ============================================================================
interface Product {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  old_price?: number;
  discount_code?: string;
  stock: number;
  tag: string;
  image_url: string;
  category: string;
  sku: string;
  status: "ACTIVE" | "HIDDEN";
}

const CATEGORIES = ["Todos", "Máquinas", "Pomadas", "Cuidado Barba", "Accesorios"];

export default function EmperadorStore() {
  const supabase = createClient();

  // Estados
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Carga de Datos Real desde Supabase (Tabla 'inventory')
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq('status', 'ACTIVE') // Solo mostramos los que el admin marcó como activos
        .order("created_at", { ascending: false });

      if (data && !error) {
        setProducts(data);
        setFilteredProducts(data);
      } else {
        console.error("Error cargando inventario:", error);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [supabase]);

  // 2. Lógica de Filtrado Avanzado (Tiempo Real)
  useEffect(() => {
    let result = products;

    if (activeCategory !== "Todos") {
      result = result.filter((p) => p.category === activeCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(query) || 
        (p.subtitle && p.subtitle.toLowerCase().includes(query)) ||
        (p.sku && p.sku.toLowerCase().includes(query))
      );
    }

    setFilteredProducts(result);
  }, [activeCategory, searchQuery, products]);

  // Utilidad para formatear moneda chilena
  const formatCLP = (val: number) => 
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(val);

  return (
    // FIX DE ESPACIO: El margen negativo compensa el layout.tsx global para lograr pantalla completa
    <div className="min-h-screen bg-[#050505] text-white pb-20 relative -mt-24 md:-mt-28">
      
      {/* Fondo Global de Tienda */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* ========================================================================= */}
      {/* HERO DE LA TIENDA - ESPACIO CORREGIDO */}
      {/* ========================================================================= */}
      <section className="relative min-h-[60vh] flex flex-col justify-center items-center overflow-hidden border-b border-zinc-900 pt-[150px] md:pt-[200px] pb-20">
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=2000&auto=format&fit=crop"
            alt="Barber Shop Tools"
            fill
            className="object-cover opacity-30 grayscale contrast-125"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-[1400px] px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-2 px-5 py-1.5 border border-amber-500/50 text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] rounded-full mb-6 backdrop-blur-md bg-black/40 shadow-[0_0_20px_rgba(217,119,6,0.2)]">
              <Zap size={14} className="fill-amber-500" /> Professional Gear Only
            </span>
            <h1 className="text-6xl md:text-[8rem] font-serif font-black tracking-tighter uppercase mb-6 leading-none drop-shadow-2xl">
              EMPERADOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-700">STORE</span>
            </h1>
            <p className="text-zinc-300 max-w-2xl mx-auto text-lg md:text-2xl font-medium drop-shadow-md">
              Las mismas herramientas premium que usamos en el trono, ahora disponibles para tu ritual diario en casa.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* BARRA DE FILTROS Y BÚSQUEDA FLOTANTE */}
      {/* ========================================================================= */}
      <div className="sticky top-[80px] md:top-[90px] z-40 bg-[#050505]/90 backdrop-blur-2xl border-b border-zinc-900 py-5 shadow-2xl">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row gap-6 justify-between items-center relative z-10">
          
          {/* Categorías */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                  activeCategory === cat 
                    ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(217,119,6,0.3)]" 
                    : "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-amber-500/50 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nombre, modelo o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white focus:border-amber-500 outline-none transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRID DE PRODUCTOS (Sincronizado con Inventory SQL) */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 py-16">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4 text-amber-500">
            <Package className="animate-bounce" size={40} />
            <span className="font-black uppercase tracking-widest text-xs">Cargando Arsenal del Emperador...</span>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            <AnimatePresence mode='popLayout'>
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                
                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                    className={`group relative flex flex-col bg-zinc-900/40 border rounded-[2.5rem] overflow-hidden transition-all duration-500 ${
                      isOutOfStock 
                        ? 'border-zinc-800 opacity-75 grayscale-[50%]' 
                        : 'border-zinc-800 hover:border-amber-500/60 hover:shadow-[0_20px_50px_rgba(217,119,6,0.15)]'
                    }`}
                  >
                    {/* ETIQUETAS FLOTANTES (Superior Izquierda) */}
                    <div className="absolute top-6 left-6 z-20 flex flex-col gap-2 items-start">
                      {isOutOfStock ? (
                        <span className="bg-red-500/20 border border-red-500/50 text-red-500 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1">
                          <AlertCircle size={10} /> Agotado
                        </span>
                      ) : product.stock <= 5 ? (
                        <span className="bg-orange-500 border border-orange-400 text-black text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                          ¡Últimas {product.stock}!
                        </span>
                      ) : null}

                      {/* Etiqueta Personalizada del Admin (Ej: NUEVO, DESTACADO) */}
                      {product.tag && !isOutOfStock && (
                        <span className="bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                          <Tag size={10} /> {product.tag}
                        </span>
                      )}
                    </div>

                    {/* DESCUENTO FLOTANTE (Superior Derecha) */}
                    {product.old_price && !isOutOfStock && (
                      <div className="absolute top-6 right-6 z-20">
                        <div className="bg-amber-500 text-black w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform">
                          <span className="text-[10px] font-black leading-none uppercase">Sale</span>
                          <Percent size={14} className="mt-0.5" />
                        </div>
                      </div>
                    )}

                    {/* CONTENEDOR IMAGEN */}
                    <div className="relative aspect-square overflow-hidden bg-zinc-950/80 p-8 flex items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900/50 z-10 pointer-events-none" />
                      {product.image_url ? (
                        <Image 
                          src={product.image_url} 
                          alt={product.name}
                          fill
                          className={`object-contain p-8 transition-transform duration-700 ${!isOutOfStock && 'group-hover:scale-110 group-hover:-translate-y-2'}`}
                          unoptimized
                        />
                      ) : (
                        <Package size={60} className="text-zinc-800" />
                      )}
                    </div>

                    {/* INFO PRODUCTO */}
                    <div className="p-8 flex-1 flex flex-col relative z-20 bg-zinc-900/40 backdrop-blur-sm">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-amber-500 font-black text-[9px] uppercase tracking-[0.3em]">
                          {product.category || 'Tienda'}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star size={12} fill="currentColor" />
                          <span className="text-[11px] font-bold text-white">5.0</span>
                        </div>
                      </div>

                      <h3 className={`text-xl font-black uppercase tracking-tight leading-none mb-1 ${isOutOfStock ? 'text-zinc-400' : 'text-white group-hover:text-amber-500 transition-colors'}`}>
                        {product.name}
                      </h3>
                      {product.subtitle && (
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">
                          {product.subtitle}
                        </p>
                      )}
                      
                      <p className="text-zinc-400 text-sm font-medium line-clamp-2 mb-6 flex-1">
                        {product.description}
                      </p>

                      {/* Cupón (Si existe) */}
                      {product.discount_code && !isOutOfStock && (
                        <div className="mb-4 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg self-start">
                          <Tag size={12} className="text-green-500" />
                          <span className="text-[9px] text-green-500 font-black uppercase tracking-widest">
                            Cupón: {product.discount_code}
                          </span>
                        </div>
                      )}

                      {/* PRECIO Y BOTÓN DE COMPRA */}
                      <div className="flex items-end justify-between mt-auto pt-6 border-t border-zinc-800/80">
                        <div>
                          {product.old_price && !isOutOfStock && (
                            <span className="block text-[11px] text-zinc-500 line-through font-bold mb-0.5">
                              {formatCLP(product.old_price)}
                            </span>
                          )}
                          <span className={`text-3xl font-black tracking-tighter ${isOutOfStock ? 'text-zinc-600' : 'text-amber-500'}`}>
                            {formatCLP(product.price)}
                          </span>
                        </div>
                        
                        <button 
                          disabled={isOutOfStock}
                          className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-xl ${
                            isOutOfStock 
                              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                              : 'bg-white text-black hover:bg-amber-500 hover:scale-110 active:scale-95'
                          }`}
                        >
                          {isOutOfStock ? <X size={24} /> : <ShoppingCart size={22} />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty State / Sin resultados */}
        {!loading && filteredProducts.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 text-center bg-zinc-900/20 border border-zinc-800/50 rounded-[3rem]">
            <Search className="mx-auto text-zinc-700 mb-6" size={60} />
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Sin Resultados</h3>
            <p className="text-zinc-500 font-medium max-w-md mx-auto">No hemos encontrado armamento que coincida con tu búsqueda en esta categoría.</p>
            <button 
              onClick={() => {setActiveCategory("Todos"); setSearchQuery("");}} 
              className="mt-8 px-8 py-4 bg-amber-500 text-black rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white transition-colors"
            >
              Ver Todo el Catálogo
            </button>
          </motion.div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECCIÓN DE CONFIANZA / BENEFICIOS */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 py-24 border-t border-zinc-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col items-center md:items-start text-center md:text-left gap-6 group">
            <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all duration-500 shadow-2xl group-hover:scale-110 group-hover:-rotate-6">
              <CreditCard size={36} />
            </div>
            <div>
              <h4 className="text-xl text-white font-black uppercase tracking-tight mb-2">Pago 100% Seguro</h4>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-xs">Aceptamos todas las tarjetas vía Webpay Plus y transferencias directas.</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="flex flex-col items-center md:items-start text-center md:text-left gap-6 group">
            <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all duration-500 shadow-2xl group-hover:scale-110 group-hover:-rotate-6">
              <Truck size={36} />
            </div>
            <div>
              <h4 className="text-xl text-white font-black uppercase tracking-tight mb-2">Despacho Express</h4>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-xs">Envíos rápidos a todo Chile y retiro gratuito inmediato en sucursal Curicó.</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex flex-col items-center md:items-start text-center md:text-left gap-6 group">
            <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all duration-500 shadow-2xl group-hover:scale-110 group-hover:-rotate-6">
              <Sparkles size={36} />
            </div>
            <div>
              <h4 className="text-xl text-white font-black uppercase tracking-tight mb-2">Garantía Emperador</h4>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-xs">Productos originales, testeados y respaldados por nuestros Master Barbers.</p>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}