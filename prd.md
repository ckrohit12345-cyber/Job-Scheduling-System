# Product Requirements Document: Interactive Job Scheduling & Visualization Platform

| Field | Value |
|---|---|
| Document status | Draft v1.0 |
| Authors | Principal Systems Architect / Lead Product Manager |
| Last updated | 2026-10-01 |
| Product type | Web application with C-based scheduling core |

---

## 1. Overview

### 1.1 Purpose
Build a high-performance web platform where users define a job workload, run it through one or more CPU scheduling algorithms, and immediately see (a) quantitative performance metrics and (b) an interactive Gantt chart of the execution timeline, combined in one results dashboard.

### 1.2 Problem Statement
Scheduling concepts are hard to grasp from static textbook examples, and ad-hoc tools are either slow, inaccurate in edge cases (ties, preemption, idle gaps), or lack side-by-side comparison. Users need a trustworthy, fast, visual simulator.

### 1.3 Target Users
| Persona | Needs |
|---|---|
| Student | Learn how algorithms behave; verify homework answers; step through timelines |
| Instructor | Build demo workloads, compare algorithms live, export results for slides |
| Systems engineer / researcher | Test workloads incl. deadlines, compare metrics across algorithms, reproducible runs |

### 1.4 Goals
1. Dynamic job input and batch configuration (manual entry, bulk paste, CSV import, random generation).
2. Execute C-powered implementations of FCFS, SJF, Priority, Round Robin, and EDF.
3. Process each run through a dual-pipeline: Performance Calculation Engine and Gantt Chart Generation Engine.
4. Present everything in a unified Final Scheduling Results Dashboard.

### 1.5 Non-Goals (v1)
- Multi-core / multiprocessor scheduling
- Real OS process control or real-time kernel integration
- I/O burst modelling, multilevel feedback queues (candidates for v2)
- User accounts and team collaboration (v1 uses shareable links only)

### 1.6 Success Metrics
| Metric | Target |
|---|---|
| Simulation latency, 1,000 jobs, p95 | < 200 ms end-to-end |
| Gantt first render, 1,000 jobs | < 1 s |
| Algorithm correctness vs. reference test suite | 100% pass |
| Task success (user completes input → results unaided) | ≥ 90% in usability tests |
| Lighthouse performance / accessibility | ≥ 90 / ≥ 95 |

---

## 2. System Architecture & Pipeline

> **Note on source input:** The pipeline specification in the original brief ended after the introductory sentence. The flow below is derived from the Target Objectives in Section 1 of that brief. Any divergence from the intended diagram should be reconciled in Open Question OQ-1.

### 2.1 High-Level Flow

```
[Job Input & Batch Configuration]
            │
            ▼
[Validation & Normalization]
            │
            ▼
[Algorithm Selection & Parameters]
            │
            ▼
[C Scheduling Core]  (FCFS | SJF | Priority | RR | EDF)
            │
            ▼
[Execution Trace]  ← canonical output: ordered list of time slices
            │
   ┌────────┴─────────┐
   ▼                  ▼
[Performance        [Gantt Chart
 Calculation         Generation
 Engine]             Engine]
   │                  │
   └────────┬─────────┘
            ▼
[Final Scheduling Results Dashboard]
```

The **Execution Trace** is the single source of truth. Both engines consume the same trace, which guarantees the Gantt chart and metrics can never disagree.

### 2.2 Component Responsibilities

| Component | Responsibility | Technology (recommended) |
|---|---|---|
| Web UI | Input forms, algorithm picker, dashboard, Gantt rendering | TypeScript, React, SVG/Canvas rendering |
| Validation layer | Schema validation, normalization, error messaging | Shared TS schema (e.g., Zod) mirrored in C |
| Scheduling Core | Deterministic simulation of all algorithms | C (C11), compiled to WebAssembly for in-browser execution |
| API wrapper (optional, v1) | Persistence, shareable links, large-batch server execution | Thin service calling the same C library natively |
| Performance Calculation Engine | Derive per-job and aggregate metrics from trace | C module (same library) |
| Gantt Chart Generation Engine | Convert trace to render-ready segments, merge contiguous slices, assign colors | TypeScript module + C-provided segment list |
| Dashboard | Compose tables, charts, comparison, export | React |

