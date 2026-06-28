import { chromium } from 'playwright';
import fs from 'fs';

const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = 'http://localhost:8787';
const SCRATCHPAD = '/tmp/claude-0/-home-user-CYBERDUDEBIVASH-ENTERPRISE-PRODUCTION/11a3c8f5-1249-5b0e-84f7-1c06a906d087/scratchpad';

fs.mkdirSync(SCRATCHPAD, { recursive: true });

const results = [];
function log(icon, label, detail) {
  const line = `${icon} ${label}${detail ? ' — ' + detail : ''}`;
  results.push(line);
  console.log(line);
}

async function ss(page, name) {
  const path = `${SCRATCHPAD}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  return path;
}

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});

// ─── MOBILE VIEWPORT (375×812 — iPhone X) ───────────────────────────────────
const mobile = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
});
const mp = await mobile.newPage();
await mp.goto(BASE + '/index.html', { waitUntil: 'networkidle', timeout: 15000 });

console.log('\n═══ MOBILE (375px) — index.html ═══');

// --- FIX 1: Sentinel Ticker renders with background (not plain text) ---
const ticker = await mp.$('#sentinel-ticker');
const tickerBox = ticker ? await ticker.boundingBox() : null;
const tickerBg = ticker ? await ticker.evaluate(el => getComputedStyle(el).background) : 'NOT FOUND';
const tickerDisplay = ticker ? await ticker.evaluate(el => getComputedStyle(el).display) : 'NOT FOUND';
const tickerHeight = tickerBox ? tickerBox.height : 0;

if (!ticker) {
  log('❌', 'TICKER', '#sentinel-ticker not found');
} else if (tickerDisplay.includes('flex')) {
  log('✅', 'TICKER display:flex confirmed', `height=${tickerHeight}px`);
} else {
  log('❌', 'TICKER display', `got ${tickerDisplay} — expected flex`);
}

if (tickerBg && !tickerBg.includes('rgba(0, 0, 0, 0)') && !tickerBg.includes('transparent')) {
  log('✅', 'TICKER has background color', tickerBg.slice(0,60));
} else {
  log('❌', 'TICKER background missing/transparent', tickerBg ? tickerBg.slice(0,80) : 'n/a');
}

const stkLabel = await mp.$('.stk-label');
const stkLabelFull = await mp.$('.stk-label-full');
const stkCta = await mp.$('.stk-cta');

if (stkLabelFull) {
  const labelFullDisplay = await stkLabelFull.evaluate(el => getComputedStyle(el).display);
  if (labelFullDisplay === 'none') {
    log('✅', 'TICKER .stk-label-full hidden on mobile', 'prevents long label overflow');
  } else {
    log('❌', 'TICKER .stk-label-full still visible', labelFullDisplay);
  }
}

const stkTrackWrap = await mp.$('.stk-track-wrap');
const stkTrack = await mp.$('#stk-track');
if (stkTrackWrap && stkTrack) {
  const wrapDisplay = await stkTrackWrap.evaluate(el => getComputedStyle(el).display);
  log(wrapDisplay.includes('flex') ? '✅' : '❌', 'TICKER .stk-track-wrap display', wrapDisplay);
}

await ss(mp, '01-mobile-ticker');
log('📸', 'Screenshot: 01-mobile-ticker.png');

// --- FIX 2: Hamburger visible on mobile ---
const hamburger = await mp.$('#hamburger, .hamburger');
const hamDisplay = hamburger ? await hamburger.evaluate(el => getComputedStyle(el).display) : 'NOT FOUND';
const hamBox = hamburger ? await hamburger.boundingBox() : null;

if (hamDisplay.includes('flex')) {
  log('✅', 'HAMBURGER visible on mobile', `${hamBox ? Math.round(hamBox.width)+'×'+Math.round(hamBox.height)+'px' : ''}`);
} else {
  log('❌', 'HAMBURGER not visible', hamDisplay);
}

// --- FIX 3: Nav menu is NOT visible by default (hidden until hamburger click) ---
const navMenu = await mp.$('#navMenu');
const navMenuDisplay = navMenu ? await navMenu.evaluate(el => {
  const s = getComputedStyle(el);
  return { display: s.display, left: s.left, visibility: s.visibility };
}) : null;

if (navMenuDisplay) {
  const hidden = navMenuDisplay.display === 'none' || navMenuDisplay.left === '-100%' ||
                 (navMenuDisplay.left && parseInt(navMenuDisplay.left) < 0);
  log(hidden ? '✅' : '⚠️', 'NAV MENU hidden by default on mobile',
    `display=${navMenuDisplay.display} left=${navMenuDisplay.left}`);
}

// --- FIX 4: Click hamburger → nav drawer opens ---
if (hamburger) {
  await hamburger.click();
  await mp.waitForTimeout(400);

  const navMenuAfter = await navMenu.evaluate(el => {
    const s = getComputedStyle(el);
    return { display: s.display, left: s.left, hasActive: el.classList.contains('active'), hasNavOpen: el.classList.contains('nav-open') };
  });

  const opened = navMenuAfter.display !== 'none' && (navMenuAfter.hasActive || navMenuAfter.hasNavOpen || parseInt(navMenuAfter.left) >= 0);
  log(opened ? '✅' : '❌', 'HAMBURGER CLICK opens nav drawer',
    `display=${navMenuAfter.display} left=${navMenuAfter.left} .active=${navMenuAfter.hasActive}`);

  await ss(mp, '02-mobile-nav-open');
  log('📸', 'Screenshot: 02-mobile-nav-open.png');

  // --- FIX 5: body scroll locked when nav open ---
  const bodyOverflow = await mp.evaluate(() => document.body.style.overflow);
  log(bodyOverflow === 'hidden' ? '✅' : '⚠️', 'BODY SCROLL LOCK when nav open', `overflow=${bodyOverflow}`);

  // --- FIX 6: Mobile dropdown accordion ---
  const dropdownTrigger = await mp.$('.nav-dropdown > .nav-link, .nav-dropdown > a');
  if (dropdownTrigger) {
    await dropdownTrigger.click();
    await mp.waitForTimeout(300);
    const ddParent = await dropdownTrigger.evaluateHandle(el => el.parentElement);
    const ddOpen = await ddParent.evaluate(el => el.classList.contains('open') || el.classList.contains('mobile-open'));
    const panel = await mp.$('.nav-dropdown.open .dropdown-panel, .nav-dropdown.mobile-open .dropdown-panel');
    const panelVisible = panel ? await panel.evaluate(el => getComputedStyle(el).display !== 'none') : false;

    log(ddOpen ? '✅' : '⚠️', 'DROPDOWN ACCORDION opens on mobile tap', `parent.open=${ddOpen}`);
    log(panelVisible ? '✅' : '⚠️', 'DROPDOWN PANEL visible after tap', `panelVisible=${panelVisible}`);
    await ss(mp, '03-mobile-nav-dropdown');
    log('📸', 'Screenshot: 03-mobile-nav-dropdown.png');
  }

  // Close nav
  await hamburger.click();
  await mp.waitForTimeout(300);
}

// --- FIX 7: global-enterprise.js does NOT replace gm-nav ---
const navClass = await mp.$eval('#navbar', el => el.className);
log(navClass.includes('gm-nav') ? '✅' : '❌', 'NAV retains gm-nav class (not replaced by global-enterprise.js)', navClass.slice(0,60));

// --- FIX 8: Top bar hidden at 480px (375 < 480) ---
const topBar = await mp.$('.top-bar');
const topBarDisplay = topBar ? await topBar.evaluate(el => getComputedStyle(el).display) : 'NOT FOUND';
log(topBarDisplay === 'none' ? '✅' : '⚠️', 'TOP BAR hidden at 375px', topBarDisplay);

// --- FIX 9: Platform pills bar hidden on mobile ---
const platformBar = await mp.$('.nav-platform-bar, #navPlatformBar');
const pbDisplay = platformBar ? await platformBar.evaluate(el => getComputedStyle(el).display) : 'NOT FOUND';
log(pbDisplay === 'none' ? '✅' : '⚠️', 'PLATFORM PILLS BAR hidden on mobile', pbDisplay);

// --- FIX 10: Hero CTA buttons stack vertically ---
const heroCta = await mp.$('.hero-cta, .cta-group, [class*="hero-cta"]');
const heroCtaDir = heroCta ? await heroCta.evaluate(el => getComputedStyle(el).flexDirection) : 'NOT FOUND';
log(heroCtaDir === 'column' ? '✅' : '⚠️', 'HERO CTA flex-direction:column on mobile', heroCtaDir);

// --- FIX 11: Inputs font-size 16px (prevents iOS zoom) ---
const inputFontSize = await mp.$eval('input, .email-input, [type="email"]', el => getComputedStyle(el).fontSize).catch(() => 'no input found');
log(inputFontSize === '16px' || inputFontSize.includes('no input') ? '✅' : '⚠️', 'INPUT font-size 16px (prevents iOS zoom)', inputFontSize);

// --- FIX 12: mobile-responsive.css loaded ---
const cssLoaded = await mp.evaluate(() => {
  for (const sheet of document.styleSheets) {
    try { if (sheet.href && sheet.href.includes('mobile-responsive')) return true; } catch(e) {}
  }
  return false;
});
log(cssLoaded ? '✅' : '❌', 'mobile-responsive.css loaded', cssLoaded ? 'confirmed' : 'NOT FOUND in stylesheets');

// --- Full mobile screenshot ---
await ss(mp, '04-mobile-full-page');
log('📸', 'Screenshot: 04-mobile-full-page.png');

// ─── TABLET VIEWPORT (768×1024 — iPad) ──────────────────────────────────────
console.log('\n═══ TABLET (768px) — index.html ═══');
const tablet = await browser.newContext({ viewport: { width: 768, height: 1024 } });
const tp = await tablet.newPage();
await tp.goto(BASE + '/index.html', { waitUntil: 'networkidle', timeout: 15000 });

const tHam = await tp.$('#hamburger, .hamburger');
const tHamDisplay = tHam ? await tHam.evaluate(el => getComputedStyle(el).display) : 'NOT FOUND';
log(tHamDisplay.includes('flex') ? '✅' : '⚠️', 'TABLET: hamburger visible at 768px', tHamDisplay);

const tTicker = await tp.$('#sentinel-ticker');
const tTickerH = tTicker ? (await tTicker.boundingBox()).height : 0;
log(tTickerH >= 38 && tTickerH <= 42 ? '✅' : '⚠️', 'TABLET: ticker height 38–42px', `${tTickerH}px`);

await tp.screenshot({ path: `${SCRATCHPAD}/05-tablet-768.png` });
log('📸', 'Screenshot: 05-tablet-768.png');

// ─── DESKTOP VIEWPORT (1280px) ───────────────────────────────────────────────
console.log('\n═══ DESKTOP (1280px) — index.html ═══');
const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const dp = await desktop.newPage();
await dp.goto(BASE + '/index.html', { waitUntil: 'networkidle', timeout: 15000 });

const dHam = await dp.$('#hamburger, .hamburger');
const dHamDisplay = dHam ? await dHam.evaluate(el => getComputedStyle(el).display) : 'NOT FOUND';
log(dHamDisplay === 'none' ? '✅' : '⚠️', 'DESKTOP: hamburger hidden (nav inline)', dHamDisplay);

const dNavMenu = await dp.$('#navMenu');
const dNavDisplay = dNavMenu ? await dNavMenu.evaluate(el => getComputedStyle(el).display) : 'NOT FOUND';
log(dNavDisplay.includes('flex') ? '✅' : '⚠️', 'DESKTOP: nav menu visible inline', dNavDisplay);

const dTicker = await dp.$('#sentinel-ticker');
const dTickerH = dTicker ? (await dTicker.boundingBox()).height : 0;
log(dTickerH >= 42 ? '✅' : '⚠️', 'DESKTOP: ticker height ≥42px', `${dTickerH}px`);

await dp.screenshot({ path: `${SCRATCHPAD}/06-desktop-1280.png` });
log('📸', 'Screenshot: 06-desktop-1280.png');

// ─── INNER PAGES — mobile-responsive.css present ─────────────────────────────
console.log('\n═══ INNER PAGES — CSS injection check ═══');
const pages = ['about.html', 'pricing.html', 'contact.html', 'services.html', 'threat-intel.html'];
for (const page of pages) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const pg = await ctx.newPage();
  await pg.goto(`${BASE}/${page}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  const hasCss = await pg.evaluate(() => {
    for (const s of document.styleSheets) {
      try { if (s.href && s.href.includes('mobile-responsive')) return true; } catch(e) {}
    }
    return false;
  });
  const hasViewport = await pg.evaluate(() => {
    const m = document.querySelector('meta[name="viewport"]');
    return m ? m.content : 'MISSING';
  });
  log(hasCss ? '✅' : '❌', `${page}: mobile-responsive.css`, hasCss ? 'loaded' : 'MISSING');
  log(hasViewport.includes('width=device-width') ? '✅' : '❌', `${page}: viewport meta`, hasViewport);
  await ctx.close();
}

