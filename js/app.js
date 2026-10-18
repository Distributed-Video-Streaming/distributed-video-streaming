const P={play:'<polygon points="6 4 20 12 6 20"/>',pause:'<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',bell:'<path d="M6 9a6 6 0 0 1 12 0c0 6 3 7 3 7H3s3-1 3-7M10 20a2 2 0 0 0 4 0"/>',arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',back:'<path d="M19 12H5M11 6l-6 6 6 6"/>',replay:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',vol:'<path d="M3 9v6h4l5 4V5L7 9zM16 9a4 4 0 0 1 0 6"/>',off:'<path d="M3 9v6h4l5 4V5L7 9zM17 9l5 6M22 9l-5 6"/>',cc:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 11h2M14 11h2M8 15h8"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',pip:'<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="5"/>',full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',share:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 11 7.6-3.9M8.2 13l7.6 3.9"/>',star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',server:'<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/>',check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',flag:'<path d="M5 21V4h12l-2 4 2 4H5"/>',chev:'<path d="m9 6 6 6-6 6"/>',sliders:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'};
const ico=n=>`<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[n]}</svg>`;
const $=s=>document.querySelector(s);
const paint=r=>(r||document).querySelectorAll('[data-i]:not([data-d])').forEach(e=>{e.insertAdjacentHTML('afterbegin',ico(e.dataset.i));e.dataset.d=1});
const toast=m=>{const t=$('#toast');if(!t)return;t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2200)};

/* ---------- data ---------- */
const NEW=[
 {t:'Distant Shores',m:'2026 · Drama · 1h 52m',b:'Just added',g:'Drama',c:'#e0a96d,#35566f'},
 {t:'Neon Saints',m:'2026 · Thriller · 1h 44m',b:'Relay Select',g:'Thriller',c:'#ff4d6d,#10131c'},
 {t:'Wild Current',m:'2025 · Documentary · 1h 26m',b:'Relay Select',g:'Documentary',c:'#2aa6b8,#0b2a3a'},
 {t:'The Quiet Earth',m:'2026 · Sci-fi · 2h 08m',b:'Exclusive',g:'Sci-fi',c:'#c46a3c,#1a2540'},
 {t:'Sunday People',m:'2025 · Comedy · 1h 38m',b:'Relay Select',g:'Comedy',c:'#8bb36a,#3a2f24'},
 {t:'After the Fall',m:'2026 · Drama · 1h 56m',b:'Relay Select',g:'Drama',c:'#8d7a6b,#1b1c20'}];
const WORLD=[
 {t:'Paper Lanterns',m:'Japan · Drama · 2025',b:'Relay Select',g:'Drama',c:'#e5483d,#14181f'},
 {t:'A Summer Away',m:'France · Romance · 2026',b:'Relay Select',g:'Comedy',c:'#9ac36b,#2c3b24'},
 {t:'The Long Way',m:'Argentina · Adventure · 2025',b:'Relay Select',g:'Adventure',c:'#b98652,#2f4a63'},
 {t:'Everything Is Still',m:'Norway · Drama · 2026',b:'Relay Select',g:'Drama',c:'#cfd8e0,#3d5260'},
 {t:'Second Sunrise',m:'India · Drama · 2025',b:'Relay Select',g:'Drama',c:'#e29a4a,#4a2a22'},
 {t:'Glass Houses',m:'South Korea · Thriller · 2026',b:'Relay Select',g:'Thriller',c:'#3f6a5e,#0d1614'},
 {t:'Salt & Signal',m:'Chile · Documentary · 2025',b:'Relay Select',g:'Documentary',c:'#4d93b5,#17283a'},
 {t:'Orbit Kids',m:'Canada · Sci-fi · 2026',b:'Relay Select',g:'Sci-fi',c:'#7a6ad8,#14123a'}];
const CONT=[
 {t:'Between the Pines',s:'Film · 2025',l:'42 min left',p:'58%',c:'#d19a5a,#16281f'},
 {t:'The Blue Hour',s:'S1 E3 · The crossing',l:'18 min left',p:'72%',c:'#2a8fc4,#0c1626'},
 {t:'Higher Ground',s:'Film · 2026',l:'1h 06m left',p:'12%',c:'#b9c7d6,#3b4e63'}];
