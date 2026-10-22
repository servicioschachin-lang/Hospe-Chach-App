import { DB, saveDB, logAudit, genId } from './db.js';
import { roomById, resById, getGuestName, getGuestSnap, isRoomFreeForReservationDates, reservationsBlockingOnDate, reservationMatchesListHorizon } from './lookup.js';
import { getRoomRealStatus } from './room-states.js';
import { today, fmtMoney, fmtDate, addDays, addMonths, nightsBetween, escapeAttr, statusBadge, pad3, applyCardFeeToPaymentRecord, cardFeeHintHtml } from './utils.js';
import { channelLabel, channelUsesOtaPricing, effectiveNightRateForReservation, reservationSummaryForAudit, reservationChangeDetails } from './helpers.js';
import { icn } from './icons.js';
import { guestInlineForm, readGuestForm } from './guests.js';

export let resFilter = 'all';
const RES_FILTER_LIST = ['all','pendiente','confirmada','cancelada','finalizada'];
const STATUS_SEL = ['pendiente','confirmada'];
// CHANNELS moved to DB

export function setResFilter(f){ resFilter = f; render_reservations(); }
export function setResListHorizon(months){ window._resListHorizon = months; render_reservations(); }
export function setAvailQueryDateFromInput(){
  const el = document.getElementById('avail-query-date');
  window._availQueryDate = (el && el.value) ? el.value : today();
  render_reservations();
}

