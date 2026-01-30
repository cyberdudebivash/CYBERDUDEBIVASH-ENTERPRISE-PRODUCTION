/**
 * Main JavaScript File
 * CYBERDUDEBIVASH® Enterprise
 * Production-grade interactions and form handling
 */

(function() {
    'use strict';
    
    // ===== Mobile Navigation =====
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
        
        // Close menu when clicking nav links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }
    
    // ===== Contact Form Handling with Formspree =====
    const contactForm = document.getElementById('contactForm');
    const formMessage = document.getElementById('formMessage');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData);
            
            // Basic validation
            if (!data.name || !data.email || !data.message) {
                showFormMessage('Please fill in all required fields.', 'error');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                showFormMessage('Please enter a valid email address.', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            try {
                // Submit to Formspree
                const response = await fetch('https://formspree.io/f/xkordvzn', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    showFormMessage('✅ Thank you! Your message has been sent successfully. We\'ll get back to you within 24 hours.', 'success');
                    contactForm.reset();
                    
                    // Show success toast
                    showToast('Message sent successfully!', 'success');
                } else {
                    throw new Error('Form submission failed');
                }
            } catch (error) {
                console.error('Form submission error:', error);
                showFormMessage('❌ Sorry, there was an error sending your message. Please email us directly at iambivash@cyberdudebivash.com', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    function showFormMessage(message, type) {
        if (!formMessage) return;
        
        formMessage.textContent = message;
        formMessage.className = 'form-message ' + type;
        formMessage.style.display = 'block';
        formMessage.style.padding = '1rem';
        formMessage.style.marginTop = '1rem';
        formMessage.style.borderRadius = '8px';
        
        if (type === 'success') {
            formMessage.style.background = 'rgba(0, 208, 156, 0.1)';
            formMessage.style.border = '1px solid rgba(0, 208, 156, 0.3)';
            formMessage.style.color = '#00D09C';
        } else {
            formMessage.style.background = 'rgba(255, 51, 102, 0.1)';
            formMessage.style.border = '1px solid rgba(255, 51, 102, 0.3)';
            formMessage.style.color = '#FF3366';
        }
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    }
    
    // ===== Newsletter Form =====
    const newsletterForm = document.getElementById('newsletterForm');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = newsletterForm.querySelector('input[type="email"]').value;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address.');
                return;
            }
            
            // Simulate subscription
            const submitBtn = newsletterForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Subscribing...';
            submitBtn.disabled = true;
            
            setTimeout(() => {
                alert('Successfully subscribed to threat intelligence feed!');
                newsletterForm.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 1000);
        });
    }
    
    // ===== Smooth Scroll for Anchor Links =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href !== '') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // ===== Navbar Scroll Effect =====
    let lastScroll = 0;
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 100) {
                navbar.style.boxShadow = '0 4px 20px rgba(0, 255, 255, 0.2)';
            } else {
                navbar.style.boxShadow = '0 4px 20px rgba(0, 255, 255, 0.1)';
            }
            
            lastScroll = currentScroll;
        });
    }
    
    // ===== Animate Elements on Scroll =====
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe cards and sections for animation
    document.querySelectorAll('.ecosystem-card, .capability-card, .service-block, .pricing-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // ===== Loading Performance =====
    window.addEventListener('load', () => {
        document.body.classList.add('loaded');
        console.log('%c🛡️ CYBERDUDEBIVASH® Enterprise Platform', 'color: #00FFFF; font-size: 20px; font-weight: bold;');
        console.log('%cProduction-Grade Cybersecurity Solutions', 'color: #FF8C42; font-size: 14px;');
        console.log('%cwww.cyberdudebivash.com', 'color: #00D09C; font-size: 12px;');
    });
    
})();

    // ===== Toast Notifications =====
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 1.5rem;">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <div>
                    <strong style="display: block; margin-bottom: 0.3rem;">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                    <span>${message}</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.5s ease reverse';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500);
        }, 5000);
    }
    
    // Make showToast available globally
    window.showToast = showToast;
    
    // ===== Copy Email/Phone Functions =====
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(function() {
            showToast(`Copied: ${text}`, 'success');
        }).catch(function() {
            // Fallback
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast(`Copied: ${text}`, 'success');
        });
    };
    
    // ===== Track Contact Clicks (Analytics Ready) =====
    document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach(link => {
        link.addEventListener('click', function() {
            const type = this.href.startsWith('mailto:') ? 'Email' : 'Phone';
            const value = this.href.replace('mailto:', '').replace('tel:', '').split('?')[0];
            
            console.log(`Contact clicked: ${type} - ${value}`);
            
            // Google Analytics (when integrated)
            if (typeof gtag !== 'undefined') {
                gtag('event', 'contact_click', {
                    'event_category': 'Contact',
                    'event_label': `${type}: ${value}`
                });
            }
        });
    });
    
    // ===== External Link Tracking =====
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
        link.addEventListener('click', function() {
            console.log(`External link clicked: ${this.href}`);
            
            if (typeof gtag !== 'undefined') {
                gtag('event', 'external_link', {
                    'event_category': 'Outbound',
                    'event_label': this.href
                });
            }
        });
    });
    
    // ===== Lazy Loading Images =====
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    // ===== Back to Top Button =====
    const backToTop = document.createElement('button');
    backToTop.innerHTML = '↑';
    backToTop.className = 'back-to-top';
    backToTop.style.cssText = `
        position: fixed;
        bottom: 120px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #00FFFF, #00A8E8);
        color: #0A1628;
        border: none;
        border-radius: 50%;
        font-size: 1.5rem;
        cursor: pointer;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 998;
        box-shadow: 0 4px 15px rgba(0, 255, 255, 0.3);
    `;
    
    document.body.appendChild(backToTop);
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTop.style.opacity = '1';
            backToTop.style.visibility = 'visible';
        } else {
            backToTop.style.opacity = '0';
            backToTop.style.visibility = 'hidden';
        }
    });
    
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // ===== Service Worker Registration (PWA Ready) =====
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Uncomment when service-worker.js is created
            // navigator.serviceWorker.register('/service-worker.js')
            //     .then(registration => console.log('SW registered'))
            //     .catch(error => console.log('SW registration failed'));
        });
    }
    
    // ===== Console Branding =====
    console.log('%c🛡️ CYBERDUDEBIVASH®', 'color: #00FFFF; font-size: 24px; font-weight: bold; text-shadow: 0 0 10px rgba(0,255,255,0.5);');
    console.log('%cGlobal Cybersecurity Authority', 'color: #FF8C42; font-size: 14px;');
    console.log('%cwww.cyberdudebivash.com', 'color: #00D09C; font-size: 12px;');
    console.log('%c📧 iambivash@cyberdudebivash.com | 📞 +91 81798 81447', 'color: #999; font-size: 11px;');


document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const sidebar = document.getElementById("mobile-sidebar");
  const overlay = document.getElementById("mobile-overlay");
  const closeBtn = document.getElementById("sidebar-close");

  function closeMenu() {
    sidebar?.classList.remove("active");
    overlay?.classList.remove("active");
  }

  menuBtn?.addEventListener("click", () => {
    sidebar?.classList.add("active");
    overlay?.classList.add("active");
  });

  closeBtn?.addEventListener("click", closeMenu);
  overlay?.addEventListener("click", closeMenu);

  document.querySelectorAll("#mobile-sidebar a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });
});
