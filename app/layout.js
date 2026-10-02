import './globals.css'
import AdminApp from '@/components/admin/AdminApp'

export const metadata = {
  title: 'Kaya CMS — Content Dashboard',
  description: 'Manage treatments, doctors, enquiries and page content for the Kaya site.',
  // A staff tool has no business appearing in search results.
  robots: { index: false, follow: false },
}

/**
 * Plain-JS diagnostic, inlined into the static HTML.
 *
 * The React error boundary can only report a crash once React is running. When
 * the failure is earlier than that — a chunk blocked by an extension, a script
 * that never parses, a browser mid-update serving stale resources — nothing
 * mounts and the visitor is left with a white page and no information.
 *
 * This runs before and independently of the app: it records errors as they
 * happen, then after a grace period checks whether anything actually rendered.
 * If not, it prints what it saw, so the problem can be read off the screen
 * instead of requiring devtools.
 */
const DIAGNOSTIC = `
(function () {
  var errors = [];
  var failed = [];

  window.addEventListener('error', function (e) {
    // Resource failures (script/style/image) arrive with a target, not a message.
    if (e.target && e.target !== window && (e.target.src || e.target.href)) {
      failed.push(String(e.target.src || e.target.href));
      return;
    }
    var where = e.filename ? ' (' + String(e.filename).split('/').pop() + ':' + e.lineno + ')' : '';
    errors.push(String(e.message || 'Unknown error') + where);
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    errors.push('Unhandled promise: ' + String((r && (r.message || r.stack)) || r));
  });

  function esc(s) {
    return String(s).replace(/[<>&]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c];
    });
  }

  // ?reset=1 wipes this browser's saved dashboard data and reloads clean.
  // A one-click recovery matters because the state that needs clearing is the
  // same state that can stop the page rendering the button to clear it.
  if (location.search.indexOf('reset=1') !== -1) {
    try {
      Object.keys(localStorage)
        .filter(function (k) { return k.indexOf('kaya_') === 0; })
        .forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* storage blocked — reloading is still worth a try */ }
    location.replace(location.origin + location.pathname);
    return;
  }

  // ?diag=1 reports immediately and unconditionally. Waiting 12 seconds and
  // guessing whether the app mounted is the wrong tool when someone is trying
  // to send you what their browser is doing.
  var forced = location.search.indexOf('diag=1') !== -1;

  function report() {
    if (!forced && document.querySelector('.ad-login, .ad-shell, .ad-crash')) return;

    // The panel is APPENDED, never swapped in for the page: an earlier version
    // replaced document.body, so a merely slow start was destroyed by the very
    // thing meant to diagnose it.
    //
    // Every row below answers a question that would otherwise need asking.
    var mounted = !!document.querySelector('.ad-login, .ad-shell, .ad-crash');
    var stored = [];
    var storageErr = '';
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('kaya_') === 0) {
          stored.push(k + ' = ' + String(localStorage.getItem(k)).length + ' chars');
        }
      }
    } catch (e) { storageErr = String(e && e.message || e); }

    var sheets = 0;
    try { sheets = document.styleSheets.length; } catch (e) { /* ignore */ }

    // The app can mount and still show nothing if layout collapses it, so
    // report the geometry too — "mounted but invisible" and "never mounted"
    // have completely different causes.
    var shell = document.querySelector('.ad-shell, .ad-login, .ad-crash, .ad-boot');
    var geo = 'no element';
    if (shell) {
      var r = shell.getBoundingClientRect();
      var cs = getComputedStyle(shell);
      geo = shell.className + '  ' + Math.round(r.width) + 'x' + Math.round(r.height) +
        '  display=' + cs.display + ' visibility=' + cs.visibility +
        ' opacity=' + cs.opacity + ' children=' + shell.children.length;
    }

    var kids = [];
    for (var j = 0; j < document.body.children.length && j < 6; j++) {
      var c = document.body.children[j];
      var cr = c.getBoundingClientRect();
      kids.push(c.tagName + '.' + (c.className || '—').toString().slice(0, 28) +
        ' ' + Math.round(cr.width) + 'x' + Math.round(cr.height));
    }

    var rows = [
      ['App mounted', mounted ? 'yes' : 'NO'],
      ['Root element', geo],
      ['Body children', kids.join('\\n') || '(none)'],
      ['Browser', navigator.userAgent],
      ['Page', location.href],
      ['Stylesheets loaded', String(sheets)],
      ['Scripts that failed', failed.length ? failed.join('\\n') : 'none'],
      ['Errors', errors.length ? errors.join('\\n') : 'none recorded'],
      ['Saved data', storageErr ? 'BLOCKED: ' + storageErr : (stored.length ? stored.join('\\n') : 'none')],
      ['Body text', document.body.innerText.trim().slice(0, 140) || '(empty)'],
    ];

    var box = document.createElement('div');
    box.setAttribute('data-kaya-diagnostic', '');
    box.style.cssText = 'position:fixed;inset:auto 16px 16px 16px;z-index:2147483647;max-height:70vh;' +
      'overflow:auto;background:#fff;border:1px solid #EAE4F5;border-radius:14px;padding:20px;' +
      'box-shadow:0 24px 60px rgba(90,70,140,.22);font-family:system-ui,-apple-system,sans-serif;color:#241C36';

    box.innerHTML =
      '<div style="font-size:15px;font-weight:700;margin-bottom:4px">The dashboard has not started</div>' +
      '<div style="font-size:12.5px;line-height:1.55;color:#665F7A;margin-bottom:16px">' +
      'Please send a screenshot of this panel — it says what this browser is doing.</div>' +
      rows.map(function (r) {
        return '<div style="margin-bottom:11px">' +
          '<div style="font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;' +
          'color:#665F7A;margin-bottom:4px">' + esc(r[0]) + '</div>' +
          '<pre style="margin:0;padding:9px 11px;background:#FAF9FC;border:1px solid #EAE4F5;border-radius:7px;' +
          'font-size:10.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;color:#B23B3B">' +
          esc(r[1]) + '</pre></div>';
      }).join('') +
      '<button id="kaya-diag-reset" style="background:#6E5A96;color:#fff;border:0;border-radius:9px;' +
      'padding:10px 16px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit">' +
      'Clear saved data &amp; reload</button>';

    document.body.appendChild(box);

    document.getElementById('kaya-diag-reset').addEventListener('click', function () {
      try {
        Object.keys(localStorage)
          .filter(function (k) { return k.indexOf('kaya_admin_') === 0; })
          .forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) { /* storage unavailable — reloading is still worth a try */ }
      location.reload();
    });
  }

  if (forced) {
    // Wait for the app to have had a fair chance, then report regardless.
    if (document.readyState === 'complete') setTimeout(report, 2500);
    else window.addEventListener('load', function () { setTimeout(report, 2500); });
  } else {
    setTimeout(report, 12000);
  }
})();
`

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/*
        Browser extensions commonly stamp attributes onto <body> before React
        hydrates (password managers, grammar checkers, screen recorders), which
        React reports as a hydration mismatch even though the app rendered
        identically on both sides.

        suppressHydrationWarning applies to THIS element only — its own
        attributes and text. Mismatches inside the tree still surface, so this
        silences the extension noise without hiding a real bug.
      */}
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: DIAGNOSTIC }} />
        <AdminApp>{children}</AdminApp>
      </body>
    </html>
  )
}
