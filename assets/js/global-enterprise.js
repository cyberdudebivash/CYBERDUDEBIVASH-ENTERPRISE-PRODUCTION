/**
 * CYBERDUDEBIVASH® Global Enterprise Layer
 * Injects consistent enterprise nav, footer strip, floating CTA,
 * cookie consent, and WhatsApp button across ALL pages.
 * © 2026 CYBERDUDEBIVASH Pvt. Ltd.
 */
(function () {
  'use strict';

  var INTEL  = 'https://intel.cyberdudebivash.com/';
  var TOOLS  = 'https://tools.cyberdudebivash.com';
  var AI_HUB = 'https://cyberdudebivash.in';
  var BLOG   = 'https://blog.cyberdudebivash.in';
  var API_UP = 'https://intel.cyberdudebivash.com/upgrade.html?plan=pro&utm_source=global-nav';
  var API_REF= 'https://intel.cyberdudebivash.com/api/preview/';

  /* ─────────────────────────────────────────────────────────────
     ENTERPRISE NAVIGATION INJECTION
     Replaces any existing .navbar on every page with the
     production enterprise nav from index.html
  ───────────────────────────────────────────────────────────── */
  function injectEnterpriseNav() {
    var existing = document.querySelector('nav.navbar, nav#navbar, .navbar');
    if (!existing) return;

    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    function active(page) { return currentPage === page ? ' class="nav-link active"' : ' class="nav-link"'; }

    var navHTML = '\
<nav class="navbar gm-nav" id="navbar" role="navigation" aria-label="Main navigation" style="position:fixed;top:0;left:0;right:0;z-index:9999;">\
  <div class="container nav-inner" style="display:flex;align-items:center;padding:0 1.5rem;min-height:60px;max-width:1400px;margin:0 auto;">\
    <a href="index.html" class="nav-brand" aria-label="CYBERDUDEBIVASH Home" style="display:flex;align-items:center;gap:10px;text-decoration:none;margin-right:1.5rem;flex-shrink:0;">\
      <img src="./assets/images/logo.jpg" alt="CYBERDUDEBIVASH Logo" class="nav-logo" width="36" height="36" style="width:36px;height:36px;border-radius:6px;border:1px solid rgba(12,242,255,0.22);">\
      <span class="brand-text" style="font-family:Orbitron,sans-serif;font-size:0.82rem;font-weight:700;color:#e8edf5;white-space:nowrap;letter-spacing:0.04em;">CYBERDUDEBIVASH<sup>®</sup></span>\
    </a>\
    <ul class="nav-menu" id="navMenu" role="menubar" style="display:flex;align-items:center;list-style:none;margin:0;padding:0;gap:0;flex:1;">\
      <li class="nav-dropdown" style="position:relative;">\
        <a href="platforms.html"' + active('platforms.html') + ' style="display:flex;align-items:center;gap:4px;padding:0 0.8rem;height:60px;font-family:Inter,sans-serif;font-size:0.79rem;font-weight:500;color:#8b9ab5;text-decoration:none;border-bottom:2px solid transparent;transition:all 0.15s;">Platforms ▾</a>\
        <div class="dropdown-panel" style="position:absolute;top:100%;left:0;min-width:220px;background:#0a1829;border:1px solid rgba(255,255,255,0.07);border-top:2px solid #0cf2ff;border-radius:0 0 12px 12px;padding:0.5rem 0;box-shadow:0 4px 24px rgba(0,0,0,0.4);opacity:0;visibility:hidden;transform:translateY(-6px);transition:all 0.15s;z-index:9999;">\
          <a href="' + INTEL + '" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;transition:background 0.15s;"><span>📡</span>Sentinel APEX™ — Threat Intel</a>\
          <a href="' + AI_HUB + '" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>🧠</span>AI Security Hub</a>\
          <a href="' + TOOLS + '" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>🛠️</span>ThreatCore™ Tools Platform</a>\
          <a href="' + API_UP + '" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>⚙️</span>Intelligence API</a>\
          <a href="' + BLOG + '" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>📝</span>Research &amp; Intel Blog</a>\
        </div>\
      </li>\
      <li class="nav-dropdown" style="position:relative;">\
        <a href="services.html"' + active('services.html') + ' style="display:flex;align-items:center;gap:4px;padding:0 0.8rem;height:60px;font-family:Inter,sans-serif;font-size:0.79rem;font-weight:500;color:#8b9ab5;text-decoration:none;border-bottom:2px solid transparent;transition:all 0.15s;">Solutions ▾</a>\
        <div class="dropdown-panel" style="position:absolute;top:100%;left:0;min-width:210px;background:#0a1829;border:1px solid rgba(255,255,255,0.07);border-top:2px solid #0cf2ff;border-radius:0 0 12px 12px;padding:0.5rem 0;box-shadow:0 4px 24px rgba(0,0,0,0.4);opacity:0;visibility:hidden;transform:translateY(-6px);transition:all 0.15s;z-index:9999;">\
          <a href="soc-services.html" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>🔍</span>SOC-as-a-Service</a>\
          <a href="services.html" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>🗡️</span>Penetration Testing</a>\
          <a href="services.html" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>🚨</span>Incident Response</a>\
          <a href="services.html" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>🏢</span>Enterprise Consulting</a>\
          <a href="services.html" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>🛡️</span>Zero-Trust Architecture</a>\
          <a href="services.html" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>🎓</span>Security Training</a>\
        </div>\
      </li>\
      <li><a href="research.html"' + active('research.html') + ' style="display:flex;align-items:center;padding:0 0.8rem;height:60px;font-family:Inter,sans-serif;font-size:0.79rem;font-weight:500;color:#8b9ab5;text-decoration:none;border-bottom:2px solid transparent;transition:all 0.15s;">Research</a></li>\
      <li class="nav-dropdown" style="position:relative;">\
        <a href="' + API_REF + '" target="_blank" rel="noopener noreferrer" class="nav-link" style="display:flex;align-items:center;gap:4px;padding:0 0.8rem;height:60px;font-family:Inter,sans-serif;font-size:0.79rem;font-weight:500;color:#8b9ab5;text-decoration:none;border-bottom:2px solid transparent;transition:all 0.15s;">Developers ▾</a>\
        <div class="dropdown-panel" style="position:absolute;top:100%;left:0;min-width:210px;background:#0a1829;border:1px solid rgba(255,255,255,0.07);border-top:2px solid #0cf2ff;border-radius:0 0 12px 12px;padding:0.5rem 0;box-shadow:0 4px 24px rgba(0,0,0,0.4);opacity:0;visibility:hidden;transform:translateY(-6px);transition:all 0.15s;z-index:9999;">\
          <a href="' + API_UP + '" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>🔑</span>API Keys &amp; Access</a>\
          <a href="' + API_REF + '" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>📖</span>API Reference</a>\
          <a href="bug-bounty.html" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>🐛</span>Bug Bounty Program</a>\
          <a href="' + BLOG + '" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>📋</span>Changelog</a>\
        </div>\
      </li>\
      <li class="nav-dropdown" style="position:relative;">\
        <a href="about.html"' + active('about.html') + ' style="display:flex;align-items:center;gap:4px;padding:0 0.8rem;height:60px;font-family:Inter,sans-serif;font-size:0.79rem;font-weight:500;color:#8b9ab5;text-decoration:none;border-bottom:2px solid transparent;transition:all 0.15s;">Company ▾</a>\
        <div class="dropdown-panel" style="position:absolute;top:100%;left:0;min-width:190px;background:#0a1829;border:1px solid rgba(255,255,255,0.07);border-top:2px solid #0cf2ff;border-radius:0 0 12px 12px;padding:0.5rem 0;box-shadow:0 4px 24px rgba(0,0,0,0.4);opacity:0;visibility:hidden;transform:translateY(-6px);transition:all 0.15s;z-index:9999;">\
          <a href="about.html" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>🏢</span>About Us</a>\
          <a href="contact.html" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>📞</span>Contact</a>\
          <a href="bug-bounty.html" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>🛡️</span>Security &amp; Disclosure</a>\
          <a href="pricing.html" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>💰</span>Pricing</a>\
          <a href="status.html" style="display:flex;align-items:center;gap:10px;padding:0.6rem 1.2rem;font-size:0.81rem;color:#8b9ab5;text-decoration:none;"><span>📊</span>Platform Status</a>\
        </div>\
      </li>\
      <li><a href="pricing.html"' + active('pricing.html') + ' style="display:flex;align-items:center;padding:0 0.8rem;height:60px;font-family:Inter,sans-serif;font-size:0.79rem;font-weight:500;color:#8b9ab5;text-decoration:none;border-bottom:2px solid transparent;transition:all 0.15s;">Pricing</a></li>\
    </ul>\
    <div style="display:flex;align-items:center;gap:0.5rem;margin-left:auto;flex-shrink:0;">\
      <a href="status.html" style="display:flex;align-items:center;gap:5px;padding:0.28rem 0.65rem;background:rgba(0,217,126,0.12);border:1px solid rgba(0,217,126,0.25);border-radius:100px;font-size:0.68rem;font-weight:600;color:#00d97e;text-decoration:none;white-space:nowrap;" title="Platform Status">\
        <span style="width:6px;height:6px;background:#00d97e;border-radius:50%;display:inline-block;animation:pe-pulse 2s infinite;"></span>All Systems Operational\
      </a>\
      <a href="./react-portal/build/portal-landing.html" style="display:flex;align-items:center;gap:6px;padding:0.42rem 0.95rem;background:linear-gradient(135deg,#0e7aff,#0cf2ff);border-radius:8px;font-family:Inter,sans-serif;font-size:0.76rem;font-weight:600;color:#050c18;text-decoration:none;white-space:nowrap;">⚡ Client Portal</a>\
    </div>\
    <button class="hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false" style="display:none;flex-direction:column;gap:5px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px;cursor:pointer;margin-left:0.75rem;">\
      <span style="width:18px;height:2px;background:#e8edf5;display:block;transition:all 0.2s;"></span>\
      <span style="width:18px;height:2px;background:#e8edf5;display:block;transition:all 0.2s;"></span>\
      <span style="width:18px;height:2px;background:#e8edf5;display:block;transition:all 0.2s;"></span>\
    </button>\
  </div>\
</nav>';

    // Replace the existing nav
    var wrapper = document.createElement('div');
    wrapper.innerHTML = navHTML;
    existing.parentNode.replaceChild(wrapper.firstElementChild, existing);

    // Re-init hamburger
    var burger = document.getElementById('hamburger');
    var menu   = document.getElementById('navMenu');
    if (burger && menu) {
      burger.addEventListener('click', function () {
        var isOpen = menu.classList.contains('nav-open');
        menu.style.cssText = isOpen
          ? 'display:flex;'
          : 'display:flex;flex-direction:column;position:fixed;top:60px;left:0;right:0;background:#07111e;border-bottom:1px solid rgba(255,255,255,0.07);padding:1rem 0;z-index:9998;max-height:calc(100vh - 60px);overflow-y:auto;';
        menu.classList.toggle('nav-open');
        burger.setAttribute('aria-expanded', !isOpen);
      });
      // Close on link click
      menu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          menu.classList.remove('nav-open');
          menu.style.cssText = '';
        });
      });
    }

    // Dropdown hover
    document.querySelectorAll('.nav-dropdown').forEach(function (dd) {
      var panel = dd.querySelector('.dropdown-panel');
      if (!panel) return;
      dd.addEventListener('mouseenter', function () {
        panel.style.opacity = '1';
        panel.style.visibility = 'visible';
        panel.style.transform = 'translateY(0)';
      });
      dd.addEventListener('mouseleave', function () {
        panel.style.opacity = '0';
        panel.style.visibility = 'hidden';
        panel.style.transform = 'translateY(-6px)';
      });
      panel.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('mouseenter', function () { a.style.background = 'rgba(12,242,255,0.08)'; a.style.color = '#e8edf5'; });
        a.addEventListener('mouseleave', function () { a.style.background = ''; a.style.color = '#8b9ab5'; });
      });
    });

    // Highlight active nav link
    document.querySelectorAll('.nav-menu .nav-link, .nav-menu a').forEach(function (a) {
      try {
        var href = a.getAttribute('href') || '';
        if (href && !href.startsWith('http') && !href.startsWith('#') && href !== '') {
          if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            a.style.color = '#e8edf5';
            a.style.borderBottomColor = '#0cf2ff';
          }
        }
      } catch(e) {}
    });

    // Navbar scroll effect
    var nav = document.getElementById('navbar');
    if (nav) {
      window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
          nav.style.background = 'rgba(3,7,15,0.99)';
          nav.style.boxShadow = '0 1px 0 rgba(12,242,255,0.08),0 4px 24px rgba(0,0,0,0.6)';
        } else {
          nav.style.background = 'rgba(5,12,24,0.97)';
          nav.style.boxShadow = '0 1px 0 rgba(12,242,255,0.06),0 4px 16px rgba(0,0,0,0.4)';
        }
      }, { passive: true });
      nav.style.background = 'rgba(5,12,24,0.97)';
      nav.style.backdropFilter = 'blur(20px)';
      nav.style.borderBottom = '1px solid rgba(255,255,255,0.07)';
    }

    // Mobile: show hamburger, hide inline nav
    function handleResize() {
      var burger2 = document.getElementById('hamburger');
      var menu2   = document.getElementById('navMenu');
      if (!burger2 || !menu2) return;
      if (window.innerWidth <= 1024) {
        burger2.style.display = 'flex';
        if (!menu2.classList.contains('nav-open')) {
          menu2.style.display = 'none';
        }
        menu2.querySelectorAll('li').forEach(function (li) {
          li.style.width = '100%';
        });
        menu2.querySelectorAll('.nav-link, li > a').forEach(function (a) {
          a.style.height = 'auto';
          a.style.padding = '0.75rem 1.5rem';
        });
      } else {
        burger2.style.display = 'none';
        menu2.style.display = 'flex';
        menu2.style.flexDirection = 'row';
        menu2.classList.remove('nav-open');
      }
    }
    window.addEventListener('resize', handleResize, { passive: true });
    handleResize();
  }

  /* ─────────────────────────────────────────────────────────────
     WHATSAPP FLOATING BUTTON
  ───────────────────────────────────────────────────────────── */
  function injectWhatsApp() {
    if (document.getElementById('wa-float')) return;
    var btn = document.createElement('a');
    btn.id = 'wa-float';
    btn.href = 'https://wa.me/918179881447?text=Hi%2C%20I%27m%20interested%20in%20CYBERDUDEBIVASH%20cybersecurity%20services.%20Please%20help%20me.';
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.setAttribute('aria-label', 'Chat on WhatsApp');
    btn.title = 'Chat with us on WhatsApp';
    btn.innerHTML = '\
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">\
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>\
      </svg>';
    btn.style.cssText = 'position:fixed;bottom:100px;right:24px;width:56px;height:56px;background:#25D366;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(37,211,102,0.4);z-index:9997;transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;';
    btn.addEventListener('mouseenter', function () { btn.style.transform = 'scale(1.1)'; btn.style.boxShadow = '0 6px 28px rgba(37,211,102,0.55)'; });
    btn.addEventListener('mouseleave', function () { btn.style.transform = ''; btn.style.boxShadow = '0 4px 20px rgba(37,211,102,0.4)'; });
    document.body.appendChild(btn);

    // Tooltip
    var tip = document.createElement('div');
    tip.textContent = 'Chat with us';
    tip.style.cssText = 'position:fixed;bottom:115px;right:90px;background:#1a1a2e;color:#e8edf5;font-size:0.72rem;padding:0.35rem 0.7rem;border-radius:6px;border:1px solid rgba(255,255,255,0.1);white-space:nowrap;opacity:0;transition:opacity 0.2s;z-index:9996;pointer-events:none;font-family:Inter,sans-serif;';
    document.body.appendChild(tip);
    btn.addEventListener('mouseenter', function () { tip.style.opacity = '1'; });
    btn.addEventListener('mouseleave', function () { tip.style.opacity = '0'; });
  }

  /* ─────────────────────────────────────────────────────────────
     COOKIE CONSENT BANNER
  ───────────────────────────────────────────────────────────── */
  function injectCookieConsent() {
    if (localStorage.getItem('cdb_cookie_consent')) return;
    if (document.getElementById('cdb-cookie')) return;

    var banner = document.createElement('div');
    banner.id = 'cdb-cookie';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML = '\
      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">\
        <div style="flex:1;min-width:200px;">\
          <strong style="color:#e8edf5;font-size:0.85rem;">🍪 We use cookies</strong>\
          <p style="color:#8b9ab5;font-size:0.77rem;margin:0.3rem 0 0;">We use cookies to enhance your experience, analyze traffic, and serve personalized security content. By continuing you agree to our <a href="privacy.html" style="color:#0cf2ff;">Privacy Policy</a>.</p>\
        </div>\
        <div style="display:flex;gap:0.5rem;flex-shrink:0;">\
          <button id="cdb-cookie-accept" style="padding:0.45rem 1.1rem;background:linear-gradient(135deg,#0e7aff,#0cf2ff);border:none;border-radius:6px;font-size:0.78rem;font-weight:600;color:#050c18;cursor:pointer;">Accept All</button>\
          <button id="cdb-cookie-decline" style="padding:0.45rem 1rem;background:transparent;border:1px solid rgba(255,255,255,0.15);border-radius:6px;font-size:0.78rem;color:#8b9ab5;cursor:pointer;">Decline</button>\
        </div>\
      </div>';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:rgba(7,17,30,0.98);border-top:1px solid rgba(12,242,255,0.15);padding:1rem 1.5rem;z-index:99999;font-family:Inter,sans-serif;backdrop-filter:blur(12px);box-shadow:0 -4px 24px rgba(0,0,0,0.4);';
    document.body.appendChild(banner);

    function accept() {
      localStorage.setItem('cdb_cookie_consent', 'accepted');
      banner.style.transform = 'translateY(100%)';
      banner.style.transition = 'transform 0.3s ease';
      setTimeout(function () { banner.remove(); }, 350);
    }
    function decline() {
      localStorage.setItem('cdb_cookie_consent', 'declined');
      banner.remove();
    }
    var acceptBtn = document.getElementById('cdb-cookie-accept');
    var declineBtn = document.getElementById('cdb-cookie-decline');
    if (acceptBtn) acceptBtn.addEventListener('click', accept);
    if (declineBtn) declineBtn.addEventListener('click', decline);
  }

  /* ─────────────────────────────────────────────────────────────
     LIVE THREAT COUNTER — top alert bar update
  ───────────────────────────────────────────────────────────── */
  function initLiveCounter() {
    var count = 2847;
    setInterval(function () {
      count += Math.floor(Math.random() * 4) + 1;
      document.querySelectorAll('.live-count, [data-live-threats]').forEach(function (el) {
        el.textContent = count.toLocaleString();
      });
    }, 5000);
  }

  /* ─────────────────────────────────────────────────────────────
     FIX BROKEN LINKS — replace href="" with proper URLs
  ───────────────────────────────────────────────────────────── */
  function fixBrokenLinks() {
    document.querySelectorAll('a[href=""], a[href="#"]').forEach(function (a) {
      var text = (a.textContent || '').toLowerCase().trim();
      if (text.includes('trust') || text.includes('trust center')) a.href = 'bug-bounty.html';
      else if (text.includes('status') || text.includes('system status')) a.href = 'status.html';
      else if (text.includes('security') || text.includes('advisori')) a.href = 'bug-bounty.html';
      else if (text.includes('platform')) a.href = 'platforms.html';
      else if (text === '' || text === '—' || text === '-') a.removeAttribute('href');
    });
  }

  /* ─────────────────────────────────────────────────────────────
     PAGE BODY PADDING — ensure content not hidden under fixed nav
  ───────────────────────────────────────────────────────────── */
  function fixBodyPadding() {
    var body = document.body;
    if (!body.style.paddingTop || parseInt(body.style.paddingTop) < 60) {
      // Only add if page doesn't already handle it
      var firstEl = body.children[0];
      if (firstEl && firstEl.tagName === 'CANVAS') firstEl = body.children[1];
      if (firstEl && getComputedStyle(firstEl).position !== 'fixed') {
        // Check if there's already a top-contact-bar
        var tcBar = document.querySelector('.alert-bar, .top-contact-bar');
        if (!tcBar) {
          body.style.paddingTop = body.style.paddingTop || '60px';
        }
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────
     SMOOTH SCROLL FOR ANCHOR LINKS
  ───────────────────────────────────────────────────────────── */
  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var hash = a.getAttribute('href');
      if (!hash || hash.length < 2) return;
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      var offset = 76;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────────────────────── */
  function init() {
    injectEnterpriseNav();
    injectWhatsApp();
    injectCookieConsent();
    initLiveCounter();
    fixBrokenLinks();
    fixBodyPadding();
    initSmoothScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
