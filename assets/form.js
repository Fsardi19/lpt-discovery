/* ============================================================
   La Palma & El Tucán · Discovery — JS compartido
   Auto-save · Progress · Submit
   ============================================================ */

(() => {
  const SUPABASE_URL = window.LPT_SUPABASE_URL || '';
  const SUPABASE_KEY = window.LPT_SUPABASE_KEY || '';
  const SUPABASE_TABLE = 'discovery_responses';

  const area = document.querySelector('meta[name="discovery-area"]')?.content || 'desconocida';
  const recipient = document.querySelector('meta[name="discovery-recipient"]')?.content || '';
  const STORAGE_KEY = `lpt-discovery-${area}-v1`;

  const form = document.getElementById('discoveryForm');
  if (!form) return;

  const toast = document.getElementById('saveToast');

  function showToast(msg = 'Guardado', type = '') {
    if (!toast) return;
    toast.classList.remove('error', 'success');
    if (type) toast.classList.add(type);
    toast.firstElementChild.nextSibling
      ? (toast.lastChild.textContent = msg)
      : null;
    toast.innerHTML = `<span class="dot"></span>${msg}`;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // ---------- COLLECT FORM DATA ----------
  function collect() {
    const fd = new FormData(form);
    const data = {};
    for (const [k, v] of fd.entries()) {
      if (data[k] === undefined) data[k] = v;
      else if (Array.isArray(data[k])) data[k].push(v);
      else data[k] = [data[k], v];
    }
    data._area = area;
    data._recipient = recipient;
    data._meta = { savedAt: new Date().toISOString(), userAgent: navigator.userAgent };
    return data;
  }

  // ---------- LOCAL SAVE ----------
  function save() {
    try {
      const data = collect();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      showToast('Guardado');
      updateProgress();
    } catch (e) { console.error(e); }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.entries(data).forEach(([k, v]) => {
        if (k.startsWith('_')) return;
        const els = form.querySelectorAll(`[name="${k}"]`);
        if (!els.length) return;
        if (els[0].type === 'checkbox') {
          const vals = Array.isArray(v) ? v : [v];
          els.forEach(el => { el.checked = vals.includes(el.value); });
        } else if (els[0].type === 'radio') {
          els.forEach(el => { el.checked = el.value === v; });
        } else {
          els[0].value = v;
        }
      });
      updateProgress();
    } catch (e) { console.error(e); }
  }

  // ---------- PROGRESS ----------
  function updateProgress() {
    const fd = new FormData(form);
    const seen = new Set();
    for (const [k, v] of fd.entries()) {
      if (v && String(v).trim()) seen.add(k);
    }
    const uniqueNames = new Set();
    form.querySelectorAll('[name]').forEach(el => uniqueNames.add(el.name));
    const total = uniqueNames.size;
    const pct = total > 0 ? Math.min(100, Math.round((seen.size / total) * 100)) : 0;
    const pctEl = document.getElementById('pctNum');
    const barEl = document.getElementById('pbarFill');
    if (pctEl) pctEl.textContent = pct;
    if (barEl) barEl.style.width = pct + '%';
  }

  // ---------- TOC ACTIVE ----------
  const tocLinks = document.querySelectorAll('nav.toc a');
  const sections = document.querySelectorAll('section.q-section');
  if (sections.length) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id;
          tocLinks.forEach(l => l.classList.toggle('active', l.dataset.target === id));
        }
      });
    }, { rootMargin: '-30% 0px -65% 0px', threshold: 0 });
    sections.forEach(s => obs.observe(s));
  }

  // ---------- ACTIONS ----------
  const btnDownload = document.getElementById('btnDownload');
  const btnPdf = document.getElementById('btnPdf');
  const btnSend = document.getElementById('btnSend');

  btnDownload?.addEventListener('click', () => {
    const data = collect();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discovery-${area}-LPT-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  btnPdf?.addEventListener('click', () => window.print());

  btnSend?.addEventListener('click', async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      // Fallback mailto si no hay backend configurado
      const data = collect();
      const subject = encodeURIComponent(`Discovery LP&T · ${area} · ${data.firma_nombre || 'Sin firmar'}`);
      const body = encodeURIComponent(
        `Hola Felipe,\n\nAdjunto las respuestas del Discovery — área: ${area}.\n\n` +
        `- Firmado por: ${data.firma_nombre || '(sin firmar)'}\n` +
        `- Rol: ${data.firma_rol || ''}\n` +
        `- Fecha: ${data.firma_fecha || ''}\n` +
        `- Avance: ${document.getElementById('pctNum')?.textContent || '?'}%\n\n` +
        `(Adjuntar el JSON descargado para tener el detalle estructurado.)\n\nSaludos.`
      );
      window.location.href = `mailto:felipe@lapalmayeltucan.com?subject=${subject}&body=${body}`;
      return;
    }

    btnSend.disabled = true;
    btnSend.textContent = 'Enviando…';
    showToast('Enviando…');

    try {
      const data = collect();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          area: area,
          recipient: recipient,
          payload: data,
          user_agent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }

      showToast('Enviado a Felipe ✓', 'success');
      btnSend.textContent = '✓ Enviado';
      setTimeout(() => {
        if (confirm('Respuesta enviada con éxito. ¿Borrar el borrador local de este navegador?')) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }, 1200);
    } catch (err) {
      console.error(err);
      showToast('Error al enviar — intenta descargar JSON', 'error');
      btnSend.disabled = false;
      btnSend.textContent = '→ Reintentar envío';
    }
  });

  // ---------- INIT ----------
  form.addEventListener('input', save);
  form.addEventListener('change', save);

  // fecha por defecto en firma
  const firmaFecha = document.getElementById('firmaFecha');
  if (firmaFecha && !firmaFecha.value) {
    firmaFecha.value = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Insertar link de carpeta Drive si está configurado
  const driveLinkEl = document.getElementById('driveFolderLink');
  if (driveLinkEl && window.LPT_DRIVE_FOLDER) {
    driveLinkEl.href = window.LPT_DRIVE_FOLDER;
    driveLinkEl.textContent = 'Abrir carpeta Drive →';
    driveLinkEl.style.color = 'var(--green)';
  }

  load();
  updateProgress();
})();
