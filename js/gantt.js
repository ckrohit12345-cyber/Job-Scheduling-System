/**
 * Gantt Chart Generation Engine
 * Implements PRD Section 7 & Dynamic "Fit-to-Width" Scaling (Linear/Raycast Spec)
 * 
 * - Defaults to "Fit-to-Width" scale where timeline unit width equals Available Width / Total Makespan.
 * - Switches to internal horizontal scroll only if slice unit width drops below 16px.
 * - Responsive ResizeObserver adapts canvas dynamically when drawer collapses/expands (Cmd+B).
 * - Precision SVG timeline ticks, milestone markers (▼, ✓, ◆), and interactive hover tooltips.
 */

// 6 Vibrant Process Colors — High-saturation fills with dark high-contrast typography
export const PROCESS_PALETTE = [
    { name: 'electric-indigo', bg: '#818CF8', fg: '#09090B', border: '#6366F1' }, // P1 Vibrant Electric Indigo
    { name: 'mint-emerald',    bg: '#34D399', fg: '#09090B', border: '#10B981' }, // P2 Bright Mint Emerald
    { name: 'amber-gold',      bg: '#FBBF24', fg: '#09090B', border: '#F59E0B' }, // P3 Warm Amber Gold
    { name: 'coral-rose',      bg: '#FB7185', fg: '#09090B', border: '#F43F5E' }, // P4 Bright Coral Rose
    { name: 'sky-blue',        bg: '#38BDF8', fg: '#09090B', border: '#0EA5E9' }, // P5 Vivid Sky Blue
    { name: 'electric-orchid', bg: '#C084FC', fg: '#09090B', border: '#A855F7' }, // P6 Electric Orchid / Purple
];

export function getJobColor(jobId) {
    if (jobId <= 0 || jobId === null) return { bg: '#27272A', fg: '#A1A1AA', border: '#3F3F46' };
    const index = Math.abs(Number(jobId) - 1) % PROCESS_PALETTE.length;
    return PROCESS_PALETTE[index];
}

export function processGanttSegments(trace, mergeContiguous = true) {
    if (!trace || trace.length === 0) return [];
    if (!mergeContiguous) return trace.map((s, i) => ({ ...s, index: i, duration: s.end - s.start }));

    const merged = [];
    let cur = null;
    for (let i = 0; i < trace.length; i++) {
        const s = trace[i];
        if (!cur) {
            cur = { ...s, duration: s.end - s.start };
        } else if (cur.jobId === s.jobId && cur.end === s.start && cur.kind === s.kind) {
            cur.end = s.end;
            cur.duration = cur.end - cur.start;
            cur.remainingAfter = s.remainingAfter;
        } else {
            merged.push(cur);
            cur = { ...s, duration: s.end - s.start };
        }
    }
    if (cur) merged.push(cur);
    return merged;
}

