/**
 * Main Application Orchestrator (Linear/Raycast Spec)
 * Coordinates 100vh Zero-Scroll Layout, Drawer Collapses, Command Palette,
 * Fit-to-Width Gantt Canvas, and Benchmarks.
 */

import { AlgorithmType, ALGORITHM_METADATA, runSimulation } from './algorithms.js';
import { calculateMetrics } from './metrics.js';
import { GanttChartRenderer, getJobColor } from './gantt.js';
import { PlaybackController } from './playback.js';
import { PRESET_WORKLOADS } from './presets.js';
import { exportResultsCSV, exportSimulationJSON, printPDFReport } from './export.js';

class LinearSchedulerApp {
    constructor() {
        this.workload = [
            { id: 1, name: 'P1', arrival: 0, burst: 5, priority: 2, deadline: 14 },
            { id: 2, name: 'P2', arrival: 1, burst: 3, priority: 1, deadline: 7 },
            { id: 3, name: 'P3', arrival: 2, burst: 8, priority: 4, deadline: 20 },
            { id: 4, name: 'P4', arrival: 3, burst: 4, priority: 3, deadline: 11 }
        ];

        this.selectedAlgorithm = AlgorithmType.RR;
        this.quantum = 2;
        this.contextSwitch = 0;
        this.isDrawerOpen = true;
        this.isBottomExpanded = true;
        this.activeBottomTab = 'matrix'; // 'matrix' | 'benchmark'

        this.currentSimulation = null;
        this.currentMetrics = null;
        this.compareResults = [];

        this.ganttRenderer = null;
        this.playback = null;

        this.init();
    }

    init() {
        // Initialize Fit-to-Width Gantt Renderer
        const ganttContainer = document.getElementById('gantt-chart-container');
        this.ganttRenderer = new GanttChartRenderer(ganttContainer, {
            mergeContiguous: true,
            onSelectJob: (jobId) => this.highlightJob(jobId)
        });

        // Initialize Playback Controller
        this.playback = new PlaybackController({
            onTick: (time, snapshot) => this.handlePlaybackTick(time, snapshot),
            onStateChange: (state) => this.handlePlaybackStateChange(state)
        });

        this.setupDOM();
        this.renderDrawerJobs();
        this.runCurrentSimulation();
        this.setupKeyboardShortcuts();
    }

