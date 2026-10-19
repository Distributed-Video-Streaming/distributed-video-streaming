/* Watch page: HTML5 video player, connection status and error handling.
   Needs js/app.js (loaded first) for $, toast, icons and the film data. */

/* ---------- config: the only part that changes when the backend arrives ---------- */

/* use this to see browser error handling */
// const SAMPLE_VIDEO = 'https://youtu.be/9E6b3swbnWg?si=O8nQENP2FRczFa1A';

/* Placeholder Video until back-end is ready */
const SAMPLE_VIDEO = 'assets/Chopin - Nocturne op.9 No.2.mp4';
const CONNECT_TIMEOUT_MS = 15000;

const STATUS_TEXT = {
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected'
};

const MEDIA_ERRORS = {
  1: 'Playback was stopped before the video could load.',
  2: 'A network problem interrupted the video. Check your connection and try again.',
  3: 'This video could not be decoded.',
  4: 'This video could not be loaded, or its format is not supported by your browser.'
};

const video = $('#video');
const playerBox = $('#player');
let connectTimer;

/* ---------- connection status ---------- */
function setStatus(state) {
  $('#status').dataset.state = state;
  $('#statusText').textContent = STATUS_TEXT[state];
}

/* ---------- errors ---------- */
function showError(message) {
  clearTimeout(connectTimer);
  $('#errorMsg').textContent = message;
  $('#error').hidden = false;
  playerBox.classList.remove('buffering');
  setStatus('disconnected');
}

function clearError() {
  $('#error').hidden = true;
}

/* ---------- source ----------
   Sprint 1: a sample video URL.
   Later sprints: replace the body with the WebRTC stream, e.g.
   video.srcObject = remoteStream, and call setStatus() from the
   connection's state-change events. */
function loadSource() {
  clearError();
  setStatus('connecting');
  video.src = SAMPLE_VIDEO;
  video.load();
  clearTimeout(connectTimer);
  connectTimer = setTimeout(() => {
    if ($('#status').dataset.state === 'connecting') {
      showError('Could not connect in time. Check your connection and try again.');
    }
  }, CONNECT_TIMEOUT_MS);
}

/* ---------- video events ---------- */
video.addEventListener('loadeddata', () => {
  clearTimeout(connectTimer);
  setStatus('connected');
});
video.addEventListener('error', () => {
  const code = video.error && video.error.code;
  showError(MEDIA_ERRORS[code] || 'Something went wrong while loading the video.');
});
video.addEventListener('waiting', () => playerBox.classList.add('buffering'));
video.addEventListener('playing', () => playerBox.classList.remove('buffering'));
video.addEventListener('canplay', () => playerBox.classList.remove('buffering'));

window.addEventListener('offline', () => showError('You are offline. Reconnect to keep watching.'));
window.addEventListener('online', loadSource);
$('#retry').onclick = loadSource;

/* ---------- controls ---------- */
const pp = $('#pp'), mute = $('#mute'), vol = $('#vol'), seek = $('#seek'), time = $('#time');

const fmt = (sec) => {
  if (!isFinite(sec)) return '0:00';
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

function togglePlay() {
  if (!video.paused) return video.pause();
  const attempt = video.play();
  if (attempt && attempt.catch) {
    attempt.catch((err) => {
      if (err.name === 'AbortError') return;
      if (err.name === 'NotAllowedError') return toast('Your browser blocked playback. Press play again.');
      showError('Could not start playback. ' + MEDIA_ERRORS[4]);
    });
  }
}

function updateTime() {
  const dur = video.duration;
  seek.value = isFinite(dur) && dur > 0 ? (video.currentTime / dur) * 1000 : 0;
  time.innerHTML = `${fmt(video.currentTime)} <span class="mute"> / ${fmt(dur)}</span>`;
}

pp.onclick = togglePlay;
video.onclick = togglePlay;
video.addEventListener('play', () => { setIcon(pp, 'pause'); pp.setAttribute('aria-label', 'Pause'); });
video.addEventListener('pause', () => { setIcon(pp, 'play'); pp.setAttribute('aria-label', 'Play'); });
video.addEventListener('timeupdate', updateTime);
video.addEventListener('loadedmetadata', updateTime);

$('#rw').onclick = () => { video.currentTime = Math.max(0, video.currentTime - 10); };
seek.oninput = () => { if (isFinite(video.duration)) video.currentTime = (seek.value / 1000) * video.duration; };

vol.oninput = () => { video.volume = vol.value / 100; video.muted = video.volume === 0; };
mute.onclick = () => { video.muted = !video.muted; };
video.addEventListener('volumechange', () => {
  const silent = video.muted || video.volume === 0;
  setIcon(mute, silent ? 'off' : 'vol');
  vol.value = silent ? 0 : Math.round(video.volume * 100);
});

$('#fs').onclick = () => {
  if (document.fullscreenElement) return document.exitFullscreen();
  if (!playerBox.requestFullscreen) return toast('Fullscreen is not supported in this browser.');
  playerBox.requestFullscreen().catch(() => toast('Could not enter fullscreen.'));
};

const pip = $('#pip');
if (!document.pictureInPictureEnabled) {
  pip.disabled = true;
  pip.title = 'Picture-in-picture is not supported in this browser';
}
pip.onclick = () => {
  const action = document.pictureInPictureElement ? document.exitPictureInPicture() : video.requestPictureInPicture();
  action.catch(() => toast('Picture-in-picture is not available right now.'));
};

addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !/INPUT|BUTTON|TEXTAREA/.test(e.target.tagName)) {
    e.preventDefault();
    togglePlay();
  }
});

/* ---------- film details ---------- */
const wanted = new URLSearchParams(location.search).get('title') || FILMS[0].t;
const film = FILMS.find((f) => f.t === wanted) || { t: wanted, y: '—', len: '—', g: 'Drama' };

document.title = `${film.t} – Relay`;
['#fTitle', '#fCrumb', '#fNow'].forEach((id) => { $(id).textContent = film.t; });
$('#fYear').textContent = film.y;
$('#fRun').textContent = film.len;
$('#fGenre').textContent = film.g;
if (film.age) $('#fAge').textContent = film.age; else $('#fAge').remove();
$('#fSyn').textContent = film.d || `A ${film.g.toLowerCase()} from the Relay collection.`;

if (film.c) {
  const [a, b] = film.c.split(',');
  playerBox.style.background = `radial-gradient(60% 40% at 55% 65%,${a},transparent 75%),linear-gradient(180deg,${b},#0b0d10)`;
}

$('#more').innerHTML = FILMS.filter((f) => f.sec && f.t !== film.t).slice(0, 6).map(posterCard).join('');

bindListButton($('#list'), 'In my list', 'Add to my list');
$('#share').onclick = () => {
  if (!navigator.clipboard) return toast('Copy the address bar to share');
  navigator.clipboard.writeText(location.href).then(() => toast('Link copied'), () => toast('Copy the address bar to share'));
};

/* ---------- start ---------- */
paintIcons();
vol.value = 60;
video.volume = 0.6;
updateTime();

if (!video.canPlayType || video.canPlayType('video/mp4') === '') {
  showError('Your browser does not support HTML5 video. Please use an up-to-date browser.');
} else {
  loadSource();
}
