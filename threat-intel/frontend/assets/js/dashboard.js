// CYBERDUDEBIVASH THREAT-INTEL Dashboard
// © 2026 CyberDudeBivash Pvt Ltd

class ThreatIntelDashboard {
    constructor() {
        this.feedUrl = '../../backend/data/threat-feed.json';
        this.incidents = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        await this.loadFeed();
        this.setupFilters();
        this.startAutoRefresh();
    }

    async loadFeed() {
        try {
            const response = await fetch(this.feedUrl);
            const data = await response.json();
            this.incidents = data.incidents || [];
            this.updateStats(data.metadata);
            this.renderIncidents();
        } catch (error) {
            console.error('Error loading feed:', error);
            this.showError();
        }
    }

    updateStats(metadata) {
        const stats = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        this.incidents.forEach(incident => {
            const sev = incident.severity.toLowerCase();
            if (stats[sev] !== undefined) stats[sev]++;
        });

        document.getElementById('stat-critical').textContent = stats.critical;
        document.getElementById('stat-high').textContent = stats.high;
        document.getElementById('stat-medium').textContent = stats.medium;
        document.getElementById('stat-total').textContent = this.incidents.length;
        
        if (metadata && metadata.generated) {
            const date = new Date(metadata.generated);
            const mins = Math.floor((Date.now() - date.getTime()) / 60000);
            document.getElementById('stat-updated').textContent = mins < 1 ? 'Just now' : `${mins}m ago`;
        }
    }

    renderIncidents() {
        const grid = document.getElementById('threats-grid');
        
        let filtered = this.incidents;
        if (this.currentFilter !== 'all') {
            filtered = this.incidents.filter(inc => 
                inc.severity === this.currentFilter || inc.category === this.currentFilter
            );
        }

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="loading">
                    <p>No incidents found for this filter.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(incident => `
            <div class="threat-card severity-${incident.severity}">
                <div class="threat-header">
                    <span class="severity-badge severity-${incident.severity}">${incident.severity}</span>
                    <span class="category-badge">${incident.category}</span>
                </div>
                <h3 class="threat-title">${this.escapeHtml(incident.title)}</h3>
                <p class="threat-description">${this.escapeHtml(incident.description || 'No description available.')}</p>
                <div class="threat-meta">
                    <span class="threat-source">📡 ${incident.source}</span>
                    <span class="threat-time">🕐 ${this.formatTime(incident.hours_ago)}</span>
                </div>
                ${incident.url ? `<a href="${incident.url}" class="threat-link" target="_blank" rel="noopener">View Source →</a>` : ''}
            </div>
        `).join('');
    }

    setupFilters() {
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderIncidents();
            });
        });
    }

    formatTime(hours) {
        if (hours < 1) return 'Just now';
        if (hours === 1) return '1 hour ago';
        return `${hours} hours ago`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError() {
        const grid = document.getElementById('threats-grid');
        grid.innerHTML = `
            <div class="loading">
                <p>Error loading threat intelligence feed.</p>
                <p>Please refresh the page or contact support.</p>
            </div>
        `;
    }

    startAutoRefresh() {
        // Refresh every 5 minutes
        setInterval(() => this.loadFeed(), 5 * 60 * 1000);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    new ThreatIntelDashboard();
});