/* Event-driven glass. No idle loop, scroll interception or chart transforms. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var opaque = window.matchMedia('(prefers-reduced-transparency: reduce)');
  var surface = null, point = null, frame = 0;
  var dragging = false, lastWave = 0, lastScrollWave = 0;
  var waves = [], waterFrame = 0, canvas, water, width, height;
  var scrollFrame = 0, scrollForce = 0, lastScrollY = scrollY, lastScrollTime = performance.now();
  var flowing = new Set();
  var symbols = new Set(), visible = new Set();
  var selector = '.card-head .logo, .kopf-marke';
  var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    schedule();
  }) : null;

  function resizeWater() {
    if (!canvas) return;
    width = innerWidth; height = innerHeight;
    var ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    water.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function wave(x, y, strength) {
    if (reduced.matches || opaque.matches || document.hidden) return;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'black-glass-water';
      canvas.setAttribute('aria-hidden', 'true');
      water = canvas.getContext('2d');
      if (!water) { canvas = null; return; }
      document.body.appendChild(canvas);
      resizeWater();
    }
    waves.push({x:x, y:y, born:performance.now(), strength:strength});
    if (waves.length > 8) waves.shift();
    if (!waterFrame) waterFrame = requestAnimationFrame(drawWater);
  }
  function stopWater() {
    cancelAnimationFrame(waterFrame); waterFrame = 0; waves = [];
    if (water) water.clearRect(0, 0, width, height);
  }
  function drawWater(now) {
    waterFrame = 0;
    if (reduced.matches || opaque.matches || document.hidden) { stopWater(); return; }
    water.clearRect(0, 0, width, height);
    waves = waves.filter(function (w) { return now - w.born < 1650; });
    waves.forEach(function (w) {
      var age = (now - w.born) / 1650;
      var fade = Math.pow(1 - age, 1.4) * Math.min(1, age * 18) * w.strength;
      // Three trailing crests, with bright and dark sides like moving water.
      for (var crest = 0; crest < 3; crest++) {
        var radius = 14 + age * 270 - crest * 24;
        if (radius < 8) continue;
        var light = water.createLinearGradient(w.x-radius, w.y-radius, w.x+radius, w.y+radius);
        light.addColorStop(0, 'rgba(245,255,252,' + fade * .9 + ')');
        light.addColorStop(.32, 'rgba(180,214,205,' + fade * .42 + ')');
        light.addColorStop(.58, 'rgba(0,0,0,' + fade * .6 + ')');
        light.addColorStop(1, 'rgba(235,255,248,' + fade * .7 + ')');
        for (var edge = 0; edge < 2; edge++) {
          water.beginPath();
          for (var step = 0; step <= 80; step++) {
            var angle = step / 80 * Math.PI * 2;
            var bend = Math.sin(angle * 3 + age * 6) * 5 + Math.cos(angle * 5 - age * 4) * 2;
            var r = radius + bend * Math.sin(age * Math.PI) + edge * 3;
            var x = w.x + Math.cos(angle) * r;
            var y = w.y + Math.sin(angle) * r * .83;
            if (!step) water.moveTo(x,y); else water.lineTo(x,y);
          }
          water.closePath();
          water.strokeStyle = edge ? 'rgba(255,255,255,' + fade * .15 + ')' : light;
          water.lineWidth = edge ? 4 : 1.8;
          water.stroke();
        }
      }
    });
    if (waves.length) waterFrame = requestAnimationFrame(drawWater);
  }
  function settleGlass() {
    scrollFrame = 0;
    if (reduced.matches || document.hidden) scrollForce = 0;
    scrollForce *= .88;
    var strength = Math.min(1, Math.abs(scrollForce));
    visible.forEach(function (symbol) {
      var card = symbol.closest('.card');
      if (card) flowing.add(card);
    });
    flowing.forEach(function (card) {
      if (strength < .015 || !card.isConnected) {
        card.classList.remove('black-glass-flow');
        card.style.removeProperty('--flow-strength');
        card.style.removeProperty('--flow-angle');
        flowing.delete(card);
      } else {
        card.classList.add('black-glass-flow');
        card.style.setProperty('--flow-strength', strength.toFixed(3));
        card.style.setProperty('--flow-angle', (125 + scrollForce * 38).toFixed(1) + 'deg');
      }
    });
    if (strength >= .015) scrollFrame = requestAnimationFrame(settleGlass);
  }
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
    surface = null; point = null; dragging = false;
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
      entry[0].style.translate = '0 ' + (entry[1] * -9).toFixed(2) + 'px';
      entry[0].style.rotate = (entry[1] * 6).toFixed(2) + 'deg';
    });
  }
  document.addEventListener('pointerdown', function (event) {
    if (!event.isPrimary || event.button !== 0 || reduced.matches || opaque.matches) return;
    var target = event.target.closest('button, a, .card, .kasten, .auftakt-mitte, .jetzt, .kopf-marke, header, nav, main, body');
    if (!target || target.matches(':disabled') || event.target.closest('input, textarea, select, .chart')) return;
    clearTouch();
    surface = target.closest('.card, .kasten, .auftakt-mitte, .jetzt');
    point = {x: event.clientX, y: event.clientY};
    if (surface) surface.classList.add('black-glass-touch');
    dragging = true;
    lastWave = performance.now();
    wave(event.clientX, event.clientY, 1);
    schedule();
  }, {passive: true});
  document.addEventListener('pointermove', function (event) {
    if (!dragging || !event.isPrimary) return;
    point = {x: event.clientX, y: event.clientY};
    if (performance.now() - lastWave > 95) {
      wave(point.x, point.y, .7); lastWave = performance.now();
    }
    schedule();
  }, {passive: true});
  document.addEventListener('pointerup', clearTouch, {passive: true});
  document.addEventListener('pointercancel', clearTouch, {passive: true});
  window.addEventListener('blur', clearTouch);
  window.addEventListener('scroll', function () {
    var now = performance.now();
    var delta = scrollY - lastScrollY;
    var elapsed = Math.max(16, now - lastScrollTime);
    lastScrollY = scrollY; lastScrollTime = now;
    schedule();
    if (reduced.matches || opaque.matches || Math.abs(delta) < 1) return;
    scrollForce = Math.max(-1, Math.min(1, delta / elapsed * .75));
    if (!scrollFrame) scrollFrame = requestAnimationFrame(settleGlass);
    if (now - lastScrollWave < 150) return;
    var nearest = null, nearestDistance = Infinity;
    visible.forEach(function (symbol) {
      var rect = symbol.getBoundingClientRect();
      var distance = Math.abs(rect.top - innerHeight * .4);
      if (distance < nearestDistance) { nearest = rect; nearestDistance = distance; }
    });
    if (nearest) {
      wave(nearest.left + nearest.width / 2, nearest.top + nearest.height / 2, .65 + Math.abs(scrollForce) * .35);
      lastScrollWave = now;
    }
  }, {passive: true});
  window.addEventListener('resize', function () { resizeWater(); schedule(); }, {passive: true});
  document.addEventListener('rcp:karten', function () { collect(); schedule(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(scrollFrame); scrollFrame = 0; scrollForce = 0; settleGlass(); stopWater(); clearTouch(); cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  });
  reduced.addEventListener('change', function () {
    scrollForce = 0; stopWater(); clearTouch();
    symbols.forEach(function (node) { node.style.removeProperty('translate'); node.style.removeProperty('rotate'); });
    schedule();
  });
  opaque.addEventListener('change', function () { stopWater(); clearTouch(); });
  collect(); schedule();
})();
