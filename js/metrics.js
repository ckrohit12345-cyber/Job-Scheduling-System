/**
 * Performance Calculation Engine
 * Implements PRD Section 6 formulas for per-job and aggregate metrics.
 * The Execution Trace is the single source of truth.
 */

export function calculateMetrics(simulationResult) {
    const { rawJobs, trace, algorithm, makespan } = simulationResult;
    const n = rawJobs.length;

    if (n === 0 || trace.length === 0) {
        return {
            perJob: [],
            aggregates: {
                awt: 0,
                att: 0,
                art: 0,
                cpuUtilization: 0,
                throughput: 0,
                makespan: 0,
                totalBurst: 0,
                contextSwitches: 0,
                preemptions: 0,
                missedDeadlines: 0,
                maxLateness: 0
            }
        };
    }

    // Map each job to its trace records
    const jobStats = new Map();
    rawJobs.forEach(job => {
        jobStats.set(job.id, {
            id: job.id,
            name: job.name,
            arrival: job.arrival,
            burst: job.burst,
            priority: job.priority,
            deadline: job.deadline,
            firstStart: -1,
            completion: -1,
            slicesCount: 0,
            executedBurst: 0
        });
    });

    let contextSwitches = 0;
    let preemptions = 0;
    let prevJobId = null;

    // Scan trace
    for (let i = 0; i < trace.length; i++) {
        const slice = trace[i];

        // Context switch count: transition between different entities
        if (prevJobId !== null && slice.jobId !== prevJobId && slice.jobId > 0 && prevJobId > 0) {
            contextSwitches++;
        }

        if (slice.jobId > 0) {
            const stat = jobStats.get(slice.jobId);
            if (stat) {
                if (stat.firstStart === -1) {
                    stat.firstStart = slice.start;
                }
                stat.completion = slice.end;
                stat.slicesCount++;
                stat.executedBurst += (slice.end - slice.start);

                // Detect preemption if slice ended without remaining reaching 0
                if (slice.remainingAfter !== undefined && slice.remainingAfter > 0) {
                    preemptions++;
                }
            }
            prevJobId = slice.jobId;
        } else {
            // Idle or switch
            prevJobId = slice.jobId;
        }
    }

    // Compute Per-Job Metrics
    let sumWT = 0;
    let sumTAT = 0;
    let sumRT = 0;
    let totalBurst = 0;
    let missedDeadlines = 0;
    let maxLateness = 0;

    const perJob = rawJobs.map(job => {
        const stat = jobStats.get(job.id);
        const completion = stat ? stat.completion : job.arrival;
        const firstStart = stat && stat.firstStart !== -1 ? stat.firstStart : job.arrival;

        const turnaround = Math.max(0, completion - job.arrival);
        const waiting = Math.max(0, turnaround - job.burst);
        const response = Math.max(0, firstStart - job.arrival);

        sumWT += waiting;
        sumTAT += turnaround;
        sumRT += response;
        totalBurst += job.burst;

        let lateness = 0;
        let isMissed = false;
        let deadlineStatus = 'N/A';

        if (job.deadline >= 0) {
            lateness = completion - job.deadline;
            if (lateness > 0) {
                isMissed = true;
                missedDeadlines++;
                deadlineStatus = `Missed (+${lateness})`;
                if (lateness > maxLateness) maxLateness = lateness;
            } else {
                deadlineStatus = `Met (${Math.abs(lateness)} early)`;
            }
        }

        return {
            id: job.id,
            name: job.name,
            arrival: job.arrival,
            burst: job.burst,
            priority: job.priority,
            deadline: job.deadline,
            firstStart,
            completion,
            turnaround,
            waiting,
            response,
            lateness,
            isMissed,
            deadlineStatus,
            slicesCount: stat ? stat.slicesCount : 0
        };
    });

    const earliestArrival = Math.min(...rawJobs.map(j => j.arrival));
    const effectiveMakespan = Math.max(1, makespan - earliestArrival);
    const awt = Number((sumWT / n).toFixed(2));
    const att = Number((sumTAT / n).toFixed(2));
    const art = Number((sumRT / n).toFixed(2));
    const throughput = Number((n / effectiveMakespan).toFixed(3));
    const cpuUtilization = Number(((totalBurst / effectiveMakespan) * 100).toFixed(2));

    return {
        perJob,
        aggregates: {
            awt,
            att,
            art,
            cpuUtilization: Math.min(100, Math.max(0, cpuUtilization)),
            throughput,
            makespan,
            effectiveMakespan,
            totalBurst,
            contextSwitches,
            preemptions,
            missedDeadlines,
            maxLateness
        }
    };
}
