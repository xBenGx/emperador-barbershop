"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Disc, Volume2, VolumeX, Volume1, Music, 
  Play, Pause, Square, SkipBack, SkipForward, ListMusic
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Sincronización con BD añadida
import { createClient } from '@/utils/supabase/client';

// ==========================================
// LISTA DE REPRODUCCIÓN (Fallback)
// ==========================================
const DEFAULT_PLAYLIST = [
  { id: 1, title: "Emperador Vibe", src: "/vibe.mp3", duration: "3:45" },
  { id: 2, title: "Lofi Barber Chill", src: "/lofi.mp3", duration: "2:30" },
  { id: 3, title: "Urban Flow", src: "/urban.mp3", duration: "4:15" },
];

export default function AdvancedMusicPlayer() {
  const supabase = createClient();
  const pathname = usePathname();

  // Referencias
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeInterval = useRef<NodeJS.Timeout | null>(null);

  // Estados Base
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [volume, setVolume] = useState(0.3); // 30% por defecto
  const [isMuted, setIsMuted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Estados del Reproductor
  const [playlist, setPlaylist] = useState(DEFAULT_PLAYLIST);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 1. Inicialización: Carga LocalStorage y Supabase
  useEffect(() => {
    setIsMounted(true);
    
    // Recuperar preferencias locales de volumen
    const savedVolume = localStorage.getItem('emperador_volume');
    const savedMuted = localStorage.getItem('emperador_muted');
    if (savedVolume) setVolume(parseFloat(savedVolume));
    if (savedMuted === 'true') setIsMuted(true);

    // Recuperar la música activa desde la base de datos
    const fetchMusicSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'background_music')
          .single();
        
        if (data && data.value && !error) {
          // Si la BD devuelve una canción, la ponemos como la primera de la lista
          setPlaylist([{ id: 0, title: "Emperador Vibe (DB)", src: data.value, duration: "--:--" }, ...DEFAULT_PLAYLIST]);
        }
      } catch (err) {
        console.error("Usando playlist local por defecto.");
      }
    };

    fetchMusicSettings();
  }, [supabase]);

  // 2. Aplicar volumen y mute al elemento de audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, currentTrackIndex, playlist]);

  // 3. Manejador de Autoplay Inteligente (Global en la página)
  useEffect(() => {
    // Si estamos en la página de inicio, NO forzamos el autoplay aquí, 
    // porque el app/page.tsx ya tiene su propio reproductor haciéndolo.
    if (pathname === '/') return;

    const handleFirstInteraction = () => {
      if (!hasInteracted && audioRef.current && !isPlaying) {
        audioRef.current.volume = 0;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setHasInteracted(true);
          fadeInAudio(isMuted ? 0 : volume);
        }).catch(() => {
          console.log("Autoplay bloqueado por el navegador.");
        });
      }
      
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
  }, [hasInteracted, volume, isMuted, isPlaying, pathname]);

  // Actualizar tiempo actual
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => nextTrack(); // Pasar a la siguiente al terminar

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex]);

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

  const stopPlayback = () => {
    if (!audioRef.current) return;
    fadeOutAudioAndPause();
    setTimeout(() => {
        if(audioRef.current) audioRef.current.currentTime = 0;
    }, 500); // Esperar a que termine el fadeout
  };

  const nextTrack = () => {
    if (!audioRef.current) return;
    fadeOutAudioAndPause();
    setTimeout(() => {
      setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
      if (isPlaying) {
        setTimeout(() => {
          if(audioRef.current) {
            audioRef.current.play();
            fadeInAudio(isMuted ? 0 : volume);
            setIsPlaying(true);
          }
        }, 100);
      }
    }, 500);
  };

  const prevTrack = () => {
    if (!audioRef.current) return;
    fadeOutAudioAndPause();
    setTimeout(() => {
      setCurrentTrackIndex((prev) => (prev === 0 ? playlist.length - 1 : prev - 1));
      if (isPlaying) {
         setTimeout(() => {
          if(audioRef.current) {
            audioRef.current.play();
            fadeInAudio(isMuted ? 0 : volume);
            setIsPlaying(true);
          }
        }, 100);
      }
    }, 500);
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      if(audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const formatTime = (time: number) => {
      if (isNaN(time)) return "0:00";
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // EVITAR ERRORES DE HIDRATACIÓN Y SOLUCIONAR EL DOBLE REPRODUCTOR
  if (!isMounted) return null; 
  if (pathname === '/') return null; // <--- LA SOLUCIÓN DEFINITIVA

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const currentTrack = playlist[currentTrackIndex];

  return (
    <>
      <audio ref={audioRef} src={currentTrack.src} loop={false} preload="auto" />

      {/* Contenedor Flotante Principal */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.5 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
            setIsHovered(false);
            setIsPlaylistOpen(false);
        }}
        className="fixed bottom-6 left-6 md:bottom-10 md:left-10 z-[100] flex flex-col-reverse items-start gap-2"
      >
        <motion.div 
          layout
          className={`flex items-center bg-[#0a0a0a]/95 backdrop-blur-xl border border-zinc-800 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.9)] transition-all duration-500 overflow-hidden ${
            isHovered ? 'pr-6' : 'pr-1'
          }`}
        >
          {/* Botón Principal (Vinilo) */}
          <button 
            onClick={togglePlay}
            className="relative flex items-center justify-center w-14 h-14 bg-black rounded-full border border-zinc-800 shrink-0 group hover:border-amber-500 transition-colors m-1 z-10 focus:outline-none"
          >
            <Disc 
              size={28} 
              className={`text-amber-500 transition-all ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : 'opacity-60'}`} 
            />
            <div className="absolute w-2.5 h-2.5 bg-zinc-900 rounded-full border border-zinc-700"></div>
            {isPlaying && (
              <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-md animate-pulse"></div>
            )}
          </button>

          {/* Panel Expandible (Estilo Winamp/Retro) */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ width: 0, opacity: 0, paddingLeft: 0 }}
                animate={{ width: "auto", opacity: 1, paddingLeft: 12 }}
                exit={{ width: 0, opacity: 0, paddingLeft: 0 }}
                className="flex items-center gap-4 overflow-hidden whitespace-nowrap"
              >
                
                {/* Controles de Reproducción */}
                <div className="flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-full border border-zinc-800">
                    <button onClick={prevTrack} className="text-zinc-400 hover:text-amber-500 transition-colors p-1"><SkipBack size={14} /></button>
                    <button onClick={stopPlayback} className="text-zinc-400 hover:text-amber-500 transition-colors p-1"><Square size={12} fill="currentColor" /></button>
                    <button onClick={togglePlay} className="text-zinc-200 hover:text-amber-500 transition-colors p-1">
                        {isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                    </button>
                    <button onClick={nextTrack} className="text-zinc-400 hover:text-amber-500 transition-colors p-1"><SkipForward size={14} /></button>
                </div>

                {/* Pantalla LED / Info del Track */}
                <div className="flex flex-col justify-center bg-[#050505] px-3 py-1 rounded-lg border border-zinc-800/80 min-w-[120px] relative overflow-hidden group/screen cursor-pointer" onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}>
                  
                  {/* Decoración Retro */}
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>

                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 text-amber-500">
                        {isPlaying ? (
                             <div className="flex items-end gap-[1px] h-2">
                                <motion.div animate={{ height: ["2px", "6px", "2px"] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-[2px] bg-amber-500" />
                                <motion.div animate={{ height: ["2px", "8px", "2px"] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-[2px] bg-amber-500" />
                                <motion.div animate={{ height: ["2px", "4px", "2px"] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-[2px] bg-amber-500" />
                             </div>
                        ) : (
                            <Music size={10} />
                        )}
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-500/90 truncate max-w-[70px]">
                            {currentTrack.title}
                        </p>
                    </div>
                    <ListMusic size={10} className="text-zinc-600 group-hover/screen:text-amber-500 transition-colors" />
                  </div>
                  
                  {/* Barra de Progreso */}
                  <div className="flex items-center gap-2">
                      <span className="text-[8px] font-mono text-zinc-500">{formatTime(currentTime)}</span>
                      <input 
                        type="range" 
                        min="0" 
                        max={duration || 100} 
                        value={currentTime} 
                        onChange={handleSeek}
                        className="w-16 h-0.5 bg-zinc-800 appearance-none cursor-pointer accent-amber-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:h-1.5 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-none"
                      />
                  </div>
                </div>

                <div className="w-px h-8 bg-zinc-800 mx-1"></div>

                {/* Controles de Volumen */}
                <div className="flex items-center gap-2 group/volume bg-black/50 px-3 py-1.5 rounded-full border border-zinc-800">
                  <button onClick={toggleMute} className="text-zinc-400 hover:text-amber-500 transition-colors focus:outline-none p-1">
                    <VolumeIcon size={14} />
                  </button>
                  <div className="flex flex-col gap-0.5">
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-14 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-amber-500 hover:bg-zinc-700 transition-colors [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-125 transition-transform"
                    />
                    <span className="text-[7px] text-zinc-500 font-mono text-right leading-none">
                        VOL {(volume * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Playlist Desplegable (Estilo Winamp) */}
        <AnimatePresence>
            {isHovered && isPlaylistOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="ml-2 w-[280px] bg-[#0a0a0a]/95 backdrop-blur-xl border border-zinc-800 rounded-xl p-3 shadow-2xl origin-bottom-left"
                >
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-zinc-800">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Playlist</span>
                        <span className="text-[10px] font-mono text-amber-500">{playlist.length} TRACKS</span>
                    </div>
                    <div className="space-y-1">
                        {playlist.map((track, idx) => (
                            <button 
                                key={idx}
                                onClick={() => {
                                    setCurrentTrackIndex(idx);
                                    if(!isPlaying) togglePlay();
                                }}
                                className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors group ${currentTrackIndex === idx ? 'bg-amber-500/10 border border-amber-500/30' : 'hover:bg-zinc-900 border border-transparent'}`}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className={`text-[10px] font-mono w-4 ${currentTrackIndex === idx ? 'text-amber-500' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                        {currentTrackIndex === idx && isPlaying ? <Play size={10} fill="currentColor"/> : (idx + 1).toString().padStart(2, '0')}
                                    </span>
                                    <span className={`text-xs truncate ${currentTrackIndex === idx ? 'text-amber-500 font-bold' : 'text-zinc-300 group-hover:text-white'}`}>
                                        {track.title}
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500 shrink-0">{track.duration}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

      </motion.div>
    </>
  );
}