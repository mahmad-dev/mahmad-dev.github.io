/* Ask Ahmad — floating AI twin widget.
 *
 * Self-contained: injects its own styles, launcher and iframe. No build step,
 * no dependency, matching the rest of this site.
 *
 * The twin itself is a separate Next.js app on Vercel. This file only knows
 * its URL, so the portfolio stays a static site with no secrets in it.
 */
(function () {
  'use strict';

  /* Change this one line after deploying. It is the only place the URL lives. */
  var TWIN_ORIGIN = 'https://ask-ahmad.vercel.app';

  var script = document.currentScript;
  if (script && script.getAttribute('data-origin')) {
    TWIN_ORIGIN = script.getAttribute('data-origin');
  }

  if (window.__askAhmadWidget) return;
  window.__askAhmadWidget = true;

  var CSS =
    '.twin-launcher{position:fixed;right:20px;bottom:20px;z-index:9998;display:inline-flex;align-items:center;gap:9px;' +
    'padding:11px 17px 11px 13px;border-radius:999px;border:1px solid var(--border-strong,rgba(255,255,255,.16));' +
    'background:var(--surface,#11141c);color:var(--text,#e8eaf0);font:600 14px/1 var(--font,Inter,system-ui,sans-serif);' +
    'cursor:pointer;box-shadow:0 12px 32px -12px rgba(0,0,0,.7);transition:transform .2s ease,border-color .2s ease}' +
    '.twin-launcher:hover{transform:translateY(-2px);border-color:var(--accent,#22d3ee)}' +
    '.twin-launcher-dot{width:8px;height:8px;border-radius:50%;background:var(--accent,#22d3ee);' +
    'box-shadow:0 0 0 4px var(--accent-soft,rgba(34,211,238,.12))}' +
    '.twin-panel{position:fixed;right:20px;bottom:20px;z-index:9999;width:390px;height:560px;max-height:calc(100vh - 40px);' +
    'border-radius:16px;overflow:hidden;border:1px solid var(--border-strong,rgba(255,255,255,.16));' +
    'background:var(--bg-elev,#0d0f15);box-shadow:0 32px 70px -24px rgba(0,0,0,.8);display:flex;flex-direction:column;' +
    'opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .22s ease,transform .22s ease}' +
    '.twin-panel.is-open{opacity:1;transform:none;pointer-events:auto}' +
    '.twin-panel-bar{display:flex;align-items:center;justify-content:flex-end;gap:6px;padding:7px 8px;flex-shrink:0;' +
    'border-bottom:1px solid var(--border,rgba(255,255,255,.09));background:var(--surface,#11141c)}' +
    '.twin-panel-bar a,.twin-panel-bar button{background:none;border:0;cursor:pointer;padding:5px 9px;border-radius:7px;' +
    'color:var(--text-faint,#6b7285);font:500 12px/1 var(--mono,ui-monospace,monospace);text-decoration:none}' +
    '.twin-panel-bar a:hover,.twin-panel-bar button:hover{color:var(--text,#e8eaf0);background:var(--surface-2,#161a24)}' +
    '.twin-panel iframe{flex:1;width:100%;border:0;display:block;background:var(--bg-elev,#0d0f15)}' +
    '@media (max-width:520px){.twin-panel{right:10px;left:10px;bottom:10px;width:auto;height:min(78vh,560px)}' +
    '.twin-launcher{right:14px;bottom:14px}}' +
    '@media (prefers-reduced-motion:reduce){.twin-launcher,.twin-panel{transition:none}}';

  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'twin-launcher';
  launcher.setAttribute('aria-expanded', 'false');
  launcher.innerHTML = '<span class="twin-launcher-dot" aria-hidden="true"></span>Ask my AI twin';

  var panel = document.createElement('div');
  panel.className = 'twin-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Ask Ahmad, an AI twin');
  panel.hidden = true;

  var bar = document.createElement('div');
  bar.className = 'twin-panel-bar';

  var expand = document.createElement('a');
  expand.href = TWIN_ORIGIN;
  expand.target = '_blank';
  expand.rel = 'noopener';
  expand.textContent = 'Open full page';

  var close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.textContent = 'Close';

  bar.appendChild(expand);
  bar.appendChild(close);

  var frame = document.createElement('iframe');
  frame.title = 'Ask Ahmad';
  frame.loading = 'lazy';
  /* Sandboxed: the widget needs scripts and same-origin for its own storage,
     and nothing else. No top-level navigation, no popups, no downloads. */
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');

  panel.appendChild(bar);
  panel.appendChild(frame);

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(launcher);
    document.body.appendChild(panel);
  });

  var loaded = false;

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function open() {
    /* The iframe src is set on first open, never on page load. Otherwise every
       visit to every page of the portfolio would boot the Next.js app, paying
       a cold start and a request for something most visitors never click. */
    if (!loaded) {
      frame.src = TWIN_ORIGIN + '/embed?theme=' + currentTheme();
      loaded = true;
    }
    panel.hidden = false;
    /* One frame later, so the transition has a starting state to animate from. */
    requestAnimationFrame(function () {
      panel.classList.add('is-open');
    });
    launcher.setAttribute('aria-expanded', 'true');
    launcher.style.display = 'none';
  }

  function hide() {
    panel.classList.remove('is-open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.style.display = '';
    launcher.focus();
    setTimeout(function () {
      if (!panel.classList.contains('is-open')) panel.hidden = true;
    }, 240);
  }

  launcher.addEventListener('click', open);
  close.addEventListener('click', hide);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) hide();
  });
})();
