/**
 * Interactive Playback & Step-by-Step Simulation Controller
 * Compliant with PRD Section 3.5 (FR-GC-05) and Section 3.6 (FR-DB-06)
 * - Timeline playback: Play, Pause, Step Forward, Step Backward, Scrub
 * - Live Ready Queue visualization at time `t`
 * - Active CPU state monitor (Running Job, Idle, or Switch overhead)
 * - Scheduler Decision Log inspector (explaining why each decision was reached)
 */

export class PlaybackController {
    constructor(callbacks = {}) {
        this.currentTime = 0;
        this.maxTime = 0;
        this.isPlaying = false;
        this.playbackSpeed = 1.0; // multiplier
        this.baseIntervalMs = 700; // ms per time unit
        this.timer = null;
        this.data = null;
        this.callbacks = {
            onTick: null,
            onStateChange: null,
            ...callbacks
        };
    }

    loadSimulation(simResult, metrics) {
        this.stop();
        this.data = {
            rawJobs: simResult.rawJobs,
            trace: simResult.trace,
            decisions: simResult.decisions,
            algorithm: simResult.algorithm,
            metadata: simResult.metadata,
            options: simResult.options,
            makespan: simResult.makespan,
            metrics: metrics
        };
        this.maxTime = simResult.makespan;
        this.currentTime = 0;
        this.notifyState();
    }

    setSpeed(speedMultiplier) {
        this.playbackSpeed = Math.max(0.2, Number(speedMultiplier) || 1.0);
        if (this.isPlaying) {
            this.pause();
            this.play();
        }
    }

    play() {
        if (!this.data || this.isPlaying) return;
        if (this.currentTime >= this.maxTime) {
            this.currentTime = 0;
        }
        this.isPlaying = true;
        this.notifyState();

        const step = () => {
            if (!this.isPlaying) return;
            if (this.currentTime < this.maxTime) {
                this.currentTime++;
                this.notifyTick();
                const interval = Math.max(80, this.baseIntervalMs / this.playbackSpeed);
                this.timer = setTimeout(step, interval);
            } else {
                this.pause();
            }
        };

        const interval = Math.max(80, this.baseIntervalMs / this.playbackSpeed);
        this.timer = setTimeout(step, interval);
    }

    pause() {
        this.isPlaying = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.notifyState();
    }

    stop() {
        this.pause();
        this.currentTime = 0;
        this.notifyTick();
    }

    stepForward() {
        if (!this.data) return;
        this.pause();
        if (this.currentTime < this.maxTime) {
            this.currentTime++;
            this.notifyTick();
        }
    }

    stepBackward() {
        if (!this.data) return;
        this.pause();
        if (this.currentTime > 0) {
            this.currentTime--;
            this.notifyTick();
        }
    }

    seek(time) {
        if (!this.data) return;
        this.currentTime = Math.max(0, Math.min(this.maxTime, Number(time) || 0));
        this.notifyTick();
    }

    notifyTick() {
        const snapshot = this.getSystemStateAt(this.currentTime);
        if (this.callbacks.onTick) {
            this.callbacks.onTick(this.currentTime, snapshot);
        }
    }

    notifyState() {
        if (this.callbacks.onStateChange) {
            this.callbacks.onStateChange({
                isPlaying: this.isPlaying,
                currentTime: this.currentTime,
                maxTime: this.maxTime,
                speed: this.playbackSpeed
            });
        }
        this.notifyTick();
    }

    /**
     * Reconstructs exact CPU and ready queue state at time `t`
     */
    getSystemStateAt(t) {
        if (!this.data) return null;

        const { trace, rawJobs, decisions } = this.data;

        // Find active slice running at time t
        // Slice is active if slice.start <= t < slice.end (or t === slice.end if at makespan)
        let activeSlice = trace.find(s => s.start <= t && (t < s.end || (t === this.maxTime && t === s.end)));

        // If t is exactly at a slice boundary and not makespan, pick the one starting at t
        const exactSlice = trace.find(s => s.start === t);
        if (exactSlice) {
            activeSlice = exactSlice;
        }

        // Calculate executed burst for all jobs up to time t
        const executedMap = new Map();
        rawJobs.forEach(j => executedMap.set(j.id, 0));

        trace.forEach(s => {
            if (s.jobId > 0) {
                if (s.end <= t) {
                    executedMap.set(s.jobId, executedMap.get(s.jobId) + (s.end - s.start));
                } else if (s.start < t && s.end > t) {
                    executedMap.set(s.jobId, executedMap.get(s.jobId) + (t - s.start));
                }
            }
        });

        // Compute job statuses at time t
        const readyQueue = [];
        const completedJobs = [];
        const futureJobs = [];
        let runningJob = null;

        rawJobs.forEach(job => {
            const exec = executedMap.get(job.id);
            const remaining = Math.max(0, job.burst - exec);

            if (job.arrival > t) {
                futureJobs.push({ ...job, remaining });
            } else if (remaining === 0) {
                completedJobs.push({ ...job, remaining });
            } else {
                // Either currently running on CPU or waiting in Ready Queue
                const isRunning = activeSlice && activeSlice.jobId === job.id;
                if (isRunning) {
                    runningJob = { ...job, remaining, currentSlice: activeSlice };
                } else {
                    readyQueue.push({ ...job, remaining });
                }
            }
        });

        // Find latest decision relevant to time <= t
        const relevantDecisions = decisions.filter(d => d.time <= t);
        const latestDecision = relevantDecisions.length > 0 ? relevantDecisions[relevantDecisions.length - 1] : null;

        return {
            time: t,
            activeSlice,
            runningJob,
            readyQueue,
            completedJobs,
            futureJobs,
            latestDecision,
            allDecisionsUpToNow: relevantDecisions
        };
    }
}
