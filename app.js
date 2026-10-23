(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* ---------- hero headline: word-by-word rise ---------- */
  const h1 = $('#h1');
  if (h1) {
    let i = 0;
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(t => {
            if (!t.trim()) { frag.append(t); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = t;
            s.style.animationDelay = (0.15 + i++ * 0.07) + 's';
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(h1);
  }

  /* ---------- nav ---------- */
  const nav = $('#nav'), bar = $('.progress i'), glow = $('.cursor-glow');
  const onScroll = () => {
    nav.classList.toggle('stuck', scrollY > 24);
    const h = document.documentElement;
    bar.style.width = (scrollY / (h.scrollHeight - innerHeight) * 100) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('#burger'), menu = $('#menu');
  burger.addEventListener('click', () => {
    const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o);
  });
  $$('.menu a').forEach(a => a.addEventListener('click', () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); }));
  if (fine) addEventListener('pointermove', e => { glow.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`; }, { passive: true });

  /* ---------- reveal (staggered per parent) ---------- */
  $$('.cols3,.cols2,.tiers,.timeline,.faq,.stats,.spec,.answers').forEach(g =>
    $$(':scope > .reveal, :scope > *', g).forEach((el, i) => { el.classList.add('reveal'); el.style.setProperty('--d', i * 0.09 + 's'); }));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.matches('.stats')) counters(); }
  }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- counters ---------- */
  let counted = false;
  function counters() {
    if (counted) return; counted = true;
    $$('[data-count]').forEach(el => {
      const to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0;
      if (reduce || !to) return;
      const t0 = performance.now(), d = 1600;
      (function tick(t) {
        const p = Math.min((t - t0) / d, 1), e = 1 - Math.pow(1 - p, 4);
        el.textContent = (to * e).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  /* ---------- card spotlight + tilt ---------- */
  $$('.spot').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));

  /* ---------- magnetic buttons ---------- */
  if (fine && !reduce) $$('.magnetic').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .25}px)`;
    });
    b.addEventListener('pointerleave', () => b.style.transform = '');
  });

  /* ---------- architecture detail ---------- */
  const D = {
    idp: ['Identity & Access Management', 'Direct federation with Okta, Microsoft Entra ID (Azure AD), Google Workspace, SAML 2.0, OAuth2/OIDC and LDAP, with custom role mappings. RBAC goes down to document metadata tags and model-routing permissions.'],
    audit: ['Audit Logs & Token Quotas', 'Every prompt, retrieval citation and agent decision is logged. JSON structured logs, Prometheus metrics, OpenTelemetry tracing and syslog feed Splunk or Datadog. Logs are immutable for assurance reviews.'],
    parse: ['Context Extraction', 'Local parsing engines (Docling / PyMuPDF) extract tables, formulas and multi-column PDFs into structured Markdown chunks, with cryptographic document checksums before embedding generation.'],
    agents: ['Agent Blueprint Hub', 'Stateful, multi-step orchestration (ReAct / DAG) with code interpretation, SQL querying and multi-document synthesis. Tools run in ephemeral, non-root micro-VMs or isolated containers.'],
    guard: ['Prompt Guard', 'Sanitizes inputs and enforces strict context boundaries. A verification layer scores outputs against retrieved sources and suppresses or escalates low-confidence answers.'],
    vec: ['Vector & Metadata Database', 'Tenant-isolated PostgreSQL (pgvector), Qdrant or Milvus inside your dedicated subnet. Hybrid dense (HNSW) and sparse (BM25) search with cross-encoder re-ranking. No phone-home requests.'],
    inf: ['Private Inference Engines', 'vLLM (PagedAttention, continuous batching), TensorRT-LLM or Ollama on local NVIDIA/AMD GPUs, with FP8, INT4 and AWQ quantization. Context caches are flushed from VRAM after each agentic run.']
  };
  const det = $('#detail');
  if (det) {
  const show = k => { det.innerHTML = `<h4>${D[k][0]}</h4><p>${D[k][1]}</p>`; $$('.node').forEach(n => n.classList.toggle('on', n.dataset.k === k)); };
  $$('.node').forEach(n => n.addEventListener('click', () => show(n.dataset.k)));
  show('idp');
  }

  /* ---------- confidence threshold ---------- */
  const thr = $('#thr'), thrOut = $('#thr-out');
  if (thr) {
  const verdicts = () => {
    const t = +thr.value; thrOut.textContent = t + '%';
    $$('.answers li').forEach(li => {
      const ok = +li.dataset.s >= t;
      li.classList.toggle('pass', ok); li.classList.toggle('fail', !ok);
      $('.verdict', li).textContent = ok ? '✓ Released with citation' : '✕ Suppressed · routed to human reviewer';
    });
  };
  thr.addEventListener('input', verdicts); verdicts();
  }

  /* ---------- cost viz ---------- */
  const us = $('#users');
  if (us) {
  const usOut = $('#users-out'), ds = $('#cv-dot-s'), df = $('#cv-dot-f'), ls = $('#cv-lab-s');
  const cost = () => {
    const p = +us.value / 100; usOut.textContent = us.value + '%';
    const x = 40 + p * 420, ys = 210 - p * 170;
    ds.setAttribute('cx', x); ds.setAttribute('cy', ys); df.setAttribute('cx', x); df.setAttribute('cy', 170);
    ls.setAttribute('x', 456); ls.setAttribute('y', 36 - 4);
  };
  us.addEventListener('input', cost); cost();
  }


  /* ---------- ROI calculator ---------- */
  const calc = $('#calc');
  if (calc) {
    const usd = n => '$' + Math.round(n).toLocaleString('en-US');
    let mode = 'cloud_vpc';
    const g = id => document.getElementById(id);
    const run = () => {
      const users = +g('c-users').value, seat = +g('c-seat').value, q = +g('c-q').value;
      g('c-users-o').textContent = users.toLocaleString('en-US'); g('c-seat-o').textContent = '$' + seat; g('c-q-o').textContent = q + ' prompts';
      const base = users * seat * 12;
      const overage = q > 20 ? users * (q - 20) * 0.008 * 250 : 0;
      const saas = Math.round(base + overage);
      let lic = 36000;
      if (users > 5000) lic = 78000; else if (users > 2000) lic = 58000; else if (users > 800) lic = 48000;
      const conc = Math.max(1, Math.ceil(users * q / (8 * 60)));
      const nodes = Math.max(1, Math.ceil(conc / 25));
      const compute = mode === 'cloud_vpc' ? nodes * 1800 * 12 : nodes * 950 * 12;
      const ep = Math.round(lic + compute);
      const save = Math.max(0, saas - ep), pct = saas > 0 ? Math.round(save / saas * 100) : 0;
      g('o-pct').textContent = pct + '% cost reduction';
      g('o-save').textContent = usd(save); g('o-3y').textContent = usd(save * 3);
      g('o-pay').textContent = save > 0 ? (lic / save * 12).toFixed(1) + ' months' : 'not reached';
      g('o-saas').textContent = usd(saas) + ' / yr'; g('o-ep').textContent = usd(ep) + ' / yr';
      g('bar-ep').style.width = Math.min(100, Math.round(ep / saas * 100)) + '%';
      g('o-lic').textContent = usd(lic);
      g('o-gpu-l').textContent = 'Estimated GPU infrastructure (' + nodes + (nodes === 1 ? ' node' : ' nodes') + ')';
      g('o-gpu').textContent = usd(compute);
      calc.dataset.scenario = JSON.stringify({ users, seat, q, mode, saas, ep, save });
    };
    ['c-users', 'c-seat', 'c-q'].forEach(id => g(id).addEventListener('input', run));
    $$('.seg button', calc).forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode;
      $$('.seg button', calc).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      run();
    }));
    run();
    const modal = g('lead'), open = () => { modal.hidden = false; $('input', modal).focus(); }, close = () => { modal.hidden = true; };
    g('open-lead').addEventListener('click', open);
    g('lead-x').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    g('lead-form').addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      $$('[required]', e.target).forEach(i => { const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value)); i.classList.toggle('err', bad); if (bad) ok = false; });
      if (!ok) return;
      // TODO: POST { ...Object.fromEntries(new FormData(e.target)), scenario: calc.dataset.scenario } to your backend and generate the PDF server-side
      g('lead-ok').hidden = false;
    });
  }

  /* ---------- timeline progress ---------- */
  const tl = $('#timeline');
  if (tl) {
  const tlp = () => {
    const r = tl.getBoundingClientRect();
    tl.style.setProperty('--tl', Math.max(0, Math.min(1, (innerHeight * .8 - r.top) / (r.height + 40))) * 100 + '%');
  };
  addEventListener('scroll', tlp, { passive: true }); tlp();
  }

  /* ---------- form ---------- */
  $('#form')?.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('[required]', e.target).forEach(i => { const bad = !i.value.trim(); i.classList.toggle('err', bad); if (bad) ok = false; });
    if (!ok) return;
    // TODO: POST new FormData(e.target) to your own backend endpoint
    $('#form-ok').hidden = false; e.target.reset();
  });
  $('#yr').textContent = new Date().getFullYear();

  /* ---------- hero canvas: agents inside a perimeter, egress attempts blocked ---------- */
  const cv = $('#hero-canvas');
  if (cv) {
  const ctx = cv.getContext('2d');
  let W, H, cx, cy, R, dpr, mx = null, my = null, vis = true, raf;
  const AMB = '255,173,0', IRI = '11,58,143', OK = '15,174,126', BAD = '229,51,79';
  const nodes = [], packets = [], flashes = [], outer = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = innerWidth > 980;
    cx = wide ? W * 0.72 : W / 2; cy = H / 2;
    R = wide ? Math.min(H * 0.36, W * 0.24) : Math.min(W * 0.38, H * 0.4);
  }
  function init() {
    nodes.length = 0; outer.length = 0;
    const n = innerWidth > 980 ? 52 : 34;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.283), r = Math.sqrt(Math.random()) * R * 0.85;
      nodes.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: rnd(-.35, .35), vy: rnd(-.35, .35), s: rnd(1.4, 3), hot: Math.random() < .18 });
    }
    for (let i = 0; i < 26; i++) outer.push({ a: rnd(0, 6.283), r: rnd(1.25, 2.1), s: rnd(.0006, .0016) * (Math.random() < .5 ? -1 : 1), z: rnd(1, 2.2) });
  }
  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    // outer "external" dots
    outer.forEach(o => {
      o.a += o.s;
      const x = cx + Math.cos(o.a) * R * o.r * 1.1, y = cy + Math.sin(o.a) * R * o.r * 0.85;
      ctx.fillStyle = 'rgba(5,22,77,.22)'; ctx.beginPath(); ctx.arc(x, y, o.z, 0, 6.283); ctx.fill();
    });
    // perimeter glow + dashed ring
    const g = ctx.createRadialGradient(cx, cy, R * .6, cx, cy, R * 1.25);
    g.addColorStop(0, `rgba(${OK},0)`); g.addColorStop(.8, `rgba(${OK},.07)`); g.addColorStop(1, `rgba(${OK},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, 6.283); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(${OK},.65)`; ctx.setLineDash([8, 9]); ctx.lineDashOffset = -t * 0.012;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle = `rgba(${IRI},.2)`; ctx.beginPath(); ctx.arc(cx, cy, R * .6, 0, 6.283); ctx.stroke();
    ctx.font = '500 11px "JetBrains Mono",monospace'; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(${OK},.9)`;
    ctx.fillText('YOUR PERIMETER · ZERO EGRESS', cx, cy - R - 16);

    // nodes
    nodes.forEach(n => {
      if (mx !== null) { const dx = mx - n.x, dy = my - n.y, d = Math.hypot(dx, dy); if (d < 160 && d > 1) { n.vx += dx / d * .012; n.vy += dy / d * .012; } }
      n.x += n.vx; n.y += n.vy;
      const dx = n.x - cx, dy = n.y - cy, d = Math.hypot(dx, dy), lim = R * .93;
      if (d > lim) { const nx = dx / d, ny = dy / d, dot = n.vx * nx + n.vy * ny; n.vx -= 2 * dot * nx; n.vy -= 2 * dot * ny; n.x = cx + nx * lim; n.y = cy + ny * lim; }
      const sp = Math.hypot(n.vx, n.vy); if (sp > .6) { n.vx *= .96; n.vy *= .96; }
    });
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y), m = R * .36;
      if (d < m) { ctx.strokeStyle = `rgba(${IRI},${(1 - d / m) * .5})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    nodes.forEach(n => {
      const c = n.hot ? AMB : IRI;
      if (n.hot) { ctx.fillStyle = `rgba(${c},.18)`; ctx.beginPath(); ctx.arc(n.x, n.y, n.s * 4, 0, 6.283); ctx.fill(); }
      ctx.fillStyle = `rgba(${c},.95)`; ctx.beginPath(); ctx.arc(n.x, n.y, n.s, 0, 6.283); ctx.fill();
    });

    // egress attempts
    if (!reduce && Math.random() < .018) {
      const n = nodes[(Math.random() * nodes.length) | 0], a = Math.atan2(n.y - cy, n.x - cx);
      packets.push({ x: n.x, y: n.y, a, v: rnd(2.2, 3.4) });
    }
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.x += Math.cos(p.a) * p.v; p.y += Math.sin(p.a) * p.v;
      ctx.fillStyle = `rgba(${BAD},.95)`; ctx.shadowColor = `rgb(${BAD})`; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
      if (Math.hypot(p.x - cx, p.y - cy) >= R) { flashes.push({ a: p.a, life: 1 }); packets.splice(i, 1); }
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]; f.life -= .02;
      if (f.life <= 0) { flashes.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(${BAD},${f.life})`; ctx.lineWidth = 4 * f.life + 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, f.a - .22 * (2 - f.life), f.a + .22 * (2 - f.life)); ctx.stroke();
      ctx.font = '500 10px "JetBrains Mono",monospace'; ctx.fillStyle = `rgba(${BAD},${f.life})`;
      ctx.fillText('✕ egress blocked', cx + Math.cos(f.a) * (R + 56), cy + Math.sin(f.a) * (R + 22));
    }
    // lock core
    const pulse = 1 + Math.sin(t * .003) * .06;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = `rgb(${AMB})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgb(${AMB})`; ctx.beginPath(); ctx.roundRect(-10, -3, 20, 16, 3); ctx.fill();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -4, 6, Math.PI, 0); ctx.stroke(); ctx.restore();
  }
  function loop(t) { if (vis) frame(t); raf = requestAnimationFrame(loop); }
  size(); init();
  if (reduce) frame(0); else raf = requestAnimationFrame(loop);
  new ResizeObserver(() => { size(); init(); if (reduce) frame(0); }).observe(cv);
  new IntersectionObserver(e => { vis = e[0].isIntersecting; }).observe(cv);
  cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
  cv.addEventListener('pointerleave', () => { mx = my = null; });
  }
})();
