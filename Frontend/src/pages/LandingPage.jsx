import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Bot, FileText, Eye, ShieldAlert, CheckCircle, 
    ArrowRight, Users, Activity, ScanLine, Zap
} from 'lucide-react';
import { 
    motion, useScroll, useTransform, 
    AnimatePresence, useMotionValue, useSpring
} from 'framer-motion';
import { SpiralAnimation } from '../components/ui/SpiralAnimation';

// --- COLOR MAPPINGS ---
// Primary Purples: #6D28D9 (deep), #7C3AED (mid), #A78BFA (light)
// Special Purples: #4C1D95 (darkest), #FAF5FF (very light BG), #EDE6FF (light border)
// Whites/Off-whites: #FFFFFF (pure white), #F9FAFB (off-white/gray-50)
// Black: #000000 (standard black)
// -----------------------

// ===================================================================
// NOTE: Applying simulated Tailwind animation styles for the background effect.
// In a real project, this would be in your global CSS or Tailwind config.
// ===================================================================
const GradientBackgroundStyles = () => (
    <style>{`
        /* 1. Define the keyframe animation */
        @keyframes gradient-shift {
            0% {
                background-position: 0% 50%;
            }
            50% {
                background-position: 100% 50%;
            }
            100% {
                background-position: 0% 50%;
            }
        }
        
        /* 2. Create the utility class */
        .animate-bg-gradient {
            background-size: 300% 300%; /* Ensure the gradient is larger than viewport */
            animation: gradient-shift 15s ease infinite; /* Apply animation */
        }

        /* Advanced floating animation */
        @keyframes float-smooth {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        
        .animate-float {
            animation: float-smooth 6s ease-in-out infinite;
        }

        /* Shimmer effect */
        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
        
        .animate-shimmer {
            animation: shimmer 2s infinite;
            background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
            background-size: 1000px 100%;
        }

        /* Glow pulse */
        @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 0 20px rgba(167, 139, 250, 0.4); }
            50% { box-shadow: 0 0 40px rgba(167, 139, 250, 0.8); }
        }
        
        .animate-glow-pulse {
            animation: glow-pulse 2s ease-in-out infinite;
        }
    `}</style>
);
// ===================================================================

// ===================================================================
// SectionSlide - Enhanced with sophisticated multi-layer animations
// ===================================================================
const SectionSlide = React.forwardRef(({ children, className = '', direction = 'left' }, ref) => {
    const initialX = direction === 'left' ? -150 : 150;
    const rotationAngle = direction === 'left' ? 8 : -8;
    
    return (
        <motion.section
            ref={ref}
            initial={{ 
                x: initialX, 
                opacity: 0,
                rotateY: rotationAngle,
                filter: 'blur(10px)',
                scale: 0.92
            }}
            whileInView={{ 
                x: 0, 
                opacity: 1,
                rotateY: 0,
                filter: 'blur(0px)',
                scale: 1
            }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ 
                duration: 1.2, 
                ease: [0.23, 1, 0.32, 1], // cubic-bezier for smooth, bouncy feel
                x: { duration: 1.2 },
                opacity: { duration: 0.8, delay: 0.1 },
                rotateY: { duration: 1.2 },
                filter: { duration: 1 },
                scale: { duration: 1.2 }
            }}
            className={className}
            style={{ perspective: '1200px' }}
        >
            {/* Subtle shimmer overlay that fades in */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: [0, 0.15, 0], x: [0, 200, 400] }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 2, delay: 0.3, ease: 'easeOut' }}
                className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#A78BFA]/20 via-transparent to-transparent opacity-0"
                style={{ mixBlendMode: 'screen' }}
            />
            {children}
        </motion.section>
    );
});

// ===================================================================
// Mouse-following Button Component for Interactive Feedback
// ===================================================================
const MagneticButton = ({ children, onClick, className }) => {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const xSpring = useSpring(x, { damping: 25, stiffness: 150 });
    const ySpring = useSpring(y, { damping: 25, stiffness: 150 });

    const handleMouseMove = (event) => {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            x.set(event.clientX - centerX);
            y.set(event.clientY - centerY);
        }
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.button
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ x: xSpring, y: ySpring }}
            onClick={onClick}
            className={className}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.96 }}
        >
            {children}
        </motion.button>
    );
};

// ===================================================================


