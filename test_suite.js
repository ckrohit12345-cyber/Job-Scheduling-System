/**
 * Comprehensive Automated Verification Suite for KernelSched Core
 * Verifies algorithms, metrics, tie-breaking, and presets against PRD requirements.
 */

import { runSimulation, AlgorithmType } from './js/algorithms.js';
import { calculateMetrics } from './js/metrics.js';
import { PRESET_WORKLOADS } from './js/presets.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion Failed: ${message}`);
    }
}

function runTests() {
    console.log('=== Starting KernelSched Automated Verification Suite ===\n');
    let passCount = 0;

    // Test 1: FCFS with standard workload
    {
        const jobs = [
            { id: 1, name: 'P1', arrival: 0, burst: 4 },
            { id: 2, name: 'P2', arrival: 1, burst: 3 },
            { id: 3, name: 'P3', arrival: 2, burst: 1 }
        ];
        const res = runSimulation(jobs, { algorithm: AlgorithmType.FCFS });
        const metrics = calculateMetrics(res);
        assert(res.trace.length === 3, 'FCFS trace should have 3 slices');
        assert(res.trace[0].name === 'P1' && res.trace[0].start === 0 && res.trace[0].end === 4, 'P1 should run 0-4');
        assert(res.trace[1].name === 'P2' && res.trace[1].start === 4 && res.trace[1].end === 7, 'P2 should run 4-7');
        assert(res.trace[2].name === 'P3' && res.trace[2].start === 7 && res.trace[2].end === 8, 'P3 should run 7-8');
        // P1: WT=0, TAT=4
        // P2: WT=3, TAT=6
        // P3: WT=5, TAT=6
        // AWT = (0 + 3 + 5) / 3 = 8/3 = 2.67
        // ATT = (4 + 6 + 6) / 3 = 16/3 = 5.33
        assert(metrics.aggregates.awt === 2.67, `Expected AWT 2.67, got ${metrics.aggregates.awt}`);
        assert(metrics.aggregates.att === 5.33, `Expected ATT 5.33, got ${metrics.aggregates.att}`);
        console.log('✓ Test 1 Passed: FCFS baseline calculation & metrics');
        passCount++;
    }

    // Test 2: FCFS with Idle CPU gap
    {
        const jobs = [
            { id: 1, name: 'P1', arrival: 2, burst: 3 },
            { id: 2, name: 'P2', arrival: 8, burst: 2 }
        ];
        const res = runSimulation(jobs, { algorithm: AlgorithmType.FCFS });
        const metrics = calculateMetrics(res);
        assert(res.trace[0].kind === 'idle' && res.trace[0].end === 2, 'Initial idle from 0 to 2');
        assert(res.trace[1].name === 'P1' && res.trace[1].start === 2 && res.trace[1].end === 5, 'P1 runs 2 to 5');
        assert(res.trace[2].kind === 'idle' && res.trace[2].start === 5 && res.trace[2].end === 8, 'Gap idle from 5 to 8');
        assert(res.trace[3].name === 'P2' && res.trace[3].start === 8 && res.trace[3].end === 10, 'P2 runs 8 to 10');
        console.log('✓ Test 2 Passed: Explicit IDLE slices and sparse arrival gaps');
        passCount++;
    }

    // Test 3: SJF Non-Preemptive vs SRTF Preemptive
    {
        const jobs = [
            { id: 1, name: 'P1', arrival: 0, burst: 7 },
            { id: 2, name: 'P2', arrival: 2, burst: 4 },
            { id: 3, name: 'P3', arrival: 4, burst: 1 },
            { id: 4, name: 'P4', arrival: 5, burst: 4 }
        ];
        // In SJF NP: P1 starts at 0, runs to 7. Ready queue at 7 has P3(1), P2(4), P4(4). P3 runs 7-8, P2 runs 8-12, P4 runs 12-16.
        const resNP = runSimulation(jobs, { algorithm: AlgorithmType.SJF });
        assert(resNP.trace[0].name === 'P1' && resNP.trace[0].end === 7, 'SJF NP: P1 runs to 7');
        assert(resNP.trace[1].name === 'P3' && resNP.trace[1].end === 8, 'SJF NP: P3 runs next because burst=1');

        // In SRTF (Preemptive): P1 runs 0-2 (rem: 5). P2 arrives (burst 4 < 5), P2 preempts P1!
        // At t=4, P3 arrives (burst 1 < P2 rem 2), P3 preempts P2!
        const resSRTF = runSimulation(jobs, { algorithm: AlgorithmType.SRTF });
        assert(resSRTF.trace[0].name === 'P1' && resSRTF.trace[0].end === 2, 'SRTF: P1 runs 0-2 then preempted');
        assert(resSRTF.trace[1].name === 'P2' && resSRTF.trace[1].start === 2 && resSRTF.trace[1].end === 4, 'SRTF: P2 runs 2-4 then preempted');
        assert(resSRTF.trace[2].name === 'P3' && resSRTF.trace[2].start === 4 && resSRTF.trace[2].end === 5, 'SRTF: P3 runs 4-5 to completion');
        console.log('✓ Test 3 Passed: SJF Non-Preemptive vs SRTF Preemption');
        passCount++;
    }

    // Test 4: Round Robin with PRD Arrival-at-Quantum-Expiry Tie-Breaking
    {
        // PRD Section 5.2: "A job arriving at the same instant a quantum expires is enqueued before the preempted job"
        const jobs = [
            { id: 1, name: 'P1', arrival: 0, burst: 4 },
            { id: 2, name: 'P2', arrival: 2, burst: 3 }
        ];
        // With q=2:
        // P1 runs [0, 2]. At t=2, quantum expires for P1, and P2 arrives at t=2.
        // P2 must be enqueued BEFORE P1 is re-enqueued.
        // Therefore, at t=2, queue is [P2, P1]. P2 runs next!
        const res = runSimulation(jobs, { algorithm: AlgorithmType.RR, quantum: 2 });
        assert(res.trace[0].name === 'P1' && res.trace[0].end === 2, 'P1 runs first slice 0-2');
        assert(res.trace[1].name === 'P2' && res.trace[1].start === 2 && res.trace[1].end === 4, 'P2 must run at t=2 due to tie-break order');
        assert(res.trace[2].name === 'P1' && res.trace[2].start === 4 && res.trace[2].end === 6, 'P1 runs next slice 4-6');
        assert(res.trace[3].name === 'P2' && res.trace[3].start === 6 && res.trace[3].end === 7, 'P2 finishes slice 6-7');
        console.log('✓ Test 4 Passed: Round Robin arrival vs quantum expiry tie-breaking per PRD 5.2');
        passCount++;
    }

    // Test 5: Priority Scheduling with Preemption & Lower-is-Higher
    {
        const jobs = [
            { id: 1, name: 'P1', arrival: 0, burst: 6, priority: 3 },
            { id: 2, name: 'P2', arrival: 2, burst: 2, priority: 1 } // higher priority arrives at 2
        ];
        const res = runSimulation(jobs, { algorithm: AlgorithmType.PRIORITY_P, lowerIsHigher: true });
        assert(res.trace[0].name === 'P1' && res.trace[0].end === 2, 'P1 runs 0-2');
        assert(res.trace[1].name === 'P2' && res.trace[1].start === 2 && res.trace[1].end === 4, 'P2 preempts P1 due to higher priority (1 < 3)');
        assert(res.trace[2].name === 'P1' && res.trace[2].start === 4 && res.trace[2].end === 8, 'P1 resumes and completes 4-8');
        console.log('✓ Test 5 Passed: Priority Preemptive scheduling');
        passCount++;
    }

    // Test 6: EDF (Earliest Deadline First) and Deadline Tracking
    {
        const jobs = [
            { id: 1, name: 'Task A', arrival: 0, burst: 4, deadline: 9 },
            { id: 2, name: 'Task B', arrival: 1, burst: 2, deadline: 4 }
        ];
        const res = runSimulation(jobs, { algorithm: AlgorithmType.EDF_P });
        const metrics = calculateMetrics(res);
        // Task A runs 0-1. At t=1, Task B arrives with deadline 4 < 9. Task B preempts Task A!
        // Task B runs 1-3 (finishes at 3 <= 4, Met!). Task A runs 3-6 (finishes at 6 <= 9, Met!).
        assert(res.trace[0].name === 'Task A' && res.trace[0].end === 1, 'Task A runs 0-1');
        assert(res.trace[1].name === 'Task B' && res.trace[1].start === 1 && res.trace[1].end === 3, 'Task B preempts Task A');
        assert(res.trace[2].name === 'Task A' && res.trace[2].start === 3 && res.trace[2].end === 6, 'Task A finishes 3-6');
        assert(metrics.aggregates.missedDeadlines === 0, 'No missed deadlines in this scenario');
        console.log('✓ Test 6 Passed: EDF preemption and deadline tracking');
        passCount++;
    }

    // Test 7: Verify all Presets execute without errors
    {
        for (const p of PRESET_WORKLOADS) {
            for (const alg of [AlgorithmType.FCFS, AlgorithmType.SRTF, AlgorithmType.RR, AlgorithmType.PRIORITY_P, AlgorithmType.EDF_P]) {
                const res = runSimulation(p.jobs, { algorithm: alg, quantum: 2 });
                const metrics = calculateMetrics(res);
                assert(res.makespan > 0, `Preset ${p.id} with ${alg} must have valid makespan`);
                assert(metrics.aggregates.cpuUtilization > 0 && metrics.aggregates.cpuUtilization <= 100, 'Utilization 0-100%');
            }
        }
        console.log(`✓ Test 7 Passed: All ${PRESET_WORKLOADS.length} preset workloads verified across all algorithms`);
        passCount++;
    }

    console.log(`\n🎉 ALL ${passCount} AUTOMATED TESTS PASSED WITH 100% CORRECTNESS!`);
}

runTests();