**Execution model decision:** The C core runs as WebAssembly in the browser by default (no network latency, works offline, simple deployment). The identical C source is built natively for the API wrapper to handle very large batches and to run the reference test suite. Both builds must produce byte-identical traces for identical input.

### 2.3 Stage Specifications

**Stage 1: Job Input & Batch Configuration**
- Inputs: manual rows, bulk paste, CSV/JSON import, random generator (count, seed, ranges).
- Output: a `Workload` object (Section 4.1).

**Stage 2: Validation & Normalization**
- Enforce field rules (Section 4.2), trim and coerce numerics, assign stable job IDs, sort internally by `(arrival, id)`.
- Reject invalid workloads with row-level errors; never pass invalid data to the C core.

**Stage 3: Algorithm Selection**
- Single algorithm or multi-select for comparison. Parameters: time quantum (RR), preemption mode (SJF, Priority, EDF), priority ordering convention, context-switch cost.

**Stage 4: Scheduling Core (C)**
- Deterministic discrete-event simulation emitting the Execution Trace (Section 5).

**Stage 5a: Performance Calculation Engine**
- Computes per-job and aggregate metrics (Section 6).

**Stage 5b: Gantt Chart Generation Engine**
- Produces render-ready segments, idle gaps, and legend data (Section 7).

**Stage 6: Final Scheduling Results Dashboard**
- Merges 5a and 5b outputs (Section 8).

---

## 3. Functional Requirements

Priority key: **P0** = launch blocker, **P1** = important, **P2** = nice to have.

### 3.1 Job Input & Configuration
| ID | Requirement | Priority |
|---|---|---|
| FR-IN-01 | User can add, edit, duplicate, and delete job rows in an editable table | P0 |
| FR-IN-02 | Fields: Job ID/Name, Arrival Time, Burst Time; Priority and Deadline shown only when the selected algorithm needs them | P0 |
| FR-IN-03 | Bulk paste of tab/comma-separated rows with preview and error highlighting | P1 |
| FR-IN-04 | CSV and JSON import and export of workloads | P1 |
| FR-IN-05 | Random workload generator with configurable count, ranges, and seed (reproducible) | P1 |
| FR-IN-06 | Built-in sample workloads (classic textbook cases, convoy effect, starvation demo) | P1 |
| FR-IN-07 | Inline validation with plain-language errors; Run is disabled until valid | P0 |
| FR-IN-08 | Autosave of the current workload to local storage; "Reset" with undo | P2 |
| FR-IN-09 | Support at least 10,000 jobs through import (virtualized table) | P1 |

### 3.2 Algorithm Selection & Parameters
| ID | Requirement | Priority |
|---|---|---|
| FR-AL-01 | Provide FCFS, SJF, Priority, Round Robin, EDF | P0 |
| FR-AL-02 | SJF, Priority, and EDF each offer preemptive and non-preemptive modes (preemptive SJF = SRTF) | P0 |
| FR-AL-03 | Round Robin requires an integer time quantum ≥ 1 | P0 |
| FR-AL-04 | Priority convention toggle: lower number = higher priority (default) or the reverse | P1 |
| FR-AL-05 | Optional context-switch cost (default 0) | P2 |
| FR-AL-06 | Multi-select algorithms to run in one batch for side-by-side comparison | P0 |
| FR-AL-07 | Optional aging for Priority scheduling (interval and step) to demonstrate starvation mitigation | P2 |

### 3.3 Scheduling Core
| ID | Requirement | Priority |
|---|---|---|
| FR-SC-01 | Core written in C11, no dynamic global state, re-entrant | P0 |
| FR-SC-02 | Deterministic: same input and parameters always yield the identical trace | P0 |
| FR-SC-03 | Handle idle CPU periods between arrivals, emitting explicit IDLE slices | P0 |
| FR-SC-04 | Documented, consistent tie-breaking (Section 5.3) | P0 |
| FR-SC-05 | Memory-safe: bounds-checked input, no leaks (verified by ASan/Valgrind in CI) | P0 |
| FR-SC-06 | Runs off the UI thread (Web Worker) so the interface never freezes | P0 |