// ===================================================================
// ResumeVisual Component - Enhanced with Advanced Animations
// ===================================================================
const ResumeVisual = () => {
    // Values intentionally empty — placeholders removed per request
    const extracted = [
        { key: 'name', label: 'Name', value: '' },
        { key: 'email', label: 'Email', value: '' },
        { key: 'skills', label: 'Skills', value: '' },
        { key: 'exp', label: 'Experience', value: '' }
    ];

    const chipVariants = {
        hidden: { opacity: 0, y: 8, scale: 0.98 },
        visible: i => ({ opacity: 1, y: 0, scale: 1, transition: { delay: 0.4 + i * 0.18, duration: 0.45, ease: 'easeOut' } })
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    return (
        <motion.div 
            className="p-4 bg-black h-full rounded-[2.5rem] flex flex-col items-center justify-between text-white overflow-hidden relative"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 25 }}
            viewport={{ once: true }}
            whileHover={{ boxShadow: '0 0 40px rgba(167, 139, 250, 0.3)' }}
        >
            <div className="w-full h-4/5 bg-black shadow-inner p-6 relative overflow-hidden flex gap-6 group" style={{
                background: 'linear-gradient(black, black) padding-box, linear-gradient(135deg, #7C3AED, #a78bfa) border-box',
                border: '2px solid transparent',
                borderRadius: '1rem'
            }}>
                {/* LEFT: Mock resume card with animated scan line */}
                <motion.div 
                    className="w-1/2 h-full bg-black p-4 relative flex flex-col" 
                    style={{
                        background: 'linear-gradient(black, black) padding-box, linear-gradient(135deg, #7C3AED, #a78bfa) border-box',
                        border: '2px solid transparent',
                        borderRadius: '0.75rem'
                    }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                    <motion.div 
                        className="h-16 w-48 bg-[#6D28D9]/20 rounded-sm mb-4"
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                    />
                    <div className="space-y-2 text-sm text-gray-400 flex-1">
                        {[...Array(10)].map((_, i) => (
                            <motion.div 
                                key={i} 
                                className={`h-3 ${i === 0 ? 'w-3/4' : i % 3 === 0 ? 'w-2/3' : 'w-full'} bg-[#7C3AED]/10 rounded-sm`}
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
                            />
                        ))}
                    </div>

                    {/* scan line (start when visible) */}
                    <motion.div
                        initial={{ x: '-120%' }}
                        whileInView={{ x: ['-120%', '120%'] }}
                        viewport={{ once: false, amount: 0.35 }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                        className="absolute left-0 right-0 top-20 h-0.5 bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent"
                    />
                </motion.div>

                {/* RIGHT: Parsing results + cards */}
                <motion.div 
                    className="w-1/2 h-full flex flex-col justify-between"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    <div>
                        <h4 className="text-sm text-gray-400 uppercase">Parsing</h4>
                        <motion.h3 
                            initial={{ opacity: 0, y: 8 }} 
                            whileInView={{ opacity: 1, y: 0 }} 
                            viewport={{ once: true, amount: 0.3 }} 
                            transition={{ delay: 0.2, duration: 0.4 }} 
                            className="text-2xl font-bold text-white mt-2"
                        >
                            Extracted Fields
                        </motion.h3>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            {extracted.map((e, i) => (
                                <motion.div
                                    key={e.key}
                                    custom={i}
                                    variants={chipVariants}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.25 }}
                                    className="bg-[#6D28D9]/30 rounded-lg p-3 flex flex-col cursor-pointer"
                                    style={{
                                        background: 'linear-gradient(rgba(109, 40, 217, 0.3), rgba(109, 40, 217, 0.3)) padding-box, linear-gradient(135deg, #7C3AED, #a78bfa) border-box',
                                        border: '1px solid transparent',
                                        borderRadius: '0.75rem'
                                    }}
                                    whileHover={{ 
                                        scale: 1.05,
                                        boxShadow: '0 0 20px rgba(167, 139, 250, 0.4)'
                                    }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                >
                                    <div className="text-xs text-gray-400">{e.label}</div>
                                    {e.value ? (
                                        <div className="text-sm font-semibold text-white">{e.value}</div>
                                    ) : (
                                        <div className="h-4" />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Parsing progress + result card */}
                    <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <div className="text-xs text-gray-400">Parsing Progress</div>
                            <div className="w-full bg-[#7C3AED]/20 h-3 rounded-full mt-2 overflow-hidden">
                                <motion.div 
                                    initial={{ width: '0%' }} 
                                    whileInView={{ width: '100%' }} 
                                    viewport={{ once: true, amount: 0.25 }} 
                                    transition={{ duration: 2.2, ease: 'easeOut' }} 
                                    className="h-full bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#A78BFA] rounded-full"
                                />
                            </div>
                        </div>

                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0.9 }} 
                            whileInView={{ scale: [0.95, 1.02, 0.98], opacity: [0.9, 1, 0.95] }} 
                            viewport={{ once: false, amount: 0.35 }} 
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} 
                            className="w-20 h-20 bg-[#6D28D9]/40 rounded-xl flex items-center justify-center text-[#A78BFA] font-bold cursor-pointer" 
                            style={{
                                background: 'linear-gradient(rgba(109, 40, 217, 0.4), rgba(109, 40, 217, 0.4)) padding-box, linear-gradient(135deg, #7C3AED, #a78bfa) border-box',
                                border: '2px solid transparent',
                                borderRadius: '0.75rem'
                            }}
                            whileHover={{ scale: 1.1 }}
                        >
                            <CheckCircle size={22} className="inline-block" />
                        </motion.div>
                    </div>
                </motion.div>
            </div>

            {/* Parsed output footer removed as requested */}
        </motion.div>
    );
};

// ===================================================================

// ===================================================================
// InterviewVisual Component - Enhanced with Advanced Animations
// ===================================================================
const InterviewVisual = () => {
    const chatVariants = {
        hidden: { opacity: 0 },
        visible: i => ({
            opacity: 1,
            transition: {
                delay: i * 0.5,
                duration: 0.8
            }
        })
    };

    return (
        // gray-900 replaced with black/dark purple
        <motion.div 
            className="p-4 bg-black h-full rounded-[2.5rem] grid grid-cols-2 gap-4 text-white" 
            style={{
                background: 'linear-gradient(black, black) padding-box, linear-gradient(135deg, #7C3AED, #a78bfa) border-box',
                border: '2px solid transparent',
                borderRadius: '2.5rem'
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 25 }}
            viewport={{ once: true }}
            whileHover={{ boxShadow: '0 0 40px rgba(167, 139, 250, 0.3)' }}
        >
            
            {/* LEFT: Candidate View */}
            <div className="col-span-1 flex flex-col h-full">
                {/* bg-black remains for video container */}
                <motion.div 
                    className="flex-grow bg-black rounded-lg relative overflow-hidden flex items-center justify-center group" 
                    style={{
                        background: 'linear-gradient(black, black) padding-box, linear-gradient(135deg, #7C3AED, #a78bfa) border-box',
                        border: '2px solid transparent',
                        borderRadius: '0.5rem'
                    }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                    {/* Animated interview visual: avatar + pulsing ring + waveform + chat bubbles */}
                    <div className="relative z-10 p-4 text-center w-full h-full flex items-center justify-center">
                        <div className="w-full h-full flex items-center justify-center gap-8 px-6">
                            {/* LEFT: Avatar + pulsing ring */}
                            <div className="flex-shrink-0 flex flex-col items-center gap-4">
                                <motion.div
                                    initial={{ scale: 0.98, opacity: 0.95 }}
                                    whileInView={{ scale: [0.98, 1.06, 0.98], opacity: [0.95, 1, 0.95] }}
                                    viewport={{ once: false, amount: 0.35 }}
                                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                                    className="relative flex items-center justify-center group/avatar"
                                    whileHover={{ scale: 1.1 }}
                                >
                                    <motion.div 
                                        className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#6D28D9] to-[#7C3AED] opacity-30 blur-xl group-hover/avatar:opacity-60"
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <motion.div 
                                        className="w-40 h-40 rounded-full bg-gradient-to-br from-[#6D28D9] to-[#7C3AED] flex items-center justify-center text-white font-semibold text-xl shadow-xl"
                                        animate={{ rotate: [0, 5, -5, 0] }}
                                        transition={{ duration: 4, repeat: Infinity }}
                                    >
                                        JD
                                    </motion.div>
                                </motion.div>
                                <div className="text-sm text-gray-300">Candidate: Jane Doe</div>
                            </div>

                            {/* CENTER: Live waveform */}
                            <div className="flex-1 flex items-center justify-center">
                                <svg width="340" height="120" viewBox="0 0 340 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {[...Array(28)].map((_, i) => {
                                        const x = 8 + i * 12;
                                        const delay = (i % 5) * 0.08;
                                        return (
                                            <motion.rect
                                                key={i}
                                                x={x}
                                                y={30}
                                                width={8}
                                                height={60}
                                                rx={3}
                                                fill="#7C3AED"
                                                initial={{ scaleY: 0.6 }}
                                                whileInView={{ scaleY: [0.5, 1.6, 0.6] }}
                                                viewport={{ once: false, amount: 0.25 }}
                                                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay }}
                                                style={{ transformOrigin: 'center' }}
                                                className="hover:fill-[#A78BFA]"
                                            />
                                        );
                                    })}
                                </svg>
                            </div>

                            {/* RIGHT: Floating chat bubbles */}
                            <div className="flex-shrink-0 w-40 h-40 relative">
                                <motion.div
                                    initial={{ x: 20, y: -10, opacity: 0 }}
                                    whileInView={{ x: [20, 6, 20], y: [-10, -2, -10], opacity: [0, 1, 0.9] }}
                                    viewport={{ once: false, amount: 0.3 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                    className="absolute top-2 right-0 p-3 bg-[#FAF5FF] text-[#6D28D9] rounded-xl shadow-md text-sm cursor-pointer"
                                    whileHover={{ scale: 1.05 }}
                                >
                                    AI: Please describe your role.
                                </motion.div>

                                <motion.div
                                    initial={{ x: 30, y: 60, opacity: 0 }}
                                    whileInView={{ x: [30, 8, 30], y: [60, 44, 60], opacity: [0, 1, 0.95] }}
                                    viewport={{ once: false, amount: 0.3 }}
                                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                                    className="absolute bottom-4 left-0 p-3 bg-[#6D28D9] text-white rounded-xl shadow-md text-sm cursor-pointer"
                                    whileHover={{ scale: 1.05 }}
                                >
                                    Candidate: I led a team of 5.
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </motion.div>
                <div className="text-xs text-center mt-2 text-gray-500">Live Video Feed</div>
            </div>

            {/* RIGHT: AI Analysis Panel */}
            <motion.div 
                className="col-span-1 flex flex-col h-full bg-[#4C1D95] rounded-lg p-3 group"
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
            >
                <div className="flex items-center gap-2 mb-3">
                    {/* Purple-400 replaced with #A78BFA */}
                    <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    >
                        <Bot size={20} className="text-[#A78BFA]" />
                    </motion.div>
                    <h3 className="text-md font-bold text-[#A78BFA] group-hover:text-white transition-colors">AI Transcript & Analysis</h3>
                </div>

                <div className="space-y-4 flex-grow overflow-y-auto">
                    {[
                        "AI: Tell me about a time you handled conflict.",
                        "CAND: I collaborated with the team to fix the deployment issue.",
                        "AI: What was the main technical challenge you faced?",
                    ].map((line, i) => (
                        <motion.p
                            key={i}
                            custom={i}
                            variants={chatVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.25 }}
                            className={`text-sm ${line.startsWith('AI') ? 'text-gray-400 font-bold' : 'text-gray-200'} hover:text-white transition-colors cursor-pointer`}
                            whileHover={{ x: 5 }}
                        >
                            {line}
                        </motion.p>
                    ))}
                    
                    {/* Key Insight Box: purple-900/50 and purple-700 replaced with dark purple/light purple */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ delay: 2.5, duration: 0.5, type: 'spring', stiffness: 100 }}
                        className="p-3 bg-black/50 rounded-lg mt-4 hover:bg-black/70 transition-colors cursor-pointer"
                        style={{
                            background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)) padding-box, linear-gradient(135deg, #7C3AED, #a78bfa) border-box',
                            border: '2px solid transparent',
                            borderRadius: '0.5rem'
                        }}
                        whileHover={{ 
                            boxShadow: '0 0 20px rgba(167, 139, 250, 0.3)',
                            scale: 1.02
                        }}
                    >
                        <p className="text-xs font-bold text-[#A78BFA] flex items-center gap-1">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <Activity size={12} />
                            </motion.div> 
                            Insight:
                        </p>
                        <p className="text-sm text-purple-200 mt-1">High **Collaboration** score (92%). Requires **Technical Depth** follow-up.</p>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ===================================================================
