"use client";

import React from "react";
import { motion } from "framer-motion";
import { speedPillTransition } from "../lib/motion";
import type { SpeedMultiplier } from "../lib/types";

interface GanttPlaybackBarProps {
  currentTime: number;
  maxTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  onSeek: (time: number) => void;
  speed: SpeedMultiplier;
  onSetSpeed: (speed: SpeedMultiplier) => void;
  activeJobName: string;
  cpuStatus: "RUNNING" | "IDLE" | "SWITCH";
}

const SPEED_OPTIONS: SpeedMultiplier[] = [0.5, 1, 2, 5];

export const GanttPlaybackBar: React.FC<GanttPlaybackBarProps> = ({
  currentTime,
  maxTime,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  onReset,
  onSeek,
  speed,
  onSetSpeed,
  activeJobName,
  cpuStatus,
}) => {
  return (
    <div className="h-11 w-full border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between gap-4 flex-shrink-0 select-none">
      {/* Left: Playback Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onReset}
          title="Reset Timeline to t=0"
          className="h-7 w-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <button
          onClick={onStepBackward}
          title="Step Backward (Left Arrow)"
          className="h-7 w-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
          </svg>
        </button>

        <button
          onClick={onTogglePlay}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          className="h-7 px-3 rounded-md bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.35)] transition-all"
        >
          {isPlaying ? (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              <span>Pause</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>Play</span>
            </>
          )}
        </button>

        <button
          onClick={onStepForward}
          title="Step Forward (Right Arrow)"
          className="h-7 w-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
          </svg>
        </button>

        {/* Live Clock Badge */}
        <div className="ml-2 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
          t = {currentTime}
        </div>
      </div>

      {/* Center: Timeline Scrubber Slider */}
      <div className="flex-1 max-w-xl flex items-center gap-3">
        <span className="text-[10px] font-mono text-slate-400 tabular-nums">0</span>
        <input
          type="range"
          min={0}
          max={Math.max(1, maxTime)}
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Timeline Scrubber"
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
        />
        <span className="text-[10px] font-mono text-slate-400 tabular-nums">{maxTime}</span>
      </div>

      {/* Right: Speed Multipliers & CPU Status Pill */}
      <div className="flex items-center gap-3">
        {/* Speed Pill Selector with Framer Motion layoutId */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
          {SPEED_OPTIONS.map((val) => {
            const isActive = speed === val;
            return (
              <button
                key={val}
                onClick={() => onSetSpeed(val)}
                className={`relative px-2 py-0.5 rounded-md transition-colors ${
                  isActive ? "text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSpeedPill"
                    transition={speedPillTransition}
                    className="absolute inset-0 bg-indigo-600 rounded-md -z-10 shadow-sm"
                  />
                )}
                <span>{val}x</span>
              </button>
            );
          })}
        </div>

        {/* CPU Activity Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              cpuStatus === "RUNNING"
                ? "bg-emerald-500 animate-pulse"
                : cpuStatus === "SWITCH"
                ? "bg-rose-500 animate-ping"
                : "bg-slate-400"
            }`}
          />
          <span className="text-slate-500 text-[10px] uppercase font-bold">{cpuStatus}:</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">{activeJobName}</span>
        </div>
      </div>
    </div>
  );
};