    setupDOM() {
        // Drawer Toggle (Cmd + B)
        const toggleDrawerBtn = document.getElementById('btn-toggle-drawer');
        const drawerEl = document.getElementById('config-drawer');
        toggleDrawerBtn?.addEventListener('click', () => {
            this.isDrawerOpen = !this.isDrawerOpen;
            if (this.isDrawerOpen) {
                drawerEl.classList.remove('collapsed');
            } else {
                drawerEl.classList.add('collapsed');
            }
        });

        // Bottom Panel Toggle
        const toggleBottomBtn = document.getElementById('btn-toggle-bottom');
        const bottomPanelEl = document.getElementById('bottom-panel');
        toggleBottomBtn?.addEventListener('click', () => {
            this.isBottomExpanded = !this.isBottomExpanded;
            if (this.isBottomExpanded) {
                bottomPanelEl.classList.remove('collapsed');
                toggleBottomBtn.textContent = '▼';
            } else {
                bottomPanelEl.classList.add('collapsed');
                toggleBottomBtn.textContent = '▲';
            }
        });

        // Bottom Tabs (Job Matrix vs Benchmark)
        const tabMatrixBtn = document.getElementById('tab-btn-matrix');
        const tabBenchBtn = document.getElementById('tab-btn-benchmark');
        const viewMatrix = document.getElementById('view-job-matrix');
        const viewBench = document.getElementById('view-benchmark-matrix');

        tabMatrixBtn?.addEventListener('click', () => {
            this.activeBottomTab = 'matrix';
            tabMatrixBtn.classList.add('active');
            tabBenchBtn.classList.remove('active');
            viewMatrix.style.display = 'block';
            viewBench.style.display = 'none';
            if (!this.isBottomExpanded) toggleBottomBtn.click();
        });

        tabBenchBtn?.addEventListener('click', () => {
            this.activeBottomTab = 'benchmark';
            tabBenchBtn.classList.add('active');
            tabMatrixBtn.classList.remove('active');
            viewMatrix.style.display = 'none';
            viewBench.style.display = 'block';
            if (!this.isBottomExpanded) toggleBottomBtn.click();
            this.runBenchmark();
        });

        // Algorithm Pills
        const algoPills = document.querySelectorAll('.algo-pill-btn');
        algoPills.forEach(pill => {
            pill.addEventListener('click', () => {
                algoPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.selectedAlgorithm = pill.dataset.algo;

                // Toggle quantum input visibility
                const meta = ALGORITHM_METADATA[this.selectedAlgorithm] || {};
                const qGroup = document.getElementById('param-group-quantum');
                if (qGroup) qGroup.style.display = meta.needsQuantum ? 'flex' : 'none';

                this.runCurrentSimulation();
            });
        });

        // Quantum & CS Inputs
        const qInput = document.getElementById('param-quantum');
        qInput?.addEventListener('change', (e) => {
            this.quantum = Math.max(1, parseInt(e.target.value) || 2);
            e.target.value = this.quantum;
            this.runCurrentSimulation();
        });

        const csInput = document.getElementById('param-context-switch');
        csInput?.addEventListener('change', (e) => {
            this.contextSwitch = Math.max(0, parseInt(e.target.value) || 0);
            e.target.value = this.contextSwitch;
            this.runCurrentSimulation();
        });

        // Preset selector
        const presetSelect = document.getElementById('preset-selector');
        presetSelect?.addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadPreset(e.target.value);
                e.target.value = '';
            }
        });

        // Theme Toggle
        const themeBtn = document.getElementById('theme-toggle-btn');
        themeBtn?.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            themeBtn.textContent = next === 'dark' ? '🌙' : '☀️';
        });

        // Playback Controls
        document.getElementById('btn-play-pause')?.addEventListener('click', () => {
            if (this.playback.isPlaying) this.playback.pause();
            else this.playback.play();
        });
        document.getElementById('btn-step-prev')?.addEventListener('click', () => this.playback.stepBackward());
        document.getElementById('btn-step-next')?.addEventListener('click', () => this.playback.stepForward());
        document.getElementById('btn-stop-playback')?.addEventListener('click', () => this.playback.stop());

        const scrubber = document.getElementById('playback-scrubber');
        scrubber?.addEventListener('input', (e) => this.playback.seek(Number(e.target.value)));

        // Speed Pills
        const speedBtns = document.querySelectorAll('.speed-opt-btn');
        speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                speedBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.playback.setSpeed(Number(btn.dataset.speed));
            });
        });

        // Drawer Actions
        document.getElementById('btn-add-job')?.addEventListener('click', () => this.addJob());
        document.getElementById('btn-open-bulk-modal')?.addEventListener('click', () => {
            document.getElementById('modal-bulk-paste').classList.add('open');
        });
        document.getElementById('btn-close-bulk-modal')?.addEventListener('click', () => {
            document.getElementById('modal-bulk-paste').classList.remove('open');
        });
        document.getElementById('btn-apply-bulk-paste')?.addEventListener('click', () => {
            const text = document.getElementById('bulk-paste-textarea').value.trim();
            if (this.parseBulk(text)) {
                document.getElementById('modal-bulk-paste').classList.remove('open');
            }
        });

        document.getElementById('btn-open-random-modal')?.addEventListener('click', () => {
            document.getElementById('modal-random-gen').classList.add('open');
        });
        document.getElementById('btn-close-random-modal')?.addEventListener('click', () => {
            document.getElementById('modal-random-gen').classList.remove('open');
        });
        document.getElementById('btn-apply-random-gen')?.addEventListener('click', () => {
            this.generateRandom();
            document.getElementById('modal-random-gen').classList.remove('open');
        });

        // Export Buttons
        document.getElementById('btn-export-csv-results')?.addEventListener('click', () => {
            if (this.currentSimulation && this.currentMetrics) exportResultsCSV(this.currentSimulation, this.currentMetrics);
        });
        document.getElementById('btn-export-json')?.addEventListener('click', () => {
            if (this.currentSimulation && this.currentMetrics) exportSimulationJSON(this.currentSimulation, this.currentMetrics);
        });
        document.getElementById('btn-print-report')?.addEventListener('click', () => printPDFReport());

        // Setup Command Palette Modal
        this.setupCommandPalette();
    }

    setupCommandPalette() {
        const modal = document.getElementById('cmd-palette-modal');
        const triggerBtn = document.getElementById('btn-trigger-cmd');
        const input = document.getElementById('cmd-palette-input');
        const list = document.getElementById('cmd-palette-list');

        const commands = [
            { cat: 'Algorithm', label: 'Run Round Robin (RR)', action: () => this.selectAlgorithm('RR') },
            { cat: 'Algorithm', label: 'Run SRTF (Shortest Remaining Time First)', action: () => this.selectAlgorithm('SRTF') },
            { cat: 'Algorithm', label: 'Run FCFS (First-Come, First-Served)', action: () => this.selectAlgorithm('FCFS') },
            { cat: 'Algorithm', label: 'Run SJF (Non-Preemptive)', action: () => this.selectAlgorithm('SJF') },
            { cat: 'Algorithm', label: 'Run Priority (Preemptive)', action: () => this.selectAlgorithm('PRIORITY_P') },
            { cat: 'Algorithm', label: 'Run EDF (Earliest Deadline First - Preemptive)', action: () => this.selectAlgorithm('EDF_P') },

            { cat: 'Preset', label: 'Load: Convoy Effect (FCFS Anomaly)', action: () => this.loadPreset('convoy_effect') },
            { cat: 'Preset', label: 'Load: Classic Textbook Case', action: () => this.loadPreset('classic_textbook') },
            { cat: 'Preset', label: 'Load: SJF Starvation Demo', action: () => this.loadPreset('sjf_starvation') },
            { cat: 'Preset', label: 'Load: EDF Real-Time Feasibility', action: () => this.loadPreset('edf_realtime') },

            { cat: 'View', label: 'Toggle Configurator Drawer (⌘B)', action: () => document.getElementById('btn-toggle-drawer')?.click() },
            { cat: 'View', label: 'Toggle Theme (Dark / Light Mode)', action: () => document.getElementById('theme-toggle-btn')?.click() },
            { cat: 'Export', label: 'Export Results to CSV', action: () => document.getElementById('btn-export-csv-results')?.click() },
            { cat: 'Export', label: 'Print Executive Summary PDF', action: () => document.getElementById('btn-print-report')?.click() }
        ];

        const renderList = (filterText = '') => {
            list.innerHTML = '';
            const filtered = commands.filter(c => c.label.toLowerCase().includes(filterText.toLowerCase()) || c.cat.toLowerCase().includes(filterText.toLowerCase()));
            filtered.forEach(c => {
                const row = document.createElement('div');
                row.className = 'cmd-item-row';
                row.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="cmd-badge" style="color: var(--text-dim);">${c.cat}</span>
                        <span>${c.label}</span>
                    </div>
                    <span class="cmd-badge" style="opacity: 0.6;">↵</span>
                `;
                row.addEventListener('click', () => {
                    c.action();
                    modal.classList.remove('open');
                });
                list.appendChild(row);
            });
        };

        triggerBtn?.addEventListener('click', () => {
            modal.classList.add('open');
            input.value = '';
            renderList('');
            input.focus();
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('open');
        });

        input?.addEventListener('input', (e) => renderList(e.target.value));

        window.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                triggerBtn?.click();
            }
            if (e.key === 'Escape' && modal.classList.contains('open')) {
                modal.classList.remove('open');
            }
        });
    }

    setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            const isCmdOrCtrl = e.metaKey || e.ctrlKey;
            if (isCmdOrCtrl && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                document.getElementById('btn-toggle-drawer')?.click();
            }
            if (e.key === ' ' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                document.getElementById('btn-play-pause')?.click();
            }
            if (e.key === 'ArrowRight' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                this.playback.stepForward();
            }
            if (e.key === 'ArrowLeft' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                this.playback.stepBackward();
            }
        });
    }

    selectAlgorithm(algo) {
        const btn = document.querySelector(`.algo-pill-btn[data-algo="${algo}"]`);
        if (btn) btn.click();
    }

    loadPreset(presetId) {
        const p = PRESET_WORKLOADS.find(x => x.id === presetId);
        if (!p) return;
        this.workload = JSON.parse(JSON.stringify(p.jobs));
        if (p.recommendedAlgorithm) this.selectAlgorithm(p.recommendedAlgorithm);
        this.renderDrawerJobs();
        this.runCurrentSimulation();
    }

    renderDrawerJobs() {
        const container = document.getElementById('drawer-jobs-list');
        const countBadge = document.getElementById('drawer-job-count');
        if (!container) return;
        container.innerHTML = '';
        if (countBadge) countBadge.textContent = `${this.workload.length} ${this.workload.length === 1 ? 'job' : 'jobs'}`;

        this.workload.forEach((job, idx) => {
            const card = document.createElement('div');
            card.className = 'job-item-card';
            const color = getJobColor(job.id);

            card.innerHTML = `
                <div class="job-item-top">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="job-color-dot" style="background: ${color.bg};"></span>
                        <input type="text" class="job-name-inp" value="${job.name}" data-idx="${idx}" data-field="name">
                    </div>
                    <button class="btn-mini" style="padding: 1px 4px; font-size: 0.65rem;" data-del="${idx}" title="Delete Job">✕</button>
                </div>
                <div class="job-fields-grid">
                    <div class="field-col">
                        <span class="field-label">Arr</span>
                        <input type="number" min="0" value="${job.arrival}" class="field-input" data-idx="${idx}" data-field="arrival">
                    </div>
                    <div class="field-col">
                        <span class="field-label">Burst</span>
                        <input type="number" min="1" value="${job.burst}" class="field-input" data-idx="${idx}" data-field="burst">
                    </div>
                    <div class="field-col">
                        <span class="field-label">Prio</span>
                        <input type="number" value="${job.priority || 0}" class="field-input" data-idx="${idx}" data-field="priority">
                    </div>
                    <div class="field-col">
                        <span class="field-label">Dline</span>
                        <input type="number" placeholder="—" value="${job.deadline >= 0 ? job.deadline : ''}" class="field-input" data-idx="${idx}" data-field="deadline">
                    </div>
                </div>
            `;

            // Input handlers
            card.querySelectorAll('input').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    const i = Number(e.target.dataset.idx);
                    const f = e.target.dataset.field;
                    let v = e.target.value.trim();
                    if (f === 'arrival') this.workload[i].arrival = Math.max(0, parseInt(v) || 0);
                    else if (f === 'burst') this.workload[i].burst = Math.max(1, parseInt(v) || 1);
                    else if (f === 'priority') this.workload[i].priority = parseInt(v) || 0;
                    else if (f === 'deadline') this.workload[i].deadline = v === '' ? -1 : Math.max(0, parseInt(v) || 0);
                    else if (f === 'name') this.workload[i].name = v || `P${this.workload[i].id}`;
                });
                inp.addEventListener('change', () => this.runCurrentSimulation());
            });

            card.querySelector('[data-del]')?.addEventListener('click', () => {
                if (this.workload.length <= 1) return;
                this.workload.splice(idx, 1);
                this.renderDrawerJobs();
                this.runCurrentSimulation();
            });

            container.appendChild(card);
        });
    }

    addJob() {
        const nextId = this.workload.length > 0 ? Math.max(...this.workload.map(j => j.id)) + 1 : 1;
        const lastArr = this.workload[this.workload.length - 1]?.arrival || 0;
        this.workload.push({ id: nextId, name: `P${nextId}`, arrival: lastArr + 1, burst: 4, priority: 2, deadline: lastArr + 14 });
        this.renderDrawerJobs();
        this.runCurrentSimulation();
    }

    runCurrentSimulation() {
        try {
            const sim = runSimulation(this.workload, {
                algorithm: this.selectedAlgorithm,
                quantum: this.quantum,
                contextSwitch: this.contextSwitch
            });
            const metrics = calculateMetrics(sim);
            this.currentSimulation = sim;
            this.currentMetrics = metrics;

            // Render Top KPI Cards
            document.getElementById('kpi-awt').textContent = metrics.aggregates.awt.toFixed(2);
            document.getElementById('kpi-att').textContent = metrics.aggregates.att.toFixed(2);
            document.getElementById('kpi-throughput').textContent = metrics.aggregates.throughput.toFixed(3);
            document.getElementById('kpi-util').textContent = `${metrics.aggregates.cpuUtilization.toFixed(1)}%`;

            // Render Fit-to-Width Gantt Chart
            this.ganttRenderer.render({
                trace: sim.trace,
                rawJobs: sim.rawJobs,
                makespan: sim.makespan
            });

            // Initialize Playback
            this.playback.loadSimulation(sim, metrics);
            const scrubber = document.getElementById('playback-scrubber');
            const maxLabel = document.getElementById('playback-max-time');
            if (scrubber) scrubber.max = sim.makespan;
            if (maxLabel) maxLabel.textContent = `${sim.makespan}`;

            // Render Per-Job Matrix Table
            this.renderMatrixTable(metrics.perJob);

            // Re-run benchmark if benchmark tab is active
            if (this.activeBottomTab === 'benchmark') {
                this.runBenchmark();
            }
        } catch (e) {
            console.error('Simulation error:', e);
        }
    }

    renderMatrixTable(jobs) {
        const tbody = document.getElementById('results-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        jobs.forEach(j => {
            const tr = document.createElement('tr');
            const color = getJobColor(j.id);
            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 5px;">
                    <span style="width: 6px; height: 6px; border-radius: 9999px; background: ${color.bg};"></span>
                    <span>${j.name}</span>
                </td>
                <td>${j.arrival}</td>
                <td>${j.burst}</td>
                <td>${j.priority}</td>
                <td>${j.firstStart >= 0 ? j.firstStart : '—'}</td>
                <td>${j.completion}</td>
                <td style="font-weight: 700; color: var(--text-main);">${j.turnaround}</td>
                <td style="font-weight: 700; color: var(--text-main);">${j.waiting}</td>
                <td>${j.response}</td>
                <td>
                    ${j.deadline >= 0
                    ? (j.isMissed
                        ? `<span style="color:#F43F5E;font-weight:800;background:rgba(244,63,94,0.15);border:1px solid rgba(244,63,94,0.3);padding:2px 7px;border-radius:4px;font-size:0.65rem;">✕ Missed (+${j.lateness})</span>`
                        : `<span style="color:#22C55E;font-weight:800;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);padding:2px 7px;border-radius:4px;font-size:0.65rem;">✓ Met</span>`)
                    : '<span style="color:var(--text-dim);font-size:0.65rem;">—</span>'}
                </td>
            `;

            tr.addEventListener('mouseenter', () => this.ganttRenderer.highlightJob(j.id));
            tr.addEventListener('mouseleave', () => this.ganttRenderer.highlightJob(null));
            tbody.appendChild(tr);
        });
    }

    runBenchmark() {
        const tbody = document.getElementById('compare-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const algos = ['FCFS', 'SJF', 'SRTF', 'RR', 'PRIORITY_NP', 'PRIORITY_P', 'EDF_NP', 'EDF_P'];
        const results = algos.map(alg => {
            const sim = runSimulation(this.workload, { algorithm: alg, quantum: this.quantum, contextSwitch: this.contextSwitch });
            const m = calculateMetrics(sim);
            return { alg, meta: ALGORITHM_METADATA[alg], metrics: m.aggregates };
        });

        const bestAwt = Math.min(...results.map(r => r.metrics.awt));
        const bestAtt = Math.min(...results.map(r => r.metrics.att));

        results.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--text-main);">${r.meta.fullName}</td>
                <td><span class="${r.metrics.awt === bestAwt ? 'kpi-best-pill' : ''}">${r.metrics.awt.toFixed(2)}</span></td>
                <td><span class="${r.metrics.att === bestAtt ? 'kpi-best-pill' : ''}">${r.metrics.att.toFixed(2)}</span></td>
                <td>${r.metrics.art.toFixed(2)}</td>
                <td>${r.metrics.cpuUtilization.toFixed(1)}%</td>
                <td>${r.metrics.throughput.toFixed(3)}</td>
                <td>${r.metrics.contextSwitches}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    handlePlaybackTick(time, snapshot) {
        document.getElementById('playback-current-time').textContent = `t = ${time}`;
        const scrubber = document.getElementById('playback-scrubber');
        if (scrubber) scrubber.value = time;
        this.ganttRenderer.setPlayheadTime(time);

        const cpuName = document.getElementById('live-cpu-job-name');
        const cpuStatus = document.getElementById('live-cpu-status');

        if (snapshot?.runningJob) {
            cpuName.textContent = snapshot.runningJob.name;
            cpuStatus.style.background = '#CCFF00';  /* lime accent — actively running */
            cpuStatus.style.border = '1.5px solid #2E1065';
        } else if (snapshot?.activeSlice?.kind === 'switch') {
            cpuName.textContent = 'SW';
            cpuStatus.style.background = '#FECDD3';  /* blush — context switch */
            cpuStatus.style.border = '1.5px solid rgba(220,38,38,0.5)';
        } else {
            cpuName.textContent = 'IDLE';
            cpuStatus.style.background = '#EDE9FE';  /* lilac — idle */
            cpuStatus.style.border = '1.5px solid rgba(46,16,101,0.25)';
        }
    }

    handlePlaybackStateChange(state) {
        const btn = document.getElementById('btn-play-pause');
        if (btn) btn.textContent = state.isPlaying ? '⏸ Pause' : '▶ Play';
    }

    highlightJob(jobId) {
        this.ganttRenderer.highlightJob(jobId);
    }

    parseBulk(text) {
        try {
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const parsed = [];
            lines.forEach((l, i) => {
                if (i === 0 && l.toLowerCase().includes('arrival')) return;
                const parts = l.split(/[,\t\s]+/).filter(x => x.length > 0);
                if (parts.length >= 2) {
                    parsed.push({
                        id: i + 1,
                        name: parts[0] || `P${i + 1}`,
                        arrival: parseInt(parts[1]) || 0,
                        burst: Math.max(1, parseInt(parts[2]) || 1),
                        priority: parseInt(parts[3]) || 0,
                        deadline: parts[4] ? parseInt(parts[4]) : -1
                    });
                }
            });
            if (parsed.length > 0) {
                this.workload = parsed;
                this.renderDrawerJobs();
                this.runCurrentSimulation();
                return true;
            }
        } catch (e) {
            console.error('Bulk parse error:', e);
        }
        return false;
    }

    generateRandom() {
        const count = Math.min(20, Math.max(2, parseInt(document.getElementById('rand-count').value) || 5));
        const maxArr = parseInt(document.getElementById('rand-max-arrival').value) || 10;
        const minB = parseInt(document.getElementById('rand-min-burst').value) || 2;
        const maxB = parseInt(document.getElementById('rand-max-burst').value) || 8;

        const newJobs = [];
        for (let i = 1; i <= count; i++) {
            const arr = Math.floor(Math.random() * (maxArr + 1));
            const burst = minB + Math.floor(Math.random() * (maxB - minB + 1));
            newJobs.push({
                id: i,
                name: `P${i}`,
                arrival: arr,
                burst,
                priority: 1 + Math.floor(Math.random() * 5),
                deadline: arr + burst + Math.floor(Math.random() * 10)
            });
        }
        this.workload = newJobs.sort((a, b) => a.arrival - b.arrival);
        this.renderDrawerJobs();
        this.runCurrentSimulation();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new LinearSchedulerApp();
});