// ProctoringVisual Component (No Change)
// ===================================================================
const ProctoringVisual = () => {
    return (
        <div className="relative w-full h-full bg-gray-900 rounded-[2.5rem] border-8 border-gray-800 shadow-2xl p-2 overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-700 to-black rounded-[2rem] flex items-center justify-center relative overflow-hidden">
                {/* Subtle emblem behind the scene */}
                <ShieldAlert size={56} className="text-[#6D28D9] opacity-6 absolute -left-10 -top-8 transform rotate-12" />

                {/* Animated 'camera feed' surface: subtle noise / gradient to simulate a live view */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02),transparent_40%)]" />
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.01) 1px, transparent 1px)", backgroundSize: '24px 24px' }} />
                </div>

                {/* Heatmap / gaze blobs (motion) */}
                <div className="absolute inset-0 pointer-events-none">
                    <motion.div
                        className="absolute w-48 h-48 rounded-full bg-[#7C3AED] opacity-20 blur-[30px]"
                        whileInView={{ x: ['15%', '35%', '20%'], y: ['20%', '40%', '25%'], scale: [1, 1.25, 1] }}
                        viewport={{ once: false, amount: 0.25 }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute w-36 h-36 rounded-full bg-[#A78BFA] opacity-14 blur-[24px]"
                        whileInView={{ x: ['60%', '48%', '62%'], y: ['55%', '48%', '60%'], scale: [1, 1.15, 1] }}
                        viewport={{ once: false, amount: 0.25 }}
                        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                    />
                </div>

                {/* Face bounding box (pulsing) */}
                <motion.div
                    initial={{ opacity: 0.9 }}
                    whileInView={{ scale: [0.98, 1.02, 0.98], opacity: [0.9, 1, 0.95] }}
                    viewport={{ once: false, amount: 0.25 }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute border-2 border-[#A78BFA] rounded-lg w-40 h-56"
                    style={{ left: '50%', top: '40%', transform: 'translate(-50%, -50%)' }}
                />

                {/* Gaze indicator (small moving dot) */}
                <motion.div
                    className="absolute w-3 h-3 rounded-full bg-[#6D28D9] shadow-lg"
                    whileInView={{ x: ['42%', '50%', '58%'], y: ['46%', '50%', '44%'] }}
                    viewport={{ once: false, amount: 0.25 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ left: 0, top: 0 }}
                />

                {/* Small 'tab switch' and 'multi-voice' badges bottom-left */}
                <div className="absolute left-6 bottom-6 flex flex-col gap-3 z-30">
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-2 rounded-lg text-white text-xs" style={{
                        background: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)) padding-box, linear-gradient(135deg, #7C3AED, #a78bfa) border-box',
                        border: '2px solid transparent',
                        borderRadius: '0.5rem'
                    }}>
                        <div className="w-2 h-2 bg-[#A78BFA] rounded-full" />
                        <div>Tab Switches: 0</div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-2 rounded-lg text-white text-xs" style={{
                        background: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)) padding-box, linear-gradient(135deg, #7C3AED, #a78bfa) border-box',
                        border: '2px solid transparent',
                        borderRadius: '0.5rem'
                    }}>
                        <div className="w-2 h-2 bg-[#6D28D9] rounded-full" />
                        <div>Voices Detected: 1</div>
                    </div>
                </div>

                {/* Live waveform at bottom center */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-14">
                    <svg viewBox="0 0 300 40" preserveAspectRatio="none" className="w-full h-full">
                        {[...Array(40)].map((_, i) => {
                            const x = i * (300 / 40);
                            const delay = (i % 6) * 0.06;
                            return (
                                <motion.rect
                                    key={i}
                                    x={x}
                                    y={10}
                                    width={6}
                                    height={20}
                                    rx={2}
                                    fill="#7C3AED"
                                    initial={{ scaleY: 0.6 }}
                                                whileInView={{ scaleY: [0.4, 1.6, 0.4] }}
                                                viewport={{ once: false, amount: 0.25 }}
                                                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay }}
                                    style={{ transformOrigin: 'center' }}
                                />
                            );
                        })}
                    </svg>
                </div>

                {/* Top status overlay and typing text */}
                <div className="absolute top-4 left-6 z-40 text-white text-xs flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-[#6D28D9] font-semibold">Proctoring Active</div>
                    <div className="text-gray-300">Gaze OK</div>
                </div>

                <div className="absolute inset-0 flex items-end p-6 z-40 pointer-events-none">
                    <div className="w-full text-white text-sm">
      
                    </div>
                </div>
            </div>
        </div>
    );
};

