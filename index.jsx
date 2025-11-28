import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Settings, Play, Pause, RotateCcw, X, Check, 
    Coffee, Brain, Zap, MoreHorizontal, Volume2, 
    VolumeX, BarChart2 
} from 'lucide-react';

export default function App() {
    // --- 1. Configurations ---
    const modes = useMemo(() => ({
        focus: { 
            id: 'focus',
            label: 'Focus Flow', 
            subLabel: 'เข้าสู่โซนแห่งสมาธิ',
            gradient: 'from-slate-900 via-gray-900 to-emerald-950',
            accent: 'text-emerald-400',
            ringColorStart: '#34d399', // emerald-400
            ringColorEnd: '#059669',   // emerald-600
            icon: <Brain size={20} />
        },
        short: { 
            id: 'short',
            label: 'Short Break', 
            subLabel: 'ผ่อนคลายสักนิด',
            gradient: 'from-slate-900 via-indigo-950 to-slate-900',
            accent: 'text-indigo-400',
            ringColorStart: '#818cf8', // indigo-400
            ringColorEnd: '#4f46e5',   // indigo-600
            icon: <Coffee size={20} />
        },
        long: { 
            id: 'long',
            label: 'Long Break', 
            subLabel: 'รีชาร์จพลังเต็มที่',
            gradient: 'from-slate-900 via-rose-950 to-slate-900',
            accent: 'text-rose-400',
            ringColorStart: '#fb7185', // rose-400
            ringColorEnd: '#e11d48',   // rose-600
            icon: <Zap size={20} />
        }
    }), []);

    // --- 2. State Management ---
    const [mode, setMode] = useState('focus');
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    
    // Stats
    const [stats, setStats] = useState({
        cycles: 0,
        totalFocusMinutes: 0
    });

    const [taskName, setTaskName] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showStats, setShowStats] = useState(false);

    // Advanced Settings
    const [settings, setSettings] = useState({
        focus: 25,
        short: 5,
        long: 15,
        autoStartBreaks: true,
        autoStartPomodoros: false,
        longBreakInterval: 4,
        soundEnabled: true,
        volume: 0.5,
        soundType: 'bell', // bell, digital, nature
        notifications: true
    });

    const timerRef = useRef(null);
    const audioCtxRef = useRef(null);

    // --- 3. Audio Engine ---
    const initAudio = () => {
        if (!audioCtxRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtxRef.current = new AudioContext();
            }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    const playSound = () => {
        if (!settings.soundEnabled || !audioCtxRef.current) return;

        const ctx = audioCtxRef.current;
        const t = ctx.currentTime;
        const vol = settings.volume;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (settings.soundType === 'bell') {
            // Zen Bell Sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, t); // C5
            osc.frequency.exponentialRampToValueAtTime(261.63, t + 2); 
            
            // Harmonics
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(523.25 * 1.5, t); // P5
            
            osc2.start(t);
            osc2.stop(t + 2);
            gain2.gain.setValueAtTime(vol * 0.1, t);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

            gain.gain.setValueAtTime(vol * 0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
            
            osc.start(t);
            osc.stop(t + 2.5);

        } else if (settings.soundType === 'digital') {
            // Digital Beep
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, t);
            osc.frequency.setValueAtTime(1760, t + 0.1);
            
            gain.gain.setValueAtTime(vol * 0.1, t);
            gain.gain.setValueAtTime(vol * 0.1, t + 0.1);
            gain.gain.linearRampToValueAtTime(0, t + 0.3);
            
            osc.start(t);
            osc.stop(t + 0.3);

        } else if (settings.soundType === 'nature') {
            // Soft Chirp
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1500, t);
            osc.frequency.linearRampToValueAtTime(2000, t + 0.1);
            osc.frequency.linearRampToValueAtTime(1500, t + 0.2);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(vol * 0.1, t + 0.1);
            gain.gain.linearRampToValueAtTime(0, t + 0.3);
            
            osc.start(t);
            osc.stop(t + 0.3);
        }
    };

    // --- 4. Notification Engine ---
    const sendNotification = (title, body) => {
        if (settings.notifications && "Notification" in window) {
            if (Notification.permission === "granted") {
                new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/2928/2928750.png' });
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission();
            }
        }
    };

    // --- 5. Timer Logic ---
    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            clearInterval(timerRef.current);
            completeTimer();
        }
        
        const { m, s } = formatTime(timeLeft);
        document.title = `${m}:${s} - ${modes[mode].label}`;

        return () => clearInterval(timerRef.current);
    }, [isActive, timeLeft, mode]);

    const completeTimer = () => {
        playSound();
        
        if (mode === 'focus') {
            sendNotification("Great Job!", "Focus session completed.");
            const newCycles = stats.cycles + 1;
            setStats(prev => ({
                cycles: newCycles,
                totalFocusMinutes: prev.totalFocusMinutes + settings.focus
            }));
            
            if (newCycles % settings.longBreakInterval === 0) {
                switchMode('long', settings.autoStartBreaks);
            } else {
                switchMode('short', settings.autoStartBreaks);
            }
        } else {
            sendNotification("Break Over", "Time to focus again.");
            switchMode('focus', settings.autoStartPomodoros);
        }
    };

    const switchMode = (newMode, shouldAutoStart = false) => {
        setMode(newMode);
        setTimeLeft(settings[newMode] * 60);
        setIsActive(shouldAutoStart);
    };

    const toggleTimer = () => {
        if (!isActive) initAudio(); 
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(settings[mode] * 60);
    };

    // --- 6. Helpers ---
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return { 
            m: mins < 10 ? `0${mins}` : mins, 
            s: secs < 10 ? `0${secs}` : secs 
        };
    };

    const totalTime = settings[mode] * 60;
    const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-1000 bg-gradient-to-br ${modes[mode].gradient} font-sans relative overflow-hidden`}>
            
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                 <div className="absolute top-0 left-0 w-full h-full opacity-10" 
                      style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}>
                 </div>
                 <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-${mode === 'focus' ? 'emerald' : mode === 'short' ? 'indigo' : 'rose'}-500/20 rounded-full blur-[100px] animate-pulse`}></div>
                 <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-${mode === 'focus' ? 'teal' : mode === 'short' ? 'blue' : 'orange'}-500/20 rounded-full blur-[100px] animate-pulse delay-1000`}></div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700&family=Sarabun:wght@300;400;500;600&display=swap');
                body { font-family: 'Outfit', 'Sarabun', sans-serif; }
                .glass-premium {
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
                }
                input[type=range] {
                    -webkit-appearance: none; 
                    background: transparent; 
                }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 16px; width: 16px;
                    border-radius: 50%;
                    background: #fff;
                    margin-top: -6px;
                }
                input[type=range]::-webkit-slider-runnable-track {
                    width: 100%; height: 4px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
            `}</style>

            {/* Main Interface */}
            <div className="glass-premium w-full max-w-sm sm:max-w-md rounded-[3rem] p-8 relative z-10 text-white transition-all duration-700 transform hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                        <span className={`text-xs font-bold tracking-widest uppercase ${modes[mode].accent}`}>
                            {modes[mode].label}
                        </span>
                    </div>
                    
                    <div className="flex gap-2">
                        <button onClick={() => setShowStats(true)} className="p-2.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-95">
                            <BarChart2 size={18} />
                        </button>
                        <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-95">
                            <Settings size={18} />
                        </button>
                    </div>
                </div>

                {/* Task Input */}
                <div className="mb-8 text-center group">
                    <div className="relative inline-block w-full">
                        <input 
                            type="text" 
                            placeholder="เป้าหมายของคุณคือ?" 
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                            className="w-full bg-transparent text-center text-xl sm:text-2xl font-light text-white outline-none placeholder-white/20 tracking-wide transition-all group-hover:placeholder-white/30"
                        />
                        <div className={`h-px w-1/3 mx-auto mt-2 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-500 ${isActive ? 'w-2/3 via-' + modes[mode].accent.split('-')[1] + '-400' : ''}`}></div>
                    </div>
                    <div className="text-white/40 text-sm mt-2 font-light tracking-wide">{modes[mode].subLabel}</div>
                </div>

                {/* Timer Ring */}
                <div className="relative w-72 h-72 mx-auto mb-10 flex items-center justify-center">
                    <svg className="absolute w-0 h-0">
                        <defs>
                            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={modes[mode].ringColorStart} />
                                <stop offset="100%" stopColor={modes[mode].ringColorEnd} />
                            </linearGradient>
                        </defs>
                    </svg>

                    <div className={`absolute inset-0 rounded-full blur-[60px] opacity-20 transition-all duration-1000 ${isActive ? 'scale-110 opacity-30' : ''}`} 
                         style={{ backgroundColor: modes[mode].ringColorStart }}></div>

                    <svg className="absolute w-full h-full transform -rotate-90 drop-shadow-2xl">
                        <circle cx="50%" cy="50%" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
                        <circle cx="50%" cy="50%" r={radius} stroke="url(#ringGradient)" strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-linear" style={{ filter: `drop-shadow(0 0 10px ${modes[mode].ringColorStart})` }} />
                    </svg>
                    
                    <div className="text-center z-10 flex flex-col items-center">
                        <div className={`text-8xl font-thin tracking-tighter transition-all duration-500 select-none ${isActive ? 'text-white scale-105' : 'text-white/80'}`}>
                            {formatTime(timeLeft).m}
                            <span className="text-white/20 text-4xl align-top mx-1">:</span>
                            {formatTime(timeLeft).s}
                        </div>
                        
                        <div className={`mt-6 p-2.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/5 text-white/70 transition-all duration-500 flex items-center gap-2 ${isActive ? 'scale-110 bg-white/10 ' + modes[mode].accent : ''}`}>
                             {isActive ? modes[mode].icon : <MoreHorizontal size={18} />}
                             <span className="text-xs font-bold uppercase tracking-widest">{isActive ? 'RUNNING' : 'PAUSED'}</span>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-center items-center gap-8 mb-8">
                    <button onClick={resetTimer} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-95 group">
                        <RotateCcw size={22} className="group-hover:-rotate-180 transition-transform duration-500" />
                    </button>

                    <button onClick={toggleTimer} className={`h-24 w-24 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 group`} 
                        style={{ 
                            background: `linear-gradient(135deg, ${modes[mode].ringColorStart}, ${modes[mode].ringColorEnd})`,
                            boxShadow: isActive ? `0 0 40px -10px ${modes[mode].ringColorStart}` : 'none'
                        }}>
                        {isActive ? <Pause size={36} fill="currentColor" className="text-white drop-shadow-md" /> : <Play size={36} fill="currentColor" className="text-white ml-2 drop-shadow-md group-hover:scale-110 transition-transform" />}
                    </button>
                    
                    <div className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl bg-white/5 min-w-[4rem]" title={`รอบที่ ${stats.cycles + 1} (เป้าหมายพักยาว: ${settings.longBreakInterval})`}>
                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">CYCLE</span>
                        <div className="flex items-baseline gap-0.5"><span className="text-xl font-medium text-white">{stats.cycles}</span><span className="text-xs text-white/30">/{settings.longBreakInterval}</span></div>
                    </div>
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-3">
                    {[...Array(settings.longBreakInterval)].map((_, i) => (
                        <div key={i} className={`h-2 rounded-full transition-all duration-700 ${i < (stats.cycles % settings.longBreakInterval) ? `w-8 ${modes['focus'].accent.replace('text-', 'bg-')} shadow-[0_0_15px_currentColor]` : i === (stats.cycles % settings.longBreakInterval) && isActive && mode === 'focus' ? 'w-8 bg-white/40 animate-pulse' : 'w-2 bg-white/10'}`} />
                    ))}
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" onClick={() => setShowSettings(false)}></div>
                    <div className="glass-premium border border-white/10 text-white rounded-3xl shadow-2xl w-full max-w-sm p-6 z-10 relative custom-scrollbar max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                            <h2 className="text-lg font-medium tracking-wide flex items-center gap-2"><Settings size={20} className="text-emerald-400" /> ตั้งค่า</h2>
                            <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white transition-colors bg-white/5 p-1 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 flex items-center gap-2"><div className="w-1 h-1 bg-emerald-400 rounded-full"></div> เวลา (นาที)</h3>
                            {[{ key: 'focus', label: 'เวลาโฟกัส' }, { key: 'short', label: 'พักสั้น' }, { key: 'long', label: 'พักยาว' }].map((item) => (
                                <div key={item.key} className="flex justify-between items-center bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors">
                                    <label className="text-white/70 text-sm">{item.label}</label>
                                    <input type="number" value={settings[item.key]} onChange={(e) => setSettings({...settings, [item.key]: Math.max(1, parseInt(e.target.value) || 1)})} className="w-16 bg-slate-900/50 text-center text-white rounded-lg py-1.5 outline-none focus:ring-1 focus:ring-emerald-500/50 border border-white/5" />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4 mb-8">
                            <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 flex items-center gap-2"><div className="w-1 h-1 bg-indigo-400 rounded-full"></div> เสียง</h3>
                            <div className="bg-white/5 p-4 rounded-xl space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-white/70 text-sm">เปิดเสียง</span>
                                    <button onClick={() => setSettings(s => ({...s, soundEnabled: !s.soundEnabled}))} className={`w-12 h-7 rounded-full p-1 transition-colors ${settings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.soundEnabled ? 'translate-x-5' : ''}`} /></button>
                                </div>
                                {settings.soundEnabled && (
                                    <>
                                        <div className="space-y-2"><div className="flex justify-between text-xs text-white/40"><span>ระดับเสียง</span><span>{Math.round(settings.volume * 100)}%</span></div><input type="range" min="0" max="1" step="0.1" value={settings.volume} onChange={(e) => setSettings({...settings, volume: parseFloat(e.target.value)})} className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" /></div>
                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                            {['bell', 'digital', 'nature'].map(type => (
                                                <button key={type} onClick={() => { setSettings({...settings, soundType: type}); const prev = settings.soundType; settings.soundType = type; playSound(); settings.soundType = prev; }} className={`py-2 px-1 rounded-lg text-xs font-medium capitalize transition-all ${settings.soundType === type ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>{type}</button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                             <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 flex items-center gap-2"><div className="w-1 h-1 bg-rose-400 rounded-full"></div> ระบบอัตโนมัติ</h3>
                             {['autoStartBreaks', 'autoStartPomodoros'].map((key) => (
                                 <div key={key} className="flex justify-between items-center bg-white/5 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setSettings(s => ({...s, [key]: !s[key]}))}>
                                    <span className="text-white/70 text-sm">{key === 'autoStartBreaks' ? 'เริ่มพักอัตโนมัติ' : 'เริ่มโฟกัสอัตโนมัติ'}</span>
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${settings[key] ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings[key] ? 'translate-x-4' : ''}`} /></div>
                                 </div>
                             ))}
                        </div>
                        <button onClick={() => { resetTimer(); setShowSettings(false); }} className="w-full bg-white text-slate-900 py-3.5 rounded-xl font-bold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-white/5"><Check size={20} /> บันทึกการตั้งค่า</button>
                    </div>
                </div>
            )}

            {/* Stats Modal */}
            {showStats && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={() => setShowStats(false)}></div>
                    <div className="glass-premium text-white rounded-3xl shadow-2xl w-full max-w-xs p-8 z-10 relative animate-fadeIn text-center">
                        <h2 className="text-xl font-bold mb-6 flex justify-center items-center gap-2"><BarChart2 className="text-emerald-400" /> สถิติวันนี้</h2>
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><div className="text-3xl font-bold text-emerald-400 mb-1">{stats.cycles}</div><div className="text-xs text-white/40 uppercase tracking-wider">รอบที่ทำได้</div></div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><div className="text-3xl font-bold text-indigo-400 mb-1">{stats.totalFocusMinutes}</div><div className="text-xs text-white/40 uppercase tracking-wider">นาทีที่โฟกัส</div></div>
                        </div>
                        <button onClick={() => setShowStats(false)} className="text-white/50 hover:text-white text-sm underline underline-offset-4">ปิดหน้าต่าง</button>
                    </div>
                </div>
            )}
        </div>
    );
}
