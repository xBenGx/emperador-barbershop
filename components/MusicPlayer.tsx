"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Disc, Volume2, VolumeX, Volume1, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdvancedMusicPlayer() {
  // Referencias
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeInterval = useRef<NodeJS.Timeout | null>(null);

  // Estados
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [volume, setVolume] = useState(0.3); // 30% por defecto
  const [isMuted, setIsMuted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 1. Inicialización y LocalStorage (Solo en cliente)
  useEffect(() => {
    setIsMounted(true);
    const savedVolume = localStorage.getItem('emperador_volume');
    const savedMuted = localStorage.getItem('emperador_muted');
    
    if (savedVolume) setVolume(parseFloat(savedVolume));
    if (savedMuted === 'true') setIsMuted(true);
  }, []);

  // 2. Aplicar volumen y mute al elemento de audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // 3. Manejador de Autoplay Inteligente
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!hasInteracted && audioRef.current && !isPlaying) {
        // Reproducir con Fade In
        audioRef.current.volume = 0;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setHasInteracted(true);
          fadeInAudio(isMuted ? 0 : volume);
        }).catch(() => {
          console.log("Autoplay bloqueado. El usuario debe iniciar manualmente.");
        });
      }
      // Limpiar listeners tras la primera interacción
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('scroll', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('scroll', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('scroll', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [hasInteracted, volume, isMuted, isPlaying]);

  // ==========================================
  // LÓGICA DE FADE IN / FADE OUT
  // ==========================================
  const fadeInAudio = (targetVolume: number) => {
    if (!audioRef.current) return;
    if (fadeInterval.current) clearInterval(fadeInterval.current);
    
    let vol = 0;
    audioRef.current.volume = vol;
    
    fadeInterval.current = setInterval(() => {
      vol += 0.05;
      if (vol >= targetVolume) {
        if (audioRef.current) audioRef.current.volume = targetVolume;
        if (fadeInterval.current) clearInterval(fadeInterval.current);
      } else {
        if (audioRef.current) audioRef.current.volume = vol;
      }
    }, 100);
  };

  const fadeOutAudioAndPause = () => {
    if (!audioRef.current) return;
    if (fadeInterval.current) clearInterval(fadeInterval.current);
    
    let vol = audioRef.current.volume;
    
    fadeInterval.current = setInterval(() => {
      vol -= 0.05;
      if (vol <= 0) {
        if (audioRef.current) {
          audioRef.current.volume = 0;
          audioRef.current.pause();
        }
        setIsPlaying(false);
        if (fadeInterval.current) clearInterval(fadeInterval.current);
      } else {
        if (audioRef.current) audioRef.current.volume = vol;
      }
    }, 50);
  };

  // ==========================================
  // CONTROLES DE USUARIO
  // ==========================================
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      fadeOutAudioAndPause();
    } else {
      audioRef.current.play();
      fadeInAudio(isMuted ? 0 : volume);
      setIsPlaying(true);
    }
    setHasInteracted(true);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    localStorage.setItem('emperador_muted', newMutedState.toString());
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      localStorage.setItem('emperador_muted', 'false');
    }
    localStorage.setItem('emperador_volume', newVolume.toString());
  };

  if (!isMounted) return null; // Evitar errores de hidratación en Next.js

  // Icono de volumen dinámico
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <>
      {/* Etiqueta de Audio Oculta */}
      <audio ref={audioRef} src="/vibe.mp3" loop preload="auto" />

      {/* Contenedor Flotante Principal */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 1 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-6 left-6 md:bottom-10 md:left-10 z-[100] flex items-center"
      >
        <motion.div 
          layout
          className={`flex items-center bg-[#050505]/90 backdrop-blur-xl border border-zinc-800 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all duration-500 overflow-hidden ${
            isHovered ? 'pr-6' : 'pr-1'
          }`}
        >
          {/* Botón Play/Pause (Vinilo) */}
          <button 
            onClick={togglePlay}
            className="relative flex items-center justify-center w-14 h-14 bg-black rounded-full border border-zinc-800 shrink-0 group hover:border-amber-500 transition-colors m-1 z-10 focus:outline-none"
          >
            <Disc 
              size={28} 
              className={`text-amber-500 transition-all ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : 'opacity-60'}`} 
            />
            {/* Agujero central del vinilo */}
            <div className="absolute w-2.5 h-2.5 bg-zinc-900 rounded-full border border-zinc-700"></div>
            
            {/* Efecto de resplandor interno si está sonando */}
            {isPlaying && (
              <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-md animate-pulse"></div>
            )}
          </button>

          {/* Panel Expandible (Contenido) */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ width: 0, opacity: 0, paddingLeft: 0 }}
                animate={{ width: "auto", opacity: 1, paddingLeft: 12 }}
                exit={{ width: 0, opacity: 0, paddingLeft: 0 }}
                className="flex items-center gap-4 overflow-hidden whitespace-nowrap"
              >
                {/* Info del Track & Ecualizador */}
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <Music size={12} className="text-amber-500" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                      Emperador Vibe
                    </p>
                  </div>
                  
                  {/* Ecualizador Animado */}
                  <div className="flex items-end gap-1 h-3 mt-1.5 opacity-80">
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <motion.div 
                        key={bar}
                        animate={isPlaying ? { height: ["4px", "12px", "4px", "8px"] } : { height: "2px" }}
                        transition={{ repeat: Infinity, duration: 0.8 + (bar * 0.1), ease: "easeInOut" }}
                        className={`w-1 rounded-t-sm ${isPlaying ? 'bg-amber-500' : 'bg-zinc-700'}`}
                      />
                    ))}
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest ml-2">Vol. 1</span>
                  </div>
                </div>

                {/* Separador */}
                <div className="w-px h-8 bg-zinc-800 mx-2"></div>

                {/* Controles de Volumen */}
                <div className="flex items-center gap-2 group/volume">
                  <button onClick={toggleMute} className="text-zinc-400 hover:text-amber-500 transition-colors focus:outline-none p-1">
                    <VolumeIcon size={16} />
                  </button>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 md:w-20 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-amber-500 hover:bg-zinc-700 transition-colors [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-125 transition-transform"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
}