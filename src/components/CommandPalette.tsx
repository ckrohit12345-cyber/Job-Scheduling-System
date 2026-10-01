"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { backdropVariants, modalVariants } from "../lib/motion";

interface CommandItem {
  id: string;
  category: "Algorithm" | "Preset" | "View" | "Export";
  label: string;
  detail?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAlgorithm: (algo: string) => void;
  onSelectPreset: (preset: string) => void;
  onToggleDrawer: () => void;
  onToggleTheme: () => void;
  onExport: (format: "csv" | "json" | "pdf") => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectAlgorithm,
  onSelectPreset,
  onToggleDrawer,
  onToggleTheme,
  onExport,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = [
    { id: "alg-fcfs", category: "Algorithm", label: "Run FCFS (First-Come, First-Served)", action: () => onSelectAlgorithm("FCFS") },
    { id: "alg-sjf", category: "Algorithm", label: "Run SJF (Shortest Job First - Non-Preemptive)", action: () => onSelectAlgorithm("SJF") },
    { id: "alg-srtf", category: "Algorithm", label: "Run SRTF (Shortest Remaining Time First)", action: () => onSelectAlgorithm("SRTF") },
    { id: "alg-rr", category: "Algorithm", label: "Run Round Robin (RR)", action: () => onSelectAlgorithm("RR") },
    { id: "alg-prio-np", category: "Algorithm", label: "Run Priority (Non-Preemptive)", action: () => onSelectAlgorithm("PRIORITY_NP") },
    { id: "alg-prio-p", category: "Algorithm", label: "Run Priority (Preemptive)", action: () => onSelectAlgorithm("PRIORITY_P") },
    { id: "alg-edf-np", category: "Algorithm", label: "Run EDF (Earliest Deadline First - NP)", action: () => onSelectAlgorithm("EDF_NP") },
    { id: "alg-edf-p", category: "Algorithm", label: "Run EDF (Earliest Deadline First - Preemptive)", action: () => onSelectAlgorithm("EDF_P") },

    { id: "pre-classic", category: "Preset", label: "Load Preset: Classic Textbook Case", action: () => onSelectPreset("classic_textbook") },
    { id: "pre-convoy", category: "Preset", label: "Load Preset: Convoy Effect (FCFS Anomaly)", action: () => onSelectPreset("convoy_effect") },
    { id: "pre-starve", category: "Preset", label: "Load Preset: SJF Starvation Demo", action: () => onSelectPreset("sjf_starvation") },
    { id: "pre-rr", category: "Preset", label: "Load Preset: Round Robin Quantum Effect", action: () => onSelectPreset("rr_quantum_demo") },
    { id: "pre-edf", category: "Preset", label: "Load Preset: EDF Real-Time Feasibility", action: () => onSelectPreset("edf_realtime") },

    { id: "view-drawer", category: "View", label: "Toggle Job Configurator Drawer (⌘B)", action: onToggleDrawer },
    { id: "view-theme", category: "View", label: "Toggle Theme (Dark / Light Mode)", action: onToggleTheme },

    { id: "exp-csv", category: "Export", label: "Export Full Simulation Results to CSV", action: () => onExport("csv") },
    { id: "exp-json", category: "Export", label: "Export Canonical Execution Trace to JSON", action: () => onExport("json") },
    { id: "exp-pdf", category: "Export", label: "Print / Export Executive Summary PDF", action: () => onExport("pdf") },
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside command palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 select-none">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Dialog Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#121217] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[440px]"
          >
            {/* Input Search Box */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 bg-zinc-50 dark:bg-[#18181F]">
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                autoFocus
                placeholder="Type a command or search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono text-zinc-400">
                ESC
              </kbd>
            </div>

            {/* Filtered Command List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-100 dark:divide-zinc-800/40 bg-white dark:bg-[#121217]">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No matching commands found.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => { item.action(); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-cyan-400 text-slate-950 font-semibold shadow-[0_0_12px_rgba(0,240,255,0.35)]"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                            isSelected
                              ? "bg-slate-950/20 text-slate-950 font-bold"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {item.category}
                        </span>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-mono opacity-80">↵ Select</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
