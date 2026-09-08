const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../symbole.js'), 'utf8');

function harness({count = 3, hash = '', reduced = false} = {}) {
  class Target {
    constructor(id = '', card = false) {
      this.id = id; this.listeners = {}; this.attrs = {}; this.children = [];
      this.style = {order: '', transform: ''}; this.hidden = false;
      this.classes = new Set(card ? ['card'] : []);
      this.classList = {
        contains: x => this.classes.has(x), add: x => this.classes.add(x),
        toggle: (x, on) => on ? this.classes.add(x) : this.classes.delete(x)
      };
      this.animations = [];
    }
    addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
    fire(name, values = {}) {
      const e = {target: this, button: 0, pointerId: 1, isPrimary: true,
        preventDefault() { this.defaultPrevented = true; },
        stopImmediatePropagation() { this.stopped = true; }, ...values};
      for (const fn of this.listeners[name] || []) { fn(e); if (e.stopped) break; }
      return e;
    }
    getAttribute(name) { return this.attrs[name] ?? null; }
    setAttribute(name, value) { this.attrs[name] = value; }
    removeAttribute(name) { delete this.attrs[name]; }
    contains(el) { return el === this || this.children.includes(el); }
    closest(selector) { return this.isButton && selector.includes('button') ? this :
      this.hash && selector.includes('a[href') ? this : null; }
    getBoundingClientRect() { return {top: 800}; }
    setPointerCapture(id) { this.captured = id; }
    animate(frames, options) { this.animations.push({frames, options}); }
    focus() { doc.activeElement = this; }
  }
  const elements = Object.fromEntries(['symbolFenster','karten','symbolSteuerung',
    'symbolZaehler'].map(id => [id, new Target(id)]));
  const cards = Array.from({length: count}, (_, i) => new Target('stock'+i, true));
  cards.forEach((card, i) => { card.attrs['data-kuerzel'] = 'S'+i; elements[card.id] = card; });
  elements.karten.children = cards;
  const links = cards.map(card => { const a = new Target(); a.hash = '#'+card.id; return a; });
  const win = new Target(), doc = new Target();
  doc.documentElement = new Target();
  win.innerHeight = 844; elements.symbolFenster.offsetHeight = 816;
  doc.getElementById = id => elements[id] || null;
  doc.querySelectorAll = () => links;
  win.matchMedia = () => ({matches: reduced});
  win.scrollY = 0;
  win.scrollTo = value => { win.lastScroll = value; };
  const location = {hash};
  vm.runInNewContext(source, {window: win, document: doc, location,
    getComputedStyle: () => ({marginBottom: '28px'}), Date});
  doc.fire('rcp:karten');
  const current = () => cards.filter(card => !card.hidden).map(card => card.id);
  const gesture = (x, y, endX, endY, end = 'pointerup', move = true) => {
    elements.karten.fire('pointerdown', {clientX: x, clientY: y});
    if (move) win.fire('pointermove', {clientX: endX, clientY: endY});
    win.fire(end, {clientX: endX, clientY: endY});
  };
  return {win, doc, elements, cards, links, location, current, gesture};
}

