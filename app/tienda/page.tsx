"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingCart, Search, Zap, Package, 
  CreditCard, Truck, Sparkles, Star, Tag, Percent, AlertCircle, X, ChevronRight
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// ============================================================================
// TIPADOS
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

  // 1. Carga de Datos Real desde Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq('status', 'ACTIVE')
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

  // 2. Lógica de Filtrado Avanzado
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

  // Utilidad para formatear moneda
  const formatCLP = (val: number) => 
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(val);

  return (
    // FIX NAVBAR: Se elimina el margen negativo. El contenedor base fluye normalmente.
    <main className="min-h-screen bg-[#050505] text-white selection:bg-amber-500/30 selection:text-amber-200 relative overflow-x-hidden pb-24">
      
      {/* GLOBAL BACKGROUND: Ruido y Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* ========================================================================= */}
      {/* HERO SECTION - ESPACIO Y NAVBAR CORREGIDO */}
      {/* ========================================================================= */}
      {/* FIX NAVBAR: pt-[160px] md:pt-[220px] solo en el Hero empuja el contenido hacia abajo, librando la Navbar global */}
      <section className="relative min-h-[60vh] flex flex-col justify-center items-center overflow-hidden border-b border-amber-500/10 pt-[160px] md:pt-[220px] pb-24">
        {/* IMAGEN DE FONDO: Empieza desde top-0 (detrás de la Navbar) */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=2000&auto=format&fit=crop"
            alt="Barber Shop Tools"
            fill
            className="object-cover opacity-20 grayscale contrast-150 mix-blend-luminosity"
            priority
            unoptimized
          />
          {/* Gradientes para fundir la imagen con el fondo oscuro */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/80 via-transparent to-transparent" />
          {/* Destello central detrás del texto */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        </div>

        <div className="relative z-10 w-full max-w-[1400px] px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 px-5 py-2 border border-amber-500/30 text-amber-400 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] rounded-full mb-8 backdrop-blur-md bg-black/50 shadow-[0_0_30px_rgba(217,119,6,0.15)]">
              <Zap size={14} className="fill-amber-500" /> Equipamiento Oficial
            </span>
            <h1 className="text-6xl md:text-[8rem] lg:text-[10rem] font-serif font-black tracking-tighter uppercase mb-6 leading-[0.85] drop-shadow-2xl">
              <span className="text-white">EMPERADOR</span><br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-500 to-amber-800 drop-shadow-[0_0_40px_rgba(217,119,6,0.3)]">STORE</span>
            </h1>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg md:text-xl font-medium drop-shadow-md">
              Las mismas herramientas premium que usamos en el trono, ahora disponibles para tu ritual diario en casa.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* BARRA DE FILTROS Y BÚSQUEDA (STICKY) */}
      {/* ========================================================================= */}
      {/* La posición top-[80px] a top-[100px] la ajusta debajo de la Navbar global al hacer scroll */}
      <div className="sticky top-[80px] lg:top-[96px] z-40 bg-[#050505]/80 backdrop-blur-xl border-y border-zinc-800/50 py-4 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)]">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row gap-4 justify-between items-center relative z-10">
          
          {/* Categorías */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-3 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 whitespace-nowrap border ${
                  activeCategory === cat 
                    ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(217,119,6,0.4)] scale-105" 
                    : "bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-amber-500/50 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Buscador de Alta Gama */}
          <div className="relative w-full md:w-[350px] lg:w-[400px] group shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/20 to-amber-500/0 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500"></div>
            <div className="relative flex items-center bg-black border border-zinc-800 group-focus-within:border-amber-500/50 rounded-2xl transition-all duration-300 shadow-inner">
              <Search className="absolute left-4 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Buscar armamento (Ej. Trimmer)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent pl-12 pr-4 py-3.5 text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRID DE PRODUCTOS */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 py-16 md:py-24">
        {loading ? (
          <div className="h-[40vh] flex flex-col items-center justify-center gap-6 text-amber-500">
            <div className="relative w-20 h-20 flex items-center justify-center">
               <div className="absolute inset-0 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
               <Package size={32} />
            </div>
            <span className="font-black uppercase tracking-[0.3em] text-xs animate-pulse">Cargando Bóveda...</span>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
          >
            <AnimatePresence mode='popLayout'>
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                
                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                    className={`group flex flex-col relative rounded-[2.5rem] bg-gradient-to-b from-zinc-900/40 to-black border transition-all duration-500 overflow-hidden ${
                      isOutOfStock 
                        ? 'border-zinc-800/50 opacity-60 grayscale-[80%]' 
                        : 'border-zinc-800 hover:border-amber-500/50 hover:shadow-[0_20px_60px_-15px_rgba(217,119,6,0.2)] hover:-translate-y-2'
                    }`}
                  >
                    {/* Efecto Glow en Hover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                    {/* ETIQUETAS FLOTANTES (Superior Izquierda) */}
                    <div className="absolute top-6 left-6 z-20 flex flex-col gap-2 items-start">
                      {isOutOfStock ? (
                        <span className="bg-red-500/10 border border-red-500/30 text-red-500 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                          <AlertCircle size={10} /> Agotado
                        </span>
                      ) : product.stock <= 5 ? (
                        <span className="bg-orange-500/10 border border-orange-500/50 text-orange-400 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-md animate-pulse shadow-lg flex items-center gap-1.5">
                          <Zap size={10} className="fill-orange-400"/> ¡Últimas {product.stock}!
                        </span>
                      ) : null}

                      {/* Etiqueta Custom (Ej: NUEVO) */}
                      {product.tag && !isOutOfStock && (
                        <span className="bg-zinc-800/80 border border-zinc-700 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg flex items-center gap-1.5">
                          <Tag size={10} className="text-amber-500" /> {product.tag}
                        </span>
                      )}
                    </div>

                    {/* DESCUENTO FLOTANTE (Superior Derecha) */}
                    {product.old_price && !isOutOfStock && (
                      <div className="absolute top-6 right-6 z-20">
                        <div className="bg-amber-500 text-black w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-[0_0_20px_rgba(217,119,6,0.4)] transform rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-300">
                          <span className="text-[10px] font-black leading-none uppercase">Sale</span>
                          <Percent size={14} className="mt-0.5 font-bold" />
                        </div>
                      </div>
                    )}

                    {/* CONTENEDOR IMAGEN PREMIUM */}
                    <div className="relative aspect-square overflow-hidden bg-black/50 p-10 flex items-center justify-center group-hover:bg-black/20 transition-colors duration-500">
                      {/* Círculo de fondo para resaltar la herramienta */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[70%] h-[70%] bg-zinc-900 rounded-full blur-3xl opacity-50 group-hover:bg-amber-500/10 transition-colors duration-700"></div>
                      </div>

                      {product.image_url ? (
                        <div className="relative w-full h-full">
                           <Image 
                             src={product.image_url} 
                             alt={product.name}
                             fill
                             className={`object-contain drop-shadow-2xl transition-all duration-700 ${!isOutOfStock && 'group-hover:scale-110 group-hover:-rotate-3'}`}
                             unoptimized
                           />
                        </div>
                      ) : (
                        <Package size={60} className="text-zinc-800 relative z-10" />
                      )}
                    </div>

                    {/* INFO PRODUCTO */}
                    <div className="p-8 flex-1 flex flex-col relative z-20">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-amber-500 font-black text-[9px] uppercase tracking-[0.3em]">
                          {product.category || 'Tienda'}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                          <Star size={10} fill="currentColor" />
                          <span className="text-[10px] font-black text-amber-500">5.0</span>
                        </div>
                      </div>

                      <h3 className={`text-xl md:text-2xl font-black uppercase tracking-tight leading-none mb-2 ${isOutOfStock ? 'text-zinc-400' : 'text-white group-hover:text-amber-500 transition-colors'}`}>
                        {product.name}
                      </h3>
                      
                      {product.subtitle && (
                        <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-4">
                          {product.subtitle}
                        </p>
                      )}
                      
                      <p className="text-zinc-400 text-sm font-medium line-clamp-2 mb-6 flex-1 leading-relaxed">
                        {product.description}
                      </p>

                      {/* Cupón */}
                      {product.discount_code && !isOutOfStock && (
                        <div className="mb-6 inline-flex items-center gap-2 bg-zinc-900 border border-dashed border-zinc-700 px-3 py-2 rounded-xl self-start">
                          <Tag size={12} className="text-amber-500" />
                          <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">
                            Cupón: <span className="text-amber-500">{product.discount_code}</span>
                          </span>
                        </div>
                      )}

                      {/* FOOTER TARJETA: PRECIO Y BOTÓN */}
                      <div className="flex items-end justify-between mt-auto pt-6 border-t border-zinc-800">
                        <div className="flex flex-col">
                          {product.old_price && !isOutOfStock && (
                            <span className="text-[11px] text-zinc-500 line-through font-bold mb-1">
                              {formatCLP(product.old_price)}
                            </span>
                          )}
                          <span className={`text-3xl font-black tracking-tighter leading-none ${isOutOfStock ? 'text-zinc-600' : 'text-white'}`}>
                            {formatCLP(product.price)}
                          </span>
                        </div>
                        
                        <button 
                          disabled={isOutOfStock}
                          className={`relative overflow-hidden flex items-center justify-center h-14 rounded-2xl transition-all duration-300 ${
                            isOutOfStock 
                              ? 'w-14 bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed' 
                              : 'w-14 hover:w-32 bg-amber-500 text-black shadow-[0_10px_20px_-10px_rgba(217,119,6,0.6)] hover:shadow-[0_15px_30px_-10px_rgba(217,119,6,0.8)]'
                          }`}
                        >
                          {isOutOfStock ? (
                            <X size={20} />
                          ) : (
                            <>
                              <ShoppingCart size={20} className="shrink-0 absolute left-1/2 -translate-x-1/2 group-hover:left-4 group-hover:translate-x-0 transition-all duration-300" />
                              <span className="opacity-0 font-black uppercase tracking-widest text-[10px] absolute right-4 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                Añadir
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* EMPTY STATE / SIN RESULTADOS */}
        {/* ========================================================================= */}
        {!loading && filteredProducts.length === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-32 text-center max-w-2xl mx-auto relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="relative z-10 bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-xl rounded-[3rem] p-12 shadow-2xl">
              <div className="w-24 h-24 bg-black border border-zinc-800 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Search className="text-amber-500 opacity-50" size={40} />
              </div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Arsenal No Encontrado</h3>
              <p className="text-zinc-400 font-medium text-lg max-w-md mx-auto mb-10">No hemos encontrado equipamiento que coincida con tu búsqueda. Intenta con otro término o explora nuestro catálogo completo.</p>
              <button 
                onClick={() => {setActiveCategory("Todos"); setSearchQuery("");}} 
                className="group flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-amber-500 transition-all shadow-xl mx-auto"
              >
                Ver Todo el Catálogo <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECCIÓN DE CONFIANZA / BENEFICIOS */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-[1400px] mx-auto px-6 py-24 md:py-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 lg:gap-16">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col items-center md:items-start text-center md:text-left gap-6 group relative">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/5 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <div className="relative w-20 h-20 bg-black border border-zinc-800 rounded-3xl flex items-center justify-center text-zinc-500 group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-400 transition-all duration-500 shadow-2xl group-hover:scale-110 group-hover:-rotate-6 z-10">
              <CreditCard size={32} />
            </div>
            <div className="relative z-10">
              <h4 className="text-xl md:text-2xl text-white font-black uppercase tracking-tight mb-3">Pago 100% Seguro</h4>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-[280px]">Aceptamos todas las tarjetas vía Webpay Plus y transferencias directas con encriptación militar.</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="flex flex-col items-center md:items-start text-center md:text-left gap-6 group relative">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/5 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <div className="relative w-20 h-20 bg-black border border-zinc-800 rounded-3xl flex items-center justify-center text-zinc-500 group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-400 transition-all duration-500 shadow-2xl group-hover:scale-110 group-hover:-rotate-6 z-10">
              <Truck size={32} />
            </div>
            <div className="relative z-10">
              <h4 className="text-xl md:text-2xl text-white font-black uppercase tracking-tight mb-3">Despacho Express</h4>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-[280px]">Envíos rápidos a todo Chile y opción de retiro inmediato y gratuito en nuestra sucursal de Curicó.</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex flex-col items-center md:items-start text-center md:text-left gap-6 group relative">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/5 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <div className="relative w-20 h-20 bg-black border border-zinc-800 rounded-3xl flex items-center justify-center text-zinc-500 group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-400 transition-all duration-500 shadow-2xl group-hover:scale-110 group-hover:-rotate-6 z-10">
              <Sparkles size={32} />
            </div>
            <div className="relative z-10">
              <h4 className="text-xl md:text-2xl text-white font-black uppercase tracking-tight mb-3">Garantía Emperador</h4>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-[280px]">Productos 100% originales, testeados en batalla y respaldados por la élite de nuestros Master Barbers.</p>
            </div>
          </motion.div>
        </div>
      </section>

    </main>
  );
}