### 3.4 Performance Calculation Engine
| ID | Requirement | Priority |
|---|---|---|
| FR-PE-01 | Compute per-job Completion, Turnaround, Waiting, and Response times | P0 |
| FR-PE-02 | Compute aggregates: AWT, ATT, Average Response Time, Throughput, CPU Utilization | P0 |
| FR-PE-03 | For EDF, compute missed-deadline count, per-job lateness, and maximum lateness | P0 |
| FR-PE-04 | Count context switches and preemptions | P1 |
| FR-PE-05 | Metrics derive solely from the Execution Trace | P0 |

### 3.5 Gantt Chart Generation Engine
| ID | Requirement | Priority |
|---|---|---|
| FR-GC-01 | Render a horizontal timeline with one color per job and visible IDLE gaps | P0 |
| FR-GC-02 | Axis shows time ticks aligned to slice boundaries | P0 |
| FR-GC-03 | Hover/focus tooltip: job, start, end, duration, remaining time | P0 |
| FR-GC-04 | Zoom and pan; fit-to-width; virtualized rendering for large traces | P1 |
| FR-GC-05 | Playback mode: play, pause, step, speed control, scrubber, with a "current time" marker and live ready-queue display | P1 |
| FR-GC-06 | Merge adjacent slices of the same job in the static view (RR can toggle "show quantum boundaries") | P1 |
| FR-GC-07 | Mark arrivals, completions, and (EDF) deadlines on the timeline | P1 |
| FR-GC-08 | Click a segment to highlight the job in the results table, and vice versa | P1 |
| FR-GC-09 | Export chart as PNG and SVG | P1 |
| FR-GC-10 | Colorblind-safe palette plus pattern or label fallback | P0 |

### 3.6 Results Dashboard
| ID | Requirement | Priority |
|---|---|---|
| FR-DB-01 | Single view showing summary metric cards, per-job table, and Gantt chart for the selected algorithm | P0 |
| FR-DB-02 | Comparison view: all selected algorithms side by side, best value per metric highlighted | P0 |
| FR-DB-03 | Bar charts comparing AWT, ATT, Response Time, Throughput, Utilization across algorithms | P1 |
| FR-DB-04 | Export results as CSV, JSON, and printable PDF report | P1 |
| FR-DB-05 | Shareable permalink encoding workload and parameters | P2 |
| FR-DB-06 | Step-by-step explanation panel describing why the scheduler made each decision | P2 |

---

## 4. Data Model & Validation

### 4.1 Core Types

```c
typedef struct {
    int32_t  id;            // unique, assigned during normalization
    char     name[32];      // display label, e.g. "P1"
    int64_t  arrival;       // >= 0
    int64_t  burst;         // >= 1
    int32_t  priority;      // optional, default 0
    int64_t  deadline;      // absolute time, optional (EDF); -1 if absent
} Job;

typedef struct {
    Job*     jobs;
    size_t   count;
} Workload;

typedef enum { ALG_FCFS, ALG_SJF, ALG_PRIORITY, ALG_RR, ALG_EDF } Algorithm;

typedef struct {
    Algorithm algorithm;
    bool      preemptive;       // SJF, Priority, EDF
    int64_t   quantum;          // RR only, >= 1
    int64_t   context_switch;   // default 0
    bool      lower_is_higher;  // priority convention
} SchedParams;

typedef struct {
    int32_t  job_id;            // -1 denotes IDLE
    int64_t  start;
    int64_t  end;               // end > start
} TraceSlice;
```

