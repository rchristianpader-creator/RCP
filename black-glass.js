/* One shared, damped height field: contacts exchange waves through the same liquid. */
(function () {
  'use strict';
  var reduced=matchMedia('(prefers-reduced-motion: reduce)');
  var opaque=matchMedia('(prefers-reduced-transparency: reduce)');
  var contacts=new Map(), impulses=[];
  var lastContact=null,lastScrollY=scrollY,lastScrollAt=0;
  var canvas,ctx,buffer,bctx,pixels,cols,rows,cell,width,height;
  var elevation,velocity,nextElevation,nextVelocity;
  var frame=0,previousTime=0,accumulator=0;
  var surface=null,point=null;
  function allowed() { return !reduced.matches && !opaque.matches && !document.hidden; }
  function resize() {
    if(!canvas) return;
    width=innerWidth; height=innerHeight;
    cell=Math.max(5,Math.ceil(width/180));
    cols=Math.ceil(width/cell)+2; rows=Math.ceil(height/cell)+2;
    var size=cols*rows,ratio=Math.min(devicePixelRatio||1,1.5);
    elevation=new Float32Array(size); velocity=new Float32Array(size);
    nextElevation=new Float32Array(size); nextVelocity=new Float32Array(size);
    canvas.width=Math.round(width*ratio); canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    buffer.width=cols; buffer.height=rows; pixels=bctx.createImageData(cols,rows);
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
  }
  function prepare() {
    if(canvas) return true;
    canvas=document.createElement('canvas'); canvas.className='black-glass-water';
    canvas.setAttribute('aria-hidden','true'); ctx=canvas.getContext('2d');
    buffer=document.createElement('canvas'); bctx=buffer.getContext('2d');
    if(!ctx || !bctx) { canvas=null; return false; }
    document.body.appendChild(canvas); resize(); return true;
  }
  function clearReflection() {
    if(surface) {
      surface.classList.remove('black-glass-touch');
      surface.style.removeProperty('--touch-x'); surface.style.removeProperty('--touch-y');
    }
    surface=null; point=null;
  }
  function reflect() {
    if(!point) return;
    var target=document.elementFromPoint(point.x,point.y);
    var next=target && target.closest('.card, .kasten, .auftakt-mitte, .jetzt, header');
    if(surface!==next) {
      var pending=point; clearReflection(); point=pending; surface=next;
      if(surface) surface.classList.add('black-glass-touch');
    }
    if(surface) {
      var r=surface.getBoundingClientRect();
      surface.style.setProperty('--touch-x',(point.x-r.left)+'px');
      surface.style.setProperty('--touch-y',(point.y-r.top)+'px');
    }
  }
  function wake() {
    if(canvas && !frame && allowed()) { previousTime=performance.now(); accumulator=16.7; frame=requestAnimationFrame(draw); }
  }
  function begin(id,x,y) {
    if(!allowed() || !prepare()) return;
    var now=performance.now();
    contacts.set(id,{x:x,y:y,time:now,born:now}); point={x:x,y:y};
    lastContact={x:x,y:y,time:now,released:0,scrolling:false};
    impulses.push({x:x,y:y,power:.55}); wake();
  }
  function move(id,x,y) {
    var old=contacts.get(id); if(!old) return;
    var now=performance.now();
    if(lastContact) { lastContact.x=x; lastContact.y=y; lastContact.time=now; }
    if(x===old.x && y===old.y) { old.time=now; return; }
    var distance=Math.hypot(x-old.x,y-old.y);
    // No distance/time threshold. Every delivered sample changes the contact.
    // Integrating along its path avoids separated circles during fast movement.
    var steps=Math.max(1,Math.min(48,Math.ceil(distance/5)));
    for(var i=1;i<=steps;i++) impulses.push({x:old.x+(x-old.x)*i/steps,y:old.y+(y-old.y)*i/steps,power:Math.min(.18,.025+distance/steps*.025)});
    contacts.set(id,{x:x,y:y,time:now,born:old.born}); point={x:x,y:y}; wake();
  }
  function end(id) {
    if(!contacts.has(id)) return;
    contacts.delete(id);
    if(!contacts.size) {
      if(lastContact) lastContact.released=performance.now();
      clearReflection();
    }
    wake();
  }
  function reset() {
    cancelAnimationFrame(frame); frame=0; contacts.clear(); lastContact=null; impulses=[]; clearReflection();
    if(elevation) { elevation.fill(0); velocity.fill(0); nextElevation.fill(0); nextVelocity.fill(0); }
    if(ctx) ctx.clearRect(0,0,width,height);
  }
  function disturb(x,y,power,held) {
    var gx=x/cell+1,gy=y/cell+1,radius=20/cell;
    var x0=Math.max(1,Math.floor(gx-radius*2)),x1=Math.min(cols-2,Math.ceil(gx+radius*2));
    var y0=Math.max(1,Math.floor(gy-radius*2)),y1=Math.min(rows-2,Math.ceil(gy+radius*2));
    for(var yy=y0;yy<=y1;yy++) for(var xx=x0;xx<=x1;xx++) {
      var dist=((xx-gx)*(xx-gx)+(yy-gy)*(yy-gy))/(radius*radius);
      var weight=Math.exp(-dist*1.7),index=yy*cols+xx;
      if(held) velocity[index]+=(-.8*weight-elevation[index])*.035*weight;
      else { elevation[index]=Math.max(-3,elevation[index]-power*weight); velocity[index]=Math.max(-.8,velocity[index]-power*weight*.13); }
    }
  }
  function step() {
    // All fingers contribute to these arrays, so crossing wakes interfere naturally.
    contacts.forEach(function(p) { disturb(p.x,p.y,0,true); });
    for(var y=1;y<rows-1;y++) for(var x=1;x<cols-1;x++) {
      var i=y*cols+x,h=elevation[i],v=velocity[i];
      var lapH=elevation[i-1]+elevation[i+1]+elevation[i-cols]+elevation[i+cols]-4*h;
      var lapV=velocity[i-1]+velocity[i+1]+velocity[i-cols]+velocity[i+cols]-4*v;
      // Viscosity spreads momentum while damping fast oscillations.
      var nv=(v+.16*lapH+.12*lapV)*.972;
      var edge=Math.min(x,y,cols-1-x,rows-1-y);
      if(edge<5) nv*=.76+edge*.045;
      nextVelocity[i]=nv;
      nextElevation[i]=Math.max(-3,Math.min(3,(h+nv)*.998));
    }
    var swap=elevation; elevation=nextElevation; nextElevation=swap;
    swap=velocity; velocity=nextVelocity; nextVelocity=swap;
  }
  function shade() {
    var data=pixels.data,energy=0;
    for(var y=1;y<rows-1;y++) for(var x=1;x<cols-1;x++) {
      var i=y*cols+x,h=elevation[i];
      var sx=(elevation[i-1]-elevation[i+1])*2.4;
      var sy=(elevation[i-cols]-elevation[i+cols])*2.4;
      var localEnergy=Math.max(Math.abs(h),Math.abs(velocity[i])*3);
      energy=Math.max(energy,localEnergy);
      if(localEnergy<.0004 && Math.abs(sx)+Math.abs(sy)<.0004) { data[i*4+3]=0; continue; }
      var slope=Math.hypot(sx,sy),length=Math.sqrt(1+sx*sx+sy*sy);
      var light=(-.42*sx-.58*sy+.69)/length;
      // Normals from the shared surface produce moving silver highlights and shadows.
      var specular=Math.pow(Math.max(0,(-.25*sx-.35*sy+.90)/length),24);
      var ridge=Math.min(1,slope*2.5);
      var bright=Math.max(0,light-.69)*1.5+specular*ridge*.6;
      var dark=Math.max(0,.69-light)*.85;
      var shadeAlpha=Math.min(.44,Math.max(bright,dark)+Math.min(.055,Math.abs(h)*.035));
      var p=i*4;
      if(bright>=dark) { data[p]=235;data[p+1]=245;data[p+2]=241; }
      else { data[p]=2;data[p+1]=6;data[p+2]=5; }
      data[p+3]=Math.round(shadeAlpha*255);

    }
    bctx.putImageData(pixels,0,0);
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(buffer,1,1,cols-2,rows-2,0,0,width,height);
    return energy;
  }
  function draw(now) {
    frame=0;
    if(!allowed()) { reset(); return; }
    accumulator+=Math.min(50,now-previousTime); previousTime=now;
    impulses.forEach(function(p) { disturb(p.x,p.y,p.power,false); }); impulses=[];
    var iterations=0;
    while(accumulator>=16.7 && iterations<3) { step(); accumulator-=16.7; iterations++; }
    reflect();
    var energy=shade();
    if(contacts.size || energy>.004) frame=requestAnimationFrame(draw);
    else { ctx.clearRect(0,0,width,height); elevation.fill(0); velocity.fill(0); }
  }
  window.addEventListener('rcp:liquid-contact',function(e) {
    var input=e.detail;
    if(input.phase==='start') begin(input.id,input.x,input.y);
    else if(input.phase==='move') {
      if(!contacts.has(input.id)) begin(input.id,input.x,input.y);
      else move(input.id,input.x,input.y);
    } else end(input.id);
  });
  window.addEventListener('scroll',function() {
    var now=performance.now(),delta=scrollY-lastScrollY; lastScrollY=scrollY;
    if(!lastContact || !allowed() || !canvas || !delta) return;
    if(contacts.size) lastContact.scrolling=true;
    var released=lastContact.released;
    var follow=contacts.size || (released && lastContact.scrolling && now-released<1100 && now-lastScrollAt<160);
    lastScrollAt=now;
    if(!follow) return;
    // Feed the momentum of this same swipe at its actual last contact point.
    // Never start a new effect at an arbitrary card or symbol.
    var freshMove=contacts.size && now-lastContact.time<24;
    if(!freshMove) {
      var fade=contacts.size ? 1 : Math.pow(1-(now-released)/1100,2);
      impulses.push({x:lastContact.x,y:lastContact.y,power:Math.min(.16,Math.abs(delta)*.007)*fade});
    }
    wake();
  },{passive:true});
  window.addEventListener('blur',reset);
  window.addEventListener('resize',function() { resize(); wake(); },{passive:true});
  document.addEventListener('visibilitychange',function() { if(document.hidden) reset(); });
  [reduced,opaque].forEach(function(p) { p.addEventListener('change',reset); });
})();
