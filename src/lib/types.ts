export type JobId = string;

export interface Job {
  id: JobId;
  name: string;
  arrival: number;
  burst: number;
  priority: number;
  deadline: number | null;
}

export type SliceKind = "run" | "idle" | "switch";

export interface Segment {
  jobId: JobId | null; // null = idle
  name: string;
  start: number;
  end: number;
  kind: SliceKind;
  remainingAfter: number;
}

export interface JobResult {
  jobId: JobId;
  name: string;
  arrival: number;
  burst: number;
  priority: number;
  deadline: number | null;
  start: number;
  completion: number;
  turnaround: number;
  waiting: number;
  response: number;
  lateness: number;
  missedDeadline: boolean;
}

export interface Summary {
  algorithm: string;
  awt: number;
  att: number;
  art: number;
  throughput: number;
  utilization: number;
  makespan: number;
  contextSwitches: number;
  missedDeadlines: number;
}

export interface RunResult {
  algorithm: string;
  makespan: number;
  segments: Segment[];
  perJob: JobResult[];
  summary: Summary;
}

export type ExportFormat = "csv" | "json" | "pdf";

export type SpeedMultiplier = 0.5 | 1 | 2 | 5;

export interface ComparisonRow {
  algorithm: string;
  fullName: string;
  awt: number;
  att: number;
  art: number;
  utilization: number;
  throughput: number;
  contextSwitches: number;
  missedDeadlines: number;
  isBestAwt?: boolean;
  isBestAtt?: boolean;
  isBestUtil?: boolean;
  isBestThroughput?: boolean;
}
