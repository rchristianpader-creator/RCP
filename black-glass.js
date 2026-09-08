/* Event-driven glass. No idle loop, scroll interception or chart transforms. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var opaque = window.matchMedia('(prefers-reduced-transparency: reduce)');
  var surface = null, point = null, frame = 0;
  var dragging = false, lastWave = 0;
  var waves = [], waterFrame = 0, canvas, water, width, height;
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
      // A short lens highlight gives the contact point depth before the crests spread.
      var lensRadius = 12 + Math.sin(Math.min(1, age * 2) * Math.PI / 2) * 48;
      var lens = water.createRadialGradient(w.x - lensRadius * .22, w.y - lensRadius * .3, 0, w.x, w.y, lensRadius);
      lens.addColorStop(0, 'rgba(245,255,252,' + fade * .14 * (1-age) + ')');
      lens.addColorStop(.55, 'rgba(215,235,230,' + fade * .035 + ')');
      lens.addColorStop(.82, 'rgba(0,0,0,' + fade * .09 + ')');
      lens.addColorStop(1, 'rgba(0,0,0,0)');
      water.fillStyle = lens;
      water.fillRect(w.x-lensRadius, w.y-lensRadius, lensRadius*2, lensRadius*2);
      // Three trailing crests, with bright and dark sides like moving water.
      for (var crest = 0; crest < 3; crest++) {
        var radius = 10 + age * 135 - crest * 17;
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
    var touched = document.elementFromPoint(event.clientX, event.clientY);
    var nextSurface = touched && touched.closest('.card, .kasten, .auftakt-mitte, .jetzt');
    if (nextSurface !== surface) {
      clearTouch(); surface = nextSurface; dragging = true;
      if (surface) surface.classList.add('black-glass-touch');
    }
    point = {x: event.clientX, y: event.clientY};
    if (performance.now() - lastWave > 95) {
      wave(point.x, point.y, .7); lastWave = performance.now();
    }
    schedule();
  }, {passive: true});
  document.addEventListener('pointerup', clearTouch, {passive: true});
  document.addEventListener('pointercancel', clearTouch, {passive: true});
  window.addEventListener('blur', clearTouch);
  window.addEventListener('resize', function () { resizeWater(); schedule(); }, {passive: true});
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stopWater(); clearTouch(); cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  });
  reduced.addEventListener('change', function () {
    stopWater(); clearTouch();
    schedule();
  });
  opaque.addEventListener('change', function () { stopWater(); clearTouch(); });

})();
