const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = html.indexOf('/* Start: echter Fortschritt');
const source = html.slice(start, html.indexOf('</script>', start));

// Run the production loader with deterministic time and DOM events. These
// checks exercise readiness, failure, deadlines and observer cleanup.
function harness({ reduced = false, cached = false } = {}) {
  let now = 0, nextId = 0;
  const timers = new Map(), listeners = new Map(), observers = [];
  function element() {
    const classes = new Set(), attrs = new Map();
    return {
      textContent: '', style: {setProperty() {}, removeProperty() {}},
      classList: {add: x => classes.add(x), contains: x => classes.has(x), toggle(x, on) {on ? classes.add(x) : classes.delete(x);}},
      setAttribute: (k,v) => attrs.set(k,String(v)),
      getAttribute: k => attrs.get(k) ?? null,
      hasAttribute: k => attrs.has(k),
      querySelector: () => null
    };
  }
  const card = element(), panel = element(), bar = element(), progress = element(), status = element();
  const labels = Object.fromEntries(['liste','chart','kurse'].map(x=>[x,element()]));
  const nodes = {auftakt:panel,auftaktBalken:bar,auftaktFortschritt:progress,auftaktWer:element(),auftaktTun:status};
  panel.querySelector = selector => labels[selector.match(/\[data-ladeschritt=(\w+)\]/)?.[1]] || null;
  panel.parentNode = {removeChild() {delete nodes.auftakt;}};
  card.setAttribute('aria-busy','true');
  const document = {
    getElementById: x=>nodes[x] || null,
    querySelector: ()=>card,
    addEventListener(name,fn) {listeners.set(name,[...(listeners.get(name)||[]),fn]);}
  };
  const window = {matchMedia:()=>({matches:reduced})};
  if(cached) window.rcpPositionen = [{id:'demo'}];
  const context = {
    window, document, Date: {now:()=>now},
    setTimeout(fn,delay=0) {const id=++nextId;timers.set(id,{fn,at:now+delay});return id;},
    clearTimeout:id=>timers.delete(id),
    setInterval(fn,delay) {const id=++nextId;timers.set(id,{fn,at:now+delay,interval:delay});return id;},
    clearInterval:id=>timers.delete(id),
    MutationObserver: class {
      constructor(fn) {this.fn=fn;this.active=false;observers.push(this);}
      observe() {this.active=true;}
      disconnect() {this.active=false;}
    }
  };
  vm.runInNewContext(source,context);
  function advance(ms) {
    const until=now+ms;
    for(;;) {
      const entry=[...timers].filter(([,t])=>t.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!entry) break;
      const [id,t]=entry;now=t.at;
      if(t.interval) t.at+=t.interval; else timers.delete(id);
      t.fn();
    }
    now=until;
  }
  function emit(name,detail) {(listeners.get(name)||[]).forEach(fn=>fn({detail}));}
  return {panel,bar,progress,status,labels,advance,observers,window,
    emit,
    cards() {window.rcpPositionen=[{id:'demo'}];emit('rcp:karten');},
    chart(failed=false) {card.setAttribute('aria-busy','false');if(failed)card.setAttribute('data-fehler','true');observers.filter(o=>o.active).forEach(o=>o.fn());},
    closed:()=>panel.classList.contains('weg'),
    removed:()=>!nodes.auftakt,
    intervals:()=>[...timers.values()].filter(t=>t.interval).length
  };
}

test('a placeholder does not count as a loaded chart',()=>{
  const h=harness();h.cards();h.emit('rcp:status');h.advance(1000);
  assert.equal(h.closed(),false);
  assert.equal(h.progress.getAttribute('aria-valuenow'),'2');
  assert.match(h.status.textContent,/Charts werden geladen/);
  h.chart();h.advance(0);assert.equal(h.closed(),true);
  assert.equal(h.progress.getAttribute('aria-valuenow'),'3');
});
test('fast loading waits only for the short minimum and removes the screen',()=>{
  const h=harness();h.cards();h.chart();h.emit('rcp:status');h.advance(599);
  assert.equal(h.closed(),false);h.advance(1);assert.equal(h.closed(),true);
  h.advance(460);assert.equal(h.removed(),true);assert.equal(h.intervals(),0);
});
test('deadline releases the app without inventing completed progress',()=>{
  const h=harness();h.cards();h.advance(4500);
  assert.equal(h.closed(),true);
  assert.equal(h.progress.getAttribute('aria-valuenow'),'1');
  assert.equal(h.bar.style.transform,'scaleX(0.333)');
  assert.match(h.status.textContent,/Hintergrund/);
  assert.equal(h.observers.some(o=>o.active),false);
  assert.equal(h.intervals(),0);
});
test('a failed status request finishes with an honest partial-data message',()=>{
  const h=harness();h.cards();h.chart();h.emit('rcp:status-fehler');h.advance(600);
  assert.equal(h.closed(),true);assert.match(h.status.textContent,/teilweise nicht verfügbar/);
});
test('a failed chart is terminal and is not reported as successful',()=>{
  const h=harness();h.cards();h.chart(true);h.emit('rcp:status');h.advance(600);
  assert.equal(h.closed(),true);assert.match(h.status.textContent,/teilweise nicht verfügbar/);
});
test('reduced motion removes the artificial minimum',()=>{
  const h=harness({reduced:true});h.cards();h.chart();h.emit('rcp:status');h.advance(0);
  assert.equal(h.closed(),true);
});
test('cards that arrived before loader setup are recognized',()=>{
  const h=harness({cached:true});h.chart();h.emit('rcp:status');h.advance(600);
  assert.equal(h.closed(),true);
});
test('late responses do not restart progress after the deadline',()=>{
  const h=harness();h.cards();h.advance(4500);const before=h.bar.style.transform;
  h.chart();h.emit('rcp:status');h.advance(500);
  assert.equal(h.bar.style.transform,before);assert.equal(h.removed(),true);
});