// Dashboard preview removed from landing page per request.


// Simple Button Component Wrapper
const Button = ({ children, onClick, className }) => (
    <button onClick={onClick} className={className}>
        {children}
    </button>
);

// ===================================================================
// TypingText Component - Starts animation only when scrolled into view
// ===================================================================
const TypingText = ({ text, duration, className = '' }) => {
    const [visibleText, setVisibleText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        // Only start typing if hasStarted is true
        if (!hasStarted) return;

        // Normalize input to avoid issues when `text` is undefined or not a string
        const safeText = typeof text === 'string' ? text : String(text || '');
        setVisibleText('');
        setIsTyping(true);

        const totalDuration = (Number(duration) || 2) * 1000;
        const length = safeText.length || 1;
        // Keep a sensible minimum interval to avoid extremely fast typing
        const charInterval = Math.max(20, Math.floor(totalDuration / length));
        let charIndex = 0;

        const typingTimer = setInterval(() => {
            // guard against out-of-bounds access
            const nextChar = safeText.charAt(charIndex) || '';
            if (charIndex < safeText.length) {
                setVisibleText(prev => prev + nextChar);
                charIndex++;
            } else {
                clearInterval(typingTimer);
                setIsTyping(false);
            }
        }, charInterval);

        return () => clearInterval(typingTimer);
    }, [text, duration, hasStarted]);
    
    const cursorVariants = {
        blinking: {
            opacity: [0, 1],
            transition: {
                duration: 0.5,
                repeat: Infinity,
                repeatType: 'reverse',
            }
        }
    };
    
    // Render the typing text; allow callers to override classes via `className`
    const baseClass = 'text-xl text-gray-600 leading-relaxed';
    return (
        <motion.p 
            ref={ref}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            onViewportEnter={() => setHasStarted(true)}
            viewport={{ once: true, amount: 0.5 }}
            className={`${className || baseClass}`}
        >
            {visibleText}
            {isTyping && (
                <motion.span
                    variants={cursorVariants}
                    animate="blinking"
                    className="inline-block w-1 h-6 ml-1 bg-gray-900 align-middle"
                />
            )}
        </motion.p>
    );
};


