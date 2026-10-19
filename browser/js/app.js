/* Shared helpers, film data and the home page. Loaded on every page. */

/* ---------- icons ---------- */
const ICONS = {
  play: '<polygon points="6 4 20 12 6 20"/>',
  pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  replay: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
  vol: '<path d="M3 9v6h4l5 4V5L7 9zM16 9a4 4 0 0 1 0 6"/>',
  off: '<path d="M3 9v6h4l5 4V5L7 9zM17 9l5 6M22 9l-5 6"/>',
  pip: '<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="5"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 11 7.6-3.9M8.2 13l7.6 3.9"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'
};

const icon = (name) =>
  `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const $ = (selector) => document.querySelector(selector);

/* Fill every <span data-i="name"> with its SVG icon (once). */
function paintIcons(root = document) {
  root.querySelectorAll('[data-i]:not([data-d])').forEach((el) => {
    el.insertAdjacentHTML('afterbegin', icon(el.dataset.i));
    el.dataset.d = 1;
  });
}

/* Swap the icon inside a button that was already painted. */
function setIcon(button, name) {
  const svg = button.querySelector('svg');
  if (svg) svg.outerHTML = icon(name);
}

let toastTimer;
function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- film data (placeholder content, no backend yet) ---------- */
const FILMS = [
  /* hero slides */
  { t: 'The Last Light', y: 2026, len: '1h 48m', g: 'Drama', age: '16+', c: '#4a5a6e,#10151d', hero: true, by: 'Elena Marlow',
    d: 'At the edge of the world, a lighthouse keeper returns home to uncover a secret the sea was meant to keep.' },
  { t: 'Neon Saints', y: 2026, len: '1h 44m', g: 'Thriller', age: '18+', c: '#7a2e57,#0e1017', hero: true, by: 'Ren Takeda', sec: 'new', badge: 'Relay Select',
    d: 'One night, three strangers and a city that never forgives what it sees.' },
  { t: 'The Quiet Earth', y: 2026, len: '2h 08m', g: 'Sci-fi', age: '13+', c: '#9a5a3a,#141a2e', hero: true, by: 'Ana Brandt', sec: 'new', badge: 'Exclusive',
    d: 'The last astronaut on a silent planet hears something answer back.' },
  { t: 'Wild Current', y: 2025, len: '1h 26m', g: 'Documentary', age: 'All', c: '#1f7d92,#07202e', hero: true, by: 'Noa Ferreira', sec: 'new', badge: 'Relay Select',
    d: 'Riding the planet’s biggest waves with the people who chase them.' },

  /* new & noteworthy */
  { t: 'Distant Shores', y: 2026, len: '1h 52m', g: 'Drama', c: '#e0a96d,#35566f', sec: 'new', badge: 'Just added' },
  { t: 'Sunday People', y: 2025, len: '1h 38m', g: 'Comedy', c: '#8bb36a,#3a2f24', sec: 'new', badge: 'Relay Select' },
  { t: 'After the Fall', y: 2026, len: '1h 56m', g: 'Drama', c: '#8d7a6b,#1b1c20', sec: 'new', badge: 'Relay Select' },

  /* world cinema */
  { t: 'Paper Lanterns', country: 'Japan', y: 2025, len: '2h 04m', g: 'Drama', c: '#e5483d,#14181f', sec: 'world', badge: 'Relay Select' },
  { t: 'A Summer Away', country: 'France', y: 2026, len: '1h 41m', g: 'Comedy', c: '#9ac36b,#2c3b24', sec: 'world', badge: 'Relay Select' },
  { t: 'The Long Way', country: 'Argentina', y: 2025, len: '1h 59m', g: 'Adventure', c: '#b98652,#2f4a63', sec: 'world', badge: 'Relay Select' },
  { t: 'Everything Is Still', country: 'Norway', y: 2026, len: '1h 47m', g: 'Drama', c: '#cfd8e0,#3d5260', sec: 'world', badge: 'Relay Select' },
  { t: 'Second Sunrise', country: 'India', y: 2025, len: '2h 12m', g: 'Drama', c: '#e29a4a,#4a2a22', sec: 'world', badge: 'Relay Select' },
  { t: 'Glass Houses', country: 'South Korea', y: 2026, len: '1h 36m', g: 'Thriller', c: '#3f6a5e,#0d1614', sec: 'world', badge: 'Relay Select' },
  { t: 'Salt & Signal', country: 'Chile', y: 2025, len: '1h 29m', g: 'Documentary', c: '#4d93b5,#17283a', sec: 'world', badge: 'Relay Select' },
  { t: 'Orbit Kids', country: 'Canada', y: 2026, len: '1h 33m', g: 'Sci-fi', c: '#7a6ad8,#14123a', sec: 'world', badge: 'Relay Select' },

  /* continue watching */
  { t: 'Between the Pines', y: 2025, len: '1h 40m', g: 'Drama', c: '#d19a5a,#16281f', sec: 'cont', sub: 'Film · 2025', left: '42 min left', p: '58%' },
  { t: 'The Blue Hour', y: 2026, len: '52m', g: 'Drama', c: '#2a8fc4,#0c1626', sec: 'cont', sub: 'S1 E3 · The crossing', left: '18 min left', p: '72%' },
  { t: 'Higher Ground', y: 2026, len: '1h 58m', g: 'Adventure', c: '#b9c7d6,#3b4e63', sec: 'cont', sub: 'Film · 2026', left: '1h 06m left', p: '12%' }
];

const inSection = (name) => FILMS.filter((f) => f.sec === name);
const watchLink = (film) => 'watch.html?title=' + encodeURIComponent(film.t);

/* A poster card. Used on the home page and in "More like this". */
function posterCard(f) {
  const meta = f.country ? `${f.country} · ${f.g} · ${f.y}` : `${f.y} · ${f.g} · ${f.len}`;
  const badge = f.badge ? `<span class="badge ${f.badge === 'Relay Select' ? 'g' : ''}">${f.badge}</span>` : '';
  return `<a class="card" href="${watchLink(f)}">
    <div class="poster" style="--g:linear-gradient(160deg,${f.c})">${badge}<h3>${f.t}</h3></div>
    <p class="ct">${f.t}</p><p class="cm">${meta}</p></a>`;
}

/* "Add to my list" toggle shared by both pages. */
function bindListButton(button, labelOn, labelOff) {
  button.onclick = () => {
    const label = button.lastChild;
    const adding = label.textContent === labelOff;
    label.textContent = adding ? labelOn : labelOff;
    toast(adding ? 'Added to my list' : 'Removed from my list');
  };
}

/* ---------- home page ---------- */
function initHome() {
  const slides = FILMS.filter((f) => f.hero);

  $('#cont').innerHTML = inSection('cont').map((f) => `
    <div>
      <a class="thumb" href="${watchLink(f)}" style="--g:linear-gradient(160deg,${f.c})">
        <span class="pl" data-i="play"></span><span class="left">${f.left}</span><span class="bar" style="--p:${f.p}"></span>
      </a>
      <div class="row"><div><p class="ct">${f.t}</p><p class="cm">${f.sub}</p></div></div>
    </div>`).join('');

  $('#newGrid').innerHTML = inSection('new').map(posterCard).join('');

  /* hero: dots switch slides (no auto-rotate, keeps it simple) */
  const dots = $('#dots');
  dots.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Slide ${i + 1}"></button>`).join('');
  const showSlide = (i) => {
    const s = slides[i];
    const [a, b] = s.c.split(',');
    $('#hero').style.background = `radial-gradient(60% 80% at 75% 40%,${a},transparent),${b}`;
    $('#hTitle').textContent = s.t;
    $('#hMeta').innerHTML = `<span>${s.y}</span><span class="mute">${s.len}</span><span class="tag">${s.age}</span><span class="mute">${s.g}</span>`;
    $('#hDesc').textContent = s.d;
    $('#hCredit').textContent = 'A film by ' + s.by;
    $('#hWatch').href = watchLink(s);
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
  };
  dots.onclick = (e) => {
    const i = [...dots.children].indexOf(e.target);
    if (i > -1) showSlide(i);
  };
  bindListButton($('#hList'), 'Added to my list', 'Add to my list');
  showSlide(0);

  /* world cinema with genre chips */
  const genres = ['All films', 'Drama', 'Thriller', 'Sci-fi', 'Comedy', 'Documentary', 'Adventure'];
  const chips = $('#chips');
  chips.innerHTML = '<span style="display:flex;gap:8px;align-items:center;margin-right:6px"><span data-i="sliders"></span>Find your mood</span>'
    + genres.map((g, i) => `<button type="button" class="chip${i ? '' : ' on'}">${g}</button>`).join('');
  const drawWorld = (genre) => {
    const list = inSection('world').filter((f) => genre === 'All films' || f.g === genre).slice(0, 6);
    $('#worldGrid').innerHTML = list.length ? list.map(posterCard).join('') : '<p class="mute">No films in this mood yet. Try another.</p>';
  };
  chips.onclick = (e) => {
    if (!e.target.classList.contains('chip')) return;
    chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === e.target));
    drawWorld(e.target.textContent);
  };
  drawWorld('All films');
}

if ($('#hero')) initHome();
paintIcons();
