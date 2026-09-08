/* iOS watchlist scrolling with interruptible app-owned momentum.
   WebKit can swallow new contacts during native scroll deceleration. */
(function () {
  'use strict';
  var ios=/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  if(!ios || !window.CSS || !CSS.supports('touch-action','pan-x pinch-zoom')) return;
  var root=document.documentElement,gesture=null,frame=0,velocity=0,lastFrame=0,suppressClick=0;
  var reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function stop() {
    cancelAnimationFrame(frame); frame=0; velocity=0;
    root.classList.remove('liquid-scroll-moving');
  }
  function setPosition(y) {
    var limit=Math.max(0,root.scrollHeight-innerHeight);
    var next=Math.max(0,Math.min(limit,y));
    root.classList.add('liquid-scroll-moving');
    window.scrollTo(0,next);
    return next>0 && next<limit;
  }
  function coast(now) {
    frame=0;
    var dt=Math.min(32,Math.max(1,now-lastFrame)); lastFrame=now;
    velocity*=Math.exp(-dt/245);
    if(document.hidden || reduced.matches || Math.abs(velocity)<.025) { stop(); return; }
    if(!setPosition(scrollY+velocity*dt)) { stop(); return; }
    frame=requestAnimationFrame(coast);
  }
  window.addEventListener('touchstart',function(e) {
    stop(); gesture=null; suppressClick=0;
    if(e.touches.length!==1 || document.hidden) return;
    var target=e.target instanceof Element ? e.target : null;
    if(!target || !target.closest('.erste-seite, .karten') || target.closest('input,textarea,select,[contenteditable="true"]')) return;
    var t=e.touches[0];
    gesture={id:t.identifier,x:t.clientX,y:t.clientY,lastY:t.clientY,time:performance.now(),moving:false};
  },{capture:true,passive:true});
  window.addEventListener('touchmove',function(e) {
    if(!gesture) return;
    if(e.touches.length!==1) { gesture=null; stop(); return; }
    var t=Array.from(e.touches).find(function(t) { return t.identifier===gesture.id; });
    if(!t) return;
    var dx=t.clientX-gesture.x,dy=t.clientY-gesture.y;
    if(!gesture.moving) {
      if(Math.abs(dx)>7 && Math.abs(dx)>Math.abs(dy)) { gesture=null; return; }
      if(Math.abs(dy)<4) return;
      gesture.moving=true;
    }
    if(!e.cancelable) { gesture=null; stop(); return; }
    e.preventDefault();
    var now=performance.now(),dt=Math.max(8,now-gesture.time);
    var delta=gesture.lastY-t.clientY;
    var speed=Math.max(-6,Math.min(6,delta/dt));
    // A reversal immediately reverses velocity instead of averaging opposite swipes.
    velocity=velocity*speed<0 ? speed : velocity*.3+speed*.7;
    setPosition(scrollY+delta);
    gesture.lastY=t.clientY; gesture.time=now;
  },{capture:true,passive:false});
  function finish(e) {
    if(!gesture) return;
    if(Array.from(e.touches).some(function(t) { return t.identifier===gesture.id; })) return;
    var moved=gesture.moving,paused=performance.now()-gesture.time>90;
    gesture=null;
    if(!moved) { stop(); return; }
    suppressClick=performance.now()+400;
    if(e.type==='touchcancel' || paused || reduced.matches || Math.abs(velocity)<.025) { stop(); return; }
    lastFrame=performance.now(); frame=requestAnimationFrame(coast);
  }
  window.addEventListener('touchend',finish,{capture:true,passive:true});
  window.addEventListener('touchcancel',finish,{capture:true,passive:true});
  window.addEventListener('click',function(e) {
    if(performance.now()<suppressClick) { e.preventDefault(); e.stopImmediatePropagation(); }
  },true);
  window.addEventListener('wheel',stop,{passive:true});
  window.addEventListener('keydown',stop);
  window.addEventListener('blur',function() { gesture=null; stop(); });
  document.addEventListener('visibilitychange',function() { if(document.hidden) { gesture=null; stop(); } });
  // Activate only after all gesture handlers are installed.
  root.classList.add('liquid-touch-scroll');
})();
