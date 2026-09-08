/* Event-driven glass. No idle loop, scroll interception or chart transforms. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var opaque = window.matchMedia('(prefers-reduced-transparency: reduce)');
  var surface = null, point = null, frame = 0;
  var symbols = new Set(), visible = new Set();
  var selector = '.card-head .logo, .kopf-marke';
  var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    schedule();
  }) : null;

  function collect() {
    symbols.forEach(function (node) {
      if (!node.isConnected) {
        if (observer) observer.unobserve(node);
        symbols.delete(node); visible.delete(node);
      }
    });
    document.querySelectorAll(selector).forEach(function (node) {
      if (symbols.has(node)) return;
      symbols.add(node);
      if (observer) observer.observe(node);
    });
  }
  function clearTouch() {
    if (surface) {
      surface.classList.remove('black-glass-touch');
      surface.style.removeProperty('--touch-x');
      surface.style.removeProperty('--touch-y');
    }
    surface = null; point = null;
  }
  function schedule() {
    if (!frame && !document.hidden && !reduced.matches) frame = requestAnimationFrame(draw);
  }
  function draw() {
    frame = 0;
    if (reduced.matches || document.hidden) return;
    if (surface && point) {
      var rect = surface.getBoundingClientRect();
      surface.style.setProperty('--touch-x', (point.x - rect.left) + 'px');
      surface.style.setProperty('--touch-y', (point.y - rect.top) + 'px');
    }
    /* Read all positions before updating styles. Only visible symbols move. */
    var positions = [];
    visible.forEach(function (node) {
      var rect = node.getBoundingClientRect();
      var distance = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - innerHeight / 2) / (innerHeight / 2)));
      positions.push([node, distance]);
    });
    positions.forEach(function (entry) {
      entry[0].style.translate = '0 ' + (entry[1] * -5).toFixed(2) + 'px';
      entry[0].style.rotate = (entry[1] * 3).toFixed(2) + 'deg';
    });
  }
  document.addEventListener('pointerdown', function (event) {
    if (!event.isPrimary || event.button !== 0 || reduced.matches || opaque.matches) return;
    var target = event.target.closest('button, a, .card, .kasten, .auftakt-mitte, .jetzt, .kopf-marke');
    if (!target || target.matches(':disabled') || event.target.closest('input, textarea, select, .chart')) return;
    clearTouch();
    surface = target.closest('.card, .kasten, .auftakt-mitte, .jetzt');
    point = {x: event.clientX, y: event.clientY};
    if (surface) surface.classList.add('black-glass-touch');
    var ring = document.createElement('i');
    ring.className = 'black-glass-ripple';
    ring.setAttribute('aria-hidden', 'true');
    ring.style.left = event.clientX + 'px'; ring.style.top = event.clientY + 'px';
    document.body.appendChild(ring);
    setTimeout(function () { ring.remove(); }, 700);
    schedule();
  }, {passive: true});
  document.addEventListener('pointermove', function (event) {
    if (!surface || !event.isPrimary) return;
    point = {x: event.clientX, y: event.clientY}; schedule();
  }, {passive: true});
  document.addEventListener('pointerup', clearTouch, {passive: true});
  document.addEventListener('pointercancel', clearTouch, {passive: true});
  window.addEventListener('blur', clearTouch);
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule, {passive: true});
  document.addEventListener('rcp:karten', function () { collect(); schedule(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearTouch(); cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  });
  reduced.addEventListener('change', function () {
    clearTouch();
    symbols.forEach(function (node) { node.style.removeProperty('translate'); node.style.removeProperty('rotate'); });
    schedule();
  });
  opaque.addEventListener('change', clearTouch);
  collect(); schedule();
})();
