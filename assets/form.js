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

  // ---------- ARCHIVOS DINÁMICOS ----------
  const filesList = document.getElementById('filesList');
  const btnAddFile = document.getElementById('btnAddFile');
  let fileCounter = 0;

  function renderFileEntry(idx) {
    const n = String(idx).padStart(2, '0');
    const div = document.createElement('div');
    div.className = 'file-entry';
    div.dataset.idx = idx;
    div.innerHTML = `
      <div class="entry-num">ARCHIVO ${n}</div>
      <div class="file-grid">
        <div>
          <label>Nombre del archivo</label>
          <input type="text" name="file_${idx}_nombre" placeholder="Ej: Inventario_Cafe_Verde_2026.xlsx" />
        </div>
        <div>
          <label>Tipo</label>
          <select name="file_${idx}_tipo">
            <option value="">—</option>
            <option value="Excel">Excel / Sheets</option>
            <option value="Word">Word / Docs</option>
            <option value="PDF">PDF</option>
            <option value="Notion">Notion</option>
            <option value="App propia">App / sistema</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div>
          <label>Dónde vive</label>
          <select name="file_${idx}_ubicacion">
            <option value="">—</option>
            <option value="Drive compartido">Drive compartido</option>
            <option value="Mi Drive">Mi Drive</option>
            <option value="OneDrive">OneDrive</option>
            <option value="Local en mi PC">Local en mi PC</option>
            <option value="Servidor de red">Servidor de red</option>
            <option value="Email adjunto">Email (adjunto)</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div>
          <label>Frecuencia de uso</label>
          <select name="file_${idx}_frecuencia">
            <option value="">—</option>
            <option value="Diario">Diario</option>
            <option value="Semanal">Semanal</option>
            <option value="Quincenal">Quincenal</option>
            <option value="Mensual">Mensual</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Eventual">Eventual / sólo cuando se pide</option>
          </select>
        </div>
        <div>
          <label>Quién lo usa</label>
          <input type="text" name="file_${idx}_usuarios" placeholder="Tú, todo el equipo, gerencia, etc." />
        </div>
        <div>
          <label>Quién lo actualiza</label>
          <input type="text" name="file_${idx}_actualiza" placeholder="Nombre o rol." />
        </div>
      </div>
      <div class="entry-row">
        <label>¿Para qué sirve y cómo está estructurado?</label>
        <textarea name="file_${idx}_descripcion" placeholder="Ej: Lleva el kardex de café verde por lote. Una pestaña por mes. Columnas: lote, fecha entrada, kg, destino. Lo actualizo manualmente cada vez que sale un saco."></textarea>
      </div>
      <div class="entry-row">
        <label>Link directo (opcional, si lo puedes compartir)</label>
        <input type="text" name="file_${idx}_link" placeholder="URL de Drive / OneDrive si está disponible." />
      </div>
      <button type="button" class="btn-remove-file" data-idx="${idx}">× Eliminar este archivo</button>
    `;
    filesList?.appendChild(div);
    refreshFilesEmpty();
  }

  function refreshFilesEmpty() {
    if (!filesList) return;
    const empty = filesList.querySelector('.files-empty');
    const hasEntries = filesList.querySelectorAll('.file-entry').length > 0;
    if (hasEntries && empty) empty.remove();
    if (!hasEntries && !empty) {
      const e = document.createElement('div');
      e.className = 'files-empty';
      e.textContent = 'Aún no hay archivos listados. Click en "+ Agregar archivo" para empezar.';
      filesList.appendChild(e);
    }
  }

  if (filesList) refreshFilesEmpty();

  btnAddFile?.addEventListener('click', () => {
    fileCounter++;
    renderFileEntry(fileCounter);
    save();
  });

  filesList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-file');
    if (!btn) return;
    if (!confirm('¿Eliminar este archivo de la lista?')) return;
    btn.closest('.file-entry')?.remove();
    refreshFilesEmpty();
    save();
  });

  // Restaurar entradas guardadas (lee localStorage para detectar el max idx)
  function restoreFiles() {
    if (!filesList) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const idxs = new Set();
      Object.keys(data).forEach(k => {
        const m = k.match(/^file_(\d+)_/);
        if (m) idxs.add(parseInt(m[1], 10));
      });
      const sorted = Array.from(idxs).sort((a, b) => a - b);
      sorted.forEach(idx => {
        renderFileEntry(idx);
        if (idx > fileCounter) fileCounter = idx;
      });
    } catch (e) { console.error(e); }
  }

  restoreFiles();

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
