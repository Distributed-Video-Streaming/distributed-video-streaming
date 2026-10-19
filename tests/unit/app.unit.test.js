/**
 * Unit tests for browser/js/app.js
 *
 * Assumptions: Jest + jest-environment-jsdom are installed and Jest is configured
 * to use the jsdom environment. Run with: npx jest tests/unit/app.unit.test.js
 *
 * The app.js file is a browser script (not a module), so these tests evaluate it
 * in the test environment and expose its top-level helpers only for testing.
 */

const fs = require('fs');
const path = require('path');

const appSource = fs.readFileSync(
    path.resolve(__dirname, '../../browser/js/app.js'),
    'utf8'
);

function installDom({ home = true, toast = true } = {}) {
    document.body.innerHTML = `
    ${home ? `
      <section id="hero"></section>
      <h1 id="hTitle"></h1>
      <div id="hMeta"></div>
      <p id="hDesc"></p>
      <p id="hCredit"></p>
      <a id="hWatch"></a>
      <button id="hList"><svg></svg><span>Add to my list</span></button>
      <div id="dots"></div>
      <div id="cont"></div>
      <div id="newGrid"></div>
      <div id="chips"></div>
      <div id="worldGrid"></div>
    ` : ''}
    ${toast ? '<div id="toast"></div>' : ''}
    <span data-i="play"></span>
    <span data-i="search"></span>
  `;
}

function loadApp() {
    // app.js is intentionally a classic script and has no exports.
    // Expose its declarations after evaluation so unit tests can call them.
    // The source's normal startup code still runs, matching browser behavior.
    // eslint-disable-next-line no-eval
    eval(`${appSource}
    ;globalThis.__appTestExports = {
      ICONS, icon, $, paintIcons, setIcon, toast, FILMS, inSection,
      watchLink, posterCard, bindListButton, initHome
    };
  `);
    return globalThis.__appTestExports;
}

beforeEach(() => {
    jest.useFakeTimers();
    delete globalThis.__appTestExports;
    installDom();
});

afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    delete globalThis.__appTestExports;
});

describe('shared icon and DOM helpers', () => {
    test('icon returns an SVG containing the requested icon markup', () => {
        const app = loadApp();
        expect(app.icon('play')).toContain('<svg');
        expect(app.icon('play')).toContain(app.ICONS.play);
        expect(app.icon('not-a-real-icon')).toContain('undefined');
    });

    test('$ returns the first matching element or null', () => {
        const app = loadApp();
        expect(app.$('#hero')).toBe(document.querySelector('#hero'));
        expect(app.$('#missing')).toBeNull();
    });

    test('paintIcons paints eligible elements once and marks them as done', () => {
        const app = loadApp();
        const target = document.createElement('div');
        target.innerHTML = '<span data-i="play"></span><span data-i="pause" data-d="1"></span>';
        app.paintIcons(target);

        expect(target.querySelector('[data-i="play"] svg')).not.toBeNull();
        expect(target.querySelector('[data-i="play"]').dataset.d).toBe('1');
        expect(target.querySelector('[data-i="pause"] svg')).toBeNull();

        app.paintIcons(target);
        expect(target.querySelectorAll('[data-i="play"] svg')).toHaveLength(1);
    });

    test('setIcon replaces an existing SVG and safely does nothing without one', () => {
        const app = loadApp();
        const button = document.createElement('button');
        button.innerHTML = '<svg><path /></svg><span>Play</span>';

        app.setIcon(button, 'pause');
        const rects = button.querySelectorAll('rect');
        expect(rects).toHaveLength(2);
        expect(rects[0].getAttribute('x')).toBe('6');
        expect(rects[0].getAttribute('width')).toBe('4');
        expect(rects[1].getAttribute('x')).toBe('14');

        const emptyButton = document.createElement('button');
        expect(() => app.setIcon(emptyButton, 'play')).not.toThrow();
        expect(emptyButton.querySelector('svg')).toBeNull();
    });

    test('toast displays a message, resets its timer, and hides after 2200ms', () => {
        const app = loadApp();
        const element = document.querySelector('#toast');

        app.toast('Hello');
        expect(element.textContent).toBe('Hello');
        expect(element.classList.contains('show')).toBe(true);

        jest.advanceTimersByTime(1000);
        app.toast('Updated');
        expect(element.textContent).toBe('Updated');
        jest.advanceTimersByTime(2199);
        expect(element.classList.contains('show')).toBe(true);
        jest.advanceTimersByTime(1);
        expect(element.classList.contains('show')).toBe(false);
    });

    test('toast exits cleanly if the toast element is missing', () => {
        const app = loadApp();
        document.querySelector('#toast').remove();
        expect(() => app.toast('No toast element')).not.toThrow();
    });
});

