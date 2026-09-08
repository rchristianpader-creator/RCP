/* Low-latency contact feedback, independent of the fluid solver. */
(function () {
  'use strict';
  var active=new Map(), serial=0,lastTouch=null;
  var scrollTimer=0,previousScrollY=scrollY,lastScrollAt=-Infinity;
  var options={passive:true,capture:true};
  function emit(phase,id,x,y) {
    window.dispatchEvent(new CustomEvent('rcp:liquid-contact',{detail:{phase:phase,id:id,x:x,y:y}}));
  }
  function start(id,x,y) {
    if(document.hidden) return;
    if(active.has(id)) finish(id);
    var mark=document.createElement('span');
    mark.className='liquid-contact'; mark.setAttribute('aria-hidden','true');
    var core=document.createElement('span'); core.className='liquid-contact-core'; mark.appendChild(core);
    mark.style.transform='translate3d('+x+'px,'+y+'px,0)';
    document.body.appendChild(mark);
    active.set(id,{node:mark,x:x,y:y,born:performance.now()});
    // Visual feedback is installed before invoking any simulation handler.
    lastTouch={x:x,y:y,time:performance.now()};
    emit('start',id,x,y);
  }
  function move(id,x,y) {
    var contact=active.get(id);
    if(!contact) { start(id,x,y); return; }
    contact.x=x; contact.y=y;
    contact.node.style.transform='translate3d('+x+'px,'+y+'px,0)';
    lastTouch={x:x,y:y,time:performance.now()};
    emit('move',id,x,y);
  }
  function finish(id) {
    var contact=active.get(id); if(!contact) return;
    active.delete(id);
    lastTouch={x:contact.x,y:contact.y,time:performance.now()};
    var wait=Math.max(0,140-(performance.now()-contact.born));
    setTimeout(function() {
      contact.node.classList.add('released');
      setTimeout(function() { contact.node.remove(); },650);
    },wait);
    emit('end',id,contact.x,contact.y);
  }
  function clearScrollFeedback() {
    clearTimeout(scrollTimer); lastScrollAt=-Infinity;
  }
  function settleScroll() {
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
  window.addEventListener('scroll',function() {
    var delta=scrollY-previousScrollY; previousScrollY=scrollY;
    if(!delta || !lastTouch || document.hidden) return;
    var now=performance.now();
    // Keep a continuous native momentum gesture alive, but never resurrect
    // a stale touch for later keyboard, wheel, or programmatic scrolling.
    if(!active.size && now-lastTouch.time>250 && now-lastScrollAt>180) return;
    lastScrollAt=now;
    clearTimeout(scrollTimer);
    window.dispatchEvent(new CustomEvent('rcp:liquid-scroll',{detail:{x:lastTouch.x,y:lastTouch.y,delta:delta}}));
    // Only the wave solver receives momentum; no extra stationary circle.
    scrollTimer=setTimeout(settleScroll,180);
  },{passive:true});
  function syncTouches(e) {
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
    move(id,e.clientX,e.clientY);
  },options);
  ['pointerup','pointercancel'].forEach(function(name) {
    window.addEventListener(name,function(e) { if(e.pointerType!=='touch') finish('p'+e.pointerId); },options);
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