test('one symbol is shown; swipes wrap in both directions without vertical scrolling', () => {
  const h = harness();
  assert.deepEqual(h.current(), ['stock0']);
  h.gesture(100, 200, 200, 200);
  assert.deepEqual(h.current(), ['stock2']);
  h.gesture(200, 200, 100, 200);
  assert.deepEqual(h.current(), ['stock0']);
  assert.equal(h.win.lastScroll, undefined);
  assert.equal(h.elements.symbolZaehler.textContent, 'S0 · 1 von 3');
});
test('initial hash, changed hash and direct selection activate hidden symbols', () => {
  const h = harness({hash: '#stock2'});
  assert.deepEqual(h.current(), ['stock2']);
  h.location.hash = '#stock1'; h.win.fire('hashchange');
  assert.deepEqual(h.current(), ['stock1']);
  assert.equal(h.win.lastScroll.top, 786);
  assert.equal(h.win.rcpSymbolZeigen('missing'), false);
  assert.equal(h.win.rcpSymbolZeigen('stock0', false), true);
  assert.equal(h.links[0].attrs['aria-current'], 'true');
  assert.equal(h.links[1].attrs['aria-current'], undefined);
});
test('sorting preserves selected symbol and follows new order when paging', () => {
  const h = harness();
  h.cards[0].style.order = '3'; h.cards[1].style.order = '1'; h.cards[2].style.order = '2';
  h.doc.fire('rcp:sortiert');
  assert.deepEqual(h.current(), ['stock0']);
  assert.equal(h.elements.symbolZaehler.textContent, 'S0 · 3 von 3');
  h.gesture(200, 200, 100, 200);
  assert.deepEqual(h.current(), ['stock1']);
});
test('horizontal swipe switches once and suppresses the trailing link click', () => {
  const h = harness(); h.gesture(200, 200, 100, 204);
  assert.deepEqual(h.current(), ['stock1']);
  const click = h.elements.karten.fire('click');
  assert.equal(click.defaultPrevented, true); assert.equal(click.stopped, true);
  assert.equal(h.cards[0].style.transform, '');
});
test('sparse swipe uses release position even without pointermove', () => {
  const h = harness(); h.gesture(200, 200, 100, 200, 'pointerup', false);
  assert.deepEqual(h.current(), ['stock1']);
});
test('short, vertical and cancelled gestures keep the selected symbol', () => {
  for (const [x, y, end] of [[180,201,'pointerup'],[198,300,'pointerup'],[100,200,'pointercancel']]) {
    const h = harness(); h.gesture(200,200,x,y,end);
    assert.deepEqual(h.current(), ['stock0']); assert.equal(h.cards[0].style.transform, '');
  }
});
test('multitouch, blur and lost capture cancel a pending switch', () => {
  for (const cancel of [h => h.elements.karten.fire('pointerdown', {isPrimary:false}),
    h => h.win.fire('blur'), h => h.elements.karten.fire('lostpointercapture')]) {
    const h = harness();
    h.elements.karten.fire('pointerdown', {clientX:200,clientY:200});
    h.win.fire('pointermove', {clientX:100,clientY:200}); cancel(h);
    h.win.fire('pointerup', {clientX:100,clientY:200});
    assert.deepEqual(h.current(), ['stock0']); assert.equal(h.cards[0].style.transform, '');
  }
});
test('chart controls do not start swipe navigation', () => {
  const h = harness(); const button = {closest: () => button};
  h.elements.karten.fire('pointerdown', {target:button,clientX:200,clientY:200});
  h.win.fire('pointerup', {clientX:100,clientY:200});
  assert.deepEqual(h.current(), ['stock0']);
});
test('keyboard navigation moves focus out of a newly hidden card and retains its DOM', () => {
  const h = harness(); const chart = {}; h.cards[0].children.push(chart); h.doc.activeElement = chart;
  h.elements.symbolFenster.fire('keydown', {key:'ArrowRight'});
  assert.deepEqual(h.current(), ['stock1']); assert.equal(h.doc.activeElement, h.cards[1]);
  assert.equal(h.cards[0].children[0], chart);
});
test('empty and single-symbol lists do not switch on swipe', () => {
  assert.equal(harness({count:0}).elements.symbolSteuerung.hidden, true);
  const h = harness({count:1});
  h.gesture(200, 200, 100, 200); assert.deepEqual(h.current(), ['stock0']);
});
test('reduced motion disables drag and entrance effects while preserving navigation', () => {
  const h = harness({reduced:true});
  h.elements.karten.fire('pointerdown', {clientX:200,clientY:200});
  h.win.fire('pointermove', {clientX:100,clientY:200});
  assert.equal(h.cards[0].style.transform, '');
  h.win.fire('pointerup', {clientX:100,clientY:200});
  assert.deepEqual(h.current(), ['stock1']); assert.equal(h.cards[1].animations.length, 0);
});
test('internal symbol links work and modified clicks retain browser behavior', () => {
  const h = harness();
  const modified = h.doc.fire('click', {target:h.links[2],ctrlKey:true});
  assert.equal(modified.defaultPrevented, undefined); assert.deepEqual(h.current(), ['stock0']);
  const normal = h.doc.fire('click', {target:h.links[2]});
  assert.equal(normal.defaultPrevented, true); assert.deepEqual(h.current(), ['stock2']);
});

