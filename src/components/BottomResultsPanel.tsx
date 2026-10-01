"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { bottomPanelTransition, BOTTOM_BAR_HEIGHT, BOTTOM_EXPANDED_HEIGHT } from "../lib/motion";
import { getJobColor } from "../lib/colors";
import type { JobResult, ComparisonRow } from "../lib/types";

interface BottomResultsPanelProps {
  jobResults: JobResult[];
  comparisonRows: ComparisonRow[];
  selectedJobId?: string | null;
  onSelectJob?: (jobId: string) => void;
}

export const BottomResultsPanel: React.FC<BottomResultsPanelProps> = ({
  jobResults,
  comparisonRows,
  selectedJobId,
  onSelectJob,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"matrix" | "benchmark">("matrix");

  const panelHeight = isExpanded ? BOTTOM_EXPANDED_HEIGHT : BOTTOM_BAR_HEIGHT;

  return (
    <motion.section
      animate={{ height: panelHeight }}
      transition={bottomPanelTransition(false)}
      className="w-full flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col overflow-hidden relative z-30 select-none"
    >
      {/* Resizable / Collapsible Control Bar */}
      <div className="h-9 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Tab Switcher: Job Matrix vs Benchmark */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-[11px] font-medium">
            <button
              onClick={() => { setActiveTab("matrix"); setIsExpanded(true); }}
              className={`px-2.5 py-0.5 rounded-md transition-colors ${
                activeTab === "matrix" && isExpanded
                  ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Job Matrix
            </button>
            <button
              onClick={() => { setActiveTab("benchmark"); setIsExpanded(true); }}
              className={`px-2.5 py-0.5 rounded-md transition-colors ${
                activeTab === "benchmark" && isExpanded
                  ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Benchmark ({comparisonRows.length})
            </button>
          </div>
        </div>

        {/* Panel Collapse Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse Panel" : "Expand Panel"}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Isolated Scrollable Results Body */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          {activeTab === "matrix" ? (
            /* Tab 1: Detailed Per-Job Matrix */
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider z-10 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-1.5 px-3">Job</th>
                  <th className="py-1.5 px-3">Arrival</th>
                  <th className="py-1.5 px-3">Burst</th>
                  <th className="py-1.5 px-3">Priority</th>
                  <th className="py-1.5 px-3">First Start</th>
                  <th className="py-1.5 px-3">Completion</th>
                  <th className="py-1.5 px-3 font-semibold text-slate-900 dark:text-slate-100">TAT</th>
                  <th className="py-1.5 px-3 font-semibold text-slate-900 dark:text-slate-100">WT</th>
                  <th className="py-1.5 px-3">Response</th>
                  <th className="py-1.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-mono text-[11px] tabular-nums">
                {jobResults.map((j) => {
                  const color = getJobColor(j.jobId);
                  const isSelected = selectedJobId && String(j.jobId) === String(selectedJobId);

                  return (
                    <tr
                      key={j.jobId}
                      onClick={() => onSelectJob?.(String(j.jobId))}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <td className="py-1 px-3 flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.bg }} />
                        <span>{j.name}</span>
                      </td>
                      <td className="py-1 px-3">{j.arrival}</td>
                      <td className="py-1 px-3">{j.burst}</td>
                      <td className="py-1 px-3">{j.priority}</td>
                      <td className="py-1 px-3">{j.start}</td>
                      <td className="py-1 px-3">{j.completion}</td>
                      <td className="py-1 px-3 font-bold text-slate-900 dark:text-slate-100">{j.turnaround}</td>
                      <td className="py-1 px-3 font-bold text-slate-900 dark:text-slate-100">{j.waiting}</td>
                      <td className="py-1 px-3">{j.response}</td>
                      <td className="py-1 px-3 font-sans">
                        {j.deadline !== null ? (
                          j.missedDeadline ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-semibold">
                              Missed (+{j.lateness})
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                              Met
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* Tab 2: Algorithm Benchmark Comparison Matrix */
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider z-10 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-1.5 px-3">Algorithm</th>
                  <th className="py-1.5 px-3">Avg Waiting (AWT)</th>
                  <th className="py-1.5 px-3">Avg Turnaround (ATT)</th>
                  <th className="py-1.5 px-3">Avg Response</th>
                  <th className="py-1.5 px-3">CPU Utilization</th>
                  <th className="py-1.5 px-3">Throughput</th>
                  <th className="py-1.5 px-3">Switches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-mono text-[11px] tabular-nums">
                {comparisonRows.map((row) => (
                  <tr key={row.algorithm} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300">
                    <td className="py-1.5 px-3 font-bold font-sans text-slate-900 dark:text-slate-100">
                      {row.fullName}
                    </td>
                    <td className="py-1.5 px-3">
                      <span className={row.isBestAwt ? "px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[#22C55E] dark:text-[#A3E635] font-black shadow-[0_0_8px_rgba(34,197,94,0.25)]" : ""}>
                        {row.awt.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className={row.isBestAtt ? "px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[#22C55E] dark:text-[#A3E635] font-black shadow-[0_0_8px_rgba(34,197,94,0.25)]" : ""}>
                        {row.att.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-1.5 px-3">{row.art.toFixed(2)}</td>
                    <td className="py-1.5 px-3">
                      <span className={row.isBestUtil ? "px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[#22C55E] dark:text-[#A3E635] font-black shadow-[0_0_8px_rgba(34,197,94,0.25)]" : ""}>
                        {row.utilization.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-1.5 px-3">{row.throughput.toFixed(3)}</td>
                    <td className="py-1.5 px-3">{row.contextSwitches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </motion.section>
  );
};