export function exportAvailabilityCatalog(){
  const el = document.getElementById('avail-query-date');
  const qDate = (el && el.value) ? el.value : ((window._availQueryDate) ? window._availQueryDate : today());
  const free = [];
  for (const rm of DB.rooms) {
    if (getRoomRealStatus(rm, qDate) === 'disponible') free.push(rm);
  }
  if (!free.length) {
    window.toast('No hay habitaciones disponibles en esa fecha para armar el catálogo.', 'info');
    return;
  }
  free.sort((a, b) => {
    const na = parseInt(String(a.number), 10), nb = parseInt(String(b.number), 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    return String(a.number).localeCompare(String(b.number), 'es', {numeric: true});
  });

  window.openModal(`
    <div class="modal-header"><h3>Seleccionar habitaciones a incluir</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>
    <div class="modal-body">
      <div id="catalog-room-selection" style="max-height:300px;overflow-y:auto">
        ${free.map(r => `
          <label style="display:block;margin-bottom:8px">
            <input type="checkbox" class="cat-room-sel" value="${r.id}" checked> Habitación ${r.number} (${r.type})
          </label>
        `).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="generateSelectedCatalog('${qDate}')">Generar Catálogo</button>
    </div>
  `, 'modal-sm');
}

export function generateSelectedCatalog(qDate){
  const selectedIds = Array.from(document.querySelectorAll('.cat-room-sel:checked')).map(cb => cb.value);
  if (selectedIds.length === 0) {
    window.toast('Selecciona al menos una habitación', 'error');
    return;
  }
  
  const free = DB.rooms.filter(rm => selectedIds.includes(rm.id));
  
  const hName = "Hospe Chach App";
  const hAddr = (window.StorageService.getSync('hotelos_address') || '').trim();
  const hPhone = (window.StorageService.getSync('hotelos_phone') || '').trim();
  const logo = window.getReceiptLogoSrc ? window.getReceiptLogoSrc() : (window.StorageService.getSync('hotelos_logo_recibos') || '').trim();
  const genAt = new Date();
  let genStr;
  try { genStr = genAt.toLocaleString('es-GT', {timeZone: 'America/Guatemala', dateStyle: 'long', timeStyle: 'short'}); }
  catch(e){ genStr = genAt.toLocaleString('es-GT'); }
  const nFree = free.length;
  const parts = [];
  parts.push('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Catálogo — ' + escapeAttr(hName) + '</title>');
  parts.push('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap">');
  parts.push('<style>');
  parts.push(':root{--gold:#8B6914;--gold-light:#C8960C;--gold-dim:#A07820;--green:#2E7D32;--green-dim:#C8E6C7;--text:#1A1208;--text2:#4A3E28;--text3:#8A7A60;--surface:#FAF7F3;--surface2:#F2EDE5;--border:#D8D0C4;--cream:#F5ECD7;--deep:#2C1810;}');
  parts.push('@page{size:A4;margin:14mm;}');
  parts.push('@media print{*{ -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }body{margin:0;padding:0}.doc{max-width:none;padding:0}.no-print{display:none!important}.room{box-shadow:none!important;border-color:#D8D0C4!important}}');
  parts.push('* {box-sizing:border-box;}body{margin:0;padding:28px 24px 40px;background:var(--surface);color:var(--text);font-family:"DM Sans",system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.55;-webkit-font-smoothing:antialiased;}.doc{max-width:760px;margin:0 auto;}.hero{position:relative;border-radius:16px;overflow:hidden;margin-bottom:22px;border:1px solid var(--border);box-shadow:0 16px 48px rgba(44,24,16,0.08);}.hero-bg{position:absolute;inset:0;background:linear-gradient(135deg,#F5ECD7 0%,#EDE0C8 45%,#E8D8BC 100%);}.hero-bg::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 70% 50% at 100% 0%,rgba(46,125,50,0.09),transparent 55%),radial-gradient(ellipse 50% 40% at 0% 100%,rgba(139,105,20,0.12),transparent 50%);pointer-events:none;}.hero-accent{position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,var(--green) 0%,var(--gold) 100%);}.hero-inner{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;padding:26px 28px 26px 32px;}.hero-logo{width:100%;max-width:1250px;margin:0 auto;display:flex;align-items:center;justify-content:center;}.hero-logo img{width:650px;height:200px;object-fit:contain;object-position:center;max-width:none;}.hero-text{flex:1;width:100%;text-align:center;}.hero-kicker{display:inline-block;font-size:0.65rem;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--green);background:var(--green-dim);padding:5px 12px;border-radius:999px;margin-bottom:10px;}.hero h1{font-family:"Playfair Display",Georgia,serif;font-size:1.75rem;font-weight:700;color:var(--gold);margin:0 0 6px;line-height:1.2;letter-spacing:0.02em;}.hero-tagline{font-size:0.88rem;color:var(--text2);margin:0;max-width:36em;}.summary-bar{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;padding:14px 18px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;margin-bottom:20px;}.meta-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px;}.meta-card{padding:12px;background:#fff;border:1px solid var(--border);border-radius:8px;}.meta-label{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text3);margin-bottom:2px;}.meta-value{font-weight:500;}.rooms{list-style:none;padding:0;display:grid;grid-template-columns:1fr;gap:20px;}.room{background:#fff;border:1px solid var(--border);border-radius:12px;overflow:hidden;}.room-h{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;}.room-num{font-size:1.25rem;font-weight:700;color:var(--gold);}.room-tags{display:flex;gap:6px;}.tag{font-size:0.7rem;background:var(--surface2);padding:2px 8px;border-radius:4px;color:var(--text2);}.room-body{padding:16px 20px;}.price-row{display:flex;justify-content:space-between;margin-bottom:10px;}.price-item{display:flex;flex-direction:column;}.lbl{font-size:0.7rem;color:var(--text3);}.val{font-weight:600;}.val-sub{font-size:0.85rem;color:var(--text2);}.desc{font-size:0.85rem;margin:10px 0 0;color:var(--text2);}.photos{display:flex;gap:10px;margin-top:12px;overflow-x:auto;}.ph{width:120px;flex-shrink:0;}.ph img{width:100%;height:80px;object-fit:cover;border-radius:6px;}.ph-cap{font-size:0.65rem;text-align:center;margin-top:4px;color:var(--text3);}.foot{margin-top:30px;padding-top:20px;border-top:2px solid var(--gold-light);text-align:center;}.note{font-size:0.75rem;color:var(--text3);max-width:50em;margin:0 auto;}.brand-foot{font-weight:600;margin-top:10px;color:var(--gold);}');
  parts.push('</style></head><body><div class="doc">');
  parts.push('<header class="hero"><div class="hero-bg"></div><div class="hero-accent"></div><div class="hero-inner">');
  if (logo) parts.push('<div class="hero-logo"><img src="' + escapeAttr(logo) + '" alt=""></div>');
  parts.push('<div class="hero-text"><span class="hero-kicker">Disponibilidad · cotización</span>');
  parts.push('<p class="hero-tagline">Catálogo de habitaciones seleccionadas para la noche indicada.</p>');
  parts.push('</div></div></header>');
  parts.push('<div class="summary-bar"><span class="pill">' + nFree + ' seleccionada' + (nFree !== 1 ? 's' : '') + '</span>');
  parts.push('<span>Para la noche del <strong>' + escapeAttr(fmtDate(qDate)) + '</strong>.</span></div>');
  parts.push('<div class="meta-grid">');
  parts.push('<div class="meta-card"><div class="meta-label">Noche consultada</div><div class="meta-value">' + escapeAttr(fmtDate(qDate)) + '</div></div>');
  parts.push('<div class="meta-card"><div class="meta-label">Documento generado</div><div class="meta-value">' + escapeAttr(genStr) + '</div><div style="font-size:0.75rem;color:var(--text3);margin-top:4px">Zona horaria: América/Guatemala</div></div>');
  parts.push('</div>');
  parts.push('<h2 class="section-title">Habitaciones seleccionadas</h2><ul class="rooms">');
  for (const r of free) {
    const photos = window.getRoomPhotos(r);
    parts.push('<li class="room"><div class="room-h"><div class="room-num-wrap">');
    parts.push('<span class="room-num">' + escapeAttr(r.number) + '</span>');
    parts.push('<div class="room-tags"><span class="tag">' + escapeAttr(String(r.type || '').toUpperCase()) + '</span>');
    parts.push('<span class="tag">Piso ' + escapeAttr(String(r.floor)) + '</span><span class="tag">' + escapeAttr(String(r.capacity)) + ' pers.</span></div></div></div>');
    parts.push('<div class="room-body"><div class="price-row">');
    parts.push('<div class="price-item"><span class="lbl">Precio por noche</span><span class="val">' + escapeAttr(fmtMoney(r.price)) + '</span></div>');
    parts.push('<div class="price-item"><span class="lbl">Depósito de llave</span><span class="val-sub">' + escapeAttr(fmtMoney(r.keyDeposit || 0)) + '</span></div></div>');
    if (r.description) parts.push('<p class="desc">' + escapeAttr(r.description) + '</p>');
    if (photos.length) {
      parts.push('<div class="photos">');
      for (let p = 0; p < photos.length; p++) {
        parts.push('<div class="ph"><img src="' + escapeAttr(photos[p]) + '" alt="' + escapeAttr('Habitación ' + r.number + ' · ' + (p + 1) + ' / ' + photos.length) + '">');
        parts.push('<div class="ph-cap">Foto ' + (p + 1) + ' / ' + photos.length + '</div></div>');
      }
      parts.push('</div>');
    }
    parts.push('</div></li>');
  }
  parts.push('</ul><footer class="foot">');
  parts.push('<p class="note">Los precios son referenciales. La disponibilidad definitiva, políticas de cancelación, servicios incluidos y cargos adicionales deben confirmarse directamente con el establecimiento.</p>');
  parts.push('<p class="brand-foot">' + escapeAttr(hName) + '</p></footer></div>');
  parts.push(`<script>function _catPrint(){window.print();}window.onload=function(){if(document.fonts&&document.fonts.ready)document.fonts.ready.then(_catPrint).catch(_catPrint);else _catPrint();};<\/script></body></html>`);
  
  const w = window.open('', '_blank');
  if (!w) { window.toast('Permita ventanas emergentes para generar el catálogo.', 'error'); return; }
  w.document.open();
  w.document.write(parts.join(''));
  w.document.close();
  closeModal();
}

function resFilterBtns() {
  return RES_FILTER_LIST.map(f =>
    `<button class="filter-btn ${resFilter === f ? 'active' : ''}" onclick="setResFilter('${f}')">`
    + `${f === 'all' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}</button>`
  ).join('');
}

function availCardHtml(t, qDate) {
  const avFree = [], avBusy = [];
  for (const rma of DB.rooms) {
    const rs = getRoomRealStatus(rma, qDate);
    if (rs === 'disponible') avFree.push(rma);
    else avBusy.push({room: rma, status: rs});
  }
  const blockOnQ = reservationsBlockingOnDate(qDate);
  let blockRows = '';
  for (const br of blockOnQ) {
    const brm = roomById(br.roomId);
    blockRows += `<tr><td class="fw-600">${brm ? brm.number : '—'}</td><td>${getGuestName(br)}</td><td>${fmtDate(br.checkIn)} → ${fmtDate(br.checkOut)}</td>`
      + `<td>${channelLabel(br.channel)}</td><td>${window.statusBadge(br.status)}</td>`
      + `<td><button class="btn btn-sm btn-secondary" onclick="viewResDetail('${br.id}')">Ver</button></td></tr>`;
  }
  return `<div class="card" style="margin-bottom:20px;border:1px solid var(--green-dim)">`
    + `<div class="card-header"><h4>Disponibilidad en fecha (evitar overbooking)</h4></div>`
    + `<div style="padding:14px">`
    + `<div class="form-row" style="margin-bottom:12px">`
    + `<div class="form-group" style="margin-bottom:0"><label>Noche a consultar</label>`
    + `<input type="date" id="avail-query-date" value="${qDate}" onchange="setAvailQueryDateFromInput()"></div>`
    + `<div style="display:flex;align-items:flex-end;gap:8px;padding-bottom:2px;flex-wrap:wrap">`
    + `<button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('avail-query-date').value='${addMonths(t, 1)}';setAvailQueryDateFromInput()">+1 mes</button>`
    + `<button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('avail-query-date').value='${addMonths(t, 3)}';setAvailQueryDateFromInput()">+3 meses</button>`
    + `<button type="button" class="btn btn-sm btn-primary" onclick="exportAvailabilityCatalog()" title="Abre una ventana lista para imprimir o guardar como PDF">Generar catálogo (PDF)</button>`
    + `</div></div>`
    + `<p style="font-size:0.78rem;color:var(--text3);margin-bottom:10px">Para la noche del <strong>${fmtDate(qDate)}</strong>: ${avFree.length} habitación(es) libres de ${DB.rooms.length} (considerando reservas confirmadas/pendientes y huéspedes en casa).</p>`
    + `<div style="margin-bottom:12px"><span style="font-size:0.72rem;color:var(--green);font-weight:600">DISPONIBLE: </span>`
    + (avFree.length ? avFree.map(x => `<span style="display:inline-block;background:var(--green-dim);color:var(--green);padding:4px 10px;border-radius:6px;font-size:0.82rem;font-weight:600;margin:3px">${x.number}</span>`).join('') : '<span style="color:var(--text3);font-size:0.85rem">Ninguna</span>')
    + `</div>`
    + (avBusy.length ? `<div style="font-size:0.72rem;color:var(--text3);margin-bottom:6px">Ocupadas / reservadas / fuera de servicio esa noche:</div><ul style="font-size:0.8rem;margin:0 0 10px 18px;color:var(--text2)">` + avBusy.map(b => `<li>Hab. ${b.room.number} — ${statusLabel(b.status)}</li>`).join('') + `</ul>` : '')
    + `<div style="font-size:0.72rem;color:var(--text3);letter-spacing:1px;margin:12px 0 6px;font-weight:600">Reservas que usan esa noche</div>`
    + `<table><thead><tr><th>Hab.</th><th>Huésped</th><th>Estancia</th><th>Canal</th><th>Estado</th><th></th></tr></thead>`
    + `<tbody>` + (blockRows || `<tr><td colspan="6"><span style="color:var(--text3);font-size:0.85rem">Ninguna reserva bloquea esta fecha.</span></td></tr>`)
    + `</tbody></table></div></div>`;
}

function horizonBtnsHtml() {
  const h = window._resListHorizon;
  return `<button class="filter-btn ${h === 0 ? 'active' : ''}" onclick="setResListHorizon(0)">Todas las fechas</button>`
    + `<button class="filter-btn ${h === 1 ? 'active' : ''}" onclick="setResListHorizon(1)">Próx. 1 mes</button>`
    + `<button class="filter-btn ${h === 3 ? 'active' : ''}" onclick="setResListHorizon(3)">Próx. 3 meses</button>`;
}

export function render_reservations(){
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="openResModal(null)">+ Nueva Reserva</button>`;
  const t = today();
  if (window._resListHorizon === undefined) window._resListHorizon = 0;
  if (!window._availQueryDate) window._availQueryDate = addMonths(t, 3);
  const qDate = window._availQueryDate;
  const availCard = availCardHtml(t, qDate);
  const upcoming = DB.reservations
    .filter(r => (r.status === 'confirmada' || r.status === 'pendiente') && r.checkIn >= t)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.id.localeCompare(b.id));
  let upcomingFiltered = upcoming;
  if (window._resListHorizon > 0) {
    upcomingFiltered = upcoming.filter(ru => reservationMatchesListHorizon(ru, t, window._resListHorizon));
  }
  let upRows = '';
  for (const ur of upcomingFiltered) {
    const urm = roomById(ur.roomId);
    const uToday = ur.checkIn === t;
    upRows += `<tr${uToday ? ' style="background:rgba(201,168,76,0.08)"' : ''}>`
      + `<td class="fw-600">${fmtDate(ur.checkIn)}${uToday ? ' <span class="badge badge-gold">HOY</span>' : ''}</td>`
      + `<td>${getGuestName(ur)}</td>`
      + `<td>${urm ? urm.number : '—'}</td>`
      + `<td><span style="font-size:0.78rem;color:var(--text2)">${channelLabel(ur.channel)}</span></td>`
      + `<td>${window.statusBadge(ur.status)}</td>`
      + `<td><button class="btn btn-sm btn-secondary" onclick="viewResDetail('${ur.id}')">Ver</button></td></tr>`;
  }
  const upCard = `<div class="card" style="margin-bottom:20px;border:1px solid var(--gold-dim)">`
    + `<div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M3 8h14v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2-5v3m10-3v3M3 7V5a1 1 0 011-1h12a1 1 0 011 1v2"/></svg> Próximos ingresos (orden cronológico)</h4></div>`
    + `<table><thead><tr><th>Check-in</th><th>Huésped</th><th>Hab.</th><th>Canal</th><th>Estado</th><th></th></tr></thead>`
    + `<tbody>` + (upRows || `<tr><td colspan="6"><div class="empty-state" style="padding:20px"><p>No hay ingresos futuros programados</p></div></td></tr>`) + `</tbody></table></div>`;
  let list = DB.reservations.slice();
  list.sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.id.localeCompare(b.id));
  let rows = '';
  for (const r of list) {
    if (window._resListHorizon > 0 && !reservationMatchesListHorizon(r, t, window._resListHorizon)) continue;
    if (resFilter !== 'all' && r.status !== resFilter) continue;
    const rm = roomById(r.roomId);
    const nights = nightsBetween(r.checkIn, r.checkOut);
    const isToday = r.checkIn === today();
    rows += `<tr${isToday ? ' style="background:rgba(201,168,76,0.07)"' : ''} >`
      + `<td><span style="font-family:'DM Mono','Courier New',monospace;color:var(--gold)">${r.id}</span></td>`
      + `<td class="fw-600">${getGuestName(r)}${isToday ? ' <span style="color:var(--gold);font-size:0.7rem">HOY</span>' : ''}</td>`
      + `<td>${rm ? rm.number : '—'} <span style="color:var(--text3);font-size:0.75rem">${rm ? '(' + rm.type + ')' : ''}</span></td>`
      + `<td><span style="font-size:0.8rem">${channelLabel(r.channel)}</span></td>`
      + `<td>${fmtDate(r.checkIn)}</td>`
      + `<td>${fmtDate(r.checkOut)}</td>`
      + `<td>${nights}n</td>`
      + `<td class="fw-600">${fmtMoney(r.totalEstimated)}</td>`
      + `<td>${window.statusBadge(r.status)}</td>`
      + `<td><div class="flex gap-2">`
      + `<button class="btn btn-sm btn-secondary" onclick="viewResDetail('${r.id}')">Ver</button>`
      + ((r.status === 'pendiente' || r.status === 'confirmada') ? `<button class="btn btn-sm btn-danger" onclick="cancelRes('${r.id}')">${icn('close')}</button>` : '')
      + `</div></td></tr>`;
  }
  document.getElementById('page-content').innerHTML =
    availCard
    + upCard
    + `<div style="margin-bottom:12px;font-size:0.78rem;color:var(--text3)">Filtrar listas por horizonte (desde hoy):</div>`
    + `<div class="filter-bar" style="margin-bottom:16px">${horizonBtnsHtml()}</div>`
    + `<div class="filter-bar">${resFilterBtns()}</div>`
    + `<div class="card"><table>`
    + `<thead><tr><th>ID</th><th>Huésped</th><th>Hab.</th><th>Canal</th><th>Check-in</th><th>Check-out</th><th>Noches</th><th>Total</th><th>Estado</th><th></th></tr></thead>`
    + `<tbody>` + (rows || `<tr><td colspan="10"><div class="empty-state"><div class="icon"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M7 3h6a1 1 0 011 1v1H6V4a1 1 0 011-1zM4 5h12v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"/></svg></div><p>No hay reservas</p></div></td></tr>`) + `</tbody>`
    + `</table></div>`;
}

