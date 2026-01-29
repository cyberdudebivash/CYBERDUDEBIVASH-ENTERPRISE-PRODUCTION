/**
 * GitHub Apps Fetcher
 * Dynamically loads CYBERDUDEBIVASH apps from GitHub
 */

(function() {
    'use strict';
    
    let allApps = [];
    let currentFilter = 'all';
    
    // App metadata (pricing, categories, features)
    const appMetadata = {
        'CYBERDUDEBIVASH-PRODUCTION-APPS-SUITE': {
            price: 'Free',
            category: ['security', 'free'],
            icon: '🛡️',
            featured: true,
            description: 'Complete suite of production-grade cybersecurity tools and utilities',
            features: ['Threat Detection', 'Malware Analysis', 'Network Scanning']
        },
        'cyberdudebivash-top-10-tools': {
            price: 'Free',
            category: ['security', 'free'],
            icon: '🔧',
            featured: true,
            description: 'Top 10 curated cybersecurity tools and research hub',
            features: ['Tool Reviews', 'Best Practices', 'Tutorials']
        },
        'CYBERDUDEBIVASH-ECOSYSTEM': {
            price: 'Free',
            category: ['security', 'free'],
            icon: '🌐',
            description: 'Complete ecosystem overview and integration platform',
            features: ['Platform Directory', 'API Docs', 'Integration Guides']
        },
        'mcp-server': {
            price: '$99/month',
            category: ['ai', 'automation', 'premium'],
            icon: '🤖',
            featured: true,
            description: 'AI-powered Model Context Protocol server for automation',
            features: ['AI Integration', 'Context Management', 'API Access']
        },
        'CYBERDUDEBIVASH-ENTERPRISE-PRODUCTION': {
            price: 'Custom',
            category: ['security', 'premium'],
            icon: '🏢',
            description: 'Enterprise-grade security platform and client portal',
            features: ['Dashboard', 'License Management', 'Support Portal']
        }
    };
    
    // Fetch repos from GitHub
    async function fetchGitHubRepos() {
        try {
            const response = await fetch('https://api.github.com/users/cyberdudebivash/repos?per_page=100&sort=updated');
            
            if (!response.ok) {
                throw new Error('Failed to fetch repositories');
            }
            
            const repos = await response.json();
            
            // Filter and enhance repos
            allApps = repos
                .filter(repo => !repo.fork && !repo.private)
                .map(repo => enhanceRepo(repo))
                .sort((a, b) => {
                    // Featured apps first
                    if (a.metadata.featured && !b.metadata.featured) return -1;
                    if (!a.metadata.featured && b.metadata.featured) return 1;
                    // Then by stars
                    return b.stargazers_count - a.stargazers_count;
                });
            
            displayApps(allApps);
            
        } catch (error) {
            console.error('Error fetching GitHub repos:', error);
            displayError();
        }
    }
    
    // Enhance repo with metadata
    function enhanceRepo(repo) {
        const metadata = appMetadata[repo.name] || {
            price: 'Free',
            category: ['security', 'free'],
            icon: '🔒',
            description: repo.description || 'Cybersecurity tool from CYBERDUDEBIVASH',
            features: ['Security Tool', 'Open Source']
        };
        
        return {
            ...repo,
            metadata
        };
    }
    
    // Display apps
    function displayApps(apps) {
        const container = document.getElementById('apps-container');
        
        if (apps.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <p>No apps found for this category</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="apps-grid">
                ${apps.map(app => createAppCard(app)).join('')}
            </div>
        `;
    }
    
    // Create app card HTML
    function createAppCard(app) {
        const { metadata } = app;
        const isPremium = metadata.category.includes('premium');
        const isFree = metadata.category.includes('free');
        
        const badgeClass = isPremium ? 'premium' : (isFree ? 'free' : '');
        const badgeText = isPremium ? 'Premium' : (isFree ? 'Free' : 'Open Source');
        
        // Detect tech stack from language
        const techStack = [];
        if (app.language) techStack.push(app.language);
        if (metadata.category.includes('ai')) techStack.push('AI');
        if (metadata.category.includes('automation')) techStack.push('Automation');
        
        return `
            <div class="app-card" data-categories="${metadata.category.join(' ')}">
                <div class="app-header">
                    <div class="app-icon">${metadata.icon}</div>
                    <div class="app-badge ${badgeClass}">${badgeText}</div>
                </div>
                
                <h3 class="app-title">${app.name.replace(/-/g, ' ')}</h3>
                
                <p class="app-description">${metadata.description}</p>
                
                <div class="app-meta">
                    <div class="meta-item">
                        <span>⭐</span>
                        <strong>${app.stargazers_count}</strong>
                        <span>stars</span>
                    </div>
                    <div class="meta-item">
                        <span>🍴</span>
                        <strong>${app.forks_count}</strong>
                        <span>forks</span>
                    </div>
                    ${app.language ? `
                    <div class="meta-item">
                        <span>💻</span>
                        <strong>${app.language}</strong>
                    </div>
                    ` : ''}
                </div>
                
                ${techStack.length > 0 ? `
                <div class="app-tech">
                    ${techStack.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                    ${metadata.features ? metadata.features.slice(0, 3).map(f => `<span class="tech-tag">${f}</span>`).join('') : ''}
                </div>
                ` : ''}
                
                <div class="app-price">
                    ${metadata.price}
                    ${isPremium ? '<small>/month</small>' : ''}
                </div>
                
                <div class="app-actions">
                    <a href="${app.html_url}" target="_blank" class="app-btn app-btn-primary">
                        View on GitHub
                    </a>
                    ${app.homepage ? `
                    <a href="${app.homepage}" target="_blank" class="app-btn app-btn-secondary">
                        Live Demo
                    </a>
                    ` : ''}
                    ${isPremium ? `
                    <a href="contact.html?app=${encodeURIComponent(app.name)}" class="app-btn app-btn-secondary">
                        Purchase
                    </a>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Display error
    function displayError() {
        const container = document.getElementById('apps-container');
        container.innerHTML = `
            <div class="loading">
                <p style="color: #FF3366;">Failed to load apps from GitHub</p>
                <p style="color: #999; margin-top: 1rem;">Please check your internet connection or try again later</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 2rem;">
                    Retry
                </button>
            </div>
        `;
    }
    
    // Filter apps
    window.filterApps = function(category) {
        currentFilter = category;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Filter apps
        let filteredApps = allApps;
        
        if (category !== 'all') {
            filteredApps = allApps.filter(app => 
                app.metadata.category.includes(category)
            );
        }
        
        displayApps(filteredApps);
    };
    
    // Initialize
    if (document.getElementById('apps-container')) {
        fetchGitHubRepos();
        
        // Auto-refresh every 5 minutes to catch new repos
        setInterval(fetchGitHubRepos, 5 * 60 * 1000);
    }
    
})();
