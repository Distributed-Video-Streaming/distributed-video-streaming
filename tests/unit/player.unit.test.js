/**
 * Unit tests for browser/js/player.js
 *
 * Assumptions: Jest + jest-environment-jsdom are installed and Jest is configured
 * to use the jsdom environment. Run with: npx jest tests/unit/player.unit.test.js
 */

const fs = require('fs');
const path = require('path');

// Mock HTMLMediaElement.prototype.load since JSDOM does not implement it
window.HTMLMediaElement.prototype.load = window.HTMLMediaElement.prototype.load || function () { };
window.HTMLMediaElement.prototype.play = window.HTMLMediaElement.prototype.play || function () { return Promise.resolve(); };
window.HTMLMediaElement.prototype.pause = window.HTMLMediaElement.prototype.pause || function () { };
window.HTMLMediaElement.prototype.canPlayType = window.HTMLMediaElement.prototype.canPlayType || function () { return 'maybe'; };

const appSource = fs.readFileSync(
    path.resolve(__dirname, '../../browser/js/app.js'),
    'utf8'
);

const playerSource = fs.readFileSync(
    path.resolve(__dirname, '../../browser/js/player.js'),
    'utf8'
);

function installPlayerDom() {
    document.body.innerHTML = `
    <div id="player">
      <video id="video"></video>
      <div id="status"></div>
      <div id="statusText"></div>
      <div id="error" hidden>
        <p id="errorMsg"></p>
        <button id="retry"></button>
      </div>
      <button id="pp"></button>
      <button id="rw"></button>
      <button id="mute"></button>
      <input id="vol" type="range" />
      <input id="seek" type="range" />
      <span id="time"></span>
      <button id="fs"></button>
      <button id="pip"></button>
      <button id="list"><span>Add to my list</span></button>
      <button id="share"></button>
    </div>
    <h1 id="fTitle"></h1>
    <span id="fCrumb"></span>
    <span id="fNow"></span>
    <span id="fYear"></span>
    <span id="fRun"></span>
    <span id="fGenre"></span>
    <span id="fAge"></span>
    <p id="fSyn"></p>
    <div id="more"></div>
    <div id="toast"></div>
  `;
}

function loadPlayer() {
    installPlayerDom();
    jest.isolateModules(() => {
        // eslint-disable-next-line no-eval
        eval(`
            ${appSource}
            ${playerSource}
        `);
    });
}

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
});

describe('player page logic and controls', () => {
    test('formats time correctly and updates duration', () => {
        loadPlayer();
        const video = document.querySelector('#video');
        Object.defineProperty(video, 'duration', { value: 3665, configurable: true });
        Object.defineProperty(video, 'currentTime', { value: 65, configurable: true });

        const timeEl = document.querySelector('#time');
        video.dispatchEvent(new Event('timeupdate'));

        expect(timeEl.textContent).toContain('1:05');
    });

    test('handles invalid or infinite time gracefully', () => {
        loadPlayer();
        const video = document.querySelector('#video');
        Object.defineProperty(video, 'duration', { value: NaN, configurable: true });
        Object.defineProperty(video, 'currentTime', { value: 0, configurable: true });
        video.dispatchEvent(new Event('timeupdate'));
        expect(document.querySelector('#time').textContent).toContain('0:00');
    });

    test('toggles play/pause state and updates button icon/aria-label', () => {
        loadPlayer();
        const video = document.querySelector('#video');
        const pp = document.querySelector('#pp');

        let isPaused = true;
        Object.defineProperty(video, 'paused', {
            get: () => isPaused,
            set: (val) => { isPaused = val; },
            configurable: true
        });

        video.play = jest.fn().mockResolvedValue(undefined);
        video.pause = jest.fn().mockImplementation(() => { isPaused = true; });

        pp.click();
        expect(video.play).toHaveBeenCalled();

        video.dispatchEvent(new Event('play'));
        expect(pp.getAttribute('aria-label')).toBe('Pause');

        isPaused = false;
        pp.click();
        expect(video.pause).toHaveBeenCalled();

        video.dispatchEvent(new Event('pause'));
        expect(pp.getAttribute('aria-label')).toBe('Play');
    });

    test('handles play rejection and catch blocks', async () => {
        loadPlayer();
        const video = document.querySelector('#video');
        const pp = document.querySelector('#pp');

        Object.defineProperty(video, 'paused', { value: true, configurable: true });
        video.play = jest.fn().mockRejectedValue({ name: 'NotAllowedError' });

        expect(() => pp.click()).not.toThrow();
    });

    test('handles volume changes and mute toggles', () => {
        loadPlayer();
        const video = document.querySelector('#video');
        const vol = document.querySelector('#vol');
        const mute = document.querySelector('#mute');

        vol.value = '40';
        vol.dispatchEvent(new Event('input'));
        expect(video.volume).toBe(0.4);
        expect(video.muted).toBe(false);

        mute.click();
        expect(video.muted).toBe(true);

        video.volume = 0;
        video.dispatchEvent(new Event('volumechange'));
        expect(vol.value).toBe('0');
    });


    test('rewinds video by 10 seconds via rewind button', () => {
        loadPlayer();
        const video = document.querySelector('#video');
        Object.defineProperty(video, 'currentTime', { value: 25, writable: true, configurable: true });
        document.querySelector('#rw').click();
        expect(video.currentTime).toBe(15);
    });

    test('displays error message when media error occurs', () => {
        loadPlayer();
        const video = document.querySelector('#video');

        video.error = { code: 2 };
        video.dispatchEvent(new Event('error'));

        const errorBox = document.querySelector('#error');
        expect(errorBox.hidden).toBe(false);
        expect(document.querySelector('#errorMsg').textContent).toContain('A network problem');
    });

    test('handles buffering state changes', () => {
        loadPlayer();
        const video = document.querySelector('#video');
        const playerBox = document.querySelector('#player');

        video.dispatchEvent(new Event('waiting'));
        expect(playerBox.classList.contains('buffering')).toBe(true);

        video.dispatchEvent(new Event('playing'));
        expect(playerBox.classList.contains('buffering')).toBe(false);

        video.dispatchEvent(new Event('waiting'));
        video.dispatchEvent(new Event('canplay'));
        expect(playerBox.classList.contains('buffering')).toBe(false);
    });

    test('handles online and offline window events', () => {
        loadPlayer();
        window.dispatchEvent(new Event('offline'));
        expect(document.querySelector('#errorMsg').textContent).toContain('You are offline');

        window.dispatchEvent(new Event('online'));
        expect(document.querySelector('#error').hidden).toBe(true);
    });

    test('toggles fullscreen mode', () => {
        loadPlayer();
        const playerBox = document.querySelector('#player');
        playerBox.requestFullscreen = jest.fn().mockResolvedValue(undefined);

        document.querySelector('#fs').click();
        expect(playerBox.requestFullscreen).toHaveBeenCalled();
    });

    test('handles keyboard spacebar shortcut for play/pause', () => {
        loadPlayer();
        const video = document.querySelector('#video');
        Object.defineProperty(video, 'paused', { value: true, configurable: true });
        video.play = jest.fn().mockResolvedValue(undefined);

        const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
        window.dispatchEvent(event);
        expect(video.play).toHaveBeenCalled();
    });

    test('populates film details and list/share buttons correctly', () => {
        loadPlayer();
        expect(document.querySelector('#fTitle').textContent).toBeTruthy();

        const shareBtn = document.querySelector('#share');
        Object.assign(navigator, {
            clipboard: {
                writeText: jest.fn().mockResolvedValue(undefined)
            }
        });
        shareBtn.click();
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
});