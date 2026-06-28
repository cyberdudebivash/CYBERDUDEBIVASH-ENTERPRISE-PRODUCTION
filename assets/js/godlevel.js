/* ============================================================
   CYBERDUDEBIVASH® — GODLEVEL.JS
   Interactive features: ROI Calculator, FAQ, Sticky CTA Bar,
   Counter Animations, Newsletter, Scroll-to-Top
   ============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* UTILS                                                                */
  /* ------------------------------------------------------------------ */

  function formatCurrency(n) {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000)    return '$' + Math.round(n / 1000) + 'K';
    return '$' + Math.round(n).toLocaleString();
  }

  function formatNumber(n) {
    return Math.round(n).toLocaleString();
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  /* ------------------------------------------------------------------ */
  /* ROI CALCULATOR                                                       */
  /* ------------------------------------------------------------------ */

  var CYBERDUDEBIVASH_COST = 299 * 12; // Professional plan annual cost = $3,588

  function calcROI(employees, budget, incidents) {
    var annualSavings = (incidents * 0.75 * 42000) + (budget * 0.40) - CYBERDUDEBIVASH_COST;
    annualSavings = Math.max(0, annualSavings);
    var threeYearROI = CYBERDUDEBIVASH_COST > 0
      ? Math.round(((annualSavings * 3 - CYBERDUDEBIVASH_COST * 3) / (CYBERDUDEBIVASH_COST * 3)) * 100)
      : 0;
    var incidentsPrevented = Math.round(incidents * 0.75);
    return { annualSavings: annualSavings, threeYearROI: threeYearROI, incidentsPrevented: incidentsPrevented };
  }

  function updateSliderTrack(input) {
    var min = parseFloat(input.min);
    var max = parseFloat(input.max);
    var val = parseFloat(input.value);
    var pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty('--range-pct', pct.toFixed(1) + '%');
  }

  function initROICalculator() {
    var empSlider      = document.getElementById('roi-employees');
    var budgetSlider   = document.getElementById('roi-budget');
    var incSlider      = document.getElementById('roi-incidents');

    if (!empSlider || !budgetSlider || !incSlider) return;

    var empVal    = document.getElementById('roi-employees-val');
    var budgetVal = document.getElementById('roi-budget-val');
    var incVal    = document.getElementById('roi-incidents-val');

    var outSavings    = document.getElementById('roi-out-savings');
    var outROI        = document.getElementById('roi-out-roi');
    var outPrevented  = document.getElementById('roi-out-prevented');

    function updateDisplay() {
      var emp      = parseInt(empSlider.value, 10);
      var budget   = parseInt(budgetSlider.value, 10);
      var inc      = parseInt(incSlider.value, 10);

      empVal.textContent    = emp.toLocaleString() + ' employees';
      budgetVal.textContent = formatCurrency(budget);
      incVal.textContent    = inc + ' incidents/yr';

      var result = calcROI(emp, budget, inc);

      if (outSavings)   outSavings.textContent   = formatCurrency(result.annualSavings);
      if (outROI)       outROI.textContent        = result.threeYearROI.toLocaleString() + '%';
      if (outPrevented) outPrevented.textContent  = formatNumber(result.incidentsPrevented) + ' incidents';

      updateSliderTrack(empSlider);
      updateSliderTrack(budgetSlider);
      updateSliderTrack(incSlider);
    }

    empSlider.addEventListener('input', updateDisplay);
    budgetSlider.addEventListener('input', updateDisplay);
    incSlider.addEventListener('input', updateDisplay);

    // Initial render
    updateDisplay();
  }

  /* ------------------------------------------------------------------ */
  /* FAQ ACCORDION                                                        */
  /* ------------------------------------------------------------------ */

  function initFAQ() {
    var items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    items.forEach(function (item) {
      var btn    = item.querySelector('.faq-question');
      var answer = item.querySelector('.faq-answer');
      if (!btn || !answer) return;

      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');

        // Close all
        items.forEach(function (i) {
          i.classList.remove('is-open');
        });

        // Toggle clicked
        if (!isOpen) {
          item.classList.add('is-open');
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* STICKY BOTTOM CTA BAR                                               */
  /* ------------------------------------------------------------------ */

  function initStickyBar() {
    var bar = document.getElementById('gl-sticky-bar');
    if (!bar) return;

    var closeBtn = bar.querySelector('.sticky-bar-close');
    var dismissed = false;

    function onScroll() {
      if (dismissed) return;
      var scrollPct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrollPct >= 40) {
        bar.classList.add('is-visible');
      } else {
        bar.classList.remove('is-visible');
      }
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        dismissed = true;
        bar.classList.add('is-dismissed');
        bar.classList.remove('is-visible');
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------------ */
  /* COUNTER ANIMATIONS (IntersectionObserver)                            */
  /* ------------------------------------------------------------------ */

  function animateCounter(el, target, suffix, prefix, duration) {
    var start     = null;
    var startVal  = 0;
    prefix  = prefix  || '';
    suffix  = suffix  || '';
    duration = duration || 2000;

    function ease(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function step(timestamp) {
      if (!start) start = timestamp;
      var elapsed  = timestamp - start;
      var progress = clamp(elapsed / duration, 0, 1);
      var eased    = ease(progress);
      var current  = Math.round(startVal + (target - startVal) * eased);

      // Format large numbers with commas
      el.textContent = prefix + current.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = prefix + target.toLocaleString() + suffix;
      }
    }

    requestAnimationFrame(step);
  }

  function initCounters() {
    var counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !entry.target.dataset.counted) {
          entry.target.dataset.counted = '1';
          var el      = entry.target;
          var target  = parseFloat(el.dataset.counter);
          var suffix  = el.dataset.suffix  || '';
          var prefix  = el.dataset.prefix  || '';
          var duration = parseInt(el.dataset.duration || '2000', 10);
          animateCounter(el, target, suffix, prefix, duration);
        }
      });
    }, { threshold: 0.3 });

    counters.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* NEWSLETTER FORM                                                      */
  /* ------------------------------------------------------------------ */

  function initNewsletter() {
    var form       = document.getElementById('gl-newsletter-form');
    var successBox = document.getElementById('gl-newsletter-success');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var emailInput = form.querySelector('input[type="email"]');
      if (!emailInput) return;

      var email = emailInput.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailInput.style.borderColor = '#ff4444';
        emailInput.focus();
        setTimeout(function () { emailInput.style.borderColor = ''; }, 2000);
        return;
      }

      var submitBtn = form.querySelector('.newsletter-submit');
      if (submitBtn) {
        submitBtn.textContent = 'Subscribing...';
        submitBtn.disabled = true;
      }

      // POST to Formspree endpoint
      fetch('https://formspree.io/f/xwpegjqv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: email, _subject: 'CYBERDUDEBIVASH Intelligence Brief Subscription' })
      })
        .then(function (res) {
          if (form && successBox) {
            form.style.display = 'none';
            successBox.style.display = 'block';
          }
        })
        .catch(function () {
          // Fallback: mailto
          window.location.href = 'mailto:bivash@cyberdudebivash.com?subject=Intelligence+Brief+Subscription&body=Subscribe+email:+' + encodeURIComponent(email);
          if (submitBtn) {
            submitBtn.textContent = 'Subscribe Free →';
            submitBtn.disabled = false;
          }
        });
    });
  }

  /* ------------------------------------------------------------------ */
  /* SCROLL TO TOP BUTTON                                                 */
  /* ------------------------------------------------------------------ */

  function initScrollTop() {
    var btn = document.getElementById('gl-scroll-top');
    if (!btn) return;

    window.addEventListener('scroll', function () {
      if (window.scrollY > 500) {
        btn.classList.add('is-visible');
      } else {
        btn.classList.remove('is-visible');
      }
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------------------ */
  /* INIT ON DOM READY                                                    */
  /* ------------------------------------------------------------------ */

  function init() {
    initROICalculator();
    initFAQ();
    initStickyBar();
    initCounters();
    initNewsletter();
    initScrollTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
