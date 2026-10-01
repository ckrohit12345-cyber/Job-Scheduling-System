"use client";

import React from "react";
import type { Summary } from "../lib/types";

interface MetricsStripProps {
  summary: Summary | null;
  comparisonBest?: {
    isBestAwt?: boolean;
    isBestAtt?: boolean;
    isBestThroughput?: boolean;
    isBestUtil?: boolean;
  };
}

export const MetricsStrip: React.FC<MetricsStripProps> = ({
  summary,
  comparisonBest = {},
}) => {
  const awt = summary ? summary.awt.toFixed(2) : "0.00";
  const att = summary ? summary.att.toFixed(2) : "0.00";
  const throughput = summary ? summary.throughput.toFixed(3) : "0.000";
  const utilization = summary ? summary.utilization.toFixed(1) : "0.0";

  return (
    <div className="h-[80px] w-full flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md px-4 py-2.5 flex items-center gap-3 overflow-hidden select-none">
      {/* Card 1: Average Waiting Time (AWT) */}
      <div className="flex-1 min-w-[140px] h-full rounded-xl bg-white dark:bg-[#121217] border border-zinc-200 dark:border-[#27272A] px-3.5 py-2 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-[#818CF8]/60 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Avg Waiting Time
          </span>
          {comparisonBest.isBestAwt && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-black shadow-[0_0_8px_rgba(34,197,94,0.3)]">
              BEST
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
            {awt}
          </span>
          <span className="text-[11px] font-mono text-zinc-400">units</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#818CF8] group-hover:h-[3px] shadow-[0_0_10px_#818CF8] transition-all" />
      </div>

      {/* Card 2: Average Turnaround Time (ATT) */}
      <div className="flex-1 min-w-[140px] h-full rounded-xl bg-white dark:bg-[#121217] border border-zinc-200 dark:border-[#27272A] px-3.5 py-2 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-[#C084FC]/60 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Avg Turnaround Time
          </span>
          {comparisonBest.isBestAtt && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-black shadow-[0_0_8px_rgba(34,197,94,0.3)]">
              BEST
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
            {att}
          </span>
          <span className="text-[11px] font-mono text-zinc-400">units</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C084FC] group-hover:h-[3px] shadow-[0_0_10px_#C084FC] transition-all" />
      </div>

      {/* Card 3: System Throughput */}
      <div className="flex-1 min-w-[140px] h-full rounded-xl bg-white dark:bg-[#121217] border border-zinc-200 dark:border-[#27272A] px-3.5 py-2 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-[#00F0FF]/60 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Throughput
          </span>
          {comparisonBest.isBestThroughput && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-black shadow-[0_0_8px_rgba(34,197,94,0.3)]">
              BEST
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
            {throughput}
          </span>
          <span className="text-[11px] font-mono text-zinc-400">jobs/sec</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00F0FF] group-hover:h-[3px] shadow-[0_0_10px_#00F0FF] transition-all" />
      </div>

      {/* Card 4: CPU Utilization */}
      <div className="flex-1 min-w-[140px] h-full rounded-xl bg-white dark:bg-[#121217] border border-zinc-200 dark:border-[#27272A] px-3.5 py-2 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-[#22C55E]/60 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            CPU Utilization
          </span>
          {comparisonBest.isBestUtil && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-black shadow-[0_0_8px_rgba(34,197,94,0.3)]">
              OPTIMAL
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black font-mono tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
            {utilization}%
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#22C55E] group-hover:h-[3px] shadow-[0_0_10px_#22C55E] transition-all" />
      </div>
    </div>
  );
};