// ===================================================================
// CUSTOM HOOK (Encapsulates useTransform calls) - NO CHANGE
// ===================================================================
const useHorizontalCardMotion = (horizontalProgress, index) => {
    const inputStart = index * 0.2;
    const inputMid = inputStart + 0.1;
    const inputEnd = inputStart + 0.2;

    const cardRotateY = useTransform(
        horizontalProgress, 
        [inputStart, inputMid, inputEnd], 
        [45, 0, -45]
    );

    const cardOpacity = useTransform(
        horizontalProgress, 
        [inputStart, inputMid, inputEnd], 
        [0.3, 1, 0.3]
    );

    return { cardRotateY, cardOpacity };
};
// ===================================================================

// --- MAIN PAGE ---

const LandingPage = () => {
    const navigate = useNavigate();
    
    // --- Refs for Scroll Animations ---
    const heroRef = useRef(null);
    const horizontalScrollRef = useRef(null); 
    
    // 1. Hero Header Scrubbing
    const { scrollYProgress: heroScroll } = useScroll({ 
        target: heroRef, 
        offset: ["start start", "end 50vh"] 
    });
    
    const headerScale = useTransform(heroScroll, [0, 1], [1, 0.8]);
    const headerOpacity = useTransform(heroScroll, [0, 0.4, 1], [1, 0.5, 0]);
    const headerBlur = useTransform(heroScroll, [0, 1], [0, 5]);

    // 3. Horizontal Feature Scrubbing
    const { scrollYProgress: horizontalProgress } = useScroll({
        target: horizontalScrollRef,
        offset: ["start end", "end start"] 
    });

    const xTransform = useTransform(horizontalProgress, [0.1, 0.8], ["0%", "-70%"]);

    // Page scroll for dynamic background gradient: purple gradient
    const { scrollYProgress: pageScroll } = useScroll();
    const bgGradient = useTransform(pageScroll, v => {
        // Purple gradient from the reference image
        const startColor = '#9b6dd6';
        const endColor = '#7c5ca0';
        // Blend with scroll position for dynamic effect
        return `linear-gradient(180deg, ${startColor} 0%, ${endColor} 100%)`;
    });

    // ===================================================================
    // Hooks must be called in the same order every render.
    // ===================================================================
    const card0 = useHorizontalCardMotion(horizontalProgress, 0);
    const card1 = useHorizontalCardMotion(horizontalProgress, 1);
    const card2 = useHorizontalCardMotion(horizontalProgress, 2);
    const card3 = useHorizontalCardMotion(horizontalProgress, 3);
    const cardMotionValues = [card0, card1, card2, card3];
    // ===================================================================

    // Feature colors updated: blue/purple/red/green replaced with shades of purple/black
    const featureData = [
        { icon: <FileText size={40} />, title: "Automatic Resume Parsing", desc: "Instantly analyze and structure candidate data. Focus on matching, not paperwork.", color: "text-gray-300", bg: "bg-black" },
        { icon: <Bot size={40} />, title: "Automated AI Interviews", desc: "24/7 video screening that captures soft skills and critical thinking.", color: "text-gray-300", bg: "bg-black" },
        { icon: <ShieldAlert size={40} />, title: "Real-Time Proctoring", desc: "Ensure assessment integrity with automated gaze tracking and environment monitoring.", color: "text-gray-300", bg: "bg-black" }
        
    ];


    return (
        // --- ADDED SCROLL-DRIVEN GRADIENT BACKGROUND & ANIMATION ---
        <motion.div className="min-h-screen font-sans selection:bg-gray-900 selection:text-white overflow-x-hidden animate-bg-gradient"
            style={{ background: bgGradient }}
        >
            <GradientBackgroundStyles />
            
            {/* --- SPIRAL ANIMATION HERO SECTION --- */}
            <section className="relative h-screen w-full overflow-hidden bg-black flex flex-col items-center justify-center">
                {/* Spiral Animation Background */}
                <div className="absolute inset-0">
                    <SpiralAnimation />
                </div>

                {/* Floating gradient orbs for depth */}
                <motion.div 
                    className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] rounded-full mix-blend-multiply filter blur-3xl opacity-15"
                    animate={{ 
                        scale: [1, 1.2, 1],
                        x: [0, 50, 0],
                        y: [0, 30, 0]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div 
                    className="absolute bottom-20 right-20 w-72 h-72 bg-gradient-to-l from-[#6D28D9] to-[#7C3AED] rounded-full mix-blend-multiply filter blur-3xl opacity-15"
                    animate={{ 
                        scale: [1, 1.15, 1],
                        x: [0, -40, 0],
                        y: [0, -50, 0]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                />

                {/* ELIXR Text Overlay with enhanced animation */}
                <motion.button
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 2, duration: 1, type: 'spring', stiffness: 100 }}
                    onClick={() => navigate('/signup')}
                    className="relative z-20 text-white text-4xl md:text-6xl tracking-[0.2em] uppercase font-extralight transition-all duration-700 hover:tracking-[0.3em]"
                    whileHover={{ 
                        scale: 1.05,
                        textShadow: '0 0 30px rgba(167, 139, 250, 0.8)'
                    }}
                    whileTap={{ scale: 0.95 }}
                >
                    AI-Cruit
                </motion.button>

                {/* Animated underline */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 200 }}
                    transition={{ delay: 2.5, duration: 1 }}
                    className="h-1 bg-gradient-to-r from-transparent via-[#A78BFA] to-transparent mt-6 z-20"
                />

                {/* Scroll Down Arrow with enhanced animations */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3, duration: 1 }}
                    className="absolute bottom-8 z-20"
                >
                    <motion.div
                        animate={{ y: [0, 12, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-white/60 hover:text-white/100 text-sm flex flex-col items-center gap-2 cursor-pointer transition-colors"
                    >
                        <span className="font-medium">Scroll to explore</span>
                        <motion.svg 
                            className="w-6 h-6" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            animate={{ y: [0, 6, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </motion.svg>
                    </motion.div>
                </motion.div>
            </section>
            
            {/* --- HERO SECTION: MASSIVE SCROLL SCRUBBING HEADER --- */}
            <section ref={heroRef} className="relative h-[80vh] flex flex-col items-center justify-start pt-20 overflow-hidden bg-black" id="features">
                {/* Background Grid - white grid lines on black background */}
                {/* Note: Hero background with white grid overlay for contrast */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#FFFFFF08_1px,transparent_1px),linear-gradient(to_bottom,#FFFFFF08_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                
                {/* Animated background elements */}
                <motion.div
                    className="absolute -top-40 right-0 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-3xl"
                    animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                />
                
                <div className="container z-10 px-6 text-center sticky top-20">
                    {/* Header animation linked to scroll */}
                    <motion.div 
                        style={{ scale: headerScale, opacity: headerOpacity, filter: useTransform(headerBlur, b => `blur(${b}px)`) }}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                        className="mb-8"
                    >
                        {/* yellow-500 replaced with light purple #A78BFA */}
                        <motion.span 
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white/50 backdrop-blur text-sm text-gray-600"
                            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(167, 139, 250, 0.3)' }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            >
                                <Zap size={14} className="text-[#A78BFA] fill-[#A78BFA]" />
                            </motion.div> 
                            AI-Cruit 1.0 Live
                        </motion.span>
                    </motion.div>

                    <motion.h1 
                        style={{ scale: headerScale, opacity: headerOpacity, filter: useTransform(headerBlur, b => `blur(${b}px)`) }}
                        className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-6"
                    >
                        Hiring, but <br />
                        {/* Gradient with purple accent */}
                        <motion.span 
                            className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] via-[#7C3AED] to-[#A78BFA] bg-300% animate-gradient"
                            animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        >
                            Crystal Clear.
                        </motion.span>
                    </motion.h1>

                    <motion.p 
                        style={{ opacity: headerOpacity, filter: useTransform(headerBlur, b => `blur(${b}px)`) }}
                        className="text-xl md:text-2xl text-[#D4CCFF] max-w-2xl mx-auto mb-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 1 }}
                    >
                        We broke the black box. Experience the fastest, fairest recruitment engine.
                    </motion.p>
                    
                    {/* CTA Button - bg-gray-900 replaced with deep purple #6D28D9 */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="mt-12"
                    >
                        <MagneticButton 
                            onClick={() => navigate('/signup')}
                            className="bg-[#6D28D9] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-2xl hover:shadow-[#6D28D9]/40 transition-all flex items-center gap-3 mx-auto"
                        >
                            Get Started 
                            <motion.div
                                animate={{ x: [0, 5, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            >
                                <ArrowRight size={20} />
                            </motion.div>
                        </MagneticButton>
                    </motion.div>
                </div>
            </section>

            {/* ------------------------------------------------------------- */}
            {/* --- NEW STATIC SECTION 1: Automatic Resume Parsing --- */}
            {/* ------------------------------------------------------------- */}
            <SectionSlide className="py-24 bg-black" direction="left">
                <div className="container mx-auto px-6">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white text-center mb-16">
                        Automatic Resume Parsing
                    </h2>
                    
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* LEFT: Typing Animation Text (Unboxed, Retained) */}
                        <div className="lg:order-1 order-2">
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                viewport={{ once: true, amount: 0.5 }}
                                className="max-w-xl mx-auto lg:mx-0"
                            >
                                
                                <TypingText
                                    text="Stop reading PDFs manually. Our AI engine instantly parses resumes in any format and extracts critical information such as skills, work experience, education, certifications, and timelines, even from poorly formatted or inconsistent documents. It cleans, standardizes, and structures messy resume data into unified candidate profiles within milliseconds, enabling faster screening, accurate comparisons, and data-driven hiring decisions without manual effort."
                                    duration={3}
                                    className="text-xl text-[#D4CCFF] leading-relaxed"
                                />
                            </motion.div>
                        </div>

                        {/* RIGHT: Resume Visual */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, type: "spring", stiffness: 50 }}
                            viewport={{ once: true, amount: 0.5 }}
                            className="w-full h-[500px] lg:order-2 order-1"
                        >
                            <ResumeVisual />
                        </motion.div>
                    </div>
                </div>
            </SectionSlide>

            {/* ------------------------------------------------------------- */}
            {/* --- NEW STATIC SECTION 2: Automated AI Interviews (TEXT UNBOXED) --- */}
            {/* ------------------------------------------------------------- */}
            {/* Removed the fixed background color to let the animated gradient show through */}
            <SectionSlide className="py-24 bg-black" direction="right">
                <div className="container mx-auto px-6">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white text-center mb-16">
                        Automated AI Interviews
                    </h2>
                    
                    {/* Reverse the layout for visual interest */}
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                         {/* LEFT: Interview Visual */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, type: "spring", stiffness: 50 }}
                            viewport={{ once: true, amount: 0.5 }}
                            className="w-full h-[500px] lg:order-1 order-1"
                        >
                            <InterviewVisual />
                        </motion.div>

                        {/* RIGHT: Text Content - NOW UNBOXED */}
                        <div className="lg:order-2 order-2">
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                viewport={{ once: true, amount: 0.5 }}
                                className="max-w-xl mx-auto lg:mx-0"
                            >
                               
                                <TypingText
                                    text="Conduct asynchronous video interviews 24/7. Our AI-led interviewer dynamically asks contextual follow-up questions based on each candidate’s responses, evaluates communication, confidence, and behavioral cues, and automatically scores and ranks candidates. By the time you log in, you already have a prioritized shortlist backed by structured insights and evidence."
                                    duration={3}
                                    className="text-xl text-[#D4CCFF] leading-relaxed"
                                />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </SectionSlide>
            
            {/* ------------------------------------------------------------- */}
            {/* --- NEW STATIC SECTION 3: Real-Time Proctoring (TEXT UNBOXED) --- */}
            {/* ------------------------------------------------------------- */}
            {/* Removed the fixed background color to let the animated gradient show through */}
            <SectionSlide className="py-24 bg-black" direction="left">
                <div className="container mx-auto px-6">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white text-center mb-16">
                        Real-Time Interview Proctoring
                    </h2>
                    
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* LEFT: Text Content - NOW UNBOXED */}
                        <div className="lg:order-1 order-2">
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                viewport={{ once: true, amount: 0.5 }}
                                className="max-w-xl mx-auto lg:mx-0"
                            >
                                
                                
                                <TypingText
                                    text="Ensure integrity throughout the interview process. Our proctoring engine continuously monitors tab switching, screen focus, gaze direction, and multiple voice detection to flag suspicious behavior in real time, ensuring the person you interview is the same person you hire, with every decision backed by verifiable audit logs."
                                    duration={3}
                                    className="text-xl text-[#D4CCFF] leading-relaxed"
                                />
                            </motion.div>
                        </div>

                        {/* RIGHT: Proctoring Visual */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, type: "spring", stiffness: 50 }}
                            viewport={{ once: true, amount: 0.5 }}
                            className="w-full h-[500px] lg:order-2 order-1"
                        >
                             <ProctoringVisual /> 
                        </motion.div>
                    </div>
                </div>
            </SectionSlide>


            {/* --- HORIZONTAL SCROLL FEATURE SHOWCASE (Uses corrected featureData) --- */}
            <SectionSlide ref={horizontalScrollRef} className="h-[120vh] relative py-4 bg-black" direction="right">
                <div className="sticky top-0 h-screen overflow-hidden flex items-center">
                    <motion.div style={{ x: xTransform }} className="flex gap-20 px-40">
                        {
                            featureData.map((feature, index) => {
                                const { cardRotateY, cardOpacity } = cardMotionValues[index];

                                return (
                                    <motion.div 
                                        key={index} 
                                        style={{ 
                                            rotateY: cardRotateY, 
                                            opacity: cardOpacity,
                                            background: 'linear-gradient(black, black) padding-box, linear-gradient(135deg, #7C3AED, #a78bfa) border-box',
                                            border: '2px solid transparent',
                                            borderRadius: '1.5rem'
                                        }}
                                        whileHover={{ 
                                            scale: 1.05,
                                            boxShadow: '0 0 50px rgba(167, 139, 250, 0.4)',
                                            rotateZ: 2
                                        }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                        className="w-[600px] h-[300px] flex-shrink-0 p-10 rounded-3xl shadow-xl bg-black flex flex-col justify-center items-center text-center group"
                                    >
                                        {/* Animated background glow on hover */}
                                        <motion.div
                                            className="absolute inset-0 opacity-0 group-hover:opacity-20 rounded-3xl bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] blur-xl"
                                            transition={{ duration: 0.3 }}
                                        />
                                        
                                        <div className="relative z-10">
                                            {/* Feature Icon container with advanced animation */}
                                            <motion.div 
                                                className="w-20 h-20 bg-[#7C3AED]/20 rounded-xl flex items-center justify-center mb-6 text-[#A78BFA]" 
                                                style={{
                                                    background: 'linear-gradient(rgba(124, 58, 237, 0.2), rgba(124, 58, 237, 0.2)) padding-box, linear-gradient(135deg, #7C3AED, #a78bfa) border-box',
                                                    border: '1px solid transparent',
                                                    borderRadius: '0.75rem'
                                                }}
                                                animate={{ 
                                                    rotateZ: [0, 5, -5, 0],
                                                    scale: [1, 1.1, 1]
                                                }}
                                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                                whileGroupHover={{ scale: 1.2, rotate: 10 }}
                                            >
                                                {feature.icon}
                                            </motion.div>
                                            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 group-hover:text-[#A78BFA] transition-colors">{feature.title}</h3>
                                            {/* Feature Description (corrected) */}
                                            <p className="text-xl text-[#D4CCFF] group-hover:text-white transition-colors">{feature.desc}</p>
                                        </div>
                                        
                                    </motion.div>
                                );
                            })
                        }
                    </motion.div>
                </div>
            </SectionSlide>

            {/* --- TRANSPARENCY SECTION (Pipeline - Enhanced) --- */}
            <SectionSlide className="py-16 bg-black text-white overflow-hidden" direction="left">
                <div className="container mx-auto px-6">
                    <motion.div 
                        className="mb-20 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                    >
                        <motion.h2 
                            className="text-4xl md:text-5xl font-extrabold mb-6"
                            animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
                            transition={{ duration: 5, repeat: Infinity }}
                        >
                            No More Black Boxes
                        </motion.h2>
                        <p className="text-gray-400 text-xl">We keep candidates informed at every step.</p>
                    </motion.div>

                    {/* Pipeline Visualization */}
                    <div className="relative max-w-5xl mx-auto">
                        {/* bg-gray-800 remains dark gray */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-800 -translate-y-1/2"></div>
                        {/* Progress Beam Gradient: blue-500, purple-500, green-500 replaced with 
                            #6D28D9 (deep), #7C3AED (mid), #A78BFA (light)
                        */}
                        <motion.div 
                            initial={{ width: "0%" }}
                            whileInView={{ width: "100%" }}
                            transition={{ duration: 2, ease: "circOut" }}
                            className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#A78BFA] -translate-y-1/2 shadow-lg shadow-[#7C3AED]/50"
                        ></motion.div>

                        <div className="grid grid-cols-4 gap-4 relative z-10">
                            {[
                                { icon: <FileText />, title: "Application", status: "UPLOADED" },
                                { icon: <Bot />, title: "Resume Parsing", status: "PROCESSING" },
                                { icon: <Activity />, title: "Automated Interviews", status: "PASSED" },
                                { icon: <CheckCircle />, title: "Final Offer", status: "PENDING" },
                            ].map((step, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ y: 50, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    transition={{ delay: i * 0.2, type: 'spring', stiffness: 100 }}
                                    viewport={{ once: true }}
                                    className="flex flex-col items-center text-center"
                                >
                                    {/* Icon Circle with enhanced animations */}
                                    <motion.div 
                                        className="w-16 h-16 rounded-full bg-gray-800 border-4 border-black flex items-center justify-center mb-4 relative group cursor-pointer"
                                        whileHover={{ 
                                            scale: 1.15,
                                            boxShadow: '0 0 30px rgba(167, 139, 250, 0.6)'
                                        }}
                                        transition={{ type: 'spring', stiffness: 300 }}
                                    >
                                        <motion.div 
                                            className="absolute inset-0 bg-[#7C3AED] rounded-full opacity-0 group-hover:opacity-30"
                                            animate={{ scale: [1, 1.5, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        ></motion.div>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                        >
                                            {step.icon}
                                        </motion.div>
                                    </motion.div>
                                    <h3 className="font-bold text-base">{step.title}</h3>
                                    {/* Status Label with animation */}
                                    <motion.span 
                                        className="text-xs uppercase tracking-wider text-[#A78BFA] mt-1 bg-[#4C1D95]/50 px-2 py-1 rounded"
                                        whileHover={{ scale: 1.1, backgroundColor: '#6D28D9' }}
                                        transition={{ type: 'spring', stiffness: 300 }}
                                    >
                                        {step.status}
                                    </motion.span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </SectionSlide>

            {/* Dashboard preview removed */}

            {/* --- CTA SECTION (Enhanced) --- */}
            <SectionSlide className="py-12 bg-black text-white text-center relative overflow-hidden" direction="left">
                {/* Animated background elements */}
                <motion.div
                    className="absolute inset-0 opacity-20"
                    animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
                    transition={{ duration: 8, repeat: Infinity }}
                />
                
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
                    viewport={{ once: true }}
                    className="container mx-auto px-6 relative z-10"
                >
                    <motion.h2 
                        className="text-5xl md:text-7xl font-extrabold mb-8"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                    >
                        Ready to automate?
                    </motion.h2>
                    {/* CTA Button: Enhanced with magnetic effect */}
                    <MagneticButton 
                        onClick={() => navigate('/signup')}
                        className="bg-white text-black px-12 py-6 text-xl font-bold rounded-full hover:bg-gray-200 transition-colors shadow-2xl"
                    >
                        <motion.div
                            className="flex items-center gap-3"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            Get Started Now
                        </motion.div>
                    </MagneticButton>
                </motion.div>
            </SectionSlide>
        </motion.div>
    );
};

export default LandingPage;