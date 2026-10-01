import { useState, useEffect, useCallback, useMemo, RefObject } from "react";

export interface GanttScaleOptions {
  containerRef: RefObject<HTMLElement | null>;
  totalMakespan: number;
  minUnitWidth?: number; // Defaults to 16px per specification
  paddingX?: number;     // Left/right timeline margin padding
}

export interface GanttScale {
  containerWidth: number;
  availableWidth: number;
  unitWidth: number;
  timelineWidth: number;
  isScrollable: boolean;
  tickInterval: number;
  timeToPx: (time: number) => number;
  pxToTime: (px: number) => number;
  timeRangeToWidth: (start: number, end: number) => number;
  ticks: number[];
}

/**
 * Dynamic "Fit-to-Width" Gantt Chart Scaling Hook
 * 
 * Adapts timeline to 100% of available canvas width without horizontal scrollbars,
 * automatically switching to isolated internal scroll ONLY if slice unit width drops
 * below the minimum visibility threshold (16px).
 */
export function useGanttScale({
  containerRef,
  totalMakespan,
  minUnitWidth = 16,
  paddingX = 32,
}: GanttScaleOptions): GanttScale {
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // ResizeObserver tracks dynamic drawer collapses (Cmd+B) and browser resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(el);
    setContainerWidth(el.clientWidth);

    return () => {
      observer.disconnect();
    };
  }, [containerRef]);

  const makespan = Math.max(1, totalMakespan);
  const availableWidth = Math.max(0, containerWidth - paddingX);

  // Fit-to-Width ideal calculation
  const idealUnitWidth = availableWidth / makespan;
  const isScrollable = idealUnitWidth < minUnitWidth;
  const unitWidth = Math.max(minUnitWidth, idealUnitWidth);
  const timelineWidth = unitWidth * makespan;

  // Coordinate Conversion Helpers
  const timeToPx = useCallback(
    (time: number): number => {
      return Math.max(0, Math.min(makespan, time)) * unitWidth;
    },
    [makespan, unitWidth]
  );

  const pxToTime = useCallback(
    (px: number): number => {
      if (unitWidth <= 0) return 0;
      return Math.max(0, Math.min(makespan, px / unitWidth));
    },
    [makespan, unitWidth]
  );

  const timeRangeToWidth = useCallback(
    (start: number, end: number): number => {
      const dur = Math.max(0, end - start);
      return dur * unitWidth;
    },
    [unitWidth]
  );

  // Adaptive Grid Density Calculation: selects integer tick interval so labels never overlap
  const tickInterval = useMemo(() => {
    const minPixelDistanceBetweenLabels = 48; // minimum px for legible time labels
    const rawInterval = minPixelDistanceBetweenLabels / unitWidth;

    if (rawInterval <= 1) return 1;
    if (rawInterval <= 2) return 2;
    if (rawInterval <= 5) return 5;
    if (rawInterval <= 10) return 10;
    if (rawInterval <= 25) return 25;
    return 50;
  }, [unitWidth]);

  // Generate tick markers array
  const ticks = useMemo(() => {
    const result: number[] = [];
    for (let t = 0; t <= makespan; t += tickInterval) {
      result.push(t);
    }
    // Always include terminal makespan tick if not already present
    if (result[result.length - 1] !== makespan) {
      result.push(makespan);
    }
    return result;
  }, [makespan, tickInterval]);

  return {
    containerWidth,
    availableWidth,
    unitWidth,
    timelineWidth,
    isScrollable,
    tickInterval,
    timeToPx,
    pxToTime,
    timeRangeToWidth,
    ticks,
  };
}
