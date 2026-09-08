const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
function setup({motion=false,transparency=false,canvas=true}={}) {
 let now=0,serial=0; const timers=new Map(),frames=new Map(),nodes=[],events=[],listeners=[];
 class Target {
  constructor(){this.handlers={};}
  addEventListener(type,fn,options){(this.handlers[type]??=[]).push(fn);listeners.push({type,options});}
  dispatchEvent(e){e.target??=this;for(const fn of this.handlers[e.type]??[])fn(e);return true;}
 }
 class Node extends Target {
  constructor(tag){super();this.tag=tag;this.children=[];this.className='';this.style={setProperty(){},removeProperty(){}};
   this.classList={add:(c)=>{if(!this.className.split(' ').includes(c))this.className+=' '+c;},remove:(c)=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ');}};
   this.context={setTransform(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:(p)=>{this.pixels=p.data.slice();this.paints=(this.paints||0)+1;},clearRect(){},drawImage(){}};
  }
  appendChild(n){this.children.push(n);n.parent=this;return n;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
  setAttribute(){} getContext(){return canvas?this.context:null;}
 }
 const window=new Target(),document=new Target();document.body=new Node('body');document.hidden=false;document.elementFromPoint=()=>null;
 document.createElement=(tag)=>{const n=new Node(tag);nodes.push(n);return n;};
 const media={};const context=vm.createContext({window,document,performance:{now:()=>now},innerWidth:390,innerHeight:844,devicePixelRatio:3,scrollY:0,
  matchMedia:q=>media[q]??=Object.assign(new Target(),{matches:q.includes('transparency')?transparency:motion}),
  CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail;}},
  setTimeout:(fn,delay)=>{const id=++serial;timers.set(id,{fn,at:now+delay});return id;},clearTimeout:id=>timers.delete(id),
  requestAnimationFrame:fn=>{const id=++serial;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)});
 for(const type of ['rcp:liquid-contact','rcp:liquid-scroll'])window.addEventListener(type,e=>events.push(e));
 for(const file of ['touch-contact.js','black-glass.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
 function advance(ms){const until=now+ms;for(;;){const next=[...timers].filter(([,t])=>t.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=until;}
 return {context,document,window,nodes,events,listeners,frames,media,advance,
  fire:(type,extra={})=>window.dispatchEvent({type,...extra}),
  touch:(type,points)=>window.dispatchEvent({type,touches:points.map(([identifier,clientX,clientY])=>({identifier,clientX,clientY}))}),
  scroll:y=>{context.scrollY=y;window.dispatchEvent({type:'scroll'});},
  frame:(ms=17)=>{advance(ms);const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));},
  contacts:()=>document.body.children.filter(n=>n.className.split(' ').includes('liquid-contact')),
  pixels:()=>nodes.find(n=>n.pixels)?.pixels};
}
const count=(h,type)=>h.events.filter(e=>e.type===type).length;
test('every delivered touch movement, including subpixel reversals, reaches solver',()=>{const h=setup();h.touch('touchstart',[[1,20,20]]);for(let i=0;i<100;i++)h.touch('touchmove',[[1,20+(i%2)*.1,20+i*.01]]);assert.equal(count(h,'rcp:liquid-contact'),101);});
test('multiple fingers survive pointer cancellation and end independently',()=>{const h=setup();h.touch('touchstart',[[1,20,20],[2,80,80]]);h.fire('pointercancel',{pointerType:'touch',pointerId:1});assert.equal(h.contacts().length,2);h.touch('touchend',[[2,81,80]]);h.advance(800);assert.equal(h.contacts().length,1);h.touch('touchcancel',[]);h.advance(800);assert.equal(h.contacts().length,0);});
test('rapid repeated taps leave no contact elements',()=>{const h=setup();for(let i=0;i<100;i++){h.touch('touchstart',[[i,20,20]]);h.touch('touchend',[]);h.advance(5);}h.advance(1000);assert.equal(h.contacts().length,0);});
test('touch-generated click does not double feedback',()=>{const h=setup();h.touch('touchstart',[[1,20,20]]);h.touch('touchend',[]);h.fire('click',{isTrusted:true,detail:1,clientX:20,clientY:20});assert.equal(count(h,'rcp:liquid-contact'),2);});
test('mouse hover and synthetic clicks produce no feedback',()=>{const h=setup();h.fire('pointermove',{pointerType:'mouse',pointerId:1,clientX:20,clientY:20});h.fire('click',{isTrusted:false});assert.equal(h.events.length,0);});
test('native scrolling is never cancelled by feedback listeners',()=>{const h=setup();for(const l of h.listeners.filter(l=>/^(touch|pointer|scroll)/.test(l.type)))assert.equal(l.options.passive,true);});
test('continuous momentum feedback lasts beyond touchend and cleans up after idle',()=>{const h=setup();h.touch('touchstart',[[1,20,20]]);h.touch('touchend',[]);for(let i=1;i<=60;i++){h.advance(100);h.scroll(i*20);}assert.equal(count(h,'rcp:liquid-scroll'),60);h.advance(900);assert.equal(h.contacts().length,0);});
test('unrelated scroll long after a gesture must not resurrect an old finger',()=>{const h=setup();h.touch('touchstart',[[1,20,20]]);h.touch('touchend',[]);h.advance(30000);h.scroll(500);assert.equal(count(h,'rcp:liquid-scroll'),0);});
test('blur stops solver and removes feedback after release',()=>{const h=setup();h.touch('touchstart',[[1,20,20]]);h.frame();h.fire('blur');h.advance(1000);assert.equal(h.frames.size,0);assert.equal(h.contacts().length,0);h.scroll(20);assert.equal(count(h,'rcp:liquid-scroll'),0);});
test('hidden document stops solver and rejects new contacts',()=>{const h=setup();h.touch('touchstart',[[1,20,20]]);h.document.hidden=true;h.document.dispatchEvent({type:'visibilitychange'});h.touch('touchstart',[[2,20,20]]);h.advance(1000);assert.equal(h.frames.size,0);assert.equal(h.contacts().length,0);});
for(const pref of ['motion','transparency'])test(pref+' preference disables solver but preserves contact feedback',()=>{const h=setup({[pref]:true});h.touch('touchstart',[[1,20,20]]);assert.equal(h.frames.size,0);assert.equal(h.contacts().length,1);});
test('missing canvas context preserves touch feedback without throwing',()=>{const h=setup({canvas:false});h.touch('touchstart',[[1,20,20]]);assert.equal(h.contacts().length,1);assert.equal(h.frames.size,0);});
test('same-size resize preserves active waves after release',()=>{const h=setup();h.touch('touchstart',[[1,195,400]]);h.frame();h.touch('touchend',[]);h.fire('resize');h.frame();assert.ok(h.pixels().some((v,i)=>i%4===3&&v>0));});
test('120 Hz display does not shade the 60 Hz simulation twice per step',()=>{const h=setup();h.touch('touchstart',[[1,195,400]]);for(let i=0;i<120;i++)h.frame(1000/120);const paints=h.nodes.find(n=>n.paints)?.paints||0;assert.ok(paints<=61,'paint count: '+paints);});
test('shared simulation produces visible waves and eventually sleeps',()=>{const h=setup();h.touch('touchstart',[[1,170,400],[2,210,400]]);for(let i=0;i<5;i++)h.frame();assert.ok(h.pixels().some((v,i)=>i%4===3&&v>0));h.touch('touchend',[]);let frames=0;while(h.frames.size&&frames++<1800)h.frame();assert.equal(h.frames.size,0,'solver must settle within 30 seconds');});
test('scroll idle cleans up a contact when touchend was not delivered',()=>{const h=setup();h.touch('touchstart',[[1,195,400]]);h.scroll(50);h.advance(100);h.scroll(100);h.advance(1000);assert.equal(h.contacts().length,0);assert.ok(h.events.some(e=>e.type==='rcp:liquid-contact'&&e.detail.phase==='end'));});
test('scroll feedback never adds a second decorative contact circle',()=>{const h=setup();h.touch('touchstart',[[1,195,400]]);h.scroll(50);assert.equal(h.contacts().length,1);});
test('touch movement after scroll idle starts feedback again',()=>{const h=setup();h.touch('touchstart',[[1,195,400]]);h.scroll(50);h.advance(1000);h.touch('touchmove',[[1,190,390]]);assert.equal(h.contacts().length,1);assert.equal(h.events.at(-1).detail.phase,'start');});
