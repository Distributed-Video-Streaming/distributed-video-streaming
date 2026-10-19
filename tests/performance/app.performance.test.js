/**
 * @jest-environment jsdom
 *
 * Tests for browser/js/app.js ONLY (player.js is never loaded).
 *
 *   npx jest tests/unit/app.test.js
 *   RELAY_COV=1 npx jest tests/unit/app.test.js     -> also prints coverage of app.js
 *
 * Needs: jest + jest-environment-jsdom (Jest 28+ for test.failing)
 */

const fs = require('fs');
const path = require('path');

const JS_DIR = path.resolve(__dirname, '../../browser/js');
const APP_FILE = path.join(JS_DIR, 'app.js');

/* app.js is a plain browser script with top-level const/let, so injecting it twice in
   one window throws "already declared". Each test runs it in a fresh function scope. */
const APP_EXPORTS = 'ICONS, icon, $, paintIcons, setIcon, toast, FILMS, inSection, watchLink, posterCard, bindListButton, initHome';

let appCode;

/* Optional coverage (RELAY_COV=1) via babel-plugin-istanbul */
function instrument(code, file) {
    if (!process.env.RELAY_COV) return code;
    const babel = require('@babel/core');
    return babel.transformSync(code, {
        filename: file, babelrc: false, configFile: false, sourceType: 'script', compact: false,
        plugins: [[require('babel-plugin-istanbul'), { cwd: path.resolve(JS_DIR, '..', '..') }]]
    }).code;
}

const runApp = () => new Function(appCode + `\n;return { ${APP_EXPORTS} };`)();

beforeAll(() => { appCode = instrument(fs.readFileSync(APP_FILE, 'utf8'), APP_FILE); });

afterAll(() => {
    if (!process.env.RELAY_COV || !window.__coverage__) return;
    const { createCoverageMap } = require('istanbul-lib-coverage');
    const map = createCoverageMap(window.__coverage__);
    map.files().forEach((f) => {
        const fc = map.fileCoverageFor(f), s = fc.toSummary();
        process.stdout.write(`\n--- coverage: ${path.basename(f)} ---\nstmts ${s.statements.pct}%  branches ${s.branches.pct}%  funcs ${s.functions.pct}%  lines ${s.lines.pct}%\n`);
        Object.entries(fc.b).forEach(([id, hits]) => hits.forEach((h, i) => {
            if (!h) process.stdout.write(`  uncovered branch, line ${fc.branchMap[id].locations[i].start.line}\n`);
        }));
        Object.entries(fc.s).forEach(([id, h]) => { if (!h) process.stdout.write(`  uncovered statement, line ${fc.statementMap[id].start.line}\n`); });
    });
});

/* HTML fixtures (same ids/structure as index.html and watch.html) */
const HOME_HTML = `
  <section class="hero" id="hero"><div class="wrap">
    <h1 id="hTitle"></h1><div id="hMeta"></div><p id="hDesc"></p>
    <a id="hWatch" href="watch.html"><span data-i="play"></span>Watch now</a>
    <button id="hList"><span data-i="plus"></span><b>Add to my list</b></button>
  </div><div><div id="dots"></div><span id="hCredit"></span></div></section>
  <div id="cont"></div><div id="newGrid"></div><div id="worldGrid"></div><div id="chips"></div>
  <div id="toast"></div>`;

const WATCH_HTML = `
  <div id="fCrumb"></div><h1 id="fTitle"></h1>
  <div id="status" data-state="connecting"><i class="dot"></i><span id="statusText"></span></div>
  <div class="player" id="player">
    <video id="video"></video>
    <b id="fNow"></b><div id="buffer"></div>
    <div id="error" hidden><p id="errorMsg"></p><button id="retry"></button></div>
    <input id="seek" type="range" min="0" max="1000" value="0">
    <button id="pp" data-i="play"></button><button id="rw" data-i="replay"></button>
    <button id="mute" data-i="vol"></button><input id="vol" type="range" min="0" max="100" value="60">
    <span id="time"></span><button id="pip" data-i="pip"></button><button id="fs" data-i="full"></button>
  </div>
  <span id="fYear"></span><span id="fRun"></span><span id="fAge"></span><span id="fGenre"></span><p id="fSyn"></p>
  <button id="list"><span data-i="plus"></span><b>Add to my list</b></button>
  <button id="share"></button>
  <div id="more"></div><div id="toast"></div>`;

