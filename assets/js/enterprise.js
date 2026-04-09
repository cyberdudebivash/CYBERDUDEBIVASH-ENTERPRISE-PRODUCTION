/**
 * CYBERDUDEBIVASH® Enterprise JS
 * enterprise.js — Production-grade interactive layer
 * © 2026 CYBERDUDEBIVASH Pvt. Ltd.
 */
(function () {
  'use strict';

  /* ===== COUNTER ANIMATION ===== */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.target) || 0;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(function () {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.floor(current).toLocaleString();
    }, duration / steps);
  }

  const counterObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-target]').forEach(function (el) {
    counterObs.observe(el);
  });

  /* ===== SCROLL ANIMATION FOR CARDS ===== */
  var visibleStyle = document.createElement('style');
  visibleStyle.textContent = '.anim-ready{opacity:0;transform:translateY(32px);transition:opacity .6s ease,transform .6s ease}.anim-ready.visible{opacity:1!important;transform:translateY(0)!important}';
  document.head.appendChild(visibleStyle);

  var cardSelectors = [
    '.platform-card', '.pricing-card', '.eco-card',
    '.testimonial-card', '.tfs-card', '.lead-card',
    '.cta-banner', '.trust-strip-inner'
  ];

  var cardObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        cardObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll(cardSelectors.join(',')).forEach(function (el) {
    el.classList.add('anim-ready');
    cardObs.observe(el);
  });

})();
  /* ===== THREAT TICKER ===== */
  var threats = [
    { sev: 'CRITICAL', msg: 'Ransomware campaign targeting Indian banks — LockBit variant detected' },
    { sev: 'HIGH',     msg: 'APT-29 spear-phishing wave targeting government emails in Southeast Asia' },
    { sev: 'CRITICAL', msg: 'Zero-day exploit in Apache ActiveMQ being actively weaponized' },
    { sev: 'HIGH',     msg: 'Mass credential stuffing attack on fintech APIs — 2.3M attempts/hr' },
    { sev: 'MEDIUM',   msg: 'BGP hijacking attempt detected targeting cloud CDN endpoints' },
    { sev: 'HIGH',     msg: 'New info-stealer campaign distributed via fake software downloads' },
    { sev: 'CRITICAL', msg: 'SQL injection campaign targeting e-commerce platforms in APAC' },
    { sev: 'HIGH',     msg: 'Suspicious lateral movement detected in enterprise AD environments' },
  ];
  var sevColor = { CRITICAL: '#ff3366', HIGH: '#ff6b35', MEDIUM: '#ffd700' };
  // All threat links route to intel platform
  var INTEL_URL = 'https://intel.cyberdudebivash.com/';
  var inner = document.getElementById('tickerInner');
  if (inner) {
    var doubled = threats.concat(threats);
    inner.innerHTML = doubled.map(function (t) {
      return '<a class="ticker-item" href="' + INTEL_URL + '" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit"><span style="color:' + sevColor[t.sev] + ';font-weight:700">● ' + t.sev + '</span> — ' + t.msg + '</a>';
    }).join('');
  }

  /* ===== LIVE THREAT FEED ===== */
  var feedData = [
    { time: '2m ago',  type: 'Ransomware',         target: 'Banking Sector',  country: 'IN', sev: 'CRITICAL' },
    { time: '8m ago',  type: 'APT Campaign',        target: 'Government',      country: 'SG', sev: 'CRITICAL' },
    { time: '15m ago', type: 'DDoS Attack',          target: 'E-Commerce',      country: 'US', sev: 'HIGH'     },
    { time: '22m ago', type: 'Phishing Campaign',    target: 'Healthcare',      country: 'GB', sev: 'HIGH'     },
    { time: '31m ago', type: 'SQL Injection',         target: 'Financial',       country: 'AE', sev: 'HIGH'     },
    { time: '45m ago', type: 'Zero-Day Exploit',     target: 'Cloud Infra',     country: 'DE', sev: 'CRITICAL' },
    { time: '1h ago',  type: 'Malware Dropper',      target: 'Enterprise',      country: 'JP', sev: 'MEDIUM'   },
    { time: '1h ago',  type: 'Credential Stuffing',  target: 'SaaS Platforms',  country: 'AU', sev: 'HIGH'     },
  ];
  var threatList = document.getElementById('threatList');
  if (threatList) {
    threatList.innerHTML = feedData.map(function (t) {
      var color = sevColor[t.sev];
      return '<div class="tf-item">' +
        '<div class="tf-item-meta">' +
          '<span class="tf-sev" style="color:' + color + ';border-color:' + color + '">' + t.sev + '</span>' +
          '<span class="tf-time">' + t.time + '</span>' +
        '</div>' +
        '<div class="tf-item-body"><strong>' + t.type + '</strong> — <span>' + t.target + '</span> <span class="tf-country">[' + t.country + ']</span></div>' +
      '</div>';
    }).join('');
    var countEl = document.getElementById('threatCount');
    if (countEl) countEl.textContent = feedData.length + ' active';
    var critEl = document.getElementById('criticalCount');
    if (critEl) critEl.textContent = feedData.filter(function (x) { return x.sev === 'CRITICAL'; }).length;
    var highEl = document.getElementById('highCount');
    if (highEl) highEl.textContent = feedData.filter(function (x) { return x.sev === 'HIGH'; }).length;
    var cntEl = document.getElementById('countriesCount');
    if (cntEl) cntEl.textContent = new Set(feedData.map(function (x) { return x.country; })).size;
    var blkEl = document.getElementById('blockedCount');
    if (blkEl) blkEl.textContent = '2,847';
    // Ensure dashboard button links to intel platform (runtime patch)
    document.querySelectorAll('a[href="threat-intel.html"]').forEach(function(a){
      a.href = 'https://intel.cyberdudebivash.com/';
      a.setAttribute('target','_blank');
      a.setAttribute('rel','noopener noreferrer');
    });
  }
  /* ===== PRICING TOGGLE ===== */
  var pricingToggle = document.getElementById('pricingToggle');
  if (pricingToggle) {
    pricingToggle.addEventListener('change', function () {
      var isAnnual = this.checked;
      document.querySelectorAll('.price-amount').forEach(function (el) {
        if (isAnnual && el.dataset.annual) {
          el.textContent = el.dataset.annual;
        } else if (!isAnnual && el.dataset.monthly) {
          el.textContent = el.dataset.monthly;
        }
      });
    });
  }

  /* ===== LEAD FORM ===== */
  var leadForm = document.getElementById('leadForm');
  if (leadForm) {
    leadForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = this.querySelector('button[type=submit]');
      var msg = document.getElementById('leadMessage');
      var orig = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      try {
        var fd = new FormData(this);
        var res = await fetch('https://formspree.io/f/mnjoydgl', {
          method: 'POST', body: fd, headers: { Accept: 'application/json' }
        });
        if (res.ok) {
          msg.style.cssText = 'display:block;background:rgba(0,208,156,.1);color:#00D09C;border:1px solid rgba(0,208,156,.3);padding:.85rem 1rem;border-radius:8px;font-size:.9rem;';
          msg.textContent = '✅ Request received! Our team will contact you within 24 hours.';
          this.reset();
          if (typeof gtag !== 'undefined') {
            gtag('event', 'lead_capture', { event_category: 'Lead', event_label: 'Free Assessment' });
          }
        } else { throw new Error('fail'); }
      } catch (err) {
        msg.style.cssText = 'display:block;background:rgba(255,51,102,.1);color:#ff3366;border:1px solid rgba(255,51,102,.3);padding:.85rem 1rem;border-radius:8px;font-size:.9rem;';
        msg.textContent = '❌ Submission failed. Email bivash@cyberdudebivash.com directly.';
      } finally {
        btn.textContent = orig;
        btn.disabled = false;
      }
    });
  }

  /* ===== BACK TO TOP ===== */
  var btt = document.getElementById('backToTop');
  if (btt) {
    window.addEventListener('scroll', function () {
      if (window.pageYOffset > 400) { btt.classList.add('visible'); }
      else { btt.classList.remove('visible'); }
    });
    btt.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ===== NAVBAR SCROLL ===== */
  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      if (window.pageYOffset > 80) {
        navbar.style.background = 'rgba(5,10,18,.98)';
      } else {
        navbar.style.background = 'rgba(10,22,40,.95)';
      }
    }, { passive: true });
  }
  /* ===== GA4 CONTACT TRACKING ===== */
  document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach(function (link) {
    link.addEventListener('click', function () {
      var type = this.href.startsWith('mailto:') ? 'Email' : 'Phone';
      var value = this.href.replace('mailto:', '').replace('tel:', '').split('?')[0];
      if (typeof gtag !== 'undefined') {
        gtag('event', 'contact_click', { event_category: 'Contact', event_label: type + ': ' + value });
      }
    });
  });

  /* ===== EXTERNAL LINK TRACKING ===== */
  document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'outbound_click', { event_category: 'Outbound', event_label: this.href });
      }
    });
  });

  /* ===== LAZY IMAGE LOADING (native fallback) ===== */
  if ('loading' in HTMLImageElement.prototype === false && 'IntersectionObserver' in window) {
    var imgObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          if (img.dataset.src) { img.src = img.dataset.src; obs.unobserve(img); }
        }
      });
    });
    document.querySelectorAll('img[data-src]').forEach(function (img) { imgObs.observe(img); });
  }

  /* ===== CONSOLE BRANDING ===== */
  console.log('%c🛡️ CYBERDUDEBIVASH®', 'color:#00FFFF;font-size:22px;font-weight:900;');
  console.log('%cGlobal AI-Powered Cybersecurity Platform', 'color:#FF8C42;font-size:13px;');
  console.log('%cwww.cyberdudebivash.com | bivash@cyberdudebivash.com', 'color:#00D09C;font-size:11px;');