describe('film data and card helpers', () => {
    test('inSection returns only films from the requested section', () => {
        const app = loadApp();
        expect(app.inSection('new').length).toBeGreaterThan(0);
        expect(app.inSection('new').every((film) => film.sec === 'new')).toBe(true);
        expect(app.inSection('not-a-section')).toEqual([]);
    });

    test('watchLink URL-encodes a film title', () => {
        const app = loadApp();
        expect(app.watchLink({ t: 'Salt & Signal' })).toBe('watch.html?title=Salt%20%26%20Signal');
    });

    test('posterCard renders metadata with and without a country and with and without a badge', () => {
        const app = loadApp();
        const domestic = app.posterCard({
            t: 'Test Film', y: 2026, g: 'Drama', len: '1h 20m',
            c: '#000,#fff', badge: 'Relay Select'
        });
        expect(domestic).toContain('Test Film');
        expect(domestic).toContain('2026 · Drama · 1h 20m');
        expect(domestic).toContain('class="badge g"');
        expect(domestic).toContain('watch.html?title=Test%20Film');

        const international = app.posterCard({
            t: 'Another Film', country: 'Japan', y: 2025, g: 'Drama',
            c: '#000,#fff', badge: 'Just added'
        });
        expect(international).toContain('Japan · Drama · 2025');
        expect(international).toContain('class="badge "');

        const noBadge = app.posterCard({
            t: 'No Badge', y: 2024, g: 'Comedy', len: '90m', c: '#000,#fff'
        });
        expect(noBadge).not.toContain('class="badge');
    });

    test('film data contains hero, new, world, and continue-watching sections', () => {
        const app = loadApp();
        expect(app.FILMS.some((film) => film.hero)).toBe(true);
        for (const section of ['new', 'world', 'cont']) {
            expect(app.FILMS.some((film) => film.sec === section)).toBe(true);
        }
    });
});

describe('list button', () => {
    test('toggles from off to on and back, showing the corresponding toast', () => {
        const app = loadApp();
        const button = document.createElement('button');
        button.innerHTML = '<svg></svg><span>Add to my list</span>';
        document.body.appendChild(button);

        app.bindListButton(button, 'Added to my list', 'Add to my list');

        button.click();
        expect(button.lastChild.textContent).toBe('Added to my list');
        expect(document.querySelector('#toast').textContent).toBe('Added to my list');

        button.click();
        expect(button.lastChild.textContent).toBe('Add to my list');
        expect(document.querySelector('#toast').textContent).toBe('Removed from my list');
    });
});

describe('home page initialization', () => {
    test('renders continue-watching, new releases, hero dots, and initial hero slide', () => {
        loadApp();

        expect(document.querySelectorAll('#cont .thumb')).toHaveLength(3);
        expect(document.querySelectorAll('#newGrid .card').length).toBeGreaterThan(0);
        expect(document.querySelectorAll('#dots button')).toHaveLength(4);
        expect(document.querySelector('#hTitle').textContent).toBe('The Last Light');
        expect(document.querySelector('#hDesc').textContent).toContain('lighthouse keeper');
        expect(document.querySelector('#hCredit').textContent).toBe('A film by Elena Marlow');
        expect(document.querySelector('#hWatch').getAttribute('href')).toBe('watch.html?title=The%20Last%20Light');
        expect(document.querySelector('#dots button').classList.contains('on')).toBe(true);
    });

    test('clicking a hero dot changes the slide and active dot', () => {
        loadApp();
        const dots = document.querySelectorAll('#dots button');

        dots[1].click();
        expect(document.querySelector('#hTitle').textContent).toBe('Neon Saints');
        expect(document.querySelector('#hCredit').textContent).toBe('A film by Ren Takeda');
        expect(dots[1].classList.contains('on')).toBe(true);
        expect(dots[0].classList.contains('on')).toBe(false);

        // Clicking a non-dot target is ignored.
        document.querySelector('#dots').click();
        expect(document.querySelector('#hTitle').textContent).toBe('Neon Saints');
    });

    test('hero list button toggles its label', () => {
        loadApp();
        const button = document.querySelector('#hList');

        button.click();
        expect(button.lastChild.textContent).toBe('Added to my list');
        button.click();
        expect(button.lastChild.textContent).toBe('Add to my list');
    });

    test('world cinema genre chips filter films and update active state', () => {
        loadApp();
        const chips = [...document.querySelectorAll('#chips .chip')];

        expect(document.querySelectorAll('#worldGrid .card')).toHaveLength(6);
        const dramaChip = chips.find((chip) => chip.textContent === 'Drama');
        dramaChip.click();

        expect(dramaChip.classList.contains('on')).toBe(true);
        expect(document.querySelectorAll('#chips .chip.on')).toHaveLength(1);
        expect([...document.querySelectorAll('#worldGrid .card .cm')].every((meta) => meta.textContent.includes('Drama'))).toBe(true);

        const allChip = chips.find((chip) => chip.textContent === 'All films');
        allChip.click();
        expect(allChip.classList.contains('on')).toBe(true);
        expect(document.querySelectorAll('#worldGrid .card')).toHaveLength(6);
    });

    test('clicking a non-chip inside the chips container does not change the grid', () => {
        loadApp();
        const before = document.querySelector('#worldGrid').innerHTML;
        document.querySelector('#chips > span').click();
        expect(document.querySelector('#worldGrid').innerHTML).toBe(before);
    });

    test('shows the empty-state message when a genre has no films', () => {
        const app = loadApp();
        // Exercise the empty-state branch using the real section data and a temporary
        // genre chip that cannot match any film.
        const chips = document.querySelector('#chips');
        const unusualChip = document.createElement('button');
        unusualChip.className = 'chip';
        unusualChip.textContent = 'Experimental';
        chips.appendChild(unusualChip);
        unusualChip.click();

        expect(document.querySelector('#worldGrid').textContent).toContain('No films in this mood yet');
    });

    test('does not initialize the home page when #hero is absent', () => {
        installDom({ home: false, toast: true });
        const app = loadApp();
        expect(typeof app.initHome).toBe('function');
        expect(document.querySelector('#worldGrid')).toBeNull();
        // Global icon painting still runs even on a non-home page.
        expect(document.querySelector('[data-i="play"] svg')).not.toBeNull();
    });
});