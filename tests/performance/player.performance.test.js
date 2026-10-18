/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Player.js Performance & Functionality Tests', () => {
    let appCode, playerCode;

    /* player.js reads helpers from app.js ($, toast, setIcon, FILMS, ...) as globals, so both
       files run together in ONE function scope (like two <script> tags). A fresh scope per
       test avoids "Identifier 'ICONS' has already been declared", which happens when the
       same top-level const/let script is injected into the same window twice. */
    const loadScripts = () => new Function(appCode + '\n' + playerCode)();

    /* jsdom's <video> has read-only paused/duration/error, so plain assignment is ignored. */
    const mockVideo = (el, props) => {
        Object.entries(props).forEach(([k, v]) =>
            Object.defineProperty(el, k, { value: v, writable: true, configurable: true }));
        return el;
    };

    /* player.js adds listeners to window (keydown/online/offline); remove them after each test. */
    const added = [];
    const realAdd = window.addEventListener;
    beforeAll(() => {
        window.addEventListener = function (type, fn, opts) {
            added.push([type, fn, opts]);
            return realAdd.call(this, type, fn, opts);
        };
        appCode = fs.readFileSync(path.resolve(__dirname, '../../browser/js/app.js'), 'utf8');
        playerCode = fs.readFileSync(path.resolve(__dirname, '../../browser/js/player.js'), 'utf8');
    });
    afterAll(() => { window.addEventListener = realAdd; });

    beforeEach(() => {
        jest.useFakeTimers();

        document.body.innerHTML = `
      <div id="player">
        <video id="video"></video>
      </div>
      <div id="status"></div>
      <div id="statusText"></div>
      <div id="error" hidden></div>
      <div id="errorMsg"></div>
      <button id="retry"></button>
      <button id="pp"></button>
      <button id="mute"></button>
      <input id="vol" type="range" min="0" max="100" value="60" />
      <input id="seek" type="range" min="0" max="1000" value="0" />
      <div id="time"></div>
      <button id="rw"></button>
      <button id="fs"></button>
      <button id="pip"></button>
      <h1 id="fTitle"></h1>
      <span id="fCrumb"></span>
      <span id="fNow"></span>
      <span id="fYear"></span>
      <span id="fRun"></span>
      <span id="fGenre"></span>
      <span id="fAge"></span>
      <p id="fSyn"></p>
      <div id="more"></div>
      <button id="list"><span class="label">Add to my list</span></button>
      <button id="share"></button>
      <div id="toast"></div>
    `;

        window.HTMLMediaElement.prototype.load = jest.fn();
        window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
        window.HTMLMediaElement.prototype.pause = jest.fn();
        window.HTMLMediaElement.prototype.canPlayType = jest.fn().mockReturnValue('probably');

        Element.prototype.requestFullscreen = jest.fn().mockResolvedValue(undefined);
        document.exitFullscreen = jest.fn().mockResolvedValue(undefined);
        HTMLVideoElement.prototype.requestPictureInPicture = jest.fn().mockResolvedValue(undefined);
        document.exitPictureInPicture = jest.fn().mockResolvedValue(undefined);
        document.pictureInPictureEnabled = true;

        Object.assign(navigator, {
            clipboard: {
                writeText: jest.fn().mockResolvedValue(undefined)
            }
        });

        loadScripts();
    });

    afterEach(() => {
        while (added.length) {
            const [t, f, o] = added.pop();
            window.removeEventListener(t, f, o);
        }
        jest.clearAllTimers();
        jest.useRealTimers();
        document.body.innerHTML = '';
    });

    test('Video events correctly update connection status and buffering classes', () => {
        const videoEl = document.getElementById('video');
        const statusEl = document.getElementById('status');

        videoEl.dispatchEvent(new Event('loadeddata'));
        expect(statusEl.dataset.state).toBe('connected');

        videoEl.dispatchEvent(new Event('waiting'));
        expect(document.getElementById('player').classList.contains('buffering')).toBe(true);

        videoEl.dispatchEvent(new Event('playing'));
        expect(document.getElementById('player').classList.contains('buffering')).toBe(false);

        mockVideo(videoEl, { error: { code: 2 } });
        videoEl.dispatchEvent(new Event('error'));
        expect(document.getElementById('error').hidden).toBe(false);
        expect(document.getElementById('errorMsg').textContent).toMatch(/network problem/i);
        expect(statusEl.dataset.state).toBe('disconnected');
    });

    test('Player control buttons (play/pause, volume, seek, rewind) function properly', () => {
        const videoEl = document.getElementById('video');
        const ppBtn = document.getElementById('pp');
        const muteBtn = document.getElementById('mute');
        const volInput = document.getElementById('vol');
        const seekInput = document.getElementById('seek');
        const rwBtn = document.getElementById('rw');

        mockVideo(videoEl, { paused: true });
        ppBtn.click();
        expect(videoEl.play).toHaveBeenCalled();

        volInput.value = '40';
        volInput.dispatchEvent(new Event('input'));
        expect(videoEl.volume).toBe(0.4);

        muteBtn.click();
        expect(videoEl.muted).toBe(true);

        mockVideo(videoEl, { currentTime: 25 });
        rwBtn.click();
        expect(videoEl.currentTime).toBe(15);

        mockVideo(videoEl, { duration: 100 });
        seekInput.value = '500';
        seekInput.dispatchEvent(new Event('input'));
        expect(videoEl.currentTime).toBe(50);
    });

    test('Fullscreen and PiP actions trigger correctly', () => {
        document.getElementById('fs').click();
        expect(document.getElementById('player').requestFullscreen).toHaveBeenCalled();

        document.getElementById('pip').click();
        expect(HTMLVideoElement.prototype.requestPictureInPicture).toHaveBeenCalled();
    });

    test('Keyboard shortcut (Spacebar) toggles playback', () => {
        const videoEl = document.getElementById('video');
        mockVideo(videoEl, { paused: true });
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        expect(videoEl.play).toHaveBeenCalled();
    });

    test('Share button writes URL to clipboard', () => {
        document.getElementById('share').click();
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(location.href);
    });

    /* ---------------- performance checks (generous budgets: jsdom is slow) ---------------- */
    const time = (fn) => { const t = performance.now(); fn(); return performance.now() - t; };

    test('PERF: 5,000 timeupdate events (about 20 minutes of playback) stay under 5s', () => {
        const videoEl = document.getElementById('video');
        mockVideo(videoEl, { duration: 7200, currentTime: 0 });
        const ms = time(() => {
            for (let i = 0; i < 5000; i++) {
                videoEl.currentTime = i;
                videoEl.dispatchEvent(new Event('timeupdate'));
            }
        });
        expect(ms).toBeLessThan(5000);
        expect(document.getElementById('time').textContent.replace(/\s+/g, '')).toBe('1:23:19/2:00:00');
    });

    test('PERF: 2,000 seek-slider drags stay under 5s', () => {
        const videoEl = document.getElementById('video');
        const seekInput = document.getElementById('seek');
        mockVideo(videoEl, { duration: 7200, currentTime: 0 });
        const ms = time(() => {
            for (let i = 0; i < 2000; i++) {
                seekInput.value = String(i % 1000);
                seekInput.dispatchEvent(new Event('input'));
            }
        });
        expect(ms).toBeLessThan(5000);
    });

    test('LEAK: hammering Retry never stacks connection timers', () => {
        for (let i = 0; i < 300; i++) document.getElementById('retry').click();
        expect(jest.getTimerCount()).toBe(1);
    });

    test('LEAK: play/pause events never grow the DOM', () => {
        const videoEl = document.getElementById('video');
        const before = document.querySelectorAll('*').length;
        for (let i = 0; i < 300; i++) {
            videoEl.dispatchEvent(new Event('play'));
            videoEl.dispatchEvent(new Event('pause'));
        }
        expect(document.querySelectorAll('*').length).toBe(before);
    });
});