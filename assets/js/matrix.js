/**
 * Matrix Rain Animation
 * CYBERDUDEBIVASH® Enterprise
 * Production-grade canvas animation with safety guards
 */

(function() {
    'use strict';
    
    const canvas = document.getElementById('matrixCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Configuration
    const config = {
        fontSize: 16,
        columns: 0,
        drops: [],
        chars: '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ',
        colors: {
            primary: '#00FFFF',
            secondary: '#00A8E8',
            tertiary: '#FF8C42'
        }
    };
    
    // Resize canvas to fit window
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        config.columns = Math.floor(canvas.width / config.fontSize);
        config.drops = Array(config.columns).fill(1);
    }
    
    // Initialize
    resizeCanvas();
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 250);
    });
    
    // Draw matrix rain
    function draw() {
        // Semi-transparent background for fade effect
        ctx.fillStyle = 'rgba(5, 10, 18, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set font
        ctx.font = config.fontSize + 'px monospace';
        
        // Draw characters
        for (let i = 0; i < config.drops.length; i++) {
            // Random character
            const char = config.chars[Math.floor(Math.random() * config.chars.length)];
            
            // Color variation for cyberpunk effect
            const colorIndex = Math.floor(Math.random() * 10);
            if (colorIndex < 7) {
                ctx.fillStyle = config.colors.primary;
            } else if (colorIndex < 9) {
                ctx.fillStyle = config.colors.secondary;
            } else {
                ctx.fillStyle = config.colors.tertiary;
            }
            
            // Draw character
            const x = i * config.fontSize;
            const y = config.drops[i] * config.fontSize;
            
            ctx.fillText(char, x, y);
            
            // Reset drop to top randomly
            if (y > canvas.height && Math.random() > 0.975) {
                config.drops[i] = 0;
            }
            
            // Increment Y coordinate
            config.drops[i]++;
        }
    }
    
    // Animation loop
    function animate() {
        draw();
        requestAnimationFrame(animate);
    }
    
    // Start animation
    animate();
    
})();