### 4.2 Validation Rules
| Field | Rule | Error message |
|---|---|---|
| Arrival | Integer ≥ 0 | "Arrival time must be a whole number, 0 or greater." |
| Burst | Integer ≥ 1 | "Burst time must be a whole number, 1 or greater." |
| Priority | Integer (any sign); required if Priority algorithm selected | "Priority is required for this algorithm." |
| Deadline | Integer ≥ arrival + burst recommended; required for EDF | "Deadline is required for EDF." (warning if infeasible on its own) |
| Quantum | Integer ≥ 1 | "Time quantum must be at least 1." |
| Job count | 1 to 10,000 (v1 cap) | "Add at least one job." / "Maximum is 10,000 jobs." |
| Names | Unique, ≤ 32 chars | "Job names must be unique." |

Time values are integer time units (v1). Decimal time support is deferred to v2 to avoid floating-point drift in traces.

---

## 5. Scheduling Algorithm Specifications

### 5.1 Common Rules
- Simulation clock starts at the earliest arrival (time 0 is shown, with IDLE if nothing has arrived).
- A job is *ready* when `arrival <= clock` and it has remaining burst.
- If no job is ready, emit an IDLE slice until the next arrival.
- Context-switch cost, when non-zero, is emitted as a distinct `SWITCH` overhead slice and excluded from "busy" time for utilization unless the user opts to include it.

### 5.2 Algorithms
| Algorithm | Selection rule | Preemption | Notes |
|---|---|---|---|
| FCFS | Earliest arrival | Never | Exhibits convoy effect |
| SJF | Smallest burst among ready jobs | Optional (SRTF: smallest *remaining* time, re-evaluated on every arrival) | Can starve long jobs |
| Priority | Best priority value among ready jobs | Optional (re-evaluated on every arrival) | Optional aging |
| Round Robin | FIFO ready queue, each dispatch runs `min(quantum, remaining)` | Quantum expiry | A job arriving at the same instant a quantum expires is enqueued **before** the preempted job |
| EDF | Earliest absolute deadline among ready jobs | Optional (re-evaluated on every arrival) | Reports deadline misses; jobs are not dropped on miss |

### 5.3 Tie-Breaking (applies everywhere, in order)
1. Algorithm's primary key (arrival, burst, priority, deadline)
2. Earlier arrival time
3. Lower job ID (input order)

### 5.4 Edge Cases the Core Must Handle
- Multiple jobs with identical arrival times
- Large gaps between arrivals (IDLE slices)
- Single-job workload
- Burst smaller than quantum (RR)
- Preemption exactly at a completion boundary (no zero-length slices)
- All priorities or deadlines equal (falls back to FCFS ordering)
- Integer overflow protection on time sums (64-bit; reject totals beyond 2^53 to stay safe for the JavaScript UI)

---

## 6. Performance Calculation Engine

### 6.1 Per-Job Metrics
| Metric | Formula |
|---|---|
| Completion Time (CT) | End time of the job's final slice |
| Turnaround Time (TAT) | CT − Arrival |
| Waiting Time (WT) | TAT − Burst |
| Response Time (RT) | First start time − Arrival |
| Lateness (EDF) | CT − Deadline (positive = missed) |

### 6.2 Aggregate Metrics
| Metric | Formula |
|---|---|
| Average Waiting Time (AWT) | Σ WT / n |
| Average Turnaround Time (ATT) | Σ TAT / n |
| Average Response Time | Σ RT / n |
| Throughput | n / makespan, where makespan = last completion − earliest arrival (shown as jobs per time unit) |
| CPU Utilization | (Σ burst time executed) / makespan × 100% |
| Missed Deadlines (EDF) | count of jobs where CT > deadline |
| Context Switches | count of transitions between different jobs |

Display precision: 2 decimal places; underlying values retained at full precision in exports.

---

## 7. Gantt Chart Generation Engine

### 7.1 Output Contract
```json
{
  "algorithm": "RR",
  "makespan": 24,
  "segments": [
    { "jobId": 1, "name": "P1", "start": 0, "end": 4, "kind": "run" },
    { "jobId": -1, "name": "IDLE", "start": 4, "end": 6, "kind": "idle" }
  ],
  "markers": [
    { "time": 2, "type": "arrival", "jobId": 2 },
    { "time": 10, "type": "deadline", "jobId": 3 }
  ],
  "legend": [{ "jobId": 1, "name": "P1", "color": "#1f77b4" }]
}
```