export function readReservationNightPriceFromForm(){
  const npEl = document.getElementById('res-night-price');
  const np = npEl ? parseFloat(npEl.value) : NaN;
  if (!isNaN(np) && np > 0) return np;
  return null;
}

export function reservationRoomSelectHTML(ignoreResId, selectedRoomId, checkIn, checkOut){
  let html = `<option value="">— Seleccionar —</option>`;
  for (const rm of DB.rooms) {
    if (!rm.active) continue; // Solo mostrar activas
    const free = !checkIn || !checkOut || checkOut <= checkIn || isRoomFreeForReservationDates(rm.id, checkIn, checkOut, ignoreResId);
    
    // Si no está libre Y no es la seleccionada, ocultar
    if (!free && selectedRoomId !== rm.id) continue;
    
    html += `<option value="${rm.id}" ${selectedRoomId === rm.id ? 'selected' : ''}>`
      + `${rm.number} - ${rm.type} ${fmtMoney(rm.price)}/n ${free ? '' : ' (Ocupada)'}</option>`;
  }
  return html;
}

export function syncResRoomSelectOptions(){
  const sel = document.getElementById('res-room'); if (!sel) return;
  const ci = document.getElementById('res-checkin') && document.getElementById('res-checkin').value;
  const co = document.getElementById('res-checkout') && document.getElementById('res-checkout').value;
  const prev = sel.value;
  const ign = window._editingReservationId || '';
  sel.innerHTML = reservationRoomSelectHTML(ign, prev, ci, co);
  if (prev) {
    const okSel = Array.from(sel.options).some(o => o.value === prev);
    if (!okSel) sel.value = '';
  }
}

