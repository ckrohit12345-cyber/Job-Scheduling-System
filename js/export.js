/**
 * Export & Sharing Suite
 * Compliant with PRD Section 3.6 (FR-DB-04, FR-DB-05) and Section 3.5 (FR-GC-09)
 * - Workload & Results CSV Export
 * - Workload & Execution Trace JSON Export
 * - Gantt Chart SVG and high-resolution PNG Export
 * - Printable PDF / Formatted Executive Report view
 * - URL Hash Shareable Permalink generator and decoder
 */

export function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Exports Workload to CSV format
 */
export function exportWorkloadCSV(jobs) {
    let csv = 'Job ID,Name,Arrival Time,Burst Time,Priority,Deadline\n';
    jobs.forEach(j => {
        csv += `${j.id},"${j.name}",${j.arrival},${j.burst},${j.priority !== undefined ? j.priority : ''},${j.deadline >= 0 ? j.deadline : ''}\n`;
    });
    downloadFile('workload.csv', csv, 'text/csv;charset=utf-8;');
}

/**
 * Exports Full Simulation Results to CSV format
 */
export function exportResultsCSV(simulationResult, metrics) {
    const { algorithm, metadata, options } = simulationResult;
    const { perJob, aggregates } = metrics;

    let csv = `OS Scheduling Simulation Results Report\n`;
    csv += `Engine Version,1.0.0\n`;
    csv += `Algorithm,"${metadata.fullName} (${algorithm})"\n`;
    csv += `Time Quantum,${options.quantum || 'N/A'}\n`;
    csv += `Context Switch Overhead,${options.contextSwitch || 0}\n\n`;

    csv += `--- AGGREGATE PERFORMANCE METRICS ---\n`;
    csv += `Average Waiting Time (AWT),${aggregates.awt}\n`;
    csv += `Average Turnaround Time (ATT),${aggregates.att}\n`;
    csv += `Average Response Time,${aggregates.art}\n`;
    csv += `CPU Utilization (%),${aggregates.cpuUtilization}%\n`;
    csv += `Throughput (jobs/unit),${aggregates.throughput}\n`;
    csv += `Total Makespan,${aggregates.makespan}\n`;
    csv += `Context Switches,${aggregates.contextSwitches}\n`;
    csv += `Preemptions,${aggregates.preemptions}\n`;
    if (aggregates.missedDeadlines > 0) {
        csv += `Missed Deadlines,${aggregates.missedDeadlines}\n`;
        csv += `Max Lateness,${aggregates.maxLateness}\n`;
    }
    csv += `\n`;

    csv += `--- DETAILED PER-JOB RESULTS ---\n`;
    csv += `Job ID,Name,Arrival Time,Burst Time,Priority,Deadline,First Response,Completion Time,Turnaround Time,Waiting Time,Lateness,Status\n`;
    perJob.forEach(j => {
        csv += `${j.id},"${j.name}",${j.arrival},${j.burst},${j.priority},${j.deadline >= 0 ? j.deadline : 'None'},${j.firstStart},${j.completion},${j.turnaround},${j.waiting},${j.lateness},"${j.deadlineStatus}"\n`;
    });

    downloadFile(`simulation_results_${algorithm.toLowerCase()}.csv`, csv, 'text/csv;charset=utf-8;');
}

/**
 * Exports Full Simulation to JSON format (compliant with PRD Section 9 envelope)
 */
export function exportSimulationJSON(simulationResult, metrics) {
    const exportData = {
        engineVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        algorithm: simulationResult.algorithm,
        algorithmName: simulationResult.metadata.fullName,
        parameters: simulationResult.options,
        workload: simulationResult.rawJobs,
        executionTrace: simulationResult.trace,
        decisions: simulationResult.decisions,
        metrics: {
            perJob: metrics.perJob,
            aggregate: metrics.aggregates
        }
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    downloadFile(`simulation_${simulationResult.algorithm.toLowerCase()}.json`, jsonString, 'application/json');
}

/**
 * Exports Gantt SVG file
 */
export function exportGanttSVG(containerElement) {
    const svgEl = containerElement.querySelector('svg.gantt-svg');
    if (!svgEl) {
        alert('Gantt chart not rendered yet.');
        return;
    }

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);

    // Ensure standard XML namespace
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const preamble = '<?xml version="1.0" standalone="no"?>\r\n';
    downloadFile('gantt_chart.svg', preamble + source, 'image/svg+xml;charset=utf-8');
}

/**
 * Exports Gantt chart as high-resolution PNG image
 */
export function exportGanttPNG(containerElement, scale = 2) {
    const svgEl = containerElement.querySelector('svg.gantt-svg');
    if (!svgEl) {
        alert('Gantt chart not rendered yet.');
        return;
    }

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);

    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svgEl.clientWidth * scale || 1600;
        canvas.height = svgEl.clientHeight * scale || 400;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0F172A'; // Premium slate background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        URL.revokeObjectURL(blobURL);
        const pngURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngURL;
        a.download = 'gantt_chart.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    image.src = blobURL;
}

/**
 * Triggers standard browser print report for PDF generation
 */
export function printPDFReport() {
    window.print();
}

/**
 * Encodes Workload & Options into URL hash permalink
 */
export function generateShareableLink(jobs, options) {
    try {
        const payload = {
            j: jobs.map(j => ({
                i: j.id,
                n: j.name,
                a: j.arrival,
                b: j.burst,
                p: j.priority,
                d: j.deadline
            })),
            opt: {
                alg: options.algorithm,
                q: options.quantum,
                cs: options.contextSwitch,
                lh: options.lowerIsHigher
            }
        };
        const encoded = encodeURIComponent(btoa(JSON.stringify(payload)));
        const url = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
        return url;
    } catch (err) {
        console.error('Failed to create permalink', err);
        return window.location.href;
    }
}

/**
 * Decodes URL hash permalink if present
 */
export function loadFromShareableLink() {
    try {
        const hash = window.location.hash;
        if (!hash.includes('share=')) return null;

        const encoded = hash.split('share=')[1];
        if (!encoded) return null;

        const jsonStr = atob(decodeURIComponent(encoded));
        const payload = JSON.parse(jsonStr);

        if (payload && payload.j && Array.isArray(payload.j)) {
            const jobs = payload.j.map(j => ({
                id: j.i,
                name: j.n,
                arrival: j.a,
                burst: j.b,
                priority: j.p !== undefined ? j.p : 0,
                deadline: j.d !== undefined ? j.d : -1
            }));
            return {
                jobs,
                options: payload.opt || {}
            };
        }
    } catch (e) {
        console.warn('Could not parse share hash', e);
    }
    return null;
}
