/**
 * CYBERDUDEBIVASH® addons.js v4.0
 * Attack Map + Dashboard Preview + Sound + Live Feed Upgrades
 * Fully modular — zero impact on existing functionality
 * © 2026 CYBERDUDEBIVASH Pvt. Ltd.
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════
     1. SOUND ALERT SYSTEM
  ══════════════════════════════════════════════ */
  var soundEnabled = false;
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx && AudioCtx) audioCtx = new AudioCtx();
    return audioCtx;
  }

  function playCriticalAlert() {
    if (!soundEnabled) return;
    try {
      var ctx = getAudioCtx();
      if (!ctx) return;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) { /* silent fail */ }
  }

  var soundBtn = document.getElementById('soundToggleBtn');
  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      soundEnabled = !soundEnabled;
      // Resume AudioContext on user gesture
      if (soundEnabled) {
        var ctx = getAudioCtx();
        if (ctx && ctx.state === 'suspended') ctx.resume();
      }
      soundBtn.textContent = soundEnabled ? '🔊 Sound Alerts ON' : '🔇 Sound Alerts';
      soundBtn.classList.toggle('sound-on', soundEnabled);
    });
  }

  /* ══════════════════════════════════════════════
     2. LIVE THREAT FEED — auto-update simulation
  ══════════════════════════════════════════════ */
  var newThreats = [
    { time: 'just now', type: 'Supply Chain Attack',    target: 'Software Vendor',   country: 'KR', sev: 'CRITICAL' },
    { time: 'just now', type: 'DDoS Amplification',    target: 'Financial Sector',   country: 'BR', sev: 'HIGH'     },
    { time: 'just now', type: 'Zero-Day Exploit',      target: 'Healthcare IT',      country: 'CA', sev: 'CRITICAL' },
    { time: 'just now', type: 'Insider Threat',        target: 'Tech Company',       country: 'FR', sev: 'HIGH'     },
    { time: 'just now', type: 'Cryptojacking',         target: 'Cloud Infrastructure', country: 'NL', sev: 'MEDIUM' },
    { time: 'just now', type: 'Firmware Attack',       target: 'Industrial SCADA',   country: 'UA', sev: 'CRITICAL' },
    { time: 'just now', type: 'API Abuse',             target: 'FinTech Platform',   country: 'SG', sev: 'HIGH'     },
    { time: 'just now', type: 'AI-Powered Phishing',   target: 'Enterprise HR',      country: 'IN', sev: 'HIGH'     },
  ];
  var sevColor = { CRITICAL: '#ff3366', HIGH: '#ff6b35', MEDIUM: '#ffd700' };
  var flagMap = { IN:'🇮🇳', SG:'🇸🇬', US:'🇺🇸', GB:'🇬🇧', AE:'🇦🇪', DE:'🇩🇪', JP:'🇯🇵', AU:'🇦🇺', KR:'🇰🇷', BR:'🇧🇷', CA:'🇨🇦', FR:'🇫🇷', NL:'🇳🇱', UA:'🇺🇦' };
  var feedUpdateIdx = 0;

  function injectNewThreat() {
    var list = document.getElementById('threatList');
    if (!list) return;
    var t = newThreats[feedUpdateIdx % newThreats.length];
    feedUpdateIdx++;
    var c = sevColor[t.sev];
    var div = document.createElement('div');
    div.className = 'tf-item tf-item-new' + (t.sev === 'CRITICAL' ? ' tf-item-critical tf-critical-flash' : '');
    div.innerHTML =
      '<div class="tf-item-meta">' +
        '<span class="tf-sev" style="color:' + c + ';border-color:' + c + ';background:' + c + '18">' + t.sev + '</span>' +
        '<span class="tf-time">just now</span>' +
      '</div>' +
      '<div class="tf-item-body"><strong>' + t.type + '</strong> — <span>' + t.target + '</span> ' +
        '<span class="tf-country">' + (flagMap[t.country] || '') + ' ' + t.country + '</span>' +
      '</div>';
    // Prepend and remove last if > 10
    list.insertBefore(div, list.firstChild);
    var items = list.querySelectorAll('.tf-item');
    if (items.length > 8) list.removeChild(items[items.length - 1]);
    if (t.sev === 'CRITICAL') playCriticalAlert();
  }

  // Start feed updates after 6s, every 7s
  setTimeout(function () {
    injectNewThreat();
    setInterval(injectNewThreat, 7000);
  }, 6000);

  /* ══════════════════════════════════════════════
     3. GLOBAL ATTACK MAP (Canvas-based SVG-style)
  ══════════════════════════════════════════════ */
  var mapCanvas = document.getElementById('attackMapCanvas');
  if (!mapCanvas) return;

  // Lazy init — only run when visible
  var mapInited = false;
  var mapObs = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !mapInited) {
      mapInited = true;
      initAttackMap();
      mapObs.disconnect();
    }
  }, { threshold: 0.2 });
  mapObs.observe(mapCanvas);

  function initAttackMap() {
    var canvas = mapCanvas;
    var ctx = canvas.getContext('2d');
    var W, H;

    // Country coordinates [lng, lat] → canvas x,y
    // Simplified Mercator projection
    var countries = [
      { name: 'USA',    lat: 37.09,  lng: -95.71,  flag: '🇺🇸' },
      { name: 'India',  lat: 20.59,  lng: 78.96,   flag: '🇮🇳' },
      { name: 'China',  lat: 35.86,  lng: 104.19,  flag: '🇨🇳' },
      { name: 'Russia', lat: 61.52,  lng: 105.31,  flag: '🇷🇺' },
      { name: 'Germany',lat: 51.16,  lng: 10.45,   flag: '🇩🇪' },
      { name: 'Brazil', lat: -14.23, lng: -51.92,  flag: '🇧🇷' },
      { name: 'UK',     lat: 55.37,  lng: -3.43,   flag: '🇬🇧' },
      { name: 'Japan',  lat: 36.20,  lng: 138.25,  flag: '🇯🇵' },
      { name: 'Australia',lat: -25.27,lng: 133.77, flag: '🇦🇺' },
      { name: 'Canada', lat: 56.13,  lng: -106.34, flag: '🇨🇦' },
      { name: 'UAE',    lat: 23.42,  lng: 53.84,   flag: '🇦🇪' },
      { name: 'France', lat: 46.22,  lng: 2.21,    flag: '🇫🇷' },
      { name: 'S.Korea',lat: 35.90,  lng: 127.77,  flag: '🇰🇷' },
      { name: 'Singapore',lat: 1.35, lng: 103.81,  flag: '🇸🇬' },
    ];

    function latlngToXY(lat, lng) {
      var x = (lng + 180) / 360 * W;
      var latRad = lat * Math.PI / 180;
      var mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
      var y = (Math.PI - mercN) / (2 * Math.PI) * H;
      return { x: x, y: y };
    }

    // Attack particles
    var attacks = [];
    var SEV_COLORS = ['#ff3366', '#ff6b35', '#ffd700'];

    function spawnAttack() {
      var src = countries[Math.floor(Math.random() * countries.length)];
      var tgt = countries[Math.floor(Math.random() * countries.length)];
      if (src === tgt) return;
      var sp = latlngToXY(src.lat, src.lng);
      var tp = latlngToXY(tgt.lat, tgt.lng);
      var sev = Math.floor(Math.random() * 3);
      attacks.push({
        sx: sp.x, sy: sp.y, tx: tp.x, ty: tp.y,
        prog: 0, speed: 0.004 + Math.random() * 0.006,
        color: SEV_COLORS[sev],
        alpha: 1, tail: [], done: false,
        dot: { x: sp.x, y: sp.y }
      });
    }

    // Spawn initial attacks
    for (var i = 0; i < 8; i++) spawnAttack();
    setInterval(spawnAttack, 900);

    function resize() {
      W = canvas.offsetWidth || 800;
      H = Math.min(420, W * 0.52);
      canvas.width = W;
      canvas.height = H;
    }

    function drawWorldOutline() {
      // Simple continent blobs using canvas paths (lightweight, no library)
      ctx.strokeStyle = 'rgba(0,255,255,.12)';
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(0,255,255,.03)';

      // North America
      ctx.beginPath();
      ctx.moveTo(W*.12, H*.12); ctx.lineTo(W*.28, H*.10); ctx.lineTo(W*.32, H*.25);
      ctx.lineTo(W*.30, H*.42); ctx.lineTo(W*.22, H*.48); ctx.lineTo(W*.10, H*.38);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // South America
      ctx.beginPath();
      ctx.moveTo(W*.22, H*.50); ctx.lineTo(W*.30, H*.48); ctx.lineTo(W*.32, H*.65);
      ctx.lineTo(W*.26, H*.80); ctx.lineTo(W*.18, H*.75); ctx.lineTo(W*.16, H*.58);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Europe
      ctx.beginPath();
      ctx.moveTo(W*.44, H*.10); ctx.lineTo(W*.54, H*.08); ctx.lineTo(W*.56, H*.22);
      ctx.lineTo(W*.50, H*.30); ctx.lineTo(W*.42, H*.28); ctx.lineTo(W*.42, H*.18);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Africa
      ctx.beginPath();
      ctx.moveTo(W*.44, H*.32); ctx.lineTo(W*.54, H*.30); ctx.lineTo(W*.56, H*.50);
      ctx.lineTo(W*.52, H*.70); ctx.lineTo(W*.44, H*.68); ctx.lineTo(W*.40, H*.50);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Asia
      ctx.beginPath();
      ctx.moveTo(W*.56, H*.08); ctx.lineTo(W*.82, H*.08); ctx.lineTo(W*.85, H*.25);
      ctx.lineTo(W*.78, H*.42); ctx.lineTo(W*.62, H*.40); ctx.lineTo(W*.56, H*.30);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Australia
      ctx.beginPath();
      ctx.moveTo(W*.75, H*.58); ctx.lineTo(W*.88, H*.56); ctx.lineTo(W*.90, H*.72);
      ctx.lineTo(W*.80, H*.76); ctx.lineTo(W*.72, H*.70);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Grid lines
      ctx.strokeStyle = 'rgba(0,255,255,.04)';
      for (var gx = 0; gx < 8; gx++) {
        ctx.beginPath(); ctx.moveTo(gx * W / 8, 0); ctx.lineTo(gx * W / 8, H); ctx.stroke();
      }
      for (var gy = 0; gy < 5; gy++) {
        ctx.beginPath(); ctx.moveTo(0, gy * H / 5); ctx.lineTo(W, gy * H / 5); ctx.stroke();
      }
    }

    function drawCountryDots() {
      countries.forEach(function (c) {
        var p = latlngToXY(c.lat, c.lng);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,255,255,.6)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,255,255,.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    var rafId;
    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = 'rgba(3,7,15,1)';
      ctx.fillRect(0, 0, W, H);

      drawWorldOutline();
      drawCountryDots();

      // Draw attacks
      attacks = attacks.filter(function (a) { return a.alpha > 0.01; });
      attacks.forEach(function (a) {
        if (!a.done) {
          a.prog = Math.min(1, a.prog + a.speed);
          var t = a.prog;
          // Quadratic bezier
          var cx = (a.sx + a.tx) / 2;
          var cy = Math.min(a.sy, a.ty) - H * 0.22;
          a.dot.x = (1-t)*(1-t)*a.sx + 2*(1-t)*t*cx + t*t*a.tx;
          a.dot.y = (1-t)*(1-t)*a.sy + 2*(1-t)*t*cy + t*t*a.ty;
          a.tail.push({ x: a.dot.x, y: a.dot.y });
          if (a.tail.length > 18) a.tail.shift();
          if (a.prog >= 1) { a.done = true; }
        } else {
          a.alpha -= 0.025;
        }

        // Draw tail
        for (var ti = 1; ti < a.tail.length; ti++) {
          var tailAlpha = (ti / a.tail.length) * a.alpha * 0.7;
          ctx.beginPath();
          ctx.moveTo(a.tail[ti-1].x, a.tail[ti-1].y);
          ctx.lineTo(a.tail[ti].x, a.tail[ti].y);
          ctx.strokeStyle = a.color.replace(')', ',' + tailAlpha + ')').replace('#', 'rgba(').replace(/([0-9a-f]{2})/gi, function(m, p) { return parseInt(p,16) + ','; }).replace(/,$/,'');
          // Simpler approach:
          ctx.strokeStyle = hexToRgba(a.color, tailAlpha);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Draw dot
        if (!a.done || a.alpha > 0.3) {
          var dotAlpha = a.done ? a.alpha : 1;
          ctx.beginPath();
          ctx.arc(a.dot.x, a.dot.y, a.done ? 4 : 3, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(a.color, dotAlpha);
          ctx.fill();
          // Glow
          var grad = ctx.createRadialGradient(a.dot.x, a.dot.y, 0, a.dot.x, a.dot.y, 10);
          grad.addColorStop(0, hexToRgba(a.color, dotAlpha * 0.5));
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(a.dot.x, a.dot.y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      rafId = requestAnimationFrame(draw);
    }

    function hexToRgba(hex, alpha) {
      var r = parseInt(hex.slice(1,3), 16);
      var g = parseInt(hex.slice(3,5), 16);
      var b = parseInt(hex.slice(5,7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    // Stats animation
    var statsTarget = { attacks: 247, blocked: 2847, countries: 14 };
    var statsCurrent = { attacks: 0, blocked: 0, countries: 0 };
    var statsInterval = setInterval(function () {
      var done = true;
      ['attacks','blocked','countries'].forEach(function (k) {
        if (statsCurrent[k] < statsTarget[k]) {
          statsCurrent[k] = Math.min(statsTarget[k], Math.ceil(statsCurrent[k] + (statsTarget[k] - statsCurrent[k]) * 0.15 + 1));
          done = false;
        }
      });
      var el1 = document.getElementById('mapActiveAttacks');
      var el2 = document.getElementById('mapBlockedTotal');
      var el3 = document.getElementById('mapCountries');
      if (el1) el1.textContent = statsCurrent.attacks.toLocaleString();
      if (el2) el2.textContent = statsCurrent.blocked.toLocaleString();
      if (el3) el3.textContent = statsCurrent.countries;
      if (done) clearInterval(statsInterval);
    }, 40);

    // Flicker active attacks count
    setInterval(function () {
      statsTarget.attacks = Math.max(200, statsTarget.attacks + Math.floor(Math.random() * 6 - 2));
      var el = document.getElementById('mapActiveAttacks');
      if (el) el.textContent = statsTarget.attacks.toLocaleString();
    }, 3000);

    resize();
    window.addEventListener('resize', function () {
      cancelAnimationFrame(rafId);
      resize();
      draw();
    }, { passive: true });
    draw();
  }

  /* ══════════════════════════════════════════════
     4. DASHBOARD PREVIEW
  ══════════════════════════════════════════════ */
  var dbpLoginEl = document.getElementById('dbpLogin');
  var dbpDashEl  = document.getElementById('dbpDashboard');
  var dbpLoginBtn = document.getElementById('dbpLoginBtn');
  var dbpCloseBtn = document.getElementById('dbpCloseBtn');

  if (dbpLoginBtn) {
    dbpLoginBtn.addEventListener('click', function () {
      var btn = this;
      btn.textContent = '🔐 Authenticating...';
      btn.disabled = true;
      setTimeout(function () {
        dbpLoginEl.style.display = 'none';
        dbpDashEl.classList.add('active');
        startDashboardSimulation();
      }, 1200);
    });
  }

  if (dbpCloseBtn) {
    dbpCloseBtn.addEventListener('click', function () {
      dbpDashEl.classList.remove('active');
      dbpDashEl.style.display = 'none';
      dbpLoginEl.style.display = 'flex';
      var btn = document.getElementById('dbpLoginBtn');
      if (btn) { btn.textContent = '🔐 Enter Dashboard'; btn.disabled = false; }
      stopDashboardSimulation();
    });
  }

  // Tab switching
  document.querySelectorAll('.dbp-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.dbp-tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.dbp-pane').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      var pane = document.getElementById('dbp-' + tab.dataset.tab);
      if (pane) pane.classList.add('active');
    });
  });

  var dashInterval = null;
  var dashAlerts = [
    { sev: 'crit', sevLabel: 'CRITICAL', msg: 'Ransomware lateral movement — DC-PROD-01', time: '0m ago' },
    { sev: 'high', sevLabel: 'HIGH', msg: 'Suspicious PowerShell execution — WORKSTATION-44', time: '1m ago' },
    { sev: 'high', sevLabel: 'HIGH', msg: 'SSH brute-force — 185.220.101.x — Blocked', time: '3m ago' },
    { sev: 'med',  sevLabel: 'MEDIUM', msg: 'DNS tunneling detected — ENDPOINT-12', time: '7m ago' },
    { sev: 'crit', sevLabel: 'CRITICAL', msg: 'Zero-day exploit attempt — WEB-SERVER-01', time: '0m ago' },
    { sev: 'high', sevLabel: 'HIGH', msg: 'Credential stuffing attack — AUTH-SERVICE', time: '2m ago' },
    { sev: 'med',  sevLabel: 'MEDIUM', msg: 'Unusual outbound traffic — WORKSTATION-19', time: '5m ago' },
    { sev: 'crit', sevLabel: 'CRITICAL', msg: 'Data exfiltration detected — 2.3GB upload', time: '0m ago' },
  ];
  var dashAlertIdx = 4;
  var dashRiskScores = [72, 79, 84, 87, 91, 88, 82, 76];
  var dashRiskIdx = 0;

  function startDashboardSimulation() {
    dashInterval = setInterval(function () {
      var list = document.getElementById('dbpAlertList');
      if (list) {
        var a = dashAlerts[dashAlertIdx % dashAlerts.length];
        dashAlertIdx++;
        var div = document.createElement('div');
        div.className = 'dbp-alert-item ' + a.sev;
        div.style.animation = 'tfSlideIn .4s ease';
        div.innerHTML = '<span class="dbp-alert-sev ' + a.sev + '">' + a.sevLabel + '</span>' +
          '<span class="dbp-alert-msg">' + a.msg + '</span>' +
          '<span class="dbp-alert-time">' + a.time + '</span>';
        list.insertBefore(div, list.firstChild);
        var items = list.querySelectorAll('.dbp-alert-item');
        if (items.length > 5) list.removeChild(items[items.length-1]);
        // Update active alerts count
        var cnt = document.getElementById('dbpActiveAlerts');
        if (cnt) {
          var n = parseInt(cnt.textContent) || 14;
          if (a.sev === 'crit') n = Math.min(n + 1, 25);
          cnt.textContent = n;
        }
        if (a.sev === 'crit') playCriticalAlert();
      }
      // Update risk score
      var rs = document.getElementById('dbpRiskScore');
      if (rs) {
        var score = dashRiskScores[dashRiskIdx % dashRiskScores.length];
        dashRiskIdx++;
        rs.textContent = score;
        rs.className = 'dbp-ai-score ' + (score > 80 ? 'high-risk' : 'medium');
      }
    }, 4000);
  }

  function stopDashboardSimulation() {
    if (dashInterval) { clearInterval(dashInterval); dashInterval = null; }
  }

}());
