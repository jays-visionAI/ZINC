/**
 * Studio Agent Report Visualizer
 * Renders a D3.js Force Directed Graph to visualize resource contribution
 */
class AgentReportVisualizer {
    constructor(containerId) {
        this.containerId = containerId;
    }

    render(metadata, agentName) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Clear previous visualization
        container.innerHTML = '';

        // Check for D3
        if (typeof d3 === 'undefined') {
            container.innerHTML = '<div style="color:#ef4444;text-align:center;padding:20px;">Visualization Error: D3.js library not loaded.</div>';
            return;
        }

        const width = container.clientWidth || 600;
        const height = container.clientHeight || 400;

        // Prepare Data (Nodes & Links)
        const nodes = [
            { id: 'result', label: 'Output', type: 'result', r: 40, color: '#10b981' } // Central Node (Green)
        ];
        const links = [];

        if (metadata?.resources) {
            // Project Context
            if (metadata.resources.project) {
                nodes.push({ id: 'project', label: 'Project', type: 'resource', r: 25, color: '#3b82f6' }); // Blue
                links.push({ source: 'project', target: 'result', weight: metadata.weights?.project || 20 });
            }
            // Brand Brain
            if (metadata.resources.brand) {
                nodes.push({ id: 'brand', label: 'Brand', type: 'resource', r: 30, color: '#8b5cf6' }); // Purple
                links.push({ source: 'brand', target: 'result', weight: metadata.weights?.brand || 30 });
            }
            // Knowledge Base
            const kCount = Array.isArray(metadata.resources.knowledge) ? metadata.resources.knowledge.length : 0;
            if (kCount > 0) {
                nodes.push({ id: 'knowledge', label: `Knowledge (${kCount})`, type: 'resource', r: 25 + (kCount * 2), color: '#f59e0b' }); // Amber
                links.push({ source: 'knowledge', target: 'result', weight: metadata.weights?.knowledge || 15 });
            }
            // History (Previous Outputs)
            if (metadata.resources.history > 0) {
                nodes.push({ id: 'history', label: 'Context', type: 'resource', r: 20, color: '#6366f1' }); // Indigo
                links.push({ source: 'history', target: 'result', weight: metadata.weights?.history || 10 });
            }
            // AI Model Info
            if (metadata.model) {
                nodes.push({ id: 'model', label: metadata.model, type: 'info', r: 15, color: '#64748b' }); // Slate
                links.push({ source: 'model', target: 'result', weight: 5 });
            }
        }

        // Create SVG
        const svg = d3.select(container).append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [0, 0, width, height])
            .style('border-radius', '12px')
            .style('background', '#0f172a'); // Slate-900 bg

        // Arrow marker definitions
        svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 30) // Position based on target radius (approx)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('xoverflow', 'visible')
            .append('path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', '#64748b')
            .style('stroke', 'none');

        // Force Simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(120))
            .force('charge', d3.forceManyBody().strength(-500))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collide', d3.forceCollide().radius(d => d.r + 10));

        // Links
        const link = svg.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', '#475569')
            .attr('stroke-width', d => Math.sqrt(d.weight || 10) / 2)
            .attr('marker-end', 'url(#arrowhead)');

        // Nodes Group
        const node = svg.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        // Node Circles
        node.append('circle')
            .attr('r', d => d.r)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', 'grab')
            .style('filter', 'drop-shadow(0 0 8px rgba(255,255,255,0.1))');

        // Labels
        node.append('text')
            .text(d => d.label)
            .attr('x', 0)
            .attr('y', d => d.r + 20)
            .attr('text-anchor', 'middle')
            .attr('fill', '#e2e8f0')
            .attr('font-size', '12px')
            .attr('font-weight', '500')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 2px 4px rgba(0,0,0,0.8)');

        // Animation Tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // Drag Functions
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }
}

// Export
window.AgentReportVisualizer = AgentReportVisualizer;
