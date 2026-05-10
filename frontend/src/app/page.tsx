"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Dashboard from "@/components/Dashboard";
import { BrainCircuit, Shield } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.6,
      delayChildren: 0.3,
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  show: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { duration: 1, ease: "easeOut" } 
  }
};

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const handleKeyDown = () => {
      if (showSplash) {
        setShowSplash(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSplash]);

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#050508] relative">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute inset-0 flex flex-col items-center justify-center z-50 cursor-pointer"
            onClick={() => setShowSplash(false)}
          >
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-[url('/hacker-bg.png')] bg-cover bg-center opacity-[0.25] mix-blend-screen pointer-events-none"
            />
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-[#050508]/80 pointer-events-none"></div>

            {/* Content Container (Staggered Animation) */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="relative z-10 flex flex-col items-center mt-[-10vh]"
            >
              <motion.div variants={itemVariants} className="relative mb-6">
                <BrainCircuit className="w-24 h-24 text-blue-500 relative z-10" />
                <div className="absolute inset-0 bg-blue-500 blur-[50px] opacity-60"></div>
              </motion.div>

              <motion.h1 variants={itemVariants} className="text-6xl font-bold tracking-widest text-white mb-6 shadow-black drop-shadow-2xl">
                Sentinel<span className="text-blue-500">OS</span>
              </motion.h1>

              <motion.div variants={itemVariants} className="flex items-center gap-3 text-slate-300 font-medium text-sm md:text-lg uppercase tracking-[0.4em]">
                <Shield className="w-5 h-5 text-emerald-500" />
                <span>Perceive • Reason • Mitigate</span>
              </motion.div>
            </motion.div>

            {/* Press any key - Delayed significantly so it appears last */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.8, duration: 1 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 text-slate-500 text-sm tracking-widest uppercase animate-pulse flex items-center gap-3"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
              Press any key to initialize system
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            className="h-full w-full"
          >
            <Dashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