// ─── REGRESSION: sentinel-feed.js fallback data ───────────────────────────────
console.log('\n═══ SENTINEL TICKER — fallback data renders ═══');
const sCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const sp = await sCtx.newPage();
await sp.route('**/cisa.gov/**', route => route.abort()); // block APIs
await sp.route('**/cve.circl.lu/**', route => route.abort());
await sp.route('**/nvd.nist.gov/**', route => route.abort());
await sp.goto(BASE + '/index.html', { waitUntil: 'networkidle', timeout: 15000 });

await sp.waitForTimeout(2000);
const trackText = await sp.$eval('#stk-track', el => el.textContent.trim()).catch(() => '');
const hasCVE = trackText.includes('CVE-');
const hasLoading = trackText.toLowerCase().includes('loading') || trackText.toLowerCase().includes('fetching');
log(hasCVE ? '✅' : (hasLoading ? '⚠️' : '❌'), 'SENTINEL: fallback CVE data shown when APIs blocked',
  hasCVE ? `"${trackText.slice(0,60)}…"` : `got: "${trackText.slice(0,80)}"`);

await sp.screenshot({ path: `${SCRATCHPAD}/07-mobile-ticker-fallback.png` });
log('📸', 'Screenshot: 07-mobile-ticker-fallback.png');
await sCtx.close();

