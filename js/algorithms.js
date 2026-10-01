/**
 * Interactive Job Scheduling Core Engine
 * Implements deterministic discrete-event simulation for:
 * - FCFS (First-Come, First-Served)
 * - SJF (Shortest Job First - Non-preemptive & Preemptive / SRTF)
 * - Priority (Non-preemptive & Preemptive, with Lower-is-Higher toggle & Aging)
 * - Round Robin (with exact textbook tie-breaking for arrivals vs quantum expiry)
 * - EDF (Earliest Deadline First - Non-preemptive & Preemptive)
 * 
 * Compliant with PRD Sections 4 & 5.
 */

export const AlgorithmType = {
    FCFS: 'FCFS',
    SJF: 'SJF',
    SRTF: 'SRTF',
    PRIORITY_NP: 'PRIORITY_NP',
    PRIORITY_P: 'PRIORITY_P',
    RR: 'RR',
    EDF_NP: 'EDF_NP',
    EDF_P: 'EDF_P'
};

export const ALGORITHM_METADATA = {
    [AlgorithmType.FCFS]: {
        name: 'FCFS',
        fullName: 'First-Come, First-Served',
        category: 'Non-Preemptive',
        preemptive: false,
        needsPriority: false,
        needsDeadline: false,
        needsQuantum: false,
        description: 'Allocates CPU to processes in the exact order of their arrival. Simple, fair, but vulnerable to the Convoy Effect.'
    },
    [AlgorithmType.SJF]: {
        name: 'SJF (Non-Preemptive)',
        fullName: 'Shortest Job First',
        category: 'Non-Preemptive',
        preemptive: false,
        needsPriority: false,
        needsDeadline: false,
        needsQuantum: false,
        description: 'Dispatches the process with the shortest burst time. Minimizes average waiting time but may starve long jobs.'
    },
    [AlgorithmType.SRTF]: {
        name: 'SRTF (Preemptive SJF)',
        fullName: 'Shortest Remaining Time First',
        category: 'Preemptive',
        preemptive: true,
        needsPriority: false,
        needsDeadline: false,
        needsQuantum: false,
        description: 'Preemptively selects the job with least remaining time. Re-evaluates on every job arrival. Optimal for average turnaround time.'
    },
    [AlgorithmType.PRIORITY_NP]: {
        name: 'Priority (Non-Preemptive)',
        fullName: 'Priority Scheduling (NP)',
        category: 'Non-Preemptive',
        preemptive: false,
        needsPriority: true,
        needsDeadline: false,
        needsQuantum: false,
        description: 'Executes highest priority ready job to completion. Supports customizable priority direction and starvation mitigation aging.'
    },
    [AlgorithmType.PRIORITY_P]: {
        name: 'Priority (Preemptive)',
        fullName: 'Priority Scheduling (Preemptive)',
        category: 'Preemptive',
        preemptive: true,
        needsPriority: true,
        needsDeadline: false,
        needsQuantum: false,
        description: 'Preempts running job if a ready job arrives with strictly higher priority. High responsiveness for critical tasks.'
    },
    [AlgorithmType.RR]: {
        name: 'Round Robin',
        fullName: 'Round Robin (RR)',
        category: 'Preemptive (Time Slice)',
        preemptive: true,
        needsPriority: false,
        needsDeadline: false,
        needsQuantum: true,
        description: 'Time-sharing algorithm allocating fixed quantum slices in cyclic FIFO queue. Ideal for responsive multi-user interactive systems.'
    },
    [AlgorithmType.EDF_NP]: {
        name: 'EDF (Non-Preemptive)',
        fullName: 'Earliest Deadline First (NP)',
        category: 'Real-Time Non-Preemptive',
        preemptive: false,
        needsPriority: false,
        needsDeadline: true,
        needsQuantum: false,
        description: 'Dispatches ready task with nearest absolute deadline. Once started, runs to completion.'
    },
    [AlgorithmType.EDF_P]: {
        name: 'EDF (Preemptive)',
        fullName: 'Earliest Deadline First (Preemptive)',
        category: 'Real-Time Preemptive',
        preemptive: true,
        needsPriority: false,
        needsDeadline: true,
        needsQuantum: false,
        description: 'Dynamically prioritizes jobs by absolute deadline, preempting if a new arrival has an earlier deadline. Optimal real-time scheduler.'
    }
};

