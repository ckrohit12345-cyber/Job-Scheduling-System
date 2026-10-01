# KernelSched Pro: Interactive CPU Scheduling & Visualization Platform

A high-performance, executive-grade web application for simulating, visualizing, and analyzing operating system CPU job scheduling algorithms.

Compliant with the **Interactive Job Scheduling & Visualization Platform PRD**.

---

## 🌟 Highlights & Key Features

### 1. ⚡ Supported Scheduling Algorithms
- **FCFS (First-Come, First-Served)**: Classic non-preemptive FIFO scheduling with Convoy Effect demonstration.
- **SJF (Shortest Job First - Non-Preemptive)**: Smallest burst selection to optimize average waiting time.
- **SRTF (Shortest Remaining Time First - Preemptive SJF)**: Continuous re-evaluation on arrival events.
- **Round Robin (RR)**: Fixed time-quantum cyclic execution with strict PRD Section 5.2 tie-breaking (*arrivals at quantum expiry enter before preempted job*).
- **Priority Scheduling (Non-Preemptive & Preemptive)**: Configurable priority direction (*lower-is-higher* vs. *higher-is-higher*) and optional **aging** to mitigate starvation.
- **EDF (Earliest Deadline First - Non-Preemptive & Preemptive)**: Real-time absolute deadline scheduling with lateness and missed deadline tracking.
- **Idle CPU & Context-Switch Modeling**: Automatic emission of explicit `IDLE` slices during arrival gaps and configurable context switch overhead.

### 2. 📊 Interactive Gantt Chart Timeline
- **High-Fidelity SVG Rendering**: Clean horizontal timeline with time ticks, grid boundaries, and deterministic job colors.
- **IDLE & Switch Visualization**: Diagonal hash patterns for idle CPU periods and red hash markers for context switch overhead.
- **Milestone Indicators**:
  - `▼` Arrival markers
  - `✓` Job completion markers
  - `◆` Real-time deadline markers (with missed deadline indicators)
- **Interactive Tooltips**: Hover over any slice to inspect start time, end time, duration, and remaining burst.
- **Bidirectional Highlighting**: Click any Gantt segment to jump to and highlight its row in the results table; hover over a table row to highlight all its slices on the timeline.
- **Display Toggles**:
  - Merge contiguous slices or view individual quantum boundaries.
  - Accessible colorblind-safe palette (Wong / Okabe-Ito design).
  - Zoom controls: Zoom In, Zoom Out, and Fit to Screen.

### 3. 🎬 Live Simulation Playback & Decision Inspector
- **Timeline Controls**: Play, Pause, Step Forward, Step Backward, Reset, and Scrubbing slider.
- **Configurable Speed**: 0.25x, 0.5x, 1.0x, 2.0x, and 4.0x.
- **Active CPU State Monitor**: Live status (`RUNNING`, `IDLE`, or `SWITCHING`), currently executing process, and remaining burst.
- **Live Ready Queue Visualizer**: Dynamically displays queued processes in ready order with remaining times and priorities.
- **Step-by-Step Decision Log**: Transparent audit log explaining exactly why each scheduling decision was reached at every time step.

### 4. ⚖️ Multi-Algorithm Comparison Mode
- Select 2 to 8 algorithms to run simultaneously on the identical workload.
- **Side-by-Side Comparison Table**: Automated green badges and star markers (`⭐`) highlighting best-in-class metrics (lowest AWT, lowest ATT, highest utilization).
- **Comparative Bar Charts**: Interactive visual bars for Average Waiting Time, Average Turnaround Time, and CPU Utilization.
- **Synchronized Stacked Timelines**: Stacked Gantt charts aligned on an identical horizontal time scale for instant visual contrast.

### 5. 🛠️ Workload Definition & Presets
- **Editable Table**: Add, edit, duplicate, and delete job rows with live inline validation.
- **Preset Workloads Library**:
  1. *Classic Textbook Case* (Silberschatz / Galvin standard benchmark)
  2. *Convoy Effect Demo* (Large burst blocking short jobs in FCFS)
  3. *SJF / SRTF Starvation Demo* (Continuous stream of short jobs starving long job)
  4. *Round Robin Quantum Comparison* (Impact of quantum length and overhead)
  5. *Priority Preemption vs Non-Preemption* (Emergency high-priority interrupt)
  6. *EDF Real-Time Feasibility* (Tight deadlines where EDF succeeds over FCFS)
  7. *CPU Idle Gaps & Sparse Arrivals*
- **Bulk Paste**: Comma, tab, or space-separated workload ingestion.
- **Random Workload Generator**: Configurable count, arrival ranges, burst ranges, and priority levels.
- **CSV & JSON Import**: Direct file upload or drag-and-drop.

### 6. 📤 Export & Sharing Suite
- **CSV Export**: Export workload definitions and full performance results reports.
- **JSON Export**: Export canonical execution trace conforming to PRD schema.
- **Gantt Chart Export**: Download timeline as high-resolution PNG image or SVG vector.
- **Printable Report**: Print-optimized executive PDF summary view.
- **Shareable Permalink**: Encodes workload and parameters into URL hash for one-click sharing.

---

## 🚀 How to Run Locally

### Option 1: Using the Built-in Node Server (Recommended)
From the project folder (`c:\Users\kaviya\Desktop\OS Project`):
```bash
node server.js
```
Then open your browser and navigate to:
```
http://localhost:3000/
```

### Option 2: Direct Browser Launch
Simply double-click or open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Firefox, Safari).

---

## 📁 Project Architecture

```
OS Project/
├── index.html          # Main HTML structure with semantic sections & modals
├── styles.css          # Executive-grade obsidian/dark design system & CSS variables
├── server.js           # Lightweight zero-dependency Node.js HTTP server
├── test_suite.js       # Automated verification test suite (100% pass)
├── prd.md              # Original Product Requirements Document
├── README.md           # System documentation and user guide
└── js/
    ├── algorithms.js   # Deterministic scheduling simulation core (all 8 algorithms)
    ├── metrics.js      # Performance Calculation Engine (AWT, ATT, Util, etc.)
    ├── gantt.js        # SVG Gantt Chart rendering & tooltip engine
    ├── playback.js     # Step-by-step playback & ready queue controller
    ├── presets.js      # Curated preset workloads library
    ├── export.js       # CSV, JSON, PNG, SVG, and URL hash sharing suite
    └── app.js          # Main application orchestrator & DOM coordinator
```

---

## 🧪 Testing & Verification

Run the automated test suite directly in terminal:
```bash
node test_suite.js
```
The test suite validates:
- FCFS baseline calculation and metrics
- Explicit IDLE slices and sparse arrival gap handling
- SJF Non-Preemptive vs SRTF Preemption
- Round Robin arrival vs quantum expiry tie-breaking per PRD 5.2
- Priority Preemptive scheduling with customizable direction
- EDF preemption and lateness tracking
- All preset workloads across all algorithms
