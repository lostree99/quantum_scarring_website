/* app.js — navigation, billiard sim, back-to-top progress */
/* Put this file next to index.html and reference with <script src="app.js" defer></script> */

document.addEventListener('DOMContentLoaded', () => {
  /* -------------------------
     Navigation + scroll snap
     - rely on CSS snapping; use IO to update active dot
  ------------------------- */
  const dots = Array.from(document.querySelectorAll('.nav-dots .dot'));
  const sections = Array.from(document.querySelectorAll('section'));

  dots.forEach(d => d.addEventListener('click', () => {
    const id = d.dataset.section || d.getAttribute('data-section');
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
  }));

  // IntersectionObserver to update active dot
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      dots.forEach(d => d.classList.toggle('active', d.dataset.section === id));
    });
  }, { threshold: 0.55 });

  sections.forEach(s => io.observe(s));

  // keyboard nav (up/down)
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const center = window.innerHeight/2;
      let idx = sections.findIndex(s => {
        const r = s.getBoundingClientRect();
        return r.top <= center && r.bottom >= center;
      });
      if (idx === -1) idx = 0;
      if (e.key === 'ArrowDown') idx = Math.min(sections.length-1, idx+1);
      else idx = Math.max(0, idx-1);
      sections[idx].scrollIntoView({behavior:'smooth', block:'start'});
    }
  });

  /* -------------------------
     Back-to-top button with progress fill
     - fills as you scroll; hidden at top (no clutter)
  ------------------------- */
  const back = document.getElementById('backTop');
  function updateProgress() {
    const scrollTop = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docH > 0 ? Math.round((scrollTop / docH) * 100) : 0;
    document.documentElement.style.setProperty('--progress', pct + '%'); // used by CSS
    // show button when not at very top ( > 3% ), hide at very top
    if (pct > 3) {
      back.classList.add('show');
      back.classList.remove('hidden-at-top');
    } else {
      back.classList.remove('show');
      back.classList.add('hidden-at-top');
    }
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
  back.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* -------------------------
     Tiny fade-in for content (non-blocking)
  ------------------------- */
  const fadeEls = document.querySelectorAll('.container, .stage-title, .hero-sub');
  const fadeIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.style.opacity = 1;
    });
  }, { threshold: 0.08 });
  fadeEls.forEach(el => { el.style.opacity = 0; fadeIO.observe(el); });

  /* -------------------------
     Bunimovich stadium billiard simulation
     - lightweight canvas sim (toy model for demos)
     - click canvas to add particles; press 'c' to clear; 'a' adds random cluster
  ------------------------- */
  (function billiardSim() {
    const canvas = document.getElementById('billiard-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    let dpr = window.devicePixelRatio || 1;

    function fit() {
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      rebuildOffscreen();
      drawStatic();
    }
    window.addEventListener('resize', fit);
    fit();

    // stadium geometry (centered horizontally)
    function makeStadium() {
      const pad = 18;
      const w = canvas.clientWidth * 0.68;
      const r = Math.min(120, canvas.clientHeight * 0.18);
      const left = (canvas.clientWidth - w)/2 + r;
      const right = left + (w - 2*r);
      const top = pad;
      const bottom = canvas.clientHeight - pad;
      return { left, right, top, bottom, r, cy: (top + bottom)/2 };
    }
    let stadium = makeStadium();

    // offscreen base
    const off = document.createElement('canvas'); const offCtx = off.getContext('2d');
    function rebuildOffscreen(){
      off.width = canvas.width; off.height = canvas.height;
      offCtx.clearRect(0,0,off.width,off.height);
      stadium = makeStadium();
      const s = stadium;
      offCtx.fillStyle = 'rgba(255,255,255,0.02)';
      offCtx.beginPath();
      offCtx.arc(s.left, s.cy, s.r, Math.PI/2, Math.PI*1.5, true); // left semi
      offCtx.lineTo(s.right, s.cy - s.r);
      offCtx.arc(s.right, s.cy, s.r, Math.PI*1.5, Math.PI/2, true); // right semi
      offCtx.closePath();
      offCtx.fill();
      offCtx.lineWidth = 1.2; offCtx.strokeStyle = 'rgba(255,255,255,0.06)'; offCtx.stroke();
    }

    function drawStatic(){
      ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
      ctx.drawImage(off, 0, 0, canvas.clientWidth, canvas.clientHeight);
    }

    // particles
    const particles = [];
    function randColor(){ const hues=[45,190,260,320]; const h=hues[Math.floor(Math.random()*hues.length)]; return `hsl(${h} 65% 60%)`; }

    // reflect logic: if outside domain, reflect via approximate normal
    function applyBounce(p, nx, ny, mode) {
      const vdotn = p.vx*nx + p.vy*ny;
      if (mode === 'specular') {
        p.vx = p.vx - 2*vdotn*nx; p.vy = p.vy - 2*vdotn*ny;
      } else {
        // no-slip-ish: reflect normal, damp tangential
        const tx = -ny, ty = nx;
        const vt = p.vx*tx + p.vy*ty;
        const vn = -vdotn;
        p.vx = vn*nx + vt*tx*0.95;
        p.vy = vn*ny + vt*ty*0.95;
      }
      p.vx *= 0.9995; p.vy *= 0.9995;
    }

    function reflectIfNeeded(p){
      const s = stadium, r = s.r, cy = s.cy;
      if (p.x < s.left) {
        const dx = p.x - s.left, dy = p.y - cy; const dist = Math.hypot(dx,dy);
        if (dist > r) {
          const nx = dx/dist, ny = dy/dist;
          applyBounce(p, nx, ny, document.body.querySelector('#bounce-mode')?.value || 'specular');
          // push inside
          p.x = s.left + nx*(r-1); p.y = cy + ny*(r-1);
        }
      } else if (p.x > s.right) {
        const dx = p.x - s.right, dy = p.y - cy; const dist = Math.hypot(dx,dy);
        if (dist > r) {
          const nx = dx/dist, ny = dy/dist;
          applyBounce(p, nx, ny, document.body.querySelector('#bounce-mode')?.value || 'specular');
          p.x = s.right + nx*(r-1); p.y = cy + ny*(r-1);
        }
      } else {
        if (p.y < s.top) { applyBounce(p, 0, -1, 'specular'); p.y = s.top + 2; }
        if (p.y > s.bottom) { applyBounce(p, 0, 1, 'specular'); p.y = s.bottom - 2; }
      }
    }

    // animation
    let last = performance.now();
    function frame(ts) {
      const dt = Math.min(0.04, (ts-last)/1000); last = ts;
      // trail vs clear: fade a little
      ctx.fillStyle = 'rgba(5,6,18,0.06)'; ctx.fillRect(0,0,canvas.clientWidth,canvas.clientHeight);
      ctx.drawImage(off, 0, 0, canvas.clientWidth, canvas.clientHeight);
      // update particles
      const mu = 0.0009; // small damping
      for (let p of particles) {
        p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
        p.vx *= (1 - mu * dt * 60); p.vy *= (1 - mu * dt * 60);
        reflectIfNeeded(p);
        ctx.beginPath(); ctx.fillStyle = p.color; ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // mouse to add particle
    canvas.addEventListener('click', e => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const ang = Math.random()*Math.PI*2, sp = 1.6 + Math.random()*2.5;
      particles.push({ x, y, vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp, color: randColor(), r: 3 + Math.random()*2.5 });
    });

    // keyboard shortcuts
    window.addEventListener('keydown', e => {
      if (e.key === 'c') { particles.length = 0; drawStatic(); }
      if (e.key === 'a') {
        for (let i=0;i<6;i++){
          const x = stadium.left + Math.random()*(stadium.right - stadium.left);
          const y = stadium.top + Math.random()*(stadium.bottom - stadium.top);
          const ang = Math.random()*Math.PI*2, sp = 1.7 + Math.random()*2.2;
          particles.push({ x, y, vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp, color: randColor(), r: 3 + Math.random()*2.2 });
        }
      }
    });

    // On first paint, draw static
    function drawStatic(){ ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight); ctx.drawImage(off,0,0,canvas.clientWidth,canvas.clientHeight); }
    drawStatic();

    // observe resize
    new ResizeObserver(() => { fit(); }).observe(canvas);
  })();

}); // DOMContentLoaded