export class GanttChartRenderer {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            mergeContiguous: true,
            minUnitWidth: 16, // Critical threshold from specification
            paddingX: 48,
            onSelectJob: null,
            ...options
        };
        this.currentData = null;
        this.activeHighlightJobId = null;
        this.tooltip = null;
        this.resizeObserver = null;

        this.initTooltip();
        this.initResizeObserver();
    }

    initTooltip() {
        let el = document.getElementById('gantt-global-tooltip');
        if (!el) {
            el = document.createElement('div');
            el.id = 'gantt-global-tooltip';
            el.className = 'gantt-tooltip';
            document.body.appendChild(el);
        }
        this.tooltip = el;
    }

    initResizeObserver() {
        if (typeof ResizeObserver !== 'undefined' && this.container) {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.currentData) {
                    this.render(this.currentData);
                }
            });
            this.resizeObserver.observe(this.container);
        }
    }

    setOptions(newOpts) {
        this.options = { ...this.options, ...newOpts };
        if (this.currentData) this.render(this.currentData);
    }

    highlightJob(jobId) {
        this.activeHighlightJobId = jobId;
        const segments = this.container.querySelectorAll('.gantt-segment');
        segments.forEach(seg => {
            const segJobId = Number(seg.getAttribute('data-job-id'));
            if (jobId === null) {
                seg.style.opacity = '1';
                seg.classList.remove('highlighted', 'dimmed');
            } else if (segJobId === jobId) {
                seg.style.opacity = '1';
                seg.classList.add('highlighted');
                seg.classList.remove('dimmed');
            } else {
                seg.style.opacity = '0.35';
                seg.classList.remove('highlighted');
                seg.classList.add('dimmed');
            }
        });
    }

    render(data) {
        this.currentData = data;
        const { trace, rawJobs, makespan } = data;
        this.container.innerHTML = '';

        if (!trace || trace.length === 0 || makespan <= 0) {
            this.container.innerHTML = `
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-size: 0.8rem; font-family: var(--font-mono);">
                    Ready. Press Run Simulation to visualize timeline.
                </div>
            `;
            return;
        }

        const segments = processGanttSegments(trace, this.options.mergeContiguous);
        const totalUnits = Math.max(1, makespan);

        // FIT-TO-WIDTH CALCULATION:
        // Available width = container width - padding
        const containerWidth = this.container.clientWidth || 800;
        const availableWidth = Math.max(100, containerWidth - this.options.paddingX);
        const idealUnitWidth = availableWidth / totalUnits;

        // Switches to internal scroll only if slice width drops below 16px
        const isScrollable = idealUnitWidth < this.options.minUnitWidth;
        const unitWidth = Math.max(this.options.minUnitWidth, idealUnitWidth);
        const timelineWidth = unitWidth * totalUnits;
        const chartWidth = timelineWidth + this.options.paddingX;

        const containerHeight = Math.max(140, this.container.clientHeight || 160);
        const barHeight = Math.min(48, Math.max(36, containerHeight - 80));
        const barY = Math.max(35, (containerHeight - barHeight) / 2 - 8);
        const offsetX = 24;

        // Create SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'gantt-svg-element');
        svg.setAttribute('width', `${isScrollable ? chartWidth : '100%'}`);
        svg.setAttribute('height', `${containerHeight}`);
        svg.setAttribute('viewBox', `0 0 ${chartWidth} ${containerHeight}`);

        // SVG Defs
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <pattern id="idle-stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(46,16,101,0.35)" stroke-width="2.5" />
                <rect width="10" height="10" fill="#EDE9FE" />
            </pattern>
            <pattern id="switch-stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(220,38,38,0.55)" stroke-width="2.5" />
                <rect width="8" height="8" fill="#FEE2E2" />
            </pattern>
        `;
        svg.appendChild(defs);

        // Timeline Background Track
        const trackBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        trackBg.setAttribute('x', `${offsetX}`);
        trackBg.setAttribute('y', `${barY}`);
        trackBg.setAttribute('width', `${timelineWidth}`);
        trackBg.setAttribute('height', `${barHeight}`);
        trackBg.setAttribute('rx', '8');
        trackBg.setAttribute('class', 'gantt-track-bg');
        svg.appendChild(trackBg);

        // Adaptive tick interval calculation so ticks never collide
        const minLabelDistance = 44;
        const rawStep = minLabelDistance / unitWidth;
        let tickStep = 1;
        if (rawStep > 1) tickStep = 2;
        if (rawStep > 2) tickStep = 5;
        if (rawStep > 5) tickStep = 10;
        if (rawStep > 10) tickStep = 20;

        // Grid & Ticks Group
        const axisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        for (let t = 0; t <= totalUnits; t += tickStep) {
            const x = offsetX + (t * unitWidth);

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', `${x}`);
            line.setAttribute('y1', `${barY - 5}`);
            line.setAttribute('x2', `${x}`);
            line.setAttribute('y2', `${barY + barHeight + 5}`);
            line.setAttribute('class', t === 0 || t === totalUnits ? 'gantt-grid-major' : 'gantt-grid-minor');
            axisGroup.appendChild(line);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', `${x}`);
            text.setAttribute('y', `${barY + barHeight + 20}`);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('class', 'gantt-time-tick');
            text.textContent = `${t}`;
            axisGroup.appendChild(text);
        }
        svg.appendChild(axisGroup);

        // Render Slices
        const segmentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        segments.forEach((seg) => {
            const segX = offsetX + (seg.start * unitWidth);
            const segW = Math.max(2, (seg.end - seg.start) * unitWidth);

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'gantt-segment');
            g.setAttribute('data-job-id', `${seg.jobId}`);
            g.setAttribute('data-start', `${seg.start}`);
            g.setAttribute('data-end', `${seg.end}`);

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', `${segX}`);
            rect.setAttribute('y', `${barY}`);
            rect.setAttribute('width', `${segW}`);
            rect.setAttribute('height', `${barHeight}`);
            rect.setAttribute('rx', '4');

            const color = getJobColor(seg.jobId);
            if (seg.kind === 'idle') {
                rect.setAttribute('fill', 'url(#idle-stripes)');
                rect.setAttribute('stroke', 'rgba(46,16,101,0.25)');
            } else if (seg.kind === 'switch') {
                rect.setAttribute('fill', 'url(#switch-stripes)');
                rect.setAttribute('stroke', 'rgba(220,38,38,0.45)');
            } else {
                rect.setAttribute('fill', color.bg);
                rect.setAttribute('stroke', color.border);
            }

            g.appendChild(rect);


            // Label
            if (segW >= 22) {
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', `${segX + segW / 2}`);
                label.setAttribute('y', `${barY + barHeight / 2 + 4}`);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('class', 'gantt-segment-label');
                label.setAttribute('fill', color.fg || '#FFFFFF');
                label.textContent = seg.kind === 'idle' ? 'IDLE' : (seg.kind === 'switch' ? 'SW' : seg.name);
                g.appendChild(label);
            }

            // Hover Events
            g.addEventListener('mouseenter', (e) => this.showTooltip(e, seg));
            g.addEventListener('mousemove', (e) => this.moveTooltip(e));
            g.addEventListener('mouseleave', () => this.hideTooltip());

            if (this.options.onSelectJob && seg.jobId > 0) {
                g.addEventListener('click', () => this.options.onSelectJob(seg.jobId));
            }

            segmentGroup.appendChild(g);
        });
        svg.appendChild(segmentGroup);

        // Milestones: Arrivals & Deadlines
        if (rawJobs) {
            const milestoneGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            rawJobs.forEach(job => {
                const arrX = offsetX + (job.arrival * unitWidth);
                const arrTri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                arrTri.setAttribute('points', `${arrX - 4},${barY - 8} ${arrX + 4},${barY - 8} ${arrX},${barY - 2}`);
                arrTri.setAttribute('fill', 'var(--accent-cyan, #00F0FF)');
                arrTri.setAttribute('opacity', '0.90');
                milestoneGroup.appendChild(arrTri);

                if (job.deadline >= 0) {
                    const dlX = offsetX + (job.deadline * unitWidth);
                    const dlDiamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                    dlDiamond.setAttribute('points', `${dlX},${barY - 14} ${dlX + 5},${barY - 9} ${dlX},${barY - 4} ${dlX - 5},${barY - 9}`);
                    dlDiamond.setAttribute('fill', '#FF2E93');
                    dlDiamond.setAttribute('stroke', 'rgba(255,255,255,0.7)');
                    dlDiamond.setAttribute('stroke-width', '1');
                    milestoneGroup.appendChild(dlDiamond);
                }
            });
            svg.appendChild(milestoneGroup);
        }

        // Playhead Line
        const playhead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        playhead.setAttribute('id', 'gantt-playhead-line');
        playhead.setAttribute('x1', `${offsetX}`);
        playhead.setAttribute('y1', `${barY - 8}`);
        playhead.setAttribute('x2', `${offsetX}`);
        playhead.setAttribute('y2', `${barY + barHeight + 8}`);
        playhead.setAttribute('class', 'gantt-playhead');
        svg.appendChild(playhead);

        this.container.appendChild(svg);
    }

    setPlayheadTime(time) {
        const line = this.container.querySelector('#gantt-playhead-line');
        if (!line || !this.currentData) return;

        const totalUnits = Math.max(1, this.currentData.makespan);
        const containerWidth = this.container.clientWidth || 800;
        const availableWidth = Math.max(100, containerWidth - this.options.paddingX);
        const idealUnitWidth = availableWidth / totalUnits;
        const unitWidth = Math.max(this.options.minUnitWidth, idealUnitWidth);
        const offsetX = 24;

        const x = offsetX + (time * unitWidth);
        line.setAttribute('x1', `${x}`);
        line.setAttribute('x2', `${x}`);

        // Apply visual playback classes: past / active / future
        if (this.activeHighlightJobId !== null) return; // skip if job hover highlight is active
        const segments = this.container.querySelectorAll('.gantt-segment');
        segments.forEach(seg => {
            const start = parseFloat(seg.getAttribute('data-start') || '0');
            const end = parseFloat(seg.getAttribute('data-end') || '0');

            seg.classList.remove('seg-past', 'seg-active', 'seg-future');

            if (end <= time) {
                seg.classList.add('seg-past');
            } else if (start <= time && end > time) {
                seg.classList.add('seg-active');
            } else {
                seg.classList.add('seg-future');
            }
        });
    }

    showTooltip(event, seg) {
        if (!this.tooltip) return;
        const color = getJobColor(seg.jobId);
        this.tooltip.innerHTML = `
            <div style="font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 3px; margin-bottom: 4px; display: flex; align-items: center; gap: 5px;">
                <span style="width: 8px; height: 8px; border-radius: 9999px; background: ${color.bg};"></span>
                <span>${seg.kind === 'idle' ? 'CPU Idle' : seg.kind === 'switch' ? 'Context Switch' : seg.name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 12px; font-family: var(--font-mono); font-size: 0.72rem;">
                <span style="color: var(--text-dim);">Window:</span>
                <span>[${seg.start} → ${seg.end}]</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 12px; font-family: var(--font-mono); font-size: 0.72rem;">
                <span style="color: var(--text-dim);">Duration:</span>
                <span>${seg.duration} units</span>
            </div>
            ${seg.remainingAfter !== undefined ? `
            <div style="display: flex; justify-content: space-between; gap: 12px; font-family: var(--font-mono); font-size: 0.72rem;">
                <span style="color: var(--text-dim);">Remaining:</span>
                <span>${seg.remainingAfter} units</span>
            </div>` : ''}
        `;
        this.tooltip.style.display = 'block';
        this.moveTooltip(event);
    }

    moveTooltip(event) {
        if (!this.tooltip) return;
        let x = event.clientX + 12;
        let y = event.clientY - 40;
        if (x + 180 > window.innerWidth) x = event.clientX - 190;
        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
    }

    hideTooltip() {
        if (this.tooltip) this.tooltip.style.display = 'none';
    }
}