/**
 * Normalizes and validates raw workload jobs
 */
export function normalizeWorkload(rawJobs) {
    if (!Array.isArray(rawJobs) || rawJobs.length === 0) {
        throw new Error('Workload must contain at least one job.');
    }
    if (rawJobs.length > 10000) {
        throw new Error('Maximum workload size is 10,000 jobs.');
    }

    const seenNames = new Set();
    const normalized = rawJobs.map((j, index) => {
        const id = j.id !== undefined && j.id !== null ? Number(j.id) : index + 1;
        const name = (j.name || `P${id}`).trim().substring(0, 32);
        if (seenNames.has(name)) {
            throw new Error(`Job name "${name}" is duplicated. Job names must be unique.`);
        }
        seenNames.add(name);

        const arrival = Number(j.arrival);
        const burst = Number(j.burst);
        const priority = j.priority !== undefined && j.priority !== '' ? Number(j.priority) : 0;
        const deadline = j.deadline !== undefined && j.deadline !== '' && Number(j.deadline) >= 0 ? Number(j.deadline) : -1;

        if (isNaN(arrival) || arrival < 0 || !Number.isInteger(arrival)) {
            throw new Error(`Job "${name}": Arrival time must be a non-negative integer.`);
        }
        if (isNaN(burst) || burst <= 0 || !Number.isInteger(burst)) {
            throw new Error(`Job "${name}": Burst time must be an integer >= 1.`);
        }
        if (isNaN(priority) || !Number.isInteger(priority)) {
            throw new Error(`Job "${name}": Priority must be a valid integer.`);
        }
        if (deadline !== -1 && (isNaN(deadline) || deadline < 0 || !Number.isInteger(deadline))) {
            throw new Error(`Job "${name}": Deadline must be a positive integer or empty.`);
        }

        return {
            id,
            name,
            arrival,
            burst,
            priority,
            deadline,
            color: j.color || null
        };
    });

    // Stable sort primarily by arrival time, then by ID
    return normalized.sort((a, b) => (a.arrival - b.arrival) || (a.id - b.id));
}

/**
 * Primary Simulation Engine Entrypoint
 * @param {Array} rawJobs 
 * @param {Object} options 
 * @returns {Object} Simulation results containing raw trace, events, decisions, and engine metadata
 */
