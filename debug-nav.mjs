import { chromium } from 'playwright';
const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = 'http://localhost:8787';

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await ctx.newPage();

// Intercept console logs
page.on('console', msg => console.log('[PAGE]', msg.text()));

await page.goto(BASE + '/index.html', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(1000);

// Deep debug of nav state
const debug = await page.evaluate(() => {
  const nav = document.getElementById('navMenu');
  const ham = document.getElementById('hamburger');
  if (!nav) return { error: 'navMenu not found' };

  const computed = getComputedStyle(nav);
  const inlineStyle = nav.getAttribute('style') || '(none)';
  const classes = nav.className;

  // Find what's setting display:none — check all stylesheets
  let displaySource = 'unknown';
  try {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && (rule.selectorText.includes('#navMenu') || rule.selectorText.includes('.nav-menu')) && rule.style && rule.style.display === 'none') {
            displaySource = `CSS: ${sheet.href || 'inline'} → "${rule.selectorText}"`;
            break;
          }
        }
      } catch(e) {}
    }
  } catch(e) {}

  return {
    display: computed.display,
    left: computed.left,
    visibility: computed.visibility,
    inlineStyle,
    classes,
    displaySource,
    hamExists: !!ham,
    hamDisplay: ham ? getComputedStyle(ham).display : 'n/a',
    hamClasses: ham ? ham.className : 'n/a',
    gm_nav_check: document.querySelector('#navbar')?.classList.contains('gm-nav'),
    enterprise_js_listener: typeof window._enterpriseNavInit,
  };
});

console.log('NAV DEBUG:', JSON.stringify(debug, null, 2));

// Try clicking hamburger and check result
const ham = await page.$('#hamburger, .hamburger');
if (ham) {
  console.log('\nClicking hamburger...');
  await ham.click({ force: true }); // force click even if "not visible"
  await page.waitForTimeout(500);

  const after = await page.evaluate(() => {
    const nav = document.getElementById('navMenu');
    const ham = document.getElementById('hamburger');
    return {
      display: getComputedStyle(nav).display,
      left: getComputedStyle(nav).left,
      inlineStyle: nav.getAttribute('style') || '(none)',
      navClasses: nav.className,
      hamClasses: ham ? ham.className : 'n/a',
      bodyOverflow: document.body.style.overflow,
      bodyClass: document.body.className,
    };
  });
  console.log('AFTER CLICK:', JSON.stringify(after, null, 2));
}

await browser.close();
