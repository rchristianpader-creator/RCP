/* Passive input routing for the shared liquid surface. No decorative overlays. */
(function () {
  'use strict';
  var active=new Map(), serial=0,lastTouch=null;
  var scrollTimer=0,scrollFrame=0,previousScrollY=scrollY;
  var reduced=matchMedia('(prefers-reduced-motion: reduce)');
  var opaque=matchMedia('(prefers-reduced-transparency: reduce)');
  var options={passive:true,capture:true};
  function emit(phase,id,x,y) {
    window.dispatchEvent(new CustomEvent('rcp:liquid-contact',{detail:{phase:phase,id:id,x:x,y:y}}));
  }
  function start(id,x,y) {
    if(document.hidden) return;
    if(!lastTouch) previousScrollY=scrollY;
    if(active.has(id)) finish(id);
    clearTimeout(scrollTimer);
    active.set(id,{x:x,y:y,time:performance.now()});
    lastTouch={id:id,x:x,y:y,time:performance.now()};
    emit('start',id,x,y);
    watchScroll();
  }
  function move(id,x,y) {
    var contact=active.get(id);
    if(!contact) { start(id,x,y); return; }
    contact.x=x; contact.y=y; contact.time=performance.now();
    lastTouch={id:id,x:x,y:y,time:performance.now()};
    emit('move',id,x,y);
  }
  function finish(id) {
    var contact=active.get(id); if(!contact) return;
    active.delete(id);
    if(lastTouch && lastTouch.id===id) {
      var remaining=Array.from(active.entries()).pop();
      lastTouch=remaining ? {id:remaining[0],x:remaining[1].x,y:remaining[1].y,time:remaining[1].time} : {id:id,x:contact.x,y:contact.y,time:performance.now()};
    }
    emit('end',id,contact.x,contact.y);
    if(!active.size) { clearTimeout(scrollTimer); scrollTimer=setTimeout(settleScroll,180); }
  }
  function clearScrollFeedback() {
    clearTimeout(scrollTimer); cancelAnimationFrame(scrollFrame); scrollFrame=0;
  }
  function watchScroll() {
    if(scrollFrame || !lastTouch || document.hidden || reduced.matches || opaque.matches) return;
    scrollFrame=requestAnimationFrame(function() {
      scrollFrame=0;
      observeScroll();
      watchScroll();
    });
  }
  function settleScroll() {
    // The compositor may have moved the viewport before JS receives scroll.
    // Check actual position before declaring the gesture finished.
    if(lastTouch && scrollY!==previousScrollY && !document.hidden) {
      observeScroll(); return;
    }
    // Native scroll can take over without delivering touchend. Do not keep
    // pressing the liquid forever on behalf of a finger we can no longer track.
    if(lastTouch && performance.now()-lastTouch.time<120) {
      scrollTimer=setTimeout(settleScroll,120); return;
    }
    Array.from(active.keys()).forEach(function(id) {
      if(id.charAt(0)==='t') finish(id);
    });
    clearScrollFeedback(); lastTouch=null;
  }
  function observeScroll() {
    var delta=scrollY-previousScrollY; previousScrollY=scrollY;
    if(!delta || !lastTouch || document.hidden) return;
    clearTimeout(scrollTimer);
    // Scroll distance cannot tell us where a new finger is. Never inject
    // fresh waves at a released or no-longer-updated contact position.
    var now=performance.now();
    Array.from(active.entries()).forEach(function(entry) {
      var id=entry[0],contact=entry[1];
      if(now-contact.time>120) { finish(id); return; }
      window.dispatchEvent(new CustomEvent('rcp:liquid-scroll',{detail:{x:contact.x,y:contact.y,delta:delta}}));
    });
    // Only the wave solver receives momentum; no extra stationary circle.
    scrollTimer=setTimeout(settleScroll,180);
  }
  window.addEventListener('scroll',observeScroll,{passive:true});
  function syncTouches(e) {
    // Ended/cancelled fingers are absent from touches. Consume their final
    // coordinates before removing them, including swipes with no touchmove.
    if(e.type==='touchend' || e.type==='touchcancel') {
      Array.from(e.changedTouches || []).forEach(function(t) {
        var id='t'+t.identifier;
        if(active.has(id)) move(id,t.clientX,t.clientY);
      });
    }
    var live=new Set();
    Array.from(e.touches).forEach(function(t) {
      var id='t'+t.identifier; live.add(id);
      move(id,t.clientX,t.clientY);
    });
    Array.from(active.keys()).forEach(function(id) {
      if(id.charAt(0)==='t' && !live.has(id)) finish(id);
    });
  }
  // Touch identifiers are authoritative: no heuristic matching with Pointer IDs.
  window.addEventListener('touchstart',syncTouches,options);
  window.addEventListener('touchmove',syncTouches,options);
  window.addEventListener('touchend',syncTouches,options);
  window.addEventListener('touchcancel',syncTouches,options);
  window.addEventListener('pointerdown',function(e) {
    if(e.pointerType!=='touch' && e.button===0) start('p'+e.pointerId,e.clientX,e.clientY);
  },options);
  window.addEventListener('pointermove',function(e) {
    var id='p'+e.pointerId;
    if(e.pointerType==='touch' || !active.has(id)) return;
    if(e.getCoalescedEvents) e.getCoalescedEvents().forEach(function(p) { move(id,p.clientX,p.clientY); });
    move(id,e.clientX,e.clientY);
  },options);
  ['pointerup','pointercancel'].forEach(function(name) {
    window.addEventListener(name,function(e) {
      var id='p'+e.pointerId;
      if(e.pointerType==='touch' || !active.has(id)) return;
      if(Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) move(id,e.clientX,e.clientY);
      finish(id);
    },options);
  });
  // Cover trusted click-only activations without doubling the usual touch click.
  window.addEventListener('click',function(e) {
    if(!e.isTrusted) return;
    var x=e.clientX,y=e.clientY;
    if(e.detail===0 && e.target.getBoundingClientRect) {
      var rect=e.target.getBoundingClientRect(); x=rect.left+rect.width/2; y=rect.top+rect.height/2;
    }
    if(lastTouch && performance.now()-lastTouch.time<800 && Math.hypot(x-lastTouch.x,y-lastTouch.y)<24) return;
    var id='c'+(++serial); start(id,x,y); finish(id);
  },options);
  window.addEventListener('blur',function() { Array.from(active.keys()).forEach(finish); clearScrollFeedback(); lastTouch=null; });
  document.addEventListener('visibilitychange',function() {
    if(document.hidden) { Array.from(active.keys()).forEach(finish); clearScrollFeedback(); lastTouch=null; }
  });
})();
