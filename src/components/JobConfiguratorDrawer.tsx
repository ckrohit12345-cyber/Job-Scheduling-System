"use client";

import React from "react";
import { motion } from "framer-motion";
import { drawerVariants, drawerContentVariants, DRAWER_WIDTH } from "../lib/motion";
import { getJobColor } from "../lib/colors";
import type { Job } from "../lib/types";

interface JobConfiguratorDrawerProps {
  isOpen: boolean;
  jobs: Job[];
  onAddJob: () => void;
  onUpdateJob: (index: number, field: keyof Job, value: any) => void;
  onDeleteJob: (index: number) => void;
  onOpenBulkModal: () => void;
  onOpenRandomModal: () => void;
  validationError: string | null;
}

export const JobConfiguratorDrawer: React.FC<JobConfiguratorDrawerProps> = ({
  isOpen,
  jobs,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
  onOpenBulkModal,
  onOpenRandomModal,
  validationError,
}) => {
  return (
    <motion.aside
      variants={drawerVariants}
      initial={isOpen ? "open" : "closed"}
      animate={isOpen ? "open" : "closed"}
      className="h-full flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121217] overflow-hidden relative z-30 select-none"
    >
      {/* Fixed 280px width inner container prevents text reflow during slide animation */}
      <motion.div
        variants={drawerContentVariants}
        style={{ width: `${DRAWER_WIDTH}px` }}
        className="h-full flex flex-col justify-between"
      >
        {/* Drawer Header & Quick Toolbar */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
              Workload Config
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
            </span>
          </div>

          {/* Quick Action Button Strip */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={onAddJob}
              className="h-7 px-2 rounded-md bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-[0_0_10px_rgba(0,240,255,0.3)]"
            >
              <span>+ Add</span>
            </button>
            <button
              onClick={onOpenBulkModal}
              className="h-7 px-2 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <span>Paste</span>
            </button>
            <button
              onClick={onOpenRandomModal}
              className="h-7 px-2 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <span>🎲 Gen</span>
            </button>
          </div>
        </div>

        {/* Isolated Scrollable Virtualized Job Table */}
        <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1.5">
          {jobs.map((job, idx) => {
            const color = getJobColor(job.id);
            const isInvalid = job.burst < 1 || job.arrival < 0;

            return (
              <div
                key={job.id}
                className={`p-2 rounded-lg border text-xs flex flex-col gap-1.5 transition-colors ${
                  isInvalid
                    ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900"
                    : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {/* Top Row: Color badge, Name, Delete action */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color.bg }}
                    />
                    <input
                      type="text"
                      value={job.name}
                      onChange={(e) => onUpdateJob(idx, "name", e.target.value)}
                      aria-label="Job Name"
                      className="w-16 px-1.5 py-0.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    onClick={() => onDeleteJob(idx)}
                    title="Delete Job"
                    className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Bottom Row: Arrival (A), Burst (B), Priority (P), Deadline (D) */}
                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  <div>
                    <span className="text-slate-400 block font-mono">Arr</span>
                    <input
                      type="number"
                      min={0}
                      value={job.arrival}
                      onChange={(e) => onUpdateJob(idx, "arrival", Math.max(0, parseInt(e.target.value) || 0))}
                      aria-label="Arrival Time"
                      className="w-full px-1 py-0.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <span className="text-slate-400 block font-mono">Burst</span>
                    <input
                      type="number"
                      min={1}
                      value={job.burst}
                      onChange={(e) => onUpdateJob(idx, "burst", Math.max(1, parseInt(e.target.value) || 1))}
                      aria-label="Burst Time"
                      className="w-full px-1 py-0.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <span className="text-slate-400 block font-mono">Prio</span>
                    <input
                      type="number"
                      value={job.priority}
                      onChange={(e) => onUpdateJob(idx, "priority", parseInt(e.target.value) || 0)}
                      aria-label="Priority"
                      className="w-full px-1 py-0.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <span className="text-slate-400 block font-mono">Dline</span>
                    <input
                      type="number"
                      placeholder="—"
                      value={job.deadline !== null ? job.deadline : ""}
                      onChange={(e) => onUpdateJob(idx, "deadline", e.target.value === "" ? null : Math.max(0, parseInt(e.target.value) || 0))}
                      aria-label="Deadline"
                      className="w-full px-1 py-0.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating / Bottom Inline Validation Warning */}
        {validationError && (
          <div className="p-2 border-t border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 flex-shrink-0">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="truncate">{validationError}</span>
          </div>
        )}
      </motion.div>
    </motion.aside>
  );
};
