import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Crown, Headphones, Clock, Disc3 } from 'lucide-react';

const MusicPlayer = ({ sessionId, isHost, socket, songUrl }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const audioSrc = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    useEffect(() => {
        if (!socket) return;
        const handlePlaySync = ({ currentTime: syncedTime }) => {
            if (audioRef.current) {
                if (Math.abs(audioRef.current.currentTime - syncedTime) > 0.5) audioRef.current.currentTime = syncedTime;
                audioRef.current.play().catch(console.error);
                setIsPlaying(true);
            }
        };
        const handlePauseSync = ({ currentTime: syncedTime }) => {
            if (audioRef.current) {
                audioRef.current.pause();
                if (Math.abs(audioRef.current.currentTime - syncedTime) > 0.5) audioRef.current.currentTime = syncedTime;
                setIsPlaying(false);
            }
        };
        const handleSeekSync = ({ seekTime }) => {
            if (audioRef.current) {
                audioRef.current.currentTime = seekTime;
                setCurrentTime(seekTime);
            }
        };

        socket.on('play', handlePlaySync);
        socket.on('pause', handlePauseSync);
        socket.on('seek', handleSeekSync);

        return () => {
            socket.off('play', handlePlaySync);
            socket.off('pause', handlePauseSync);
            socket.off('seek', handleSeekSync);
        };
    }, [socket]);

    useEffect(() => {
        let syncInterval;
        if (isHost && socket && isPlaying) {
            syncInterval = setInterval(() => {
                if (audioRef.current) {
                    socket.emit('auto-sync', {
                        roomId: sessionId,
                        currentTime: audioRef.current.currentTime,
                        isPlaying: !audioRef.current.paused
                    });
                }
            }, 5000);
        }
        return () => { if (syncInterval) clearInterval(syncInterval); };
    }, [isHost, socket, isPlaying, sessionId]);

    useEffect(() => {
        if (!socket || isHost) return;
        const handleAutoSync = ({ currentTime: syncedTime, isPlaying: hostIsPlaying }) => {
            if (audioRef.current) {
                if (Math.abs(audioRef.current.currentTime - syncedTime) > 1) {
                    audioRef.current.currentTime = syncedTime;
                }
                const isPaused = audioRef.current.paused;
                if (hostIsPlaying && isPaused) {
                    audioRef.current.play().catch(console.error);
                    setIsPlaying(true);
                } else if (!hostIsPlaying && !isPaused) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                }
            }
        };
        socket.on('auto-sync', handleAutoSync);
        return () => socket.off('auto-sync', handleAutoSync);
    }, [socket, isHost]);

    const handleTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    };
    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };

    const togglePlayPause = () => {
        if (!isHost) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            socket.emit('pause', { roomId: sessionId, currentTime: audioRef.current.currentTime });
        } else {
            audioRef.current.play().catch(console.error);
            setIsPlaying(true);
            socket.emit('play', { roomId: sessionId, currentTime: audioRef.current.currentTime });
        }
    };

    const handleSeek = (e) => {
        if (!isHost) return;
        const newTime = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            socket.emit('seek', { roomId: sessionId, seekTime: newTime });
        }
    };

    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60) || 0;
        const seconds = Math.floor(timeInSeconds % 60) || 0;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const progressPercent = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 relative overflow-hidden shadow-2xl h-full flex flex-col justify-center">
            {/* Host Badge */}
            <div className="absolute top-6 right-6">
                {isHost ? (
                    <div className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm transition-all shadow-indigo-500/20">
                        <Crown className="w-4 h-4" />
                        Host
                    </div>
                ) : (
                    <div className="bg-slate-700/50 border border-slate-600/50 text-slate-400 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm transition-all">
                        <Headphones className="w-4 h-4" />
                        Listener
                    </div>
                )}
            </div>

            <audio ref={audioRef} src={audioSrc} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />

            {/* Album Art Placeholder */}
            <div className="flex flex-col items-center mt-6 mb-10">
                <div className="w-56 h-56 rounded-[2rem] bg-gradient-to-br from-indigo-500/30 to-blue-500/20 border border-slate-700/50 flex items-center justify-center shadow-2xl shadow-indigo-500/10 mb-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]"></div>
                    <Disc3 className={`w-28 h-28 text-indigo-400/50 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
                </div>
                <h3 className="text-2xl font-bold text-slate-50 mb-2 max-w-sm truncate text-center" title={songUrl}>{songUrl ? songUrl.substring(songUrl.lastIndexOf('/') + 1).replace('.mp3', '') : "Loading Track..."}</h3>
                <p className="text-slate-400 font-medium tracking-wide text-sm flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Synchronized Playback</p>
            </div>

            {/* Controls */}
            <div className="w-full max-w-lg mx-auto">
                <div className="mb-4 relative group">
                    <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden absolute top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        disabled={!isHost}
                        className={`w-full h-4 appearance-none origin-center bg-transparent z-10 relative focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg ${isHost ? 'cursor-pointer hover:scale-y-110 transition-transform' : 'cursor-not-allowed opacity-0'}`}
                    />
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider mb-8 px-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-center gap-10">
                    <button disabled={!isHost} className={`p-4 rounded-full transition-all ${isHost ? 'text-slate-400 hover:text-white hover:bg-slate-700/50 active:scale-95' : 'text-slate-600 cursor-not-allowed hidden'}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-180"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>
                    </button>

                    <button
                        onClick={togglePlayPause}
                        disabled={!isHost}
                        className={`w-20 h-20 flex items-center justify-center rounded-full transition-all duration-300 shadow-xl relative group ${isHost
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 active:scale-95 shadow-indigo-500/30'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                            }`}
                    >
                        {isHost && isPlaying && <div className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-20"></div>}
                        {isPlaying ? <Pause className="w-8 h-8 fill-current relative z-10" /> : <Play className="w-8 h-8 fill-current ml-1 relative z-10" />}
                    </button>

                    <button disabled={!isHost} className={`p-4 rounded-full transition-all ${isHost ? 'text-slate-400 hover:text-white hover:bg-slate-700/50 active:scale-95' : 'text-slate-600 cursor-not-allowed hidden'}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MusicPlayer;
