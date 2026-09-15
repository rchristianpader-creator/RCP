const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../symbole.js'), 'utf8');

function harness({count=3,hash='',reduced=false,scrollend=false}={}) {
  class Target {
    constructor(id='',card=false) {
      this.id=id;this.listeners={};this.options={};this.attrs={};this.children=[];
      this.style={order:''};this.hidden=false;this.inert=false;this.scrollLeft=0;
      this.classes=new Set(card?['card']:[]);
      this.classList={contains:x=>this.classes.has(x),add:x=>this.classes.add(x),
        toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};
    }
    addEventListener(n,fn,o){(this.listeners[n]||=[]).push(fn);this.options[n]=o;}
    fire(n,v={}){const e={target:this,button:0,preventDefault(){this.defaultPrevented=true;},...v};for(const fn of this.listeners[n]||[])fn(e);return e;}
    setAttribute(n,v){this.attrs[n]=v;} getAttribute(n){return this.attrs[n]??null;}
    removeAttribute(n){delete this.attrs[n];}
    contains(el){return el===this||this.children.includes(el);}
    closest(s){return this.hash&&s.includes('a[href')?this:null;}
    focus(){doc.activeElement=this;}
    getBoundingClientRect(){const top=800-win.scrollY;return {top,bottom:top+this.offsetHeight};}
    scrollTo(o){this.scrollLeft=o.left;this.lastScroll=o;this.scrollCalls=(this.scrollCalls||0)+1;}
  }
  const elements=Object.fromEntries(['symbolFenster','karten','symbolSteuerung','symbolZaehler'].map(id=>[id,new Target(id)]));
  const cards=Array.from({length:count},(_,i)=>new Target('stock'+i,true));
  cards.forEach((c,i)=>{c.attrs['data-kuerzel']='S'+i;elements[c.id]=c;});
  elements.karten.children=cards;elements.karten.clientWidth=390;
  elements.symbolFenster.offsetHeight=816;
  const links=cards.map(c=>{const a=new Target();a.hash='#'+c.id;return a;});
  const win=new Target(),doc=new Target(),timers=new Map(),frames=new Map();let seq=0;
  win.innerHeight=844;win.scrollY=0;if(scrollend)win.onscrollend=null;
  win.matchMedia=()=>({matches:reduced});
  win.scrollTo=o=>{win.lastScroll=o;win.scrollY=o.top;win.scrollCalls=(win.scrollCalls||0)+1;};
  win.setTimeout=fn=>{timers.set(++seq,fn);return seq;};win.clearTimeout=id=>timers.delete(id);
  win.requestAnimationFrame=fn=>{frames.set(++seq,fn);return seq;};
  doc.getElementById=id=>elements[id]||null;doc.querySelectorAll=()=>links;
  const location={hash};
  function layout(){cards.slice().sort((a,b)=>(+a.style.order||0)-(+b.style.order||0)).forEach((c,i)=>{c.offsetLeft=14+i*elements.karten.clientWidth;c.offsetWidth=elements.karten.clientWidth-28;});}
  function flush(map){const callbacks=[...map.values()];map.clear();callbacks.forEach(fn=>fn());}
  layout();vm.runInNewContext(source,{window:win,document:doc,location});doc.fire('rcp:karten');
  const current=()=>cards.filter(c=>!c.inert).map(c=>c.id);
  const horizontal=x=>{elements.karten.scrollLeft=x;elements.karten.fire('scroll');flush(frames);};
  const vertical=y=>{win.scrollY=y;win.fire('scroll');};
  return {win,doc,elements,cards,links,location,current,horizontal,vertical,layout,
    idle:()=>flush(timers),frame:()=>flush(frames),timers};
}

