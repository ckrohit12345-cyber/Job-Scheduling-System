"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "./Header";
import { MetricsStrip } from "./MetricsStrip";
import { JobConfiguratorDrawer } from "./JobConfiguratorDrawer";
import { GanttCanvas } from "./GanttCanvas";
import { GanttPlaybackBar } from "./GanttPlaybackBar";
import { BottomResultsPanel } from "./BottomResultsPanel";
import { CommandPalette } from "./CommandPalette";
import type { Job, Segment, JobResult, Summary, SpeedMultiplier, ComparisonRow, ExportFormat } from "../lib/types";

// Initial standard textbook workload
const INITIAL_JOBS: Job[] = [
  { id: "1", name: "P1", arrival: 0, burst: 5, priority: 2, deadline: 14 },
  { id: "2", name: "P2", arrival: 1, burst: 3, priority: 1, deadline: 7 },
  { id: "3", name: "P3", arrival: 2, burst: 8, priority: 4, deadline: 20 },
  { id: "4", name: "P4", arrival: 3, burst: 4, priority: 3, deadline: 11 },
];

export const SchedulerShell: React.FC = () => {
  // Theme & Drawer State
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("");

  // Sync data-theme attribute on <html> so CSS variables in both
  // styles.css and globals.css respond to theme changes.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    // Also toggle .light class for components that use Tailwind dark: prefix
    if (theme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, [theme]);

  // Simulation State
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("RR");
  const [quantum, setQuantum] = useState<number>(2);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Playback State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<SpeedMultiplier>(1);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Computed Results Cache
  const [segments, setSegments] = useState<Segment[]>([]);
  const [jobResults, setJobResults] = useState<JobResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);
  const [makespan, setMakespan] = useState<number>(20);

  // Simulation runner
  const recomputeSimulation = useCallback(() => {
    if (jobs.length === 0) return;

    // Deterministic simulation generator for RR / FCFS / SRTF
    let clock = 0;
    const slices: Segment[] = [];
    const completedJobStats: Map<string, { start: number; completion: number }> = new Map();
    const working = jobs.map((j) => ({ ...j, remaining: j.burst }));

    // Run discrete-event simulation
    while (working.some((j) => j.remaining > 0) && clock < 500) {
      const ready = working.filter((j) => j.arrival <= clock && j.remaining > 0);

      if (ready.length === 0) {
        // Find next arrival
        const nextArr = Math.min(...working.filter((j) => j.remaining > 0).map((j) => j.arrival));
        slices.push({
          jobId: null,
          name: "IDLE",
          start: clock,
          end: nextArr,
          kind: "idle",
          remainingAfter: 0,
        });
        clock = nextArr;
        continue;
      }

      // Dispatch job based on algorithm
      let current = ready[0];
      if (selectedAlgorithm === "SJF") {
        ready.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
        current = ready[0];
      } else if (selectedAlgorithm === "SRTF") {
        ready.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival);
        current = ready[0];
      } else if (selectedAlgorithm === "PRIORITY_NP" || selectedAlgorithm === "PRIORITY_P") {
        ready.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);
        current = ready[0];
      }

      if (!completedJobStats.has(current.id)) {
        completedJobStats.set(current.id, { start: clock, completion: -1 });
      }

      const runDuration = selectedAlgorithm === "RR" ? Math.min(quantum, current.remaining) : (selectedAlgorithm === "SRTF" ? 1 : current.remaining);
      const start = clock;
      const end = clock + runDuration;
      current.remaining -= runDuration;

      slices.push({
        jobId: current.id,
        name: current.name,
        start,
        end,
        kind: "run",
        remainingAfter: current.remaining,
      });

      clock = end;
      if (current.remaining === 0) {
        const stat = completedJobStats.get(current.id)!;
        stat.completion = clock;
      }
    }

    setMakespan(clock);
    setSegments(slices);

    // Compute Metrics
    let totalWt = 0;
    let totalTat = 0;
    let totalRt = 0;

    const perJob: JobResult[] = jobs.map((j) => {
      const stat = completedJobStats.get(j.id) || { start: j.arrival, completion: j.arrival + j.burst };
      const turnaround = Math.max(0, stat.completion - j.arrival);
      const waiting = Math.max(0, turnaround - j.burst);
      const response = Math.max(0, stat.start - j.arrival);
      const lateness = j.deadline !== null ? stat.completion - j.deadline : 0;

      totalWt += waiting;
      totalTat += turnaround;
      totalRt += response;

      return {
        jobId: j.id,
        name: j.name,
        arrival: j.arrival,
        burst: j.burst,
        priority: j.priority,
        deadline: j.deadline,
        start: stat.start,
        completion: stat.completion,
        turnaround,
        waiting,
        response,
        lateness,
        missedDeadline: lateness > 0,
      };
    });

    setJobResults(perJob);

    const awt = totalWt / jobs.length;
    const att = totalTat / jobs.length;
    const art = totalRt / jobs.length;
    const throughput = jobs.length / Math.max(1, clock);
    const totalBurst = jobs.reduce((acc, j) => acc + j.burst, 0);
    const utilization = (totalBurst / Math.max(1, clock)) * 100;

    setSummary({
      algorithm: selectedAlgorithm,
      awt,
      att,
      art,
      throughput,
      utilization,
      makespan: clock,
      contextSwitches: slices.filter((s) => s.kind === "run").length,
      missedDeadlines: perJob.filter((j) => j.missedDeadline).length,
    });

    // Mock benchmark comparison rows
    setComparisonRows([
      { algorithm: "RR", fullName: `Round Robin (q=${quantum})`, awt, att, art, utilization, throughput, contextSwitches: slices.length, missedDeadlines: 0, isBestAwt: true },
      { algorithm: "SRTF", fullName: "Shortest Remaining Time First", awt: awt * 0.88, att: att * 0.92, art: art * 0.75, utilization: 100, throughput: throughput * 1.05, contextSwitches: slices.length + 3, missedDeadlines: 0, isBestAtt: true, isBestUtil: true },
      { algorithm: "FCFS", fullName: "First-Come, First-Served", awt: awt * 1.35, att: att * 1.25, art: art * 1.2, utilization: 95, throughput: throughput * 0.95, contextSwitches: jobs.length, missedDeadlines: 1 },
      { algorithm: "SJF", fullName: "Shortest Job First (NP)", awt: awt * 0.95, att: att * 0.98, art: art * 1.1, utilization: 98, throughput: throughput, contextSwitches: jobs.length, missedDeadlines: 0 },
    ]);
  }, [jobs, selectedAlgorithm, quantum]);

  useEffect(() => {
    recomputeSimulation();
  }, [recomputeSimulation]);

  // Live Playback Engine Loop (60fps synced)
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    const intervalMs = Math.max(50, 600 / playbackSpeed);
    playbackTimerRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= makespan) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, makespan]);

  // Keyboard Shortcuts (Cmd+K, Cmd+B, Space, Left/Right Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
      } else if (e.key === " " && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === "ArrowRight" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setCurrentTime((prev) => Math.min(makespan, prev + 1));
      } else if (e.key === "ArrowLeft" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setCurrentTime((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [makespan]);

  // Active slice detection for CPU card
  const activeSlice = segments.find((s) => s.start <= currentTime && currentTime < s.end);
  const activeJobName = activeSlice ? (activeSlice.kind === "idle" ? "IDLE" : activeSlice.name) : "None";
  const cpuStatus: "RUNNING" | "IDLE" | "SWITCH" = activeSlice
    ? activeSlice.kind === "run"
      ? "RUNNING"
      : activeSlice.kind === "idle"
      ? "IDLE"
      : "SWITCH"
    : "IDLE";

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{
        background: "var(--bg-root)",
        color: "var(--text-main)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* 1. Global Fixed Header (56px) */}
      <Header
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        selectedPreset={selectedPreset}
        onSelectPreset={(p) => { setSelectedPreset(p); }}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onExport={(format: ExportFormat) => alert(`Exporting ${format.toUpperCase()} report...`)}
      />

      {/* 2. Top Metrics Performance Strip (80px) */}
      <MetricsStrip summary={summary} comparisonBest={{ isBestAwt: true, isBestAtt: true }} />

      {/* 3. Main Workspace Area (calc(100vh - 136px)) */}
      <div className="flex-1 w-full min-h-0 flex overflow-hidden relative">
        {/* Left: Collapsible Job Configurator Drawer (280px <-> 0px) */}
        <JobConfiguratorDrawer
          isOpen={isDrawerOpen}
          jobs={jobs}
          onAddJob={() => {
            const nextId = String(jobs.length + 1);
            setJobs([...jobs, { id: nextId, name: `P${nextId}`, arrival: jobs[jobs.length - 1]?.arrival + 1 || 0, burst: 4, priority: 2, deadline: 15 }]);
          }}
          onUpdateJob={(idx, field, val) => {
            const next = [...jobs];
            (next[idx] as any)[field] = val;
            setJobs(next);
          }}
          onDeleteJob={(idx) => {
            if (jobs.length <= 1) return;
            setJobs(jobs.filter((_, i) => i !== idx));
          }}
          onOpenBulkModal={() => alert("Bulk paste modal triggered")}
          onOpenRandomModal={() => alert("Random generator modal triggered")}
          validationError={null}
        />

        {/* Center Canvas + Bottom Results Panel (Flex-grow 1, min-w-0) */}
        <div className="flex-1 min-w-0 h-full flex flex-col justify-between overflow-hidden">
          {/* Gantt Interactive Canvas with Fit-to-Width Scaling */}
          <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
            <GanttCanvas
              segments={segments}
              jobs={jobs}
              makespan={makespan}
              currentTime={currentTime}
              isPlaying={isPlaying}
              selectedJobId={selectedJobId}
              onSelectJob={(id) => setSelectedJobId(id)}
            />

            {/* Integrated Timeline Playback Bar (44px) */}
            <GanttPlaybackBar
              currentTime={currentTime}
              maxTime={makespan}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onStepForward={() => setCurrentTime((prev) => Math.min(makespan, prev + 1))}
              onStepBackward={() => setCurrentTime((prev) => Math.max(0, prev - 1))}
              onReset={() => setCurrentTime(0)}
              onSeek={(t) => setCurrentTime(t)}
              speed={playbackSpeed}
              onSetSpeed={(s) => setPlaybackSpeed(s)}
              activeJobName={activeJobName}
              cpuStatus={cpuStatus}
            />
          </div>

          {/* Bottom Resizable Results Panel (Max 200px) */}
          <BottomResultsPanel
            jobResults={jobResults}
            comparisonRows={comparisonRows}
            selectedJobId={selectedJobId}
            onSelectJob={(id) => setSelectedJobId(id)}
          />
        </div>
      </div>

      {/* Command Palette (Cmd + K Modal) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectAlgorithm={(alg) => setSelectedAlgorithm(alg)}
        onSelectPreset={(p) => setSelectedPreset(p)}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onExport={(f) => alert(`Exporting ${f.toUpperCase()}`)}
      />
    </div>
  );
};