export function runSimulation(rawJobs, options = {}) {
    const jobs = normalizeWorkload(rawJobs);
    const algorithm = options.algorithm || AlgorithmType.FCFS;
    const quantum = Math.max(1, Number(options.quantum) || 2);
    const contextSwitch = Math.max(0, Number(options.contextSwitch) || 0);
    const lowerIsHigher = options.lowerIsHigher !== false; // default true (lower number = higher priority)
    const agingInterval = Math.max(0, Number(options.agingInterval) || 0);
    const agingStep = Math.max(0, Number(options.agingStep) || 1);

    // Deep copy jobs for simulation runtime state
    const simJobs = jobs.map(j => ({
        ...j,
        remaining: j.burst,
        effectivePriority: j.priority,
        lastAgedTime: j.arrival,
        firstStart: -1,
        completedAt: -1,
        hasArrived: false
    }));

    let clock = 0;
    const slices = [];
    const decisions = [];
    let completedCount = 0;
    const totalJobs = simJobs.length;
    let lastJobId = null;

    // Ready queue structure
    let readyQueue = [];

    // Helper: Find unarrived jobs
    const getNextArrival = () => {
        let minArrival = Infinity;
        for (const j of simJobs) {
            if (!j.hasArrived && j.remaining > 0) {
                if (j.arrival < minArrival) minArrival = j.arrival;
            }
        }
        return minArrival === Infinity ? null : minArrival;
    };

    // Helper to compare priorities according to user settings
    const comparePriorities = (pA, pB) => {
        return lowerIsHigher ? (pA - pB) : (pB - pA);
    };

    // Aging routine for ready queue
    const applyAging = (currentClock) => {
        if (agingInterval <= 0) return;
        for (const job of readyQueue) {
            const timeWaiting = currentClock - job.lastAgedTime;
            if (timeWaiting >= agingInterval) {
                const cycles = Math.floor(timeWaiting / agingInterval);
                const delta = cycles * agingStep;
                if (lowerIsHigher) {
                    job.effectivePriority = job.effectivePriority - delta;
                } else {
                    job.effectivePriority = job.effectivePriority + delta;
                }
                job.lastAgedTime += cycles * agingInterval;
            }
        }
    };

    // Helper to log decision
    const logDecision = (time, event, detail, activeJob = null, queueSnap = []) => {
        decisions.push({
            time,
            event,
            detail,
            activeJobId: activeJob ? activeJob.id : null,
            activeJobName: activeJob ? activeJob.name : 'None',
            queue: queueSnap.map(q => q.name)
        });
    };

    // Maximum simulation steps safety guard against infinite loops
    let safetyCounter = 0;
    const maxSafetySteps = 500000;

    switch (algorithm) {
        case AlgorithmType.FCFS: {
            while (completedCount < totalJobs && safetyCounter++ < maxSafetySteps) {
                // Check new arrivals
                for (const j of simJobs) {
                    if (!j.hasArrived && j.arrival <= clock) {
                        j.hasArrived = true;
                        readyQueue.push(j);
                    }
                }

                if (readyQueue.length === 0) {
                    const nextArr = getNextArrival();
                    if (nextArr !== null && nextArr > clock) {
                        slices.push({
                            jobId: -1,
                            name: 'IDLE',
                            start: clock,
                            end: nextArr,
                            kind: 'idle'
                        });
                        logDecision(clock, 'CPU Idle', `No jobs ready. CPU idling until t = ${nextArr}.`);
                        clock = nextArr;
                    }
                    continue;
                }

                // FCFS: pick front of readyQueue
                const current = readyQueue.shift();

                // Context switch cost if switching from a different job
                if (contextSwitch > 0 && lastJobId !== null && lastJobId !== current.id) {
                    slices.push({
                        jobId: -2,
                        name: 'SWITCH',
                        start: clock,
                        end: clock + contextSwitch,
                        kind: 'switch'
                    });
                    clock += contextSwitch;
                }

                if (current.firstStart === -1) current.firstStart = clock;
                const startTime = clock;
                const endTime = clock + current.remaining;

                slices.push({
                    jobId: current.id,
                    name: current.name,
                    start: startTime,
                    end: endTime,
                    kind: 'run',
                    remainingBefore: current.remaining,
                    remainingAfter: 0
                });

                logDecision(startTime, 'Dispatched', `Job ${current.name} executed to completion [${startTime} -> ${endTime}].`, current, readyQueue);

                clock = endTime;
                current.remaining = 0;
                current.completedAt = clock;
                completedCount++;
                lastJobId = current.id;
            }
            break;
        }

        case AlgorithmType.SJF: {
            while (completedCount < totalJobs && safetyCounter++ < maxSafetySteps) {
                for (const j of simJobs) {
                    if (!j.hasArrived && j.arrival <= clock) {
                        j.hasArrived = true;
                        readyQueue.push(j);
                    }
                }

                if (readyQueue.length === 0) {
                    const nextArr = getNextArrival();
                    if (nextArr !== null && nextArr > clock) {
                        slices.push({ jobId: -1, name: 'IDLE', start: clock, end: nextArr, kind: 'idle' });
                        logDecision(clock, 'CPU Idle', `No jobs ready. Idling until t = ${nextArr}.`);
                        clock = nextArr;
                    }
                    continue;
                }

                // SJF (Non-preemptive): Sort readyQueue by burst, then arrival, then ID
                readyQueue.sort((a, b) => (a.burst - b.burst) || (a.arrival - b.arrival) || (a.id - b.id));
                const current = readyQueue.shift();

                if (contextSwitch > 0 && lastJobId !== null && lastJobId !== current.id) {
                    slices.push({ jobId: -2, name: 'SWITCH', start: clock, end: clock + contextSwitch, kind: 'switch' });
                    clock += contextSwitch;
                }

                if (current.firstStart === -1) current.firstStart = clock;
                const startTime = clock;
                const endTime = clock + current.remaining;

                slices.push({
                    jobId: current.id,
                    name: current.name,
                    start: startTime,
                    end: endTime,
                    kind: 'run',
                    remainingBefore: current.remaining,
                    remainingAfter: 0
                });

                logDecision(startTime, 'Dispatched SJF', `Selected ${current.name} (burst: ${current.burst}) over ${readyQueue.length} waiting jobs.`, current, readyQueue);

                clock = endTime;
                current.remaining = 0;
                current.completedAt = clock;
                completedCount++;
                lastJobId = current.id;
            }
            break;
        }

        case AlgorithmType.SRTF: {
            // Preemptive SJF: discrete event step-by-step
            while (completedCount < totalJobs && safetyCounter++ < maxSafetySteps) {
                for (const j of simJobs) {
                    if (!j.hasArrived && j.arrival <= clock) {
                        j.hasArrived = true;
                        readyQueue.push(j);
                    }
                }

                if (readyQueue.length === 0) {
                    const nextArr = getNextArrival();
                    if (nextArr !== null && nextArr > clock) {
                        slices.push({ jobId: -1, name: 'IDLE', start: clock, end: nextArr, kind: 'idle' });
                        logDecision(clock, 'CPU Idle', `No jobs in ready queue. Idling until t = ${nextArr}.`);
                        clock = nextArr;
                    }
                    continue;
                }

                // Sort by remaining burst, then arrival, then ID
                readyQueue.sort((a, b) => (a.remaining - b.remaining) || (a.arrival - b.arrival) || (a.id - b.id));
                const current = readyQueue[0];

                if (contextSwitch > 0 && lastJobId !== null && lastJobId !== current.id) {
                    slices.push({ jobId: -2, name: 'SWITCH', start: clock, end: clock + contextSwitch, kind: 'switch' });
                    clock += contextSwitch;
                }

                if (current.firstStart === -1) current.firstStart = clock;

                // Find next event: either current job finishes, or a new job arrives
                const nextArr = getNextArrival();
                let runDuration = current.remaining;
                let preemptedByArrival = false;

                if (nextArr !== null && nextArr > clock && (clock + runDuration) > nextArr) {
                    // Check if arriving job will have strictly less remaining time
                    runDuration = nextArr - clock;
                    preemptedByArrival = true;
                }

                const startTime = clock;
                const endTime = clock + runDuration;
                const remainingBefore = current.remaining;
                current.remaining -= runDuration;

                slices.push({
                    jobId: current.id,
                    name: current.name,
                    start: startTime,
                    end: endTime,
                    kind: 'run',
                    remainingBefore,
                    remainingAfter: current.remaining
                });

                clock = endTime;
                lastJobId = current.id;

                if (current.remaining === 0) {
                    current.completedAt = clock;
                    completedCount++;
                    readyQueue.shift(); // remove completed
                    logDecision(startTime, 'Job Completed', `${current.name} completed execution at t = ${clock}.`, current, readyQueue);
                } else if (preemptedByArrival) {
                    logDecision(startTime, 'Executed Time Slice', `${current.name} ran from t=${startTime} to t=${endTime}. Evaluating arriving job at t=${clock}.`, current, readyQueue);
                }
            }
            break;
        }

        case AlgorithmType.PRIORITY_NP: {
            while (completedCount < totalJobs && safetyCounter++ < maxSafetySteps) {
                for (const j of simJobs) {
                    if (!j.hasArrived && j.arrival <= clock) {
                        j.hasArrived = true;
                        readyQueue.push(j);
                    }
                }

                if (readyQueue.length === 0) {
                    const nextArr = getNextArrival();
                    if (nextArr !== null && nextArr > clock) {
                        slices.push({ jobId: -1, name: 'IDLE', start: clock, end: nextArr, kind: 'idle' });
                        logDecision(clock, 'CPU Idle', `No jobs ready. Idling until t = ${nextArr}.`);
                        clock = nextArr;
                    }
                    continue;
                }

                applyAging(clock);

                readyQueue.sort((a, b) => {
                    const pDiff = comparePriorities(a.effectivePriority, b.effectivePriority);
                    if (pDiff !== 0) return pDiff;
                    return (a.arrival - b.arrival) || (a.id - b.id);
                });

                const current = readyQueue.shift();

                if (contextSwitch > 0 && lastJobId !== null && lastJobId !== current.id) {
                    slices.push({ jobId: -2, name: 'SWITCH', start: clock, end: clock + contextSwitch, kind: 'switch' });
                    clock += contextSwitch;
                }

                if (current.firstStart === -1) current.firstStart = clock;
                const startTime = clock;
                const endTime = clock + current.remaining;

                slices.push({
                    jobId: current.id,
                    name: current.name,
                    start: startTime,
                    end: endTime,
                    kind: 'run',
                    remainingBefore: current.remaining,
                    remainingAfter: 0
                });

                logDecision(startTime, 'Dispatched Priority NP', `Selected ${current.name} with priority ${current.effectivePriority}.`, current, readyQueue);

                clock = endTime;
                current.remaining = 0;
                current.completedAt = clock;
                completedCount++;
                lastJobId = current.id;
            }
            break;
        }

        case AlgorithmType.PRIORITY_P: {
            while (completedCount < totalJobs && safetyCounter++ < maxSafetySteps) {
                for (const j of simJobs) {
                    if (!j.hasArrived && j.arrival <= clock) {
                        j.hasArrived = true;
                        readyQueue.push(j);
                    }
                }

                if (readyQueue.length === 0) {
                    const nextArr = getNextArrival();
                    if (nextArr !== null && nextArr > clock) {
                        slices.push({ jobId: -1, name: 'IDLE', start: clock, end: nextArr, kind: 'idle' });
                        logDecision(clock, 'CPU Idle', `No ready jobs. Idling until t = ${nextArr}.`);
                        clock = nextArr;
                    }
                    continue;
                }

                applyAging(clock);

                readyQueue.sort((a, b) => {
                    const pDiff = comparePriorities(a.effectivePriority, b.effectivePriority);
                    if (pDiff !== 0) return pDiff;
                    return (a.arrival - b.arrival) || (a.id - b.id);
                });

                const current = readyQueue[0];

                if (contextSwitch > 0 && lastJobId !== null && lastJobId !== current.id) {
                    slices.push({ jobId: -2, name: 'SWITCH', start: clock, end: clock + contextSwitch, kind: 'switch' });
                    clock += contextSwitch;
                }

                if (current.firstStart === -1) current.firstStart = clock;

                const nextArr = getNextArrival();
                let runDuration = current.remaining;
                let preemptCheck = false;

                if (nextArr !== null && nextArr > clock && (clock + runDuration) > nextArr) {
                    runDuration = nextArr - clock;
                    preemptCheck = true;
                }

                const startTime = clock;
                const endTime = clock + runDuration;
                const remBefore = current.remaining;
                current.remaining -= runDuration;

                slices.push({
                    jobId: current.id,
                    name: current.name,
                    start: startTime,
                    end: endTime,
                    kind: 'run',
                    remainingBefore: remBefore,
                    remainingAfter: current.remaining
                });

                clock = endTime;
                lastJobId = current.id;

                if (current.remaining === 0) {
                    current.completedAt = clock;
                    completedCount++;
                    readyQueue.shift();
                    logDecision(startTime, 'Job Completed', `${current.name} completed execution at t = ${clock}.`, current, readyQueue);
                } else if (preemptCheck) {
                    logDecision(startTime, 'Slice Preemption Check', `Job ${current.name} ran until arrival at t = ${clock}. Re-evaluating priorities.`, current, readyQueue);
                }
            }
            break;
        }

        case AlgorithmType.RR: {
            // Round Robin with PRD rule:
            // "A job arriving at the same instant a quantum expires is enqueued BEFORE the preempted job"
            while (completedCount < totalJobs && safetyCounter++ < maxSafetySteps) {
                // Initial arrivals at or before current clock
                for (const j of simJobs) {
                    if (!j.hasArrived && j.arrival <= clock) {
                        j.hasArrived = true;
                        readyQueue.push(j);
                    }
                }

                if (readyQueue.length === 0) {
                    const nextArr = getNextArrival();
                    if (nextArr !== null && nextArr > clock) {
                        slices.push({ jobId: -1, name: 'IDLE', start: clock, end: nextArr, kind: 'idle' });
                        logDecision(clock, 'CPU Idle', `Round Robin ready queue empty. Idling until t = ${nextArr}.`);
                        clock = nextArr;
                        for (const j of simJobs) {
                            if (!j.hasArrived && j.arrival <= clock) {
                                j.hasArrived = true;
                                readyQueue.push(j);
                            }
                        }
                    }
                    continue;
                }

                const current = readyQueue.shift();

                if (contextSwitch > 0 && lastJobId !== null && lastJobId !== current.id) {
                    slices.push({ jobId: -2, name: 'SWITCH', start: clock, end: clock + contextSwitch, kind: 'switch' });
                    clock += contextSwitch;
                }

                if (current.firstStart === -1) current.firstStart = clock;

                const runDuration = Math.min(quantum, current.remaining);
                const startTime = clock;
                const endTime = clock + runDuration;
                const remBefore = current.remaining;
                current.remaining -= runDuration;

                slices.push({
                    jobId: current.id,
                    name: current.name,
                    start: startTime,
                    end: endTime,
                    kind: 'run',
                    remainingBefore: remBefore,
                    remainingAfter: current.remaining
                });

                clock = endTime;
                lastJobId = current.id;

                // CRITICAL PRD TIE-BREAKING:
                // Arriving jobs during or at the exact instant the quantum ends are enqueued BEFORE the preempted job.
                for (const j of simJobs) {
                    if (!j.hasArrived && j.arrival <= clock) {
                        j.hasArrived = true;
                        readyQueue.push(j);
                    }
                }

                if (current.remaining === 0) {
                    current.completedAt = clock;
                    completedCount++;
                    logDecision(startTime, 'RR Completed', `${current.name} completed burst within quantum [${startTime} -> ${endTime}].`, current, readyQueue);
                } else {
                    // Preempted job goes back to the rear of queue
                    readyQueue.push(current);
                    logDecision(startTime, 'RR Quantum Expired', `${current.name} time slice expired. Re-enqueued with remaining burst ${current.remaining}.`, current, readyQueue);
                }
            }
            break;
        }

        case AlgorithmType.EDF_NP: {
            while (completedCount < totalJobs && safetyCounter++ < maxSafetySteps) {
                for (const j of simJobs) {
                    if (!j.hasArrived && j.arrival <= clock) {
                        j.hasArrived = true;
                        readyQueue.push(j);
                    }
                }

                if (readyQueue.length === 0) {
                    const nextArr = getNextArrival();
                    if (nextArr !== null && nextArr > clock) {
                        slices.push({ jobId: -1, name: 'IDLE', start: clock, end: nextArr, kind: 'idle' });
                        logDecision(clock, 'CPU Idle', `No ready real-time tasks. Idling until t = ${nextArr}.`);
                        clock = nextArr;
                    }
                    continue;
                }

                // Sort by deadline, then arrival, then ID
                readyQueue.sort((a, b) => {
                    const dA = a.deadline >= 0 ? a.deadline : Infinity;
                    const dB = b.deadline >= 0 ? b.deadline : Infinity;
                    if (dA !== dB) return dA - dB;
                    return (a.arrival - b.arrival) || (a.id - b.id);
                });

                const current = readyQueue.shift();

                if (contextSwitch > 0 && lastJobId !== null && lastJobId !== current.id) {
                    slices.push({ jobId: -2, name: 'SWITCH', start: clock, end: clock + contextSwitch, kind: 'switch' });
                    clock += contextSwitch;
                }

                if (current.firstStart === -1) current.firstStart = clock;
                const startTime = clock;
                const endTime = clock + current.remaining;

                slices.push({
                    jobId: current.id,
                    name: current.name,
                    start: startTime,
                    end: endTime,
                    kind: 'run',
                    remainingBefore: current.remaining,
                    remainingAfter: 0
                });

                logDecision(startTime, 'EDF NP Dispatched', `Selected ${current.name} with earliest deadline ${current.deadline}.`, current, readyQueue);

                clock = endTime;
                current.remaining = 0;
                current.completedAt = clock;
                completedCount++;
                lastJobId = current.id;
            }
            break;
        }

        case AlgorithmType.EDF_P: {
            while (completedCount < totalJobs && safetyCounter++ < maxSafetySteps) {
                for (const j of simJobs) {
                    if (!j.hasArrived && j.arrival <= clock) {
                        j.hasArrived = true;
                        readyQueue.push(j);
                    }
                }

                if (readyQueue.length === 0) {
                    const nextArr = getNextArrival();
                    if (nextArr !== null && nextArr > clock) {
                        slices.push({ jobId: -1, name: 'IDLE', start: clock, end: nextArr, kind: 'idle' });
                        logDecision(clock, 'CPU Idle', `No ready jobs. Idling until t = ${nextArr}.`);
                        clock = nextArr;
                    }
                    continue;
                }

                readyQueue.sort((a, b) => {
                    const dA = a.deadline >= 0 ? a.deadline : Infinity;
                    const dB = b.deadline >= 0 ? b.deadline : Infinity;
                    if (dA !== dB) return dA - dB;
                    return (a.arrival - b.arrival) || (a.id - b.id);
                });

                const current = readyQueue[0];

                if (contextSwitch > 0 && lastJobId !== null && lastJobId !== current.id) {
                    slices.push({ jobId: -2, name: 'SWITCH', start: clock, end: clock + contextSwitch, kind: 'switch' });
                    clock += contextSwitch;
                }

                if (current.firstStart === -1) current.firstStart = clock;

                const nextArr = getNextArrival();
                let runDuration = current.remaining;
                let preemptCheck = false;

                if (nextArr !== null && nextArr > clock && (clock + runDuration) > nextArr) {
                    runDuration = nextArr - clock;
                    preemptCheck = true;
                }

                const startTime = clock;
                const endTime = clock + runDuration;
                const remBefore = current.remaining;
                current.remaining -= runDuration;

                slices.push({
                    jobId: current.id,
                    name: current.name,
                    start: startTime,
                    end: endTime,
                    kind: 'run',
                    remainingBefore: remBefore,
                    remainingAfter: current.remaining
                });

                clock = endTime;
                lastJobId = current.id;

                if (current.remaining === 0) {
                    current.completedAt = clock;
                    completedCount++;
                    readyQueue.shift();
                    logDecision(startTime, 'EDF Completed', `${current.name} finished at t = ${clock} (Deadline: ${current.deadline}).`, current, readyQueue);
                } else if (preemptCheck) {
                    logDecision(startTime, 'EDF Preemption Check', `${current.name} time slice reached arrival at t = ${clock}. Re-evaluating deadlines.`, current, readyQueue);
                }
            }
            break;
        }

        default:
            throw new Error(`Unsupported algorithm type: ${algorithm}`);
    }

    return {
        algorithm,
        metadata: ALGORITHM_METADATA[algorithm],
        options: { quantum, contextSwitch, lowerIsHigher, agingInterval, agingStep },
        rawJobs: jobs,
        simJobs,
        trace: slices,
        decisions,
        makespan: clock
    };
}
