/**
 * Preset Sample Workloads Library
 * Compliant with PRD Section 3.1 (FR-IN-06)
 * Demonstrates classic OS scheduling concepts and edge cases.
 */

export const PRESET_WORKLOADS = [
    {
        id: 'classic_textbook',
        title: 'Classic Textbook Case',
        description: 'Standard mixed workload from Operating System Concepts (Silberschatz/Galvin). Perfect baseline for comparing all algorithms.',
        category: 'Standard',
        recommendedAlgorithm: 'RR',
        jobs: [
            { id: 1, name: 'P1', arrival: 0, burst: 5, priority: 3, deadline: 15 },
            { id: 2, name: 'P2', arrival: 1, burst: 3, priority: 1, deadline: 7 },
            { id: 3, name: 'P3', arrival: 2, burst: 8, priority: 4, deadline: 25 },
            { id: 4, name: 'P4', arrival: 3, burst: 6, priority: 2, deadline: 18 }
        ]
    },
    {
        id: 'convoy_effect',
        title: 'Convoy Effect (FCFS Anomaly)',
        description: 'P1 has a massive burst time (24) and arrives first at t=0, followed by tiny jobs (P2, P3, P4). Demonstrates dramatic degradation of average waiting time in FCFS compared to SJF or Round Robin.',
        category: 'Performance Pathology',
        recommendedAlgorithm: 'FCFS',
        jobs: [
            { id: 1, name: 'P1 (Hog)', arrival: 0, burst: 24, priority: 3, deadline: 40 },
            { id: 2, name: 'P2 (Quick)', arrival: 1, burst: 3, priority: 1, deadline: 10 },
            { id: 3, name: 'P3 (Quick)', arrival: 2, burst: 3, priority: 2, deadline: 15 },
            { id: 4, name: 'P4 (Quick)', arrival: 3, burst: 2, priority: 1, deadline: 12 }
        ]
    },
    {
        id: 'sjf_starvation',
        title: 'SJF / SRTF Starvation Demo',
        description: 'A heavy background batch job (P1) arrives early, but a continuous stream of short bursts (P2, P3, P4, P5) keeps arriving. Demonstrates starvation in non-preemptive SJF and SRTF unless aging is used.',
        category: 'Starvation',
        recommendedAlgorithm: 'SRTF',
        jobs: [
            { id: 1, name: 'P1 (Long)', arrival: 0, burst: 20, priority: 5, deadline: 50 },
            { id: 2, name: 'P2 (Stream)', arrival: 1, burst: 2, priority: 2, deadline: 6 },
            { id: 3, name: 'P3 (Stream)', arrival: 3, burst: 3, priority: 1, deadline: 10 },
            { id: 4, name: 'P4 (Stream)', arrival: 5, burst: 2, priority: 3, deadline: 12 },
            { id: 5, name: 'P5 (Stream)', arrival: 7, burst: 2, priority: 2, deadline: 14 }
        ]
    },
    {
        id: 'rr_quantum_demo',
        title: 'Round Robin Quantum Comparison',
        description: 'Shows the critical impact of time quantum length. With q=2, processes share the CPU smoothly; with q=10, it behaves like FCFS; with context switch cost > 0, small quanta reveal switching overhead.',
        category: 'Interactive',
        recommendedAlgorithm: 'RR',
        jobs: [
            { id: 1, name: 'P1', arrival: 0, burst: 10, priority: 2, deadline: 25 },
            { id: 2, name: 'P2', arrival: 1, burst: 4, priority: 1, deadline: 15 },
            { id: 3, name: 'P3', arrival: 2, burst: 6, priority: 3, deadline: 20 },
            { id: 4, name: 'P4', arrival: 4, burst: 8, priority: 2, deadline: 30 }
        ]
    },
    {
        id: 'edf_realtime',
        title: 'EDF Real-Time Feasibility',
        description: 'Real-time tasks with stringent deadlines. FCFS or SJF will miss multiple deadlines, whereas Earliest Deadline First (preemptive) meets all deadlines successfully by prioritizing nearest deadlines.',
        category: 'Real-Time',
        recommendedAlgorithm: 'EDF_P',
        jobs: [
            { id: 1, name: 'Task A', arrival: 0, burst: 4, priority: 2, deadline: 9 },
            { id: 2, name: 'Task B', arrival: 1, burst: 2, priority: 1, deadline: 4 },
            { id: 3, name: 'Task C', arrival: 2, burst: 6, priority: 3, deadline: 16 },
            { id: 4, name: 'Task D', arrival: 4, burst: 3, priority: 1, deadline: 8 }
        ]
    },
    {
        id: 'priority_preemption',
        title: 'Priority Preemption vs Non-Preemption',
        description: 'Demonstrates how a high-priority interrupt (P3, priority 1) arriving at t=2 immediately halts lower priority work in preemptive mode, minimizing latency for mission-critical jobs.',
        category: 'Priority',
        recommendedAlgorithm: 'PRIORITY_P',
        jobs: [
            { id: 1, name: 'P1 (Low)', arrival: 0, burst: 8, priority: 4, deadline: 20 },
            { id: 2, name: 'P2 (Med)', arrival: 1, burst: 5, priority: 3, deadline: 16 },
            { id: 3, name: 'P3 (Critical)', arrival: 2, burst: 3, priority: 1, deadline: 6 },
            { id: 4, name: 'P4 (Med)', arrival: 5, burst: 4, priority: 2, deadline: 18 }
        ]
    },
    {
        id: 'idle_gaps_demo',
        title: 'CPU Idle Gaps & Sparse Arrivals',
        description: 'Workload with spaced arrival times, forcing the CPU into idle periods. Verifies correct idle time detection, timeline striping, and CPU utilization formulas.',
        category: 'Edge Cases',
        recommendedAlgorithm: 'FCFS',
        jobs: [
            { id: 1, name: 'P1', arrival: 2, burst: 3, priority: 1, deadline: 8 },
            { id: 2, name: 'P2', arrival: 10, burst: 4, priority: 2, deadline: 18 },
            { id: 3, name: 'P3', arrival: 18, burst: 2, priority: 1, deadline: 24 }
        ]
    }
];