// ─── PROBE: 480px (extra small) ──────────────────────────────────────────────
console.log('\n═══ PROBE: 480px (extra-small) ═══');
const xsCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const xp = await xsCtx.newPage();
await xp.goto(BASE + '/index.html', { waitUntil: 'networkidle', timeout: 15000 });

const xsTicker = await xp.$('#sentinel-ticker');
const xsTickerH = xsTicker ? (await xsTicker.boundingBox()).height : 0;
log(xsTickerH >= 34 && xsTickerH <= 40 ? '✅' : '⚠️', 'PROBE: 480px ticker compact height', `${xsTickerH}px`);

const xsCtaDisplay = await xp.$eval('.stk-cta', el => getComputedStyle(el).display).catch(() => 'not found');
log(xsCtaDisplay === 'none' ? '✅' : '⚠️', 'PROBE: 480px stk-cta hidden', xsCtaDisplay);

await xp.screenshot({ path: `${SCRATCHPAD}/08-probe-480px.png` });
log('📸', 'Screenshot: 08-probe-480px.png');

await browser.close();

console.log('\n═══ SUMMARY ═══');
const pass = results.filter(r => r.startsWith('✅')).length;
const fail = results.filter(r => r.startsWith('❌')).length;
const warn = results.filter(r => r.startsWith('⚠️')).length;
console.log(`✅ PASS: ${pass}  ❌ FAIL: ${fail}  ⚠️ WARN: ${warn}`);