const MORE=[{...NEW[0],b:'New release'},NEW[1],NEW[2],{...NEW[3],b:'Trending'},NEW[4],NEW[5]].map(f=>({...f,m:f.m.replace(/^2026/,'2025')}));
const SLIDES=[
 {t:'The Last Light',m:['2026','1h 48m','16+','Drama · Mystery','4K UHD'],d:'At the edge of the world, a lighthouse keeper returns home to uncover a secret the sea was meant to keep.',by:'A film by Elena Marlow',c:'#4a5a6e,#10151d'},
 {t:'Neon Saints',m:['2026','1h 44m','18+','Thriller','4K UHD'],d:'One night, three strangers and a city that never forgives what it sees.',by:'A film by Ren Takeda',c:'#7a2e57,#0e1017'},
 {t:'The Quiet Earth',m:['2026','2h 08m','13+','Sci-fi','4K UHD'],d:'The last astronaut on a silent planet hears something answer back.',by:'A film by Ana Brandt',c:'#9a5a3a,#141a2e'},
 {t:'Wild Current',m:['2025','1h 26m','All','Documentary','4K UHD'],d:'Riding the planet’s biggest waves with the people who chase them.',by:'A film by Noa Ferreira',c:'#1f7d92,#07202e'}];

/* ---------- cards ---------- */
const link=f=>"watch.html?title="+encodeURIComponent(f.t);
const poster=f=>`<a class="card" href="${link(f)}"><div class="poster" style="--g:linear-gradient(160deg,${f.c})">${f.b?`<span class="badge ${f.b==='Relay Select'?'g':''}">${f.b}</span>`:''}<h3>${f.t}</h3></div><p class="ct">${f.t}</p><p class="cm">${f.m}</p></a>`;

/* ---------- home ---------- */
if($('#hero')){
  $('#cont').innerHTML=CONT.map(f=>`<div><a class="thumb" href="${link(f)}" style="--g:linear-gradient(160deg,${f.c})"><span class="pl" data-i="play"></span><span class="left">${f.l}</span><span class="bar" style="--p:${f.p}"></span></a><div class="row"><div><p class="ct">${f.t}</p><p class="cm">${f.s}</p></div><button aria-label="More options" class="mute">···</button></div></div>`).join('');
  $('#newGrid').innerHTML=NEW.map(poster).join('');
  let idx=0,timer;
  const dots=$('#dots');
  dots.innerHTML=SLIDES.map((_,i)=>`<button aria-label="Slide ${i+1}"></button>`).join('')+'<span style="margin-left:8px"></span>';
  const show=i=>{
    idx=i;const s=SLIDES[i];
    $('#hero').style.setProperty('--hbg',`radial-gradient(60% 80% at 75% 40%,${s.c.split(',')[0]},transparent),${s.c.split(',')[1]}`);
    $('#hero').style.background='var(--hbg)';
    $('#hEyebrow').textContent='Relay Original · Film of the week';
    $('#hTitle').textContent=s.t;
    $('#hMeta').innerHTML=`<span>${s.m[0]}</span><span class="mute">${s.m[1]}</span><span class="tag">${s.m[2]}</span><span class="mute">${s.m[3]}</span><span class="mute">${s.m[4]}</span>`;
    $('#hWatch').href=link(s);$('#hDesc').textContent=s.d;$('#hCredit').textContent=s.by;
    [...dots.children].forEach((d,j)=>d.classList.toggle('on',j===i));
    dots.lastChild.textContent=`0${i+1} / 0${SLIDES.length}`;
  };
  const loop=()=>{clearInterval(timer);if(!matchMedia('(prefers-reduced-motion:reduce)').matches)timer=setInterval(()=>show((idx+1)%SLIDES.length),6000)};
  dots.onclick=e=>{const j=[...dots.children].indexOf(e.target);if(j>-1&&j<SLIDES.length){show(j);loop()}};
  $('#hList').onclick=e=>{const b=e.currentTarget.lastChild,on=b.textContent==='Add to my list';b.textContent=on?'Added to my list':'Add to my list';toast(on?'Added to my list':'Removed from my list')};
  show(0);loop();
  const GEN=['All films','Drama','Thriller','Sci-fi','Comedy','Documentary','Adventure'];
  const chips=$('#chips');
  chips.insertAdjacentHTML('beforeend',GEN.map((g,i)=>`<button class="chip${i?'':' on'}">${g}</button>`).join(''));
  const draw=g=>{const l=WORLD.filter(f=>g==='All films'||f.g===g).slice(0,6);$('#worldGrid').innerHTML=l.length?l.map(poster).join(''):'<p class="mute">No films in this mood yet. Try another.</p>'};
  chips.onclick=e=>{if(!e.target.classList.contains('chip'))return;chips.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',c===e.target));draw(e.target.textContent)};
  draw('All films');
}

/* ---------- watch ---------- */
if($('#player')){
  const LL={t:'The Last Light',y:'2025',d:'1h 54m',sec:6846,g:'Sci-Fi · Drama · Adventure',rt:'PG-13',dir:'Elias Morgan',cast:'Aaron Hale, Maya Chen, Olivia Reed',desc:"When the world's power grids fall silent, a lighthouse keeper receives a signal from across the ocean. With only a fading beam to guide him, he sets out to discover who is still there — and what it means to keep hope alive.",q:'“Somewhere out there, the light is still on.”',q2:'“En algún lugar, la luz sigue encendida.”'};
  const ALL=[LL,...NEW,...WORLD,...CONT.map(f=>({...f,g:'Drama',m:f.s}))];
  const want=new URLSearchParams(location.search).get('title')||LL.t;
  const F=ALL.find(f=>f.t===want)||{t:want};
  const yr=F.y||(F.m||'').match(/\d{4}/)?.[0]||'2025',rt=F.d||(F.m||'').match(/\d+h \d+m/)?.[0]||'1h 45m';
  const dur=s=>{const m=s.match(/(\d+)h\s*(\d+)?/);return m?+m[1]*3600+(+m[2]||0)*60:6000};
  const CAP=[F.q||'“Press play and let the story begin.”',F.q2||'“Dale play y deja que empiece la historia.”'];
  document.title=`${F.t} – Relay`;
  ['#fTitle','#fCrumb','#fNow'].forEach(s=>$(s).textContent=F.t);
  $('#fRate').textContent=F===LL?'8.4':(7+[...F.t].reduce((a,c)=>a+c.charCodeAt(0),0)%25/10).toFixed(1);
  $('#fYear').textContent=yr;$('#fRun').textContent=rt;$('#fAge').textContent=F.rt||'PG-13';$('#fGenre').textContent=F.g||'Drama';
  $('#fSyn').textContent=F.desc||`A ${(F.g||'drama').toLowerCase()} from the Relay collection. Press play and let the story begin.`;
  $('#fDir').textContent=F.dir||'—';$('#fCast').textContent=F.cast||'—';
  $('#cap').textContent=CAP[0];
  if(F!==LL&&F.c){const[a,b]=F.c.split(',');const p=$('#player');p.classList.add('plain');p.style.background=`radial-gradient(60% 40% at 55% 65%,${a},transparent 75%),linear-gradient(180deg,${b},#0b0d10)`}
  $('#more').innerHTML=[...NEW,...WORLD].filter(f=>f.t!==F.t).slice(0,6).map(poster).join('');
  const DUR=F.sec||dur(rt);let t=Math.ceil(DUR*.283),playing=true,speed=1,q='1080p',subs='English',server=0;
  const fmt=s=>{s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60,p=n=>String(n).padStart(2,'0');return(h?h+':'+p(m):m)+':'+p(x)};
  const SV=['Relay 01','Relay 02','Relay 03'];
  const drawSv=()=>{$('#servers').innerHTML=SV.map((n,i)=>`<button class="btn ${i===server?'on':''}" data-s="${i}"><span data-i="${i===server?'check':'server'}"></span>${n}${i===0?'<small>Recommended</small>':''}</button>`).join('');paint($('#servers'));
    $('#conn').textContent=`Connected to ${SV[server]} · ${q==='Auto'?'Auto':q==='1080p'?'Full HD':q}`;$('#hd').textContent=['1080p','720p'].includes(q)?'HD':q==='Auto'?'AUTO':'SD'};
  $('#servers').onclick=e=>{const b=e.target.closest('[data-s]');if(b){server=+b.dataset.s;drawSv();toast(`Switched to ${SV[server]}. Resumed at ${fmt(t)}`)}};
  const draw=()=>{const pc=t/DUR*100+'%';$('#cur').style.width=pc;$('#knob').style.left=pc;$('#time').innerHTML=`${fmt(t)} <span class="mute"> / ${fmt(DUR)}</span>`};
  const setIcon=(el,n)=>{el.querySelector('svg').outerHTML=ico(n)};
  setInterval(()=>{if(playing&&t<DUR){t=Math.min(DUR,t+speed);draw()}},1000);
  const toggle=()=>{playing=!playing;setIcon($('#pp'),playing?'pause':'play')};
  $('#pp').onclick=toggle;
  addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|BUTTON|TEXTAREA/.test(e.target.tagName)){e.preventDefault();toggle()}});
  $('#rw').onclick=()=>{t=Math.max(0,t-10);draw()};
  $('#pbar').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();t=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*DUR;draw()};
  $('#vol').oninput=e=>setIcon($('#mute'),+e.target.value?'vol':'off');
  $('#mute').onclick=()=>{const v=$('#vol');v.value=+v.value?0:60;v.oninput({target:v})};
  $('#cc').onclick=e=>{const on=e.currentTarget.classList.toggle('on');$('#cap').style.display=on?'':'none';subs=on?'English':'Off';drawPanel()};
  $('#gear').onclick=()=>{const o=$('#panel').classList.toggle('open');$('#gear').classList.toggle('on',o)};
  $('#pClose').onclick=()=>{$('#panel').classList.remove('open');$('#gear').classList.remove('on')};
  $('#fs').onclick=()=>document.fullscreenElement?document.exitFullscreen():$('#player').requestFullscreen?.();
  $('#pip').onclick=()=>toast('Picture-in-picture needs a real video element');
  const G=[{k:'Video quality',o:['Auto','1080p','720p','480p'],g:()=>q,s:v=>q=v},{k:'Subtitles',o:['Off','English','Español'],g:()=>subs,s:v=>{subs=v;$('#cc').classList.toggle('on',v!=='Off');$('#cap').style.display=v==='Off'?'none':'';$('#cap').textContent=CAP[v==='Español'?1:0]}},{k:'Playback speed',o:['0.75×','1×','1.25×','1.5×','2×'],g:()=>speed+'×',s:v=>speed=parseFloat(v)}];
  function drawPanel(){$('#pBody').innerHTML=G.map((g,i)=>`<div class="g"><div class="lab">${g.k}<span>${g.g()}</span></div><div class="opts" data-g="${i}">${g.o.map(o=>`<button class="${o===g.g()?'on':''}">${o}</button>`).join('')}</div></div>`).join('')}
  $('#pBody').onclick=e=>{const b=e.target.closest('button'),grp=e.target.closest('[data-g]');if(!b||!grp)return;G[+grp.dataset.g].s(b.textContent);drawPanel();drawSv()};
  drawPanel();drawSv();draw();paint();
  $('#list').onclick=e=>{const b=e.currentTarget.lastChild,on=b.textContent==='Add to my list';b.textContent=on?'In my list':'Add to my list';toast(on?'Added to my list':'Removed from my list')};
  $('#share').onclick=()=>{navigator.clipboard?.writeText(location.href).then(()=>toast('Link copied'),()=>toast('Copy the address bar to share'))};
  $('#report').onclick=e=>{e.preventDefault();toast('Thanks. We’ll look into it')};
}
paint();