### 7.2 Rendering Rules
- Segment width is proportional to duration; minimum visible width of 2 px with a label collapse rule (label hidden when the segment is too narrow, shown on hover).
- Colors assigned deterministically from the job ID so the same job keeps its color across algorithms.
- Rendering uses SVG up to ~2,000 segments and switches to Canvas beyond that threshold.
- Playback state (current time, ready queue contents, running job) is derived from the trace, not recomputed.

---

## 8. Final Scheduling Results Dashboard

### 8.1 Layout (desktop)
1. **Header bar:** workload name, algorithm tabs (or "Compare" tab), Export menu, Edit Workload button.
2. **Metric cards:** AWT, ATT, Avg Response, Throughput, CPU Utilization (plus Missed Deadlines for EDF).
3. **Gantt chart panel:** with playback controls and zoom.
4. **Per-job results table:** sortable; columns Job, Arrival, Burst, Priority, Deadline, Start, Completion, TAT, WT, RT.
5. **Comparison panel (multi-algorithm runs):** table with best-in-column highlighting plus bar charts.

### 8.2 Responsive Behavior
- Tablet: Gantt above, table below, cards in two columns.
- Mobile: cards stack, Gantt scrolls horizontally with sticky time axis, table scrolls horizontally.

### 8.3 Empty, Loading, and Error States
- Empty: guided prompt with sample workload buttons.
- Loading: skeleton for cards and chart; shown only if a run exceeds 150 ms.
- Error: if the engine fails, show a recoverable message with the run parameters and "Copy diagnostic" action.

---

## 9. API Specification (optional server wrapper)