const $ = (s) => document.querySelector(s);

function mountHome() {
    document.body.innerHTML = HOME_HTML;
    history.pushState({}, '', '/index.html');
}
function mountWatch(title) {
    document.body.innerHTML = WATCH_HTML;
    history.pushState({}, '', '/watch.html' + (title === undefined ? '' : '?title=' + encodeURIComponent(title)));
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); document.body.innerHTML = ''; });

/* ================================================================== */
/*                               app.js                                */
/* ================================================================== */
describe('app.js', () => {
    describe('icons & helpers', () => {
        beforeEach(() => mountWatch());

        test('icon() builds an svg from ICONS', () => {
            const app = runApp();
            const html = app.icon('play');
            expect(html).toContain('<svg class="i"');
            expect(html).toContain(app.ICONS.play);
            expect(html).toContain('</svg>');
        });

        test('every data-i used by the pages (and by the JS) exists in ICONS', () => {
            const { ICONS } = runApp();
            const used = new Set(['play', 'pause', 'vol', 'off', 'sliders']);
            [HOME_HTML, WATCH_HTML].forEach((h) => {
                const d = document.createElement('div'); d.innerHTML = h;
                d.querySelectorAll('[data-i]').forEach((e) => used.add(e.dataset.i));
            });
            used.forEach((n) => expect(ICONS[n]).toBeDefined());
        });

        test('$ is querySelector', () => {
            const app = runApp();
            expect(app.$('#player')).toBe(document.getElementById('player'));
            expect(app.$('#nope')).toBeNull();
        });

        test('paintIcons paints once and never duplicates', () => {
            const app = runApp();                                    // runs paintIcons() on load
            const n = document.querySelectorAll('[data-i] svg').length;
            expect(n).toBeGreaterThan(0);
            app.paintIcons();
            expect(document.querySelectorAll('[data-i] svg').length).toBe(n);
        });

        test('paintIcons accepts a sub-tree', () => {
            const app = runApp();
            const box = document.createElement('div');
            box.innerHTML = '<span data-i="plus"></span>';
            app.paintIcons(box);
            expect(box.querySelector('svg')).not.toBeNull();
        });

        test('setIcon swaps the svg; no-op without an svg', () => {
            const app = runApp();
            app.setIcon($('#pp'), 'pause');
            expect($('#pp').querySelectorAll('svg')).toHaveLength(1);
            expect($('#pp').querySelectorAll('rect')).toHaveLength(2);
            const empty = document.createElement('button');
            expect(() => app.setIcon(empty, 'pause')).not.toThrow();
            expect(empty.innerHTML).toBe('');
        });
    });

    describe('toast', () => {
        test('shows then hides after 2.2s', () => {
            mountWatch();
            const app = runApp();
            app.toast('Hello');
            expect($('#toast').textContent).toBe('Hello');
            expect($('#toast').classList.contains('show')).toBe(true);
            jest.advanceTimersByTime(2199);
            expect($('#toast').classList.contains('show')).toBe(true);
            jest.advanceTimersByTime(2);
            expect($('#toast').classList.contains('show')).toBe(false);
        });

        test('a second toast restarts the timer', () => {
            mountWatch();
            const app = runApp();
            app.toast('one'); jest.advanceTimersByTime(2000);
            app.toast('two'); jest.advanceTimersByTime(1000);
            expect($('#toast').classList.contains('show')).toBe(true);
            expect($('#toast').textContent).toBe('two');
            jest.advanceTimersByTime(1300);
            expect($('#toast').classList.contains('show')).toBe(false);
        });

        test('no #toast element -> no throw', () => {
            document.body.innerHTML = '';
            const app = runApp();
            expect(() => app.toast('x')).not.toThrow();
        });
    });

    describe('film data', () => {
        let app;
        beforeEach(() => { mountHome(); app = runApp(); });

        test('titles are unique (they are the lookup key in ?title=)', () => {
            const t = app.FILMS.map((f) => f.t);
            expect(new Set(t).size).toBe(t.length);
        });
        test('every film has t, g, y, len and "colorA,colorB" colours', () => {
            app.FILMS.forEach((f) => {
                ['t', 'g', 'y', 'len'].forEach((k) => expect(f[k]).toBeTruthy());
                expect(f.c).toMatch(/^#[0-9a-f]{6},#[0-9a-f]{6}$/i);
            });
        });
        test('hero slides have description, credit and age', () => {
            const heroes = app.FILMS.filter((f) => f.hero);
            expect(heroes.length).toBeGreaterThanOrEqual(2);
            heroes.forEach((f) => { expect(f.d).toBeTruthy(); expect(f.by).toBeTruthy(); expect(f.age).toBeTruthy(); });
        });
        test('continue-watching items have valid progress', () => {
            app.inSection('cont').forEach((f) => {
                expect(f.left && f.sub).toBeTruthy();
                const p = parseFloat(f.p);
                expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(100);
            });
        });
        test('world films name a country', () => {
            app.inSection('world').forEach((f) => expect(f.country).toBeTruthy());
        });
        test('inSection filters by sec', () => {
            expect(app.inSection('new').every((f) => f.sec === 'new')).toBe(true);
            expect(app.inSection('zzz')).toEqual([]);
        });
    });

    describe('watchLink & posterCard', () => {
        let app;
        beforeEach(() => { mountHome(); app = runApp(); });

        test('watchLink encodes the title', () => {
            expect(app.watchLink({ t: 'Salt & Signal' })).toBe('watch.html?title=Salt%20%26%20Signal');
        });
        test('watchLink round-trips every title', () => {
            app.FILMS.forEach((f) => {
                expect(new URLSearchParams(app.watchLink(f).split('?')[1]).get('title')).toBe(f.t);
            });
        });
        test('meta line: country style vs year/genre/runtime style', () => {
            const base = { t: 'X', g: 'Drama', y: 2025, len: '1h 2m', c: '#000000,#ffffff' };
            expect(app.posterCard({ ...base, country: 'Japan' })).toContain('Japan · Drama · 2025');
            const plain = app.posterCard(base);
            expect(plain).toContain('2025 · Drama · 1h 2m');
            expect(plain).not.toContain('class="badge');
        });
        test('"Relay Select" badge is gold, others are not', () => {
            const base = { t: 'X', g: 'D', y: 1, len: '1', c: 'a,b' };
            expect(app.posterCard({ ...base, badge: 'Relay Select' })).toContain('class="badge g"');
            expect(app.posterCard({ ...base, badge: 'Just added' })).toContain('class="badge "');
        });
        test('card links to the watch page with the gradient', () => {
            const html = app.posterCard({ t: 'A B', g: 'D', y: 1, len: '1', c: '#111111,#222222' });
            expect(html).toContain('href="watch.html?title=A%20B"');
            expect(html).toContain('linear-gradient(160deg,#111111,#222222)');
        });
    });

    describe('bindListButton', () => {
        test('toggles label and toast', () => {
            document.body.innerHTML = '<button id="b"><span></span><b>Add to my list</b></button><div id="toast"></div>';
            const app = runApp();
            const b = $('#b');
            app.bindListButton(b, 'In my list', 'Add to my list');
            b.click();
            expect(b.lastChild.textContent).toBe('In my list');
            expect($('#toast').textContent).toBe('Added to my list');
            b.click();
            expect(b.lastChild.textContent).toBe('Add to my list');
            expect($('#toast').textContent).toBe('Removed from my list');
        });
    });

    describe('home page', () => {
        let app;
        beforeEach(() => { mountHome(); app = runApp(); });

        test('initHome is skipped when there is no #hero', () => {
            document.body.innerHTML = '<div id="toast"></div>';
            expect(() => runApp()).not.toThrow();
            expect($('#hTitle')).toBeNull();
        });
        test('renders the three sections', () => {
            expect($('#cont').children).toHaveLength(app.inSection('cont').length);
            expect($('#newGrid').querySelectorAll('.card')).toHaveLength(app.inSection('new').length);
            expect($('#worldGrid').querySelectorAll('.card')).toHaveLength(6);
        });
        test('continue-watching thumbs link, show time left and progress', () => {
            const film = app.inSection('cont')[0];
            const t = $('#cont .thumb');
            expect(t.getAttribute('href')).toBe(app.watchLink(film));
            expect(t.querySelector('.left').textContent).toBe(film.left);
            expect(t.querySelector('.bar').getAttribute('style')).toContain(`--p:${film.p}`);
        });
        test('hero shows the first slide', () => {
            const first = app.FILMS.find((f) => f.hero);
            expect($('#hTitle').textContent).toBe(first.t);
            expect($('#hDesc').textContent).toBe(first.d);
            expect($('#hCredit').textContent).toBe('A film by ' + first.by);
            expect($('#hMeta').textContent).toContain(first.age);
            expect($('#hWatch').getAttribute('href')).toBe(app.watchLink(first));
            expect($('#hWatch svg')).not.toBeNull();
        });
        test('one active dot; clicking a dot switches slide', () => {
            const slides = app.FILMS.filter((f) => f.hero);
            expect($('#dots').children).toHaveLength(slides.length);
            expect($('#dots .on')).toBe($('#dots').children[0]);
            $('#dots').children[2].click();
            expect($('#hTitle').textContent).toBe(slides[2].t);
            expect($('#hWatch').getAttribute('href')).toBe(app.watchLink(slides[2]));
            expect(document.querySelectorAll('#dots .on')).toHaveLength(1);
            expect($('#dots').children[2].classList.contains('on')).toBe(true);
        });
        test('clicking the dots container (not a dot) is ignored', () => {
            $('#dots').click();
            expect($('#hTitle').textContent).toBe(app.FILMS.find((f) => f.hero).t);
        });
        test('hero "Add to my list" toggles', () => {
            $('#hList').click();
            expect($('#hList').lastChild.textContent).toBe('Added to my list');
            $('#hList').click();
            expect($('#hList').lastChild.textContent).toBe('Add to my list');
        });
        test('genre chips: 7 chips, "All films" active', () => {
            expect($('#chips').querySelectorAll('.chip')).toHaveLength(7);
            expect($('#chips .chip.on').textContent).toBe('All films');
        });
        test('choosing a genre filters the world grid', () => {
            const drama = [...document.querySelectorAll('#chips .chip')].find((c) => c.textContent === 'Drama');
            drama.click();
            expect(drama.classList.contains('on')).toBe(true);
            expect(document.querySelectorAll('#chips .chip.on')).toHaveLength(1);
            const metas = [...$('#worldGrid').querySelectorAll('.cm')].map((e) => e.textContent);
            expect(metas.length).toBeGreaterThan(0);
            metas.forEach((m) => expect(m).toContain('Drama'));
        });
        test('a genre with no films shows the empty message', () => {
            app.FILMS.filter((f) => f.sec === 'world' && f.g === 'Comedy').forEach((f) => { f.g = 'Other'; });
            [...document.querySelectorAll('#chips .chip')].find((c) => c.textContent === 'Comedy').click();
            expect($('#worldGrid').textContent).toContain('No films in this mood yet');
        });
        test('clicking the "Find your mood" label is ignored', () => {
            $('#chips span').click();
            expect($('#chips .chip.on').textContent).toBe('All films');
        });
    });

    describe('KNOWN ISSUES (test.failing: bug is real now; fix it and the test flips -> change to test)', () => {
        let app;
        beforeEach(() => { mountHome(); app = runApp(); });

        // .slice(0, 6) hides 2 of the 8 world films under "All films"
        test.failing('"All films" should list every world film', () => {
            expect($('#worldGrid').querySelectorAll('.card')).toHaveLength(app.inSection('world').length);
        });
        // one shared list-button state for all slides
        test.failing('list-button state should be per slide', () => {
            $('#hList').click();
            $('#dots').children[1].click();
            expect($('#hList').lastChild.textContent).toBe('Add to my list');
        });
        // innerHTML with unescaped film fields
        test.failing('posterCard should escape HTML in titles', () => {
            expect(app.posterCard({ t: '<img src=x onerror=alert(1)>', g: 'D', y: 1, len: '1', c: 'a,b' })).not.toContain('<img src=x');
        });
    });
});