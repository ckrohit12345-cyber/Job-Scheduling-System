"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGanttScale } from "../hooks/useGanttScale";
import { getJobColor, IDLE_COLOR, SWITCH_COLOR } from "../lib/colors";
import { segmentVariants, playbackTransition, tooltipVariants } from "../lib/motion";
import type { Segment, Job } from "../lib/types";

interface GanttCanvasProps {
  segments: Segment[];
  jobs: Job[];
  makespan: number;
  currentTime: number;
  isPlaying: boolean;
  onSelectJob?: (jobId: string) => void;
  selectedJobId?: string | null;
}

export const GanttCanvas: React.FC<GanttCanvasProps> = ({
  segments,
  jobs,
  makespan,
  currentTime,
  isPlaying,
  onSelectJob,
  selectedJobId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredSegment, setHoveredSegment] = useState<{
    segment: Segment;
    x: number;
    y: number;
  } | null>(null);

  // Dynamic Fit-to-Width Gantt Scale Hook
  const {
    availableWidth,
    unitWidth,
    timelineWidth,
    isScrollable,
    timeToPx,
    ticks,
  } = useGanttScale({
    containerRef,
    totalMakespan: makespan,
    minUnitWidth: 16,
    paddingX: 48,
  });

  const barHeight = 44;
  const barY = 48;

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full relative overflow-x-auto overflow-y-hidden select-none bg-slate-50/20 dark:bg-slate-950/20"
    >
      {/* SVG Canvas */}
      <svg
        className="h-full min-h-[160px]"
        style={{
          width: isScrollable ? `${timelineWidth + 48}px` : "100%",
          minWidth: "100%",
        }}
      >
        <defs>
          {/* Diagonal pattern for IDLE intervals */}
          <pattern
            id="idle-pattern"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="10" stroke="#64748b" strokeWidth="2.5" opacity="0.4" />
          </pattern>

          {/* Red hash pattern for context-switch overhead */}
          <pattern
            id="switch-pattern"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-45)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="2.5" opacity="0.5" />
          </pattern>
        </defs>

        <g transform="translate(24, 0)">
          {/* Timeline Background Track */}
          <rect
            x={0}
            y={barY}
            width={timelineWidth}
            height={barHeight}
            rx={8}
            className="fill-slate-100 dark:fill-slate-900/60 stroke-slate-200 dark:stroke-slate-800"
          />

          {/* Time Axis Grid Lines & Numeric Labels */}
          {ticks.map((t) => {
            const x = timeToPx(t);
            return (
              <g key={`tick-${t}`}>
                <line
                  x1={x}
                  y1={barY - 6}
                  x2={x}
                  y2={barY + barHeight + 6}
                  className="stroke-slate-200 dark:stroke-slate-800 stroke-[1px] stroke-dasharray-[2,2]"
                />
                <text
                  x={x}
                  y={barY + barHeight + 22}
                  textAnchor="middle"
                  className="fill-slate-400 font-mono text-[11px] tabular-nums"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* Process Segments with Framer Motion staggered entrance */}
          {segments.map((seg, idx) => {
            const x = timeToPx(seg.start);
            const w = Math.max(2, timeToPx(seg.end) - x);
            const isIdle = seg.kind === "idle";
            const isSwitch = seg.kind === "switch";
            const color = isIdle ? IDLE_COLOR : isSwitch ? SWITCH_COLOR : getJobColor(seg.jobId);
            const isSelected = selectedJobId && String(seg.jobId) === String(selectedJobId);

            return (
              <motion.g
                key={`seg-${idx}-${seg.start}-${seg.end}`}
                custom={idx}
                variants={segmentVariants}
                initial="hidden"
                animate="visible"
                onClick={() => seg.jobId && onSelectJob?.(String(seg.jobId))}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setHoveredSegment({
                      segment: seg,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }
                }}
                onMouseLeave={() => setHoveredSegment(null)}
                className="cursor-pointer"
              >
                <rect
                  x={x}
                  y={barY}
                  width={w}
                  height={barHeight}
                  rx={4}
                  fill={isIdle ? "url(#idle-pattern)" : isSwitch ? "url(#switch-pattern)" : color.bg}
                  stroke={isSelected ? "#ffffff" : color.border}
                  strokeWidth={isSelected ? 2.5 : 1}
                  className={`transition-all ${isSelected ? "filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "hover:brightness-110"}`}
                />

                {/* Segment Label (displayed if width >= 24px) */}
                {w >= 24 && (
                  <text
                    x={x + w / 2}
                    y={barY + barHeight / 2 + 4}
                    textAnchor="middle"
                    fill={color.fg}
                    className="font-bold text-[11px] pointer-events-none tracking-tight"
                  >
                    {isIdle ? "IDLE" : isSwitch ? "SW" : seg.name}
                  </text>
                )}
              </motion.g>
            );
          })}

          {/* Milestone Markers: Deadlines (◆) and Arrivals (▼) */}
          {jobs.map((job) => {
            const arrX = timeToPx(job.arrival);
            return (
              <g key={`arr-${job.id}`}>
                {/* Arrival marker */}
                <polygon
                  points={`${arrX - 4},${barY - 8} ${arrX + 4},${barY - 8} ${arrX},${barY - 2}`}
                  className="fill-[#00F0FF] filter drop-shadow-[0_0_4px_rgba(0,240,255,0.6)]"
                />
                {/* Deadline marker if present */}
                {job.deadline !== null && job.deadline >= 0 && (
                  <g>
                    <polygon
                      points={`${timeToPx(job.deadline)},${barY - 14} ${timeToPx(job.deadline) + 5},${barY - 9} ${timeToPx(job.deadline)},${barY - 4} ${timeToPx(job.deadline) - 5},${barY - 9}`}
                      className="fill-[#FF2E93] stroke-white stroke-[1px] filter drop-shadow-[0_0_4px_rgba(255,46,147,0.6)]"
                    />
                    <line
                      x1={timeToPx(job.deadline)}
                      y1={barY - 4}
                      x2={timeToPx(job.deadline)}
                      y2={barY + barHeight}
                      className="stroke-rose-500/50 stroke-[1px] stroke-dasharray-[2,2]"
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* Animated 60fps Playback Playhead */}
          <motion.line
            x1={timeToPx(currentTime)}
            y1={barY - 10}
            x2={timeToPx(currentTime)}
            y2={barY + barHeight + 10}
            animate={{ x1: timeToPx(currentTime), x2: timeToPx(currentTime) }}
            transition={playbackTransition(isPlaying)}
            className="stroke-[#FF2E93] stroke-[2.5px] drop-shadow-[0_0_8px_rgba(255,46,147,0.7)]"
          />
        </g>
      </svg>

      {/* Rich Floating Tooltip */}
      <AnimatePresence>
        {hoveredSegment && (
          <motion.div
            variants={tooltipVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              left: `${Math.min(hoveredSegment.x + 12, (containerRef.current?.clientWidth || 800) - 200)}px`,
              top: `${Math.max(10, hoveredSegment.y - 85)}px`,
            }}
            className="absolute z-50 p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs shadow-xl pointer-events-none min-w-[170px]"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-bold text-slate-100">
                {hoveredSegment.segment.kind === "idle"
                  ? "CPU Idle"
                  : hoveredSegment.segment.kind === "switch"
                  ? "Context Switch"
                  : hoveredSegment.segment.name}
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                {hoveredSegment.segment.kind}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-300 font-mono py-0.5">
              <span className="text-slate-400">Window:</span>
              <span className="tabular-nums">
                [{hoveredSegment.segment.start} → {hoveredSegment.segment.end}]
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-300 font-mono py-0.5">
              <span className="text-slate-400">Duration:</span>
              <span className="tabular-nums">
                {hoveredSegment.segment.end - hoveredSegment.segment.start} units
              </span>
            </div>
            {hoveredSegment.segment.remainingAfter !== undefined && (
              <div className="flex justify-between text-[11px] text-slate-300 font-mono py-0.5">
                <span className="text-slate-400">Remaining:</span>
                <span className="tabular-nums">
                  {hoveredSegment.segment.remainingAfter} units
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
