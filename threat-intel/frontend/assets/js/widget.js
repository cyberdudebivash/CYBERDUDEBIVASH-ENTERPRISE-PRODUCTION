// CYBERDUDEBIVASH THREAT-INTEL Sidebar Widget
// © 2026 CyberDudeBivash Pvt Ltd

(function() {
    const WIDGET_FEED_URL = '../../backend/data/threat-feed-widget.json';
    const DASHBOARD_URL = '../dashboard/index.html';

    class ThreatWidget {
        constructor(containerId) {
            this.container = document.getElementById(containerId);
            if (!this.container) return;
            this.init();
        }

        async init() {
            await this.loadAndRender();
            // Auto-refresh every 5 minutes
            setInterval(() => this.loadAndRender(), 5 * 60 * 1000);
        }

        async loadAndRender() {
            try {
                const response = await fetch(WIDGET_FEED_URL);
                const data = await response.json();
                this.render(data.incidents || []);
            } catch (error) {
                console.error('Widget load error:', error);
                this.renderError();
            }
        }

        render(incidents) {
            const html = `
                <div class="cdb-widget-header">
                    <div class="cdb-widget-brand">CYBERDUDEBIVASH®</div>
                    <div class="cdb-widget-subtitle">Threat-Intel Live</div>
                    <div class="cdb-live-badge">
                        <span class="cdb-pulse"></span>
                        <span class="cdb-live-text">LIVE</span>
                    </div>
                </div>
                <div class="cdb-widget-threats">
                    ${incidents.map(inc => `
                        <div class="cdb-threat-item" onclick="window.open('${inc.url}', '_blank')">
                            <div class="cdb-threat-header-row">
                                <span>
                                    <span class="cdb-severity-dot ${inc.severity.toLowerCase()}"></span>
                                </span>
                                <span class="cdb-category-mini">${inc.category}</span>
                            </div>
                            <div class="cdb-threat-title-mini">${this.escapeHtml(inc.title)}</div>
                            <div class="cdb-threat-time-mini">🕐 ${this.formatTime(inc.hours_ago)}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="cdb-widget-footer">
                    <a href="${DASHBOARD_URL}" class="cdb-view-all-btn" target="_blank">
                        VIEW FULL DASHBOARD →
                    </a>
                    <div class="cdb-copyright">© 2026 CyberDudeBivash Pvt Ltd</div>
                </div>
            `;
            this.container.innerHTML = html;
        }

        renderError() {
            this.container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #ff3366;">
                    <p>Unable to load threat feed</p>
                </div>
            `;
        }

        formatTime(hours) {
            if (hours < 1) return 'Just now';
            if (hours === 1) return '1 hour ago';
            return `${hours}h ago`;
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new ThreatWidget('cyberdudebivash-threat-widget');
        });
    } else {
        new ThreatWidget('cyberdudebivash-threat-widget');
    }
})();