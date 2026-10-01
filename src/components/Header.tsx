"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { menuVariants } from "../lib/motion";
import type { ExportFormat } from "../lib/types";

interface HeaderProps {
  onOpenCommandPalette: () => void;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onSelectPreset: (presetId: string) => void;
  selectedPreset: string;
  onExport: (format: ExportFormat) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCommandPalette,
  isDrawerOpen,
  onToggleDrawer,
  onSelectPreset,
  selectedPreset,
  onExport,
  theme,
  onToggleTheme,
}) => {
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <header className="h-[56px] w-full flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#09090B]/90 backdrop-blur-md px-4 flex items-center justify-between z-40 select-none">
      {/* Left: Branding & Core Engine Status */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-50">
            Scheduler Core
          </span>
          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
            v1.0
          </span>
        </div>

        {/* C11 WASM Engine Active Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold shadow-[0_0_10px_rgba(34,197,94,0.2)]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#22c55e]" />
          <span>C11 WASM Engine Active</span>
        </div>
      </div>

      {/* Center: Command Palette Trigger (Cmd + K) */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-[#121217] border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-cyan-400 dark:hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all text-xs font-medium w-64 justify-between group"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="group-hover:text-zinc-900 dark:group-hover:text-zinc-200">Search or command...</span>
        </div>
        <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono text-zinc-400">
          ⌘K
        </kbd>
      </button>

      {/* Right: Actions, Drawer Toggle, Theme & Export */}
      <div className="flex items-center gap-2">
        {/* Preset Workload Picker */}
        <select
          value={selectedPreset}
          onChange={(e) => onSelectPreset(e.target.value)}
          aria-label="Preset Workload Selector"
          className="h-8 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="">⚡ Presets</option>
          <option value="classic_textbook">Classic Textbook</option>
          <option value="convoy_effect">Convoy Effect (FCFS)</option>
          <option value="sjf_starvation">SJF Starvation</option>
          <option value="rr_quantum_demo">RR Quantum Effect</option>
          <option value="edf_realtime">EDF Real-Time Feasibility</option>
        </select>

        {/* Collapsible Drawer Toggle (Cmd + B) */}
        <button
          onClick={onToggleDrawer}
          title={isDrawerOpen ? "Collapse Drawer (⌘B)" : "Expand Drawer (⌘B)"}
          className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
            isDrawerOpen
              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
              : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
          <span className="hidden lg:inline">Config</span>
          <kbd className="hidden sm:inline text-[9px] font-mono opacity-60">⌘B</kbd>
        </button>

        {/* Dark / Light Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title="Toggle Theme"
          className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          {theme === "dark" ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Export Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm shadow-indigo-600/20"
          >
            <span>Export</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <AnimatePresence>
            {isExportOpen && (
              <motion.div
                variants={menuVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute right-0 mt-1.5 w-36 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 text-xs font-medium"
              >
                <button
                  onClick={() => { onExport("csv"); setIsExportOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>CSV Table</span>
                  <span className="text-[10px] font-mono text-slate-400">.csv</span>
                </button>
                <button
                  onClick={() => { onExport("json"); setIsExportOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>JSON Trace</span>
                  <span className="text-[10px] font-mono text-slate-400">.json</span>
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                <button
                  onClick={() => { onExport("pdf"); setIsExportOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <span>Print Report</span>
                  <span className="text-[10px] font-mono text-slate-400">PDF</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
