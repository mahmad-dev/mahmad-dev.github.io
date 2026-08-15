/* Muhammad Ahmad — portfolio behaviour. No dependencies. */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---- Theme (dark default, persisted) ---- */
  var themeBtn = $('.theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---- Header shadow on scroll ---- */
  var header = $('.site-header');
  var toTop = $('.to-top');
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('is-stuck', y > 12);
    if (toTop) toTop.classList.toggle('show', y > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile nav ---- */
  var navToggle = $('.nav-toggle');
  var nav = $('.nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- Scroll reveal ---- */
  var revealables = $$('.reveal');
  if ('IntersectionObserver' in window && revealables.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- Active nav link while scrolling ---- */
  var sections = $$('main section[id]');
  var navLinks = $$('.nav a[href^="#"]');
  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---- Role rotator (replaces typed.js) ---- */
  var rotator = $('.rotator');
  if (rotator) {
    var words = (rotator.getAttribute('data-words') || '').split('|').filter(Boolean);
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (words.length && !reduced) {
      var w = 0, c = 0, deleting = false;
      (function tick() {
        var word = words[w];
        c += deleting ? -1 : 1;
        rotator.textContent = word.slice(0, c);
        var delay = deleting ? 34 : 62;
        if (!deleting && c === word.length) { deleting = true; delay = 1700; }
        else if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; delay = 320; }
        setTimeout(tick, delay);
      })();
    } else if (words.length) {
      rotator.textContent = words[0];
    }
  }

  /* ---- Count-up stats ---- */
  var counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        countObserver.unobserve(el);
        var target = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        var start = performance.now();
        var dur = 1200;
        (function frame(now) {
          var p = Math.min((now - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(frame);
        })(start);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { countObserver.observe(el); });
  }

  /* ---- Project filter ---- */
  var filterBtns = $$('.filter-btn');
  var cards = $$('.project-card');
  if (filterBtns.length && cards.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var f = btn.getAttribute('data-filter');
        filterBtns.forEach(function (b) {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        cards.forEach(function (card) {
          var match = f === 'all' || (card.getAttribute('data-tags') || '').indexOf(f) !== -1;
          card.classList.toggle('is-hidden', !match);
        });
      });
    });
  }

  /* ---- Footer year ---- */
  var yr = $('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