Used for persistence, shareable links, and server-side execution of oversized batches. The in-browser WASM path does not require it.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/simulate` | Body: `{ workload, params[] }`. Returns trace, metrics, and Gantt data for each algorithm |
| POST | `/api/v1/workloads` | Save workload; returns ID |
| GET | `/api/v1/workloads/{id}` | Load saved workload |
| POST | `/api/v1/share` | Create immutable shareable result link |
| GET | `/api/v1/health` | Liveness probe |

**Response envelope**
```json
{
  "results": [
    {
      "algorithm": "FCFS",
      "trace": [],
      "metrics": { "perJob": [], "aggregate": {} },
      "gantt": {}
    }
  ],
  "engineVersion": "1.0.0",
  "durationMs": 12
}
```
Errors use RFC 7807 problem details with per-field validation arrays. Rate limit: 60 requests/min/IP. Request body cap: 5 MB.

---

## 10. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | 1,000-job simulation < 200 ms p95; 10,000-job simulation < 2 s; UI remains at 60 fps during zoom/pan up to 2,000 segments |
| Scalability | Stateless API, horizontally scalable; static assets served via CDN |
| Reliability | 99.9% availability for the hosted site; the client-side path degrades to fully offline |
| Correctness | Cross-checked against a reference implementation (Python) in CI on ≥ 500 generated workloads per algorithm |
| Security | Strict input validation on both client and server; Content Security Policy; no user code execution; dependency scanning; sanitized import files |
| Privacy | No personal data collected; workloads stay local unless the user explicitly shares |
| Accessibility | WCAG 2.2 AA: keyboard operation of all controls, screen-reader summary of Gantt as a table, sufficient contrast, reduced-motion support for playback |
| Compatibility | Latest two versions of Chrome, Edge, Firefox, Safari; iOS Safari and Android Chrome |
| Internationalization | English at launch; text externalized for later localization |
| Observability | Client error reporting, engine version in every export, API request metrics and tracing |
| Maintainability | C core documented per function, ≥ 90% line coverage, compiler warnings as errors (`-Wall -Wextra -Werror`) |

---

## 11. Quality Assurance & Testing

1. **Unit tests (C):** each algorithm with hand-computed textbook cases, including all edge cases in Section 5.4.
2. **Property-based tests:** invariants such as no overlapping slices, total executed time equals total burst, no job runs before arrival, work-conserving behavior (no IDLE while jobs are ready).
3. **Differential tests:** C core versus an independent reference implementation on randomized workloads.
4. **Cross-build tests:** native versus WASM trace equality.
5. **Sanitizers and fuzzing:** ASan, UBSan, and libFuzzer on the input parser.
6. **UI tests:** component tests plus end-to-end flows (Playwright): input → run → dashboard → export.
7. **Visual regression:** Gantt snapshots for canonical workloads.
8. **Performance tests:** benchmark suite with regression thresholds in CI.
9. **Accessibility audits:** automated (axe) plus manual screen-reader pass.

---

## 12. Acceptance Criteria (Launch)

- [ ] All five algorithms pass the reference suite in both preemptive and non-preemptive variants where applicable.
- [ ] Gantt chart and metrics agree for every test workload (both derive from one trace).
- [ ] Textbook example workloads reproduce published AWT/ATT values exactly.
- [ ] Invalid input never reaches the C core; every error has a clear message.
- [ ] Comparison view works for all five algorithms on the same workload.
- [ ] Exports (CSV, JSON, PNG/SVG, PDF) open correctly and include engine version.
- [ ] Performance and accessibility targets in Sections 1.6 and 10 are met.
- [ ] No critical or high severity open defects.

---

## 13. Delivery Plan

| Phase | Scope | Indicative duration |
|---|---|---|
| 0. Foundations | Repo, CI, C core skeleton, WASM toolchain, design system | 2 weeks |
| 1. Core algorithms | FCFS, SJF, Priority, RR, EDF in C with unit and property tests | 3 weeks |
| 2. Engines | Performance Calculation Engine and Gantt Generation Engine | 2 weeks |
| 3. UI | Input flow, algorithm configuration, dashboard, Gantt interactions | 4 weeks |
| 4. Comparison & export | Multi-algorithm view, exports, share links | 2 weeks |
| 5. Hardening | Fuzzing, performance tuning, accessibility, beta feedback | 2 weeks |
| Launch | Release and monitoring | — |

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Ambiguity in tie-breaking or RR arrival-vs-requeue ordering causes disagreement with users' textbooks | Perceived incorrectness | Document rules in-app; add a "tie-break" explanation panel; allow RR ordering toggle (P2) |
| WASM load size or startup delay | Slow first run | Small build with `-Oz`, lazy-load, cache via service worker |
| Large traces slow the chart | Janky UI | Segment merging, Canvas fallback, virtualization |
| Native and WASM divergence | Inconsistent results | Cross-build tests in CI |
| Memory-safety bugs in C | Crashes or security issues | Sanitizers, fuzzing, bounds checks, no unchecked allocations |
| Scope creep (I/O bursts, MLFQ) | Delays | Hold to non-goals; track as v2 backlog |

---

## 15. Future Considerations (v2+)
Multilevel feedback queue, multiprocessor scheduling, I/O bursts, real-time rate-monotonic analysis, decimal time units, saved workspaces with accounts, classroom mode with assignable workloads and auto-grading.

---

## 16. Open Questions

| ID | Question | Owner |
|---|---|---|
| OQ-1 | The brief's pipeline section was cut off. Confirm Section 2 matches the intended end-to-end diagram (especially any stages before algorithm selection) | Product |
| OQ-2 | Should CPU utilization include context-switch overhead as busy time by default? | Product / Architecture |
| OQ-3 | Is a hosted API required at launch, or is the client-only WASM build sufficient for v1? | Architecture |
| OQ-4 | Confirm the v1 cap of 10,000 jobs and integer-only time units | Product |
| OQ-5 | Should EDF drop or continue jobs that have already missed their deadline? (Spec currently continues them) | Product |

---

## 17. Glossary

| Term | Meaning |
|---|---|
| AWT | Average Waiting Time |
| ATT | Average Turnaround Time |
| EDF | Earliest Deadline First |
| FCFS | First-Come, First-Served |
| SJF / SRTF | Shortest Job First / Shortest Remaining Time First |
| RR | Round Robin |
| Execution Trace | Ordered list of time slices produced by the scheduling core; the single source of truth for metrics and the Gantt chart |
| Makespan | Time from earliest arrival to last completion |