function channelOptsHtml(ch) {
  const channels = DB.channels || [];
  if (!channels.length) return `<option value="directo">Directo / Walk-in</option>`;
  return channels.map(c => `<option value="${c.id}" ${ch === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
}

function resStatusOptsHtml(r) {
  const opts = [...STATUS_SEL];
  if (r && r.status && !opts.includes(r.status)) opts.push(r.status);
  return opts.map(s => `<option value="${s}" ${r && r.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('');
}

export function checkinFromReservation(id){
  if (window.processCheckin) return window.processCheckin(id);
  import('./reception.js').then(m => m.processCheckin(id)).catch(()=> window.toast('No se pudo abrir check-in','error'));
}
window.checkinFromReservation = checkinFromReservation;

export function openResModal(id){
  const r = id ? resById(id) : null;
  window._editingReservationId = r ? r.id : '';
  const snap = r ? getGuestSnap(r) : null;
  const ci0 = r ? r.checkIn : today();
  const co0 = r ? r.checkOut : addDays(today(), 1);
  const roomOpts = reservationRoomSelectHTML(r ? r.id : '', r ? r.roomId : '', ci0, co0);
  const ch = r && r.channel ? r.channel : 'directo';
  window.openModal(
    `<div class="modal-header"><h3>${r ? 'Editar Reserva' : 'Nueva Reserva'}</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + guestInlineForm('res-g', snap)
    + `<div class="form-group"><label>Habitación</label><select id="res-room" onchange="updateResTotal()">${roomOpts}</select>`
    + `<div style="font-size:0.72rem;color:var(--text3);margin-top:6px">Solo habitaciones libres en el rango check-in → check-out (sin solapar reservas ni huéspedes activos).</div></div>`
    + `<div class="form-group"><label>Canal de reserva</label><select id="res-channel" onchange="syncResOtaPriceUI();updateResTotal()">${channelOptsHtml(ch)}</select><div style="font-size:0.72rem;color:var(--text3);margin-top:6px">Indica si la reserva viene de Booking, Airbnb, etc.</div></div>`
    + `<div class="form-group" id="res-ota-wrap" style="display:none"><label>Precio/noche en plataforma (Q)</label>`
    + `<input type="number" id="res-channel-night" min="0" step="0.01" value="${r && r.channelNightPrice != null && r.channelNightPrice !== '' ? String(r.channelNightPrice) : ''}" oninput="updateResTotal()" placeholder="Tarifa real por noche">`
    + `<div style="font-size:0.72rem;color:var(--text3);margin-top:6px">Lo que aplica para cobrar al huésped (puede diferir de la tarifa de la habitación).</div></div>`
    + `<div class="form-group"><label>Tarifa por noche a cobrar (Q)</label>`
    + `<input type="number" id="res-night-price" min="0" step="0.01" value="${r && r.nightPrice != null && r.nightPrice !== '' ? String(r.nightPrice) : ''}" oninput="updateResTotal()" placeholder="Opcional. Si se deja vacío usa la tarifa automática"></div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Check-in</label><input type="date" id="res-checkin" value="${ci0}" oninput="updateResTotal()"></div>`
    + `<div class="form-group"><label>Check-out</label><input type="date" id="res-checkout" value="${co0}" oninput="updateResTotal()"></div>`
    + `</div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>N° Personas</label><input type="number" id="res-persons" value="${r ? r.persons : 1}" min="1"></div>`
    + `<div class="form-group"><label>Estado</label><select id="res-status">${resStatusOptsHtml(r)}</select></div>`
    + `</div>`
    + `<div class="form-group"><label>Notas</label><textarea id="res-notes" rows="2">${r ? r.notes : ''}</textarea></div>`
    + `<div id="res-total-preview" style="background:var(--dark3);border-radius:8px;padding:12px;font-size:0.85rem"></div>`
    + `<div id="res-immediate-pay" style="display:none;margin-top:12px;padding:12px;background:rgba(201,168,76,0.08);border:1px solid var(--gold-dim);border-radius:8px">`
    + `<h4 style="margin:0 0 4px;font-size:0.88rem;color:var(--gold)">Cobro inmediato — Check-in hoy</h4>`
    + `<p style="font-size:0.72rem;color:var(--text3);margin:0 0 10px">La fecha de check-in es <strong>hoy</strong> (${fmtDate(today())}). Se registrará el cobro y el depósito de llave al guardar.</p>`
    + `<div class="form-row">`
    + `<div class="form-group" style="margin-bottom:0"><label>Monto a cobrar</label><select id="res-pay-percent" onchange="updateResTotal()"><option value="1">100% — Total completo</option><option value="0.5">50% — Anticipo</option></select></div>`
    + `<div class="form-group" style="margin-bottom:0"><label>Forma de pago</label><select id="res-paytype" onchange="updateResTotal()"><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select></div>`
    + `</div>`
    + `<div id="res-pay-preview" style="font-size:0.85rem;margin-top:10px"></div>`
    + `<div id="res-pay-feehint"></div>`
    + `</div>`
    + `</div>`
    + `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveReservation('${r ? r.id : ''}')">Guardar</button></div>`,
    'modal-lg'
  );
  setTimeout(() => { syncResOtaPriceUI(); updateResTotal(); }, 50);
}

export function syncResOtaPriceUI(){
  const ch = document.getElementById('res-channel');
  const wrap = document.getElementById('res-ota-wrap');
  if (!ch || !wrap) return;
  wrap.style.display = channelUsesOtaPricing(ch.value) ? 'block' : 'none';
}

export function updateResTotal(){
  syncResRoomSelectOptions();
  const roomId = document.getElementById('res-room') && document.getElementById('res-room').value;
  const ci = document.getElementById('res-checkin') && document.getElementById('res-checkin').value;
  const co = document.getElementById('res-checkout') && document.getElementById('res-checkout').value;
  const box = document.getElementById('res-total-preview'); if (!box) return;
  // Mostrar/ocultar cobro inmediato si es para hoy
  const immWrap = document.getElementById('res-immediate-pay');
  const isTodayCheckin = ci === today();
  if (immWrap) immWrap.style.display = isTodayCheckin ? 'block' : 'none';
  if (!roomId || !ci || !co || co <= ci) {
    box.innerHTML = '';
    const pp = document.getElementById('res-pay-preview'); if (pp) pp.innerHTML = '';
    const fh = document.getElementById('res-pay-feehint'); if (fh) fh.innerHTML = '';
    return;
  }
  const rm = roomById(roomId); if (!rm) { box.innerHTML = ''; return; }
  const nights = nightsBetween(ci, co);
  const chEl = document.getElementById('res-channel');
  const ch = chEl ? chEl.value : 'directo';
  const cnpEl = document.getElementById('res-channel-night');
  const cnp = parseFloat(cnpEl && cnpEl.value);
  const cnpVal = isNaN(cnp) ? 0 : cnp;
  const manualNight = readReservationNightPriceFromForm();
  const eff = (manualNight != null) ? manualNight : effectiveNightRateForReservation(rm, ch, cnpVal > 0 ? cnpVal : null);
  const total = nights * eff;
  const kd = rm.keyDeposit || 0;
  let html = `<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">`
    + `<span>${nights} noches × ${fmtMoney(eff)} = <strong>${fmtMoney(total)}</strong></span>`
    + `<span><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M12 8a4 4 0 11-7.5-2.5L1 9V6l3-3V1h3l2 2h2l2 2v2zM8 8v1"/></svg> Depósito llave: <strong class="text-gold">${fmtMoney(kd)}</strong></span>`
    + `</div>`;
  if (channelUsesOtaPricing(ch) && cnpVal > 0 && Math.abs(eff - parseFloat(rm.price)) > 0.001)
    html += `<div style="margin-top:8px;font-size:0.75rem;color:var(--text3)">Tarifa habitación (referencia): ${fmtMoney(rm.price)}/n</div>`;
  else if (channelUsesOtaPricing(ch) && (!cnpVal || cnpVal <= 0))
    html += `<div style="margin-top:8px;font-size:0.75rem;color:var(--orange)">Ingrese el precio/noche en la plataforma para calcular el total a cobrar.</div>`;
  if (manualNight != null) html += `<div style="margin-top:8px;font-size:0.75rem;color:var(--gold)">Tarifa manual aplicada: ${fmtMoney(manualNight)}/n</div>`;
  box.innerHTML = html;
  // Actualizar preview de cobro inmediato
  if (isTodayCheckin) {
    const percEl = document.getElementById('res-pay-percent');
    const payTypeEl = document.getElementById('res-paytype');
    const perc = percEl ? parseFloat(percEl.value) : 1;
    const payType = payTypeEl ? payTypeEl.value : 'efectivo';
    const charge = Math.round(total * perc * 100) / 100;
    const pp = document.getElementById('res-pay-preview');
    if (pp) {
      pp.innerHTML = `<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">`
        + `<span>${perc===0.5?'50% anticipo':'100% total'}: <strong class="text-gold">${fmtMoney(charge)}</strong></span>`
        + `<span>Depósito llave: <strong>${fmtMoney(kd)}</strong></span>`
        + `<span style="color:var(--text3)">Total a cobrar ahora: <strong>${fmtMoney(charge + kd)}</strong> (${payType})</span>`
        + `</div>`;
    }
    const fh = document.getElementById('res-pay-feehint');
    if (fh) fh.innerHTML = cardFeeHintHtml(charge, payType);
  }
}

export function saveReservation(id){
  const before = id ? JSON.parse(JSON.stringify(resById(id) || null)) : null;
  const guestData = readGuestForm('res-g');
  if (!guestData) { window.toast('Nombre del huésped requerido', 'error'); return; }
  const roomId = document.getElementById('res-room').value;
  const checkIn = document.getElementById('res-checkin').value;
  const checkOut = document.getElementById('res-checkout').value;
  if (!roomId || !checkIn || !checkOut) { window.toast('Completa todos los campos', 'error'); return; }
  if (checkOut <= checkIn) { window.toast('Check-out debe ser después del check-in', 'error'); return; }
  if (!isRoomFreeForReservationDates(roomId, checkIn, checkOut, id || '')) {
    const alt = DB.rooms.filter(rm => rm.active && isRoomFreeForReservationDates(rm.id, checkIn, checkOut, id || '')).map(rm=>rm.number).join(', ');
    window.toast('Habitación ocupada en esas fechas.' + (alt ? ' Libres: ' + alt : ' Sin alternativas libres.'), 'error');
    return;
  }
  const rm = roomById(roomId);
  const nights = nightsBetween(checkIn, checkOut);
  const channelEl = document.getElementById('res-channel');
  const channelVal = channelEl ? channelEl.value : 'directo';
  const cnpEl = document.getElementById('res-channel-night');
  let channelNightPrice = null;
  if (channelUsesOtaPricing(channelVal) && cnpEl) {
    const pv = parseFloat(cnpEl.value);
    if (!isNaN(pv) && pv > 0) channelNightPrice = pv;
  }
  const manualNightPrice = readReservationNightPriceFromForm();
  const effRate = (manualNightPrice != null) ? manualNightPrice : effectiveNightRateForReservation(rm, channelVal, channelNightPrice);
  const total = nights * effRate;
  const kd = rm ? rm.keyDeposit || 0 : 0;
  const isImmediate = checkIn === today();
  const payPercent = isImmediate ? (parseFloat(document.getElementById('res-pay-percent')?.value) || 1) : 1;
  const payType = isImmediate ? (document.getElementById('res-paytype')?.value || 'efectivo') : 'efectivo';
  if (!id) {
    const newRes = {
      id: genId('R'), guestId: guestData.id, guestSnap: guestData.snap, roomId,
      checkIn, checkOut,
      persons: parseInt(document.getElementById('res-persons').value) || 1,
      status: document.getElementById('res-status').value,
      notes: document.getElementById('res-notes').value,
      totalEstimated: total, keyDeposit: kd, createdAt: today(), channel: channelVal,
    };
    if (channelNightPrice != null) newRes.channelNightPrice = channelNightPrice;
    if (manualNightPrice != null) newRes.nightPrice = manualNightPrice;
    DB.reservations.push(newRes);
    // Si es para hoy y está confirmada, crear estadía y cobro inmediato (50% o 100% + depósito)
    if (isImmediate && newRes.status === 'confirmada') {
      const chargeAmount = Math.round(total * payPercent * 100) / 100;
      const stay = {
        id: genId('S'), guestId: guestData.id, guestSnap: guestData.snap, roomId,
        checkIn, checkOut, rate: total, totalPaid: 0, keyDeposit: kd, keyDepositReturned: false,
        status: 'activa', checkInTime: new Date().toISOString(), channel: channelVal,
        reservationId: newRes.id, persons: newRes.persons
      };
      const rmStay = roomById(roomId);
      if (rmStay) rmStay.status = 'ocupada';
      DB.stays.push(stay);
      if (chargeAmount > 0) {
        const rec = { id: genId('P'), stayId: stay.id, guestId: guestData.id, type: payType, payClass: 'ingreso', amount: chargeAmount, concept: `Estadía hab. ${rmStay ? rmStay.number : roomId}${payPercent===0.5?' (50% anticipo)':''}`, date: today(), invoiceNum: 'F-' + pad3(DB.payments.length + 1) };
        const saved = DB.payments[DB.payments.push(applyCardFeeToPaymentRecord(rec, chargeAmount, payType)) - 1];
        stay.totalPaid = parseFloat(saved.amount);
      }
      if (kd > 0) {
        DB.payments.push({ id: genId('P'), stayId: stay.id, guestId: guestData.id, type: payType, payClass: 'ingreso_deposito', amount: kd, concept: `Depósito llave hab. ${rmStay ? rmStay.number : roomId}`, date: today(), invoiceNum: 'F-' + pad3(DB.payments.length + 1) });
      }
      logAudit('Reserva creada + Check-in inmediato', `ID ${newRes.id} → Estadía ${stay.id} · ${reservationSummaryForAudit(newRes)} · Cobrado ${fmtMoney(chargeAmount)} + depósito ${fmtMoney(kd)} (${payType})`);
      window.toast(`Reserva creada y cobro inmediato (${payPercent===0.5?'50%':'100%'} + depósito)`, 'success');
    } else {
      logAudit('Reserva creada', `ID ${newRes.id} · ${reservationSummaryForAudit(newRes)}`);
      window.toast('Reserva creada', 'success');
    }
  } else {
    const res = resById(id);
    res.guestId = guestData.id; res.guestSnap = guestData.snap; res.roomId = roomId;
    res.checkIn = checkIn; res.checkOut = checkOut;
    res.persons = parseInt(document.getElementById('res-persons').value) || 1;
    res.status = document.getElementById('res-status').value;
    res.notes = document.getElementById('res-notes').value;
    res.totalEstimated = total; res.keyDeposit = kd; res.channel = channelVal;
    if (channelNightPrice != null) res.channelNightPrice = channelNightPrice;
    else delete res.channelNightPrice;
    if (manualNightPrice != null) res.nightPrice = manualNightPrice;
    else delete res.nightPrice;
    const changes = reservationChangeDetails(before, res);
    if (changes.length) logAudit('Reserva modificada', `ID ${res.id} · ${changes.join(' | ')}`);
    window.toast('Reserva actualizada', 'success');
  }
  saveDB(); window.closeModal(); render_reservations();
  // Si se creó estadía, refrescar recepción también
  if (window.currentPage === 'reception' && typeof window.render_reception === 'function') window.render_reception();
}

export function viewResDetail(id){
  const r = resById(id); if (!r) return;
  const rm = roomById(r.roomId);
  const snap = getGuestSnap(r);
  const nights = nightsBetween(r.checkIn, r.checkOut);
  const canEdit = r.status === 'pendiente' || r.status === 'confirmada';
  const isBlocked = !isRoomFreeForReservationDates(r.roomId, r.checkIn, r.checkOut, r.id);
  window.openModal(
    `<div class="modal-header"><h3>Reserva ${r.id}</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="detail-row"><span class="detail-label">Estado</span><span class="detail-value">${window.statusBadge(r.status)}${isBlocked && canEdit ? ' <span style="color:var(--red);font-size:0.72rem">⚠ Conflicto fechas/hab.</span>' : ''}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Huésped</span><span class="detail-value fw-600">${escapeAttr(snap.name)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Documento</span><span class="detail-value">${escapeAttr(snap.document)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Teléfono</span><span class="detail-value">${escapeAttr(snap.phone)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Habitación</span><span class="detail-value">${rm ? escapeAttr(rm.number) + ' — ' + escapeAttr(rm.type) : '—'} ${rm?'<span style="font-size:0.75rem;color:var(--text3)">ID '+escapeAttr(rm.id)+'</span>':''}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Canal</span><span class="detail-value">${escapeAttr(channelLabel(r.channel))}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Check-in</span><span class="detail-value">${fmtDate(r.checkIn)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Check-out</span><span class="detail-value">${fmtDate(r.checkOut)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Noches</span><span class="detail-value">${nights}</span></div>`
    + (r.channelNightPrice != null && r.channelNightPrice > 0 ? `<div class="detail-row"><span class="detail-label">Precio/noche (plataforma)</span><span class="detail-value fw-600">${fmtMoney(r.channelNightPrice)}</span></div>` : '')
    + (r.nightPrice != null && r.nightPrice > 0 ? `<div class="detail-row"><span class="detail-label">Tarifa por noche aplicada</span><span class="detail-value fw-600 text-gold">${fmtMoney(r.nightPrice)}</span></div>` : '')
    + `<div class="detail-row"><span class="detail-label">Total estimado</span><span class="detail-value fw-600 text-gold">${fmtMoney(r.totalEstimated)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Depósito llave</span><span class="detail-value fw-600"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M12 8a4 4 0 11-7.5-2.5L1 9V6l3-3V1h3l2 2h2l2 2v2zM8 8v1"/></svg> ${fmtMoney(r.keyDeposit || 0)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Personas</span><span class="detail-value">${r.persons||1}</span></div>`
    + (r.createdAt ? `<div class="detail-row"><span class="detail-label">Creada</span><span class="detail-value">${fmtDate(r.createdAt)}</span></div>` : '')
    + (r.notes ? `<div class="detail-row"><span class="detail-label">Notas</span><span class="detail-value" style="max-width:220px;text-align:right;white-space:pre-wrap">${escapeAttr(r.notes)}</span></div>` : '')
    + `</div>`
    + `<div class="modal-footer" style="flex-wrap:wrap;gap:8px">`
    + (r.status === 'pendiente' ? `<button class="btn btn-success btn-sm" onclick="confirmRes('${r.id}')">${icn('check')} Confirmar</button>` : '')
    + (canEdit ? `<button class="btn btn-danger btn-sm" onclick="cancelRes('${r.id}')">Anular reserva</button>` : '')
    + (r.status === 'cancelada' ? `<button class="btn btn-success btn-sm" onclick="restoreRes('${r.id}')">Restaurar</button>` : '')
    + (canEdit ? `<button class="btn btn-primary btn-sm" onclick="openResModal('${r.id}')">Editar — Fechas / Habitación</button>` : `<button class="btn btn-secondary btn-sm" onclick="openResModal('${r.id}')">Ver / Editar</button>`)
    + (r.status === 'confirmada' ? `<button class="btn btn-primary btn-sm" onclick="closeModal();checkinFromReservation('${r.id}')">Check-in</button>` : '')
    + `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`
    + `</div>`
  );
}

export const confirmRes = (id) => {
  const r = resById(id);
  if (r) {
    r.status = 'confirmada'; saveDB();
    logAudit('Reserva confirmada', `ID ${r.id} · ${reservationSummaryForAudit(r)}`);
    window.toast('Confirmada', 'success'); window.closeModal(); render_reservations();
  }
};

export function cancelRes(id){
  if (!confirm('¿Anular esta reserva? Se liberará la habitación para esas fechas.')) return;
  const r = resById(id); if (!r) return;
  r.status = 'cancelada';
  logAudit('Reserva anulada', `ID ${r.id} · ${reservationSummaryForAudit(r)}`);
  saveDB(); window.toast('Reserva anulada', 'info'); window.closeModal();
  if (window.currentPage === 'reservations') render_reservations();
  else if (window.currentPage === 'dashboard' && window.render_dashboard) window.render_dashboard();
}

export function restoreRes(id){
  if (!confirm('¿Restaurar esta reserva a pendiente? Se verificará disponibilidad.')) return;
  const r = resById(id); if (!r) return;
  if (!isRoomFreeForReservationDates(r.roomId, r.checkIn, r.checkOut, r.id)) {
    window.toast('No se puede restaurar: habitación ocupada o reservada en esas fechas', 'error');
    return;
  }
  r.status = 'pendiente';
  logAudit('Reserva restaurada', `ID ${r.id} · ${reservationSummaryForAudit(r)}`);
  saveDB(); window.toast('Reserva restaurada a pendiente', 'success'); window.closeModal();
  if (window.currentPage === 'reservations') render_reservations();
  else if (window.currentPage === 'dashboard' && window.render_dashboard) window.render_dashboard();
}

window.resFilter = resFilter;
window.setResFilter = setResFilter;
window.setResListHorizon = setResListHorizon;
window.setAvailQueryDateFromInput = setAvailQueryDateFromInput;
window.exportAvailabilityCatalog = exportAvailabilityCatalog;
window.generateSelectedCatalog = generateSelectedCatalog;
window.render_reservations = render_reservations;
window.readReservationNightPriceFromForm = readReservationNightPriceFromForm;
window.reservationRoomSelectHTML = reservationRoomSelectHTML;
window.syncResRoomSelectOptions = syncResRoomSelectOptions;
window.openResModal = openResModal;
window.syncResOtaPriceUI = syncResOtaPriceUI;
window.updateResTotal = updateResTotal;
window.saveReservation = saveReservation;
window.viewResDetail = viewResDetail;
window.confirmRes = confirmRes;
window.cancelRes = cancelRes;
window.restoreRes = restoreRes;