test('direct selection centers the complete window for different viewport heights', () => {
  for (const [viewport, panel] of [[667,639],[844,816],[900,872]]) {
    const h = harness(); h.win.innerHeight = viewport; h.elements.symbolFenster.offsetHeight = panel;
    h.win.rcpSymbolZeigen('stock1');
    assert.equal(h.win.lastScroll.top, 800 - (viewport - panel) / 2);
    assert.equal(h.doc.documentElement.classList.contains('symbole-einrasten'), true);
    assert.equal(h.elements.symbolFenster.classList.contains('bereit'), true);
  }
});

test('calendar-style native touch drag follows the full finger distance and commits on release', () => {
  const h = harness(), box = h.elements.symbolFenster;
  const touch = (x,y) => ({identifier:7,clientX:x,clientY:y});
  box.fire('touchstart',{touches:[touch(280,300)]});
  const move = box.fire('touchmove',{touches:[touch(130,302)],cancelable:true});
  assert.equal(h.cards[0].style.transform,'translateX(-150px)');
  assert.equal(move.defaultPrevented,true);
  box.fire('touchmove',{touches:[touch(180,302)],cancelable:true});
  assert.equal(h.cards[0].style.transform,'translateX(-100px)');
  box.fire('touchend',{touches:[],changedTouches:[touch(160,302)]});
  assert.deepEqual(h.current(),['stock1']);
});
test('native vertical, short, cancelled and multitouch gestures do not switch symbols', () => {
  for(const kind of ['vertical','short','cancel','multi']) {
    const h=harness(),box=h.elements.symbolFenster;
    const t=(x,y)=>({identifier:7,clientX:x,clientY:y});
    box.fire('touchstart',{touches:[t(200,200)]});
    const end=kind==='vertical'?t(202,300):kind==='short'?t(180,200):t(100,200);
    const move=box.fire('touchmove',{touches:kind==='multi'?[end,{identifier:8,clientX:50,clientY:200}]:[end],cancelable:true});
    if(kind==='vertical') assert.equal(move.defaultPrevented,undefined);
    box.fire(kind==='cancel'?'touchcancel':'touchend',{touches:[],changedTouches:[end]});
    assert.deepEqual(h.current(),['stock0']);
  }
});
test('touch pointer cancellation and duplicate pointerup cannot discard or double a native swipe', () => {
  const h=harness(),box=h.elements.symbolFenster;
  const t=x=>({identifier:7,clientX:x,clientY:200});
  h.elements.karten.fire('pointerdown',{pointerType:'touch',clientX:200,clientY:200});
  box.fire('touchstart',{touches:[t(200)]});
  box.fire('touchmove',{touches:[t(100)],cancelable:true});
  h.win.fire('pointercancel',{pointerType:'touch'});
  box.fire('touchend',{touches:[],changedTouches:[t(100)]});
  h.win.fire('pointerup',{pointerType:'touch',clientX:100,clientY:200});
  assert.deepEqual(h.current(),['stock1']);
});
test('native sparse swipe uses the final touchend coordinates', () => {
  const h=harness(),box=h.elements.symbolFenster;
  box.fire('touchstart',{touches:[{identifier:1,clientX:200,clientY:200}]});
  box.fire('touchend',{touches:[],changedTouches:[{identifier:1,clientX:80,clientY:200}]});
  assert.deepEqual(h.current(),['stock1']);
});
