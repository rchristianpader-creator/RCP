/* Event-driven glass. No idle loop, scroll interception or chart transforms. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var opaque = window.matchMedia('(prefers-reduced-transparency: reduce)');
  var surface = null, point = null, frame = 0;
  var contacts = new Map();
  var waves = [], waterFrame = 0, canvas, water, width, height;
  function resizeWater() {
    if (!canvas) return;
    width = innerWidth; height = innerHeight;
    var ratio = Math.min(devicePixelRatio || 1, 2);
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
    if (waves.length > 12) waves.shift();
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
        var radius = 8 + (1 - Math.pow(1 - age, 1.7)) * 122 - crest * 18;
        if (radius < 8) continue;
        var light = water.createLinearGradient(w.x-radius, w.y-radius, w.x+radius, w.y+radius);
        light.addColorStop(0, 'rgba(245,255,252,' + fade * .9 + ')');
        light.addColorStop(.32, 'rgba(180,214,205,' + fade * .42 + ')');
        light.addColorStop(.58, 'rgba(0,0,0,' + fade * .6 + ')');
        light.addColorStop(1, 'rgba(235,255,248,' + fade * .7 + ')');
        for (var edge = 0; edge < 3; edge++) {
          water.beginPath();
          for (var step = 0; step <= 80; step++) {
            var angle = step / 80 * Math.PI * 2;
            var bend = Math.sin(angle * 3 + age * 4) * 2.2 + Math.cos(angle * 5 - age * 3) * .8;
            var r = radius + bend * Math.sin(age * Math.PI) + (edge - 1) * 1.4;
            var x = w.x + Math.cos(angle) * r;
            var y = w.y + Math.sin(angle) * r * .94;
            if (!step) water.moveTo(x,y); else water.lineTo(x,y);
          }
          water.closePath();
          water.strokeStyle = edge === 0 ? 'rgba(0,0,0,' + fade * .2 + ')' :
            (edge === 1 ? light : 'rgba(235,250,245,' + fade * .08 + ')');
          water.lineWidth = edge === 1 ? 1.1 : 5;
          water.shadowBlur = edge === 1 ? 0 : 3;
          water.shadowColor = edge === 0 ? 'rgba(0,0,0,.15)' : 'rgba(240,255,250,.1)';
          water.stroke();
        }
      }
    });
    water.shadowBlur = 0;
    if (waves.length) waterFrame = requestAnimationFrame(drawWater);
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
  }
  function reflectAt(x, y) {
    var target = document.elementFromPoint(x, y);
    var next = target && target.closest('.card, .kasten, .auftakt-mitte, .jetzt, header');
    if (next !== surface) {
      clearTouch(); surface = next;
      if (surface) surface.classList.add('black-glass-touch');
    }
    point = {x:x, y:y}; schedule();
  }
  function begin(id, x, y) {
    if (reduced.matches || opaque.matches || document.hidden) return;
    contacts.set(id, {x:x, y:y, time:performance.now()});
    reflectAt(x, y); wave(x, y, 1);
  }
  function move(id, x, y) {
    var previous = contacts.get(id);
    if (!previous) return;
    reflectAt(x, y);
    var distance = Math.hypot(x-previous.x, y-previous.y);
    var now = performance.now();
    if (distance < 7 || now-previous.time < 55) return;
    // Interpolated contact samples keep a continuous wake during a quick swipe.
    var steps = Math.min(3, Math.ceil(distance/22));
    for (var i=1; i<=steps; i++) wave(previous.x+(x-previous.x)*i/steps, previous.y+(y-previous.y)*i/steps, .48);
    contacts.set(id, {x:x, y:y, time:now});
  }
  function end(id) { contacts.delete(id); if (!contacts.size) clearTouch(); }
  function clearContacts() { contacts.clear(); clearTouch(); }
  var passiveCapture = {passive:true, capture:true};
  // Capture also sees controls whose own handlers stop event propagation.
  // Touch events continue during native scrolling, unlike cancelled pointer events.
  document.addEventListener('touchstart', function (e) {
    Array.from(e.changedTouches).forEach(function(t) { begin('t'+t.identifier,t.clientX,t.clientY); });
  }, passiveCapture);
  document.addEventListener('touchmove', function (e) {
    Array.from(e.changedTouches).forEach(function(t) { move('t'+t.identifier,t.clientX,t.clientY); });
  }, passiveCapture);
  ['touchend','touchcancel'].forEach(function (name) {
    document.addEventListener(name,function(e) {
      Array.from(e.changedTouches).forEach(function(t) { end('t'+t.identifier); });
    }, passiveCapture);
  });
  document.addEventListener('pointerdown', function(e) {
    if (e.pointerType !== 'touch' && e.button === 0) begin('p'+e.pointerId,e.clientX,e.clientY);
  }, passiveCapture);
  document.addEventListener('pointermove', function(e) {
    if (e.pointerType !== 'touch') move('p'+e.pointerId,e.clientX,e.clientY);
  }, passiveCapture);
  ['pointerup','pointercancel'].forEach(function(name) {
    document.addEventListener(name,function(e) { end('p'+e.pointerId); },passiveCapture);
  });
  window.addEventListener('blur', clearContacts);
  window.addEventListener('resize', function() { resizeWater(); schedule(); }, {passive:true});
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) { stopWater(); clearContacts(); cancelAnimationFrame(frame); frame=0; }
  });
  [reduced, opaque].forEach(function(preference) {
    preference.addEventListener('change',function() { stopWater(); clearContacts(); });
  });
})();