test('native horizontal scrolling retains all cards and updates the selected symbol',()=>{
 const h=harness();assert.deepEqual(h.current(),['stock0']);
 h.horizontal(390);assert.deepEqual(h.current(),['stock1']);
 assert.ok(h.cards.every(c=>!c.hidden));assert.equal(h.win.lastScroll,undefined);
 assert.equal(h.elements.symbolZaehler.textContent,'S1 · 2 von 3');
 h.horizontal(780);h.horizontal(0);assert.deepEqual(h.current(),['stock0']);
});
test('native touch movement is never intercepted or transformed by the controller',()=>{
 const h=harness();
 for(const target of [h.win,h.elements.symbolFenster,h.elements.karten]) {
  const e=target.fire('touchmove',{touches:[{clientX:100,clientY:200}]});
  assert.equal(e.defaultPrevented,undefined);assert.equal(target.listeners.touchmove,undefined);
 }
 assert.ok(h.cards.every(c=>c.style.transform===undefined));
});
test('scrolling selection is coalesced and nearest to the current native scroll position',()=>{
 const h=harness();h.elements.karten.scrollLeft=260;
 h.elements.karten.fire('scroll');h.elements.karten.fire('scroll');
 assert.deepEqual(h.current(),['stock0']);h.frame();assert.deepEqual(h.current(),['stock1']);
});
test('initial hash and direct links select the correct horizontal offset and center vertically',()=>{
 const h=harness({hash:'#stock2'});assert.equal(h.elements.karten.lastScroll.left,780);
 assert.equal(h.win.lastScroll,undefined);
 h.win.rcpSymbolZeigen('stock1');assert.equal(h.elements.karten.lastScroll.left,390);
 assert.equal(h.elements.karten.lastScroll.behavior,'smooth');assert.equal(h.win.lastScroll.top,786);
 assert.equal(h.win.rcpSymbolZeigen('missing'),false);
});
test('sorting preserves the selected DOM and recalculates native snap positions',()=>{
 const h=harness();const chart={};h.cards[0].children.push(chart);
 h.cards[0].style.order='3';h.cards[1].style.order='1';h.cards[2].style.order='2';
 h.layout();h.doc.fire('rcp:sortiert');
 assert.deepEqual(h.current(),['stock0']);assert.equal(h.elements.karten.lastScroll.left,780);
 assert.equal(h.cards[0].children[0],chart);h.horizontal(0);assert.deepEqual(h.current(),['stock1']);
});
test('no centering while the finger is down or scroll momentum continues',()=>{
 const h=harness();h.win.fire('touchstart',{touches:[{}]});
 h.vertical(650);h.idle();assert.equal(h.win.lastScroll,undefined);
 h.win.fire('touchend',{touches:[]});h.vertical(700);
 assert.equal(h.win.lastScroll,undefined);h.vertical(720);assert.equal(h.win.lastScroll,undefined);
 h.idle();assert.equal(h.win.lastScroll.top,786);assert.equal(h.win.lastScroll.behavior,'smooth');
});
test('native scrollend waits for the browser; a horizontal scrollend does not center the page',()=>{
 const h=harness({scrollend:true});h.vertical(700);h.idle();assert.equal(h.win.lastScroll,undefined);
 h.win.fire('scrollend',{target:h.elements.karten});assert.equal(h.win.lastScroll,undefined);
 h.win.fire('scrollend');assert.equal(h.win.lastScroll.top,786);
});
test('start page and footer stay free; leaving the centered window does not pull back',()=>{
 const h=harness();h.vertical(100);h.idle();assert.equal(h.win.lastScroll,undefined);
 h.vertical(1400);h.idle();assert.equal(h.win.lastScroll,undefined);
 h.vertical(700);h.idle();assert.equal(h.win.scrollCalls,1);
 h.vertical(850);h.idle();assert.equal(h.win.scrollCalls,1);
 h.vertical(1350);h.idle();h.vertical(700);h.idle();assert.equal(h.win.scrollCalls,2);
});
test('browser-toolbar height changes do not interrupt horizontal momentum',()=>{
 const h=harness();const calls=h.elements.karten.scrollCalls;
 h.elements.karten.scrollLeft=150;h.win.innerHeight=780;h.win.fire('resize');
 assert.equal(h.elements.karten.scrollCalls,calls);assert.equal(h.elements.karten.scrollLeft,150);
 h.elements.karten.clientWidth=808;h.layout();h.win.fire('resize');
 assert.equal(h.elements.karten.scrollCalls,calls+1);
});
test('keyboard selection, focus and reduced motion remain accessible without visible arrows',()=>{
 const h=harness({reduced:true});h.doc.activeElement=h.cards[0];
 h.elements.symbolFenster.fire('keydown',{key:'ArrowRight'});
 assert.deepEqual(h.current(),['stock1']);assert.equal(h.doc.activeElement,h.cards[1]);
 assert.equal(h.elements.karten.lastScroll.behavior,'instant');
 assert.equal(h.links[1].attrs['aria-current'],'true');assert.equal(h.cards[0].attrs['aria-hidden'],'true');
});
test('empty and single lists remain usable',()=>{
 assert.equal(harness({count:0}).elements.symbolSteuerung.hidden,true);
 const h=harness({count:1});h.elements.symbolFenster.fire('keydown',{key:'ArrowRight'});
 assert.deepEqual(h.current(),['stock0']);assert.equal(h.elements.karten.scrollLeft,0);
});
test('direct centering adapts to viewport height without fixed offsets',()=>{
 for(const height of [667,844,900]) {
  const h=harness();h.win.innerHeight=height;h.elements.symbolFenster.offsetHeight=height-28;
  h.win.rcpSymbolZeigen('stock2');assert.equal(h.win.lastScroll.top,786);
 }
});
test('landing naturally at the center does not make the next small scroll snap back',()=>{
 const h=harness();h.vertical(786);h.idle();assert.equal(h.win.lastScroll,undefined);
 h.vertical(850);h.idle();assert.equal(h.win.lastScroll,undefined);
});
test('unchanged live sorting updates do not reset an in-progress horizontal scroll',()=>{
 const h=harness();const calls=h.elements.karten.scrollCalls;
 h.elements.karten.scrollLeft=150;h.doc.fire('rcp:sortiert');
 assert.equal(h.elements.karten.scrollLeft,150);
 assert.equal(h.elements.karten.scrollCalls,calls);
});
