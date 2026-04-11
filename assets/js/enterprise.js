/**
 * CYBERDUDEBIVASH® Enterprise JS v3.0
 * Ultra-professional interactive layer
 * © 2026 CYBERDUDEBIVASH Pvt. Ltd.
 */
(function () {
  'use strict';

  /* ── SMOOTH SCROLL ─────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var navH = (document.getElementById('navbar') || {offsetHeight: 120}).offsetHeight;
    var top = target.getBoundingClientRect().top + window.pageYOffset - navH - 16;
    window.scrollTo({ top: top, behavior: 'smooth' });
  });

  /* ── COUNTER ANIMATION ─────────────────────────────────────── */
  var counterObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      var target = parseFloat(el.dataset.target) || 0;
      var duration = 1800;
      var steps = 55;
      var inc = target / steps;
      var current = 0;
      var timer = setInterval(function () {
        current += inc;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = Math.floor(current).toLocaleString();
      }, duration / steps);
      counterObs.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-target]').forEach(function (el) { counterObs.observe(el); });

  /* ── SCROLL ANIMATIONS ─────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = '.anim-up{opacity:0;transform:translateY(28px);transition:opacity .6s ease,transform .6s ease}.anim-up.visible{opacity:1!important;transform:none!important}';
  document.head.appendChild(style);
  var animObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('visible'); animObs.unobserve(e.target); }
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -28px 0px' });
  document.querySelectorAll('.platform-card,.pricing-card,.eco-card,.testimonial-card,.tfs-card,.pdom-card,.lead-card,.cta-banner,.trust-strip-inner').forEach(function (el) {
    el.classList.add('anim-up'); animObs.observe(el);
  });

  /* ── THREAT TICKER ─────────────────────────────────────────── */
  var INTEL = 'https://intel.cyberdudebivash.com/';
  var threats = [
    { sev: 'CRITICAL', msg: 'Ransomware campaign targeting Indian banks — LockBit variant detected' },
    { sev: 'HIGH',     msg: 'APT-29 spear-phishing wave targeting government emails — Southeast Asia' },
    { sev: 'CRITICAL', msg: 'Zero-day exploit in Apache ActiveMQ being actively weaponized globally' },
    { sev: 'HIGH',     msg: 'Mass credential stuffing attack on fintech APIs — 2.3M attempts/hr' },
    { sev: 'MEDIUM',   msg: 'BGP hijacking attempt detected targeting cloud CDN endpoints' },
    { sev: 'HIGH',     msg: 'New info-stealer distributed via fake software installers — APAC' },
    { sev: 'CRITICAL', msg: 'SQL injection campaign targeting e-commerce platforms — 500+ sites hit' },
    { sev: 'HIGH',     msg: 'Lateral movement detected in enterprise AD environments' },
  ];
  var sevColor = { CRITICAL: '#ff3366', HIGH: '#ff6b35', MEDIUM: '#ffd700' };
  var inner = document.getElementById('tickerInner');
  if (inner) {
    var items = threats.concat(threats).map(function (t) {
      return '<a class="ticker-item" href="' + INTEL + '" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit">' +
        '<span style="color:' + sevColor[t.sev] + ';font-weight:700">● ' + t.sev + '</span> — ' + t.msg + '</a>';
    }).join('');
    inner.innerHTML = items;
  }

  /* ── LIVE THREAT FEED ──────────────────────────────────────── */
  var feedData = [
    { time: '2m ago',  type: 'Ransomware',        target: 'Banking Sector',    country: 'IN', sev: 'CRITICAL' },
    { time: '8m ago',  type: 'APT Campaign',       target: 'Government',        country: 'SG', sev: 'CRITICAL' },
    { time: '15m ago', type: 'DDoS Attack',         target: 'E-Commerce',        country: 'US', sev: 'HIGH'     },
    { time: '22m ago', type: 'Phishing Campaign',   target: 'Healthcare',        country: 'GB', sev: 'HIGH'     },
    { time: '31m ago', type: 'SQL Injection',        target: 'Financial Sector',  country: 'AE', sev: 'HIGH'     },
    { time: '45m ago', type: 'Zero-Day Exploit',    target: 'Cloud Infrastructure', country: 'DE', sev: 'CRITICAL' },
    { time: '1h ago',  type: 'Malware Dropper',     target: 'Enterprise',        country: 'JP', sev: 'MEDIUM'   },
    { time: '1h ago',  type: 'Credential Stuffing', target: 'SaaS Platforms',    country: 'AU', sev: 'HIGH'     },
  ];
  var threatList = document.getElementById('threatList');
  if (threatList) {
    var flagMap = { IN:'🇮🇳', SG:'🇸🇬', US:'🇺🇸', GB:'🇬🇧', AE:'🇦🇪', DE:'🇩🇪', JP:'🇯🇵', AU:'🇦🇺' };
    threatList.innerHTML = feedData.map(function (t) {
      var c = sevColor[t.sev];
      return '<div class="tf-item">' +
        '<div class="tf-item-meta">' +
          '<span class="tf-sev" style="color:' + c + ';border-color:' + c + ';background:' + c + '18">' + t.sev + '</span>' +
          '<span class="tf-time">' + t.time + '</span>' +
        '</div>' +
        '<div class="tf-item-body"><strong>' + t.type + '</strong> — <span>' + t.target + '</span> ' +
          '<span class="tf-country">' + (flagMap[t.country] || '') + ' ' + t.country + '</span>' +
        '</div>' +
        '</div>';
    }).join('');
    var cntEl = document.getElementById('threatCount');
    if (cntEl) cntEl.textContent = feedData.length + ' active';
    var critEl = document.getElementById('criticalCount');
    if (critEl) critEl.textContent = feedData.filter(function (x) { return x.sev === 'CRITICAL'; }).length;
    var highEl = document.getElementById('highCount');
    if (highEl) highEl.textContent = feedData.filter(function (x) { return x.sev === 'HIGH'; }).length;
    var cntryEl = document.getElementById('countriesCount');
    if (cntryEl) cntryEl.textContent = new Set(feedData.map(function (x) { return x.country; })).size;
    var blkEl = document.getElementById('blockedCount');
    if (blkEl) blkEl.textContent = '2,847';
    // Runtime patch — replace any remaining internal threat-intel.html links
    document.querySelectorAll('a[href="threat-intel.html"]').forEach(function (a) {
      a.href = INTEL; a.target = '_blank'; a.rel = 'noopener noreferrer';
    });
  }

  /* ── PRICING TOGGLE ────────────────────────────────────────── */
  var pricingToggle = document.getElementById('pricingToggle');
  if (pricingToggle) {
    pricingToggle.addEventListener('change', function () {
      var annual = this.checked;
      document.querySelectorAll('.price-amount').forEach(function (el) {
        var val = annual ? el.dataset.annual : el.dataset.monthly;
        if (val) el.textContent = val;
      });
    });
  }

  /* ── LEAD FORM ─────────────────────────────────────────────── */
  var leadForm = document.getElementById('leadForm');
  if (leadForm) {
    leadForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = this.querySelector('button[type=submit]');
      var msg = document.getElementById('leadMessage');
      var orig = btn.textContent;
      btn.textContent = 'Sending...'; btn.disabled = true;
      try {
        var res = await fetch('https://formspree.io/f/xkordvzn', {
          method: 'POST', body: new FormData(this), headers: { Accept: 'application/json' }
        });
        if (res.ok) {
          msg.style.cssText = 'display:block;background:rgba(0,208,156,.1);color:#00D09C;border:1px solid rgba(0,208,156,.25);padding:.82rem 1rem;border-radius:8px;font-size:.88rem;margin-top:.5rem';
          msg.textContent = '✅ Request received! Our team will contact you within 24 hours.';
          this.reset();
          if (typeof gtag !== 'undefined') gtag('event', 'lead_capture', { event_category: 'Lead', event_label: 'Free Assessment' });
        } else throw new Error('fail');
      } catch (err) {
        msg.style.cssText = 'display:block;background:rgba(255,51,102,.1);color:#ff3366;border:1px solid rgba(255,51,102,.25);padding:.82rem 1rem;border-radius:8px;font-size:.88rem;margin-top:.5rem';
        msg.textContent = '❌ Failed. Email bivash@cyberdudebivash.com directly.';
      } finally {
        btn.textContent = orig; btn.disabled = false;
      }
    });
  }

  /* ── NAVBAR SCROLL ─────────────────────────────────────────── */
  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      if (window.pageYOffset > 60) {
        navbar.style.background = 'rgba(3,7,15,.99)';
        navbar.style.boxShadow = '0 1px 0 rgba(0,255,255,.1), 0 8px 32px rgba(0,0,0,.6)';
      } else {
        navbar.style.background = '';
        navbar.style.boxShadow = '';
      }
    }, { passive: true });
  }

  /* ── BACK TO TOP ───────────────────────────────────────────── */
  var btt = document.getElementById('backToTop');
  if (btt) {
    window.addEventListener('scroll', function () {
      btt.classList.toggle('visible', window.pageYOffset > 400);
    }, { passive: true });
    btt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ── HAMBURGER / MOBILE NAV ────────────────────────────────── */
  var ham = document.getElementById('hamburger');
  var navMenu = document.getElementById('navMenu');
  if (ham && navMenu) {
    ham.addEventListener('click', function () {
      var open = navMenu.classList.toggle('active');
      ham.classList.toggle('active', open);
      ham.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    navMenu.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        navMenu.classList.remove('active');
        ham.classList.remove('active');
        ham.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
    // Close on outside click
    document.addEventListener('click', function (e) {
      if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && !ham.contains(e.target)) {
        navMenu.classList.remove('active');
        ham.classList.remove('active');
        ham.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ── GA4 TRACKING ──────────────────────────────────────────── */
  document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (typeof gtag === 'undefined') return;
      var type = this.href.startsWith('mailto:') ? 'Email' : 'Phone';
      gtag('event', 'contact_click', { event_category: 'Contact', event_label: type });
    });
  });
  document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (typeof gtag === 'undefined') return;
      gtag('event', 'outbound_click', { event_category: 'Outbound', event_label: this.href });
    });
  });

  /* ── LAZY IMAGES ───────────────────────────────────────────── */
  if ('IntersectionObserver' in window) {
    var imgObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting && e.target.dataset.src) {
          e.target.src = e.target.dataset.src;
          obs.unobserve(e.target);
        }
      });
    });
    document.querySelectorAll('img[data-src]').forEach(function (img) { imgObs.observe(img); });
  }

  /* ── CONSOLE BRANDING ──────────────────────────────────────── */
  console.log('%c🛡️ CYBERDUDEBIVASH®', 'color:#00FFFF;font-size:22px;font-weight:900;font-family:monospace');
  console.log('%cGlobal AI-Powered Cybersecurity Platform', 'color:#FF8C42;font-size:13px');
  console.log('%cwww.cyberdudebivash.com | bivash@cyberdudebivash.com', 'color:#00D09C;font-size:11px');

}());
