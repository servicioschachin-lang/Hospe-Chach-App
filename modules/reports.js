import { DB } from './db.js';
import { roomById, guestById, getGuestName } from './lookup.js';
import { today, fmtMoney, fmtDate, nightsBetween, statusBadge } from './utils.js';
import { stayOpenAccountTotal } from './helpers.js';
import { getRoomsAvailable } from './room-states.js';

function computeTotals() {
  const totals = {ingreso: 0, egreso: 0, ingreso_deposito: 0, egreso_deposito: 0};
  for (const p of DB.payments) {
    const cls = p.payClass || 'ingreso';
    totals[cls] = (totals[cls] || 0) + parseFloat(p.amount || 0);
  }
  return totals;
}

function computeRoomUsage() {
  const roomUsage = {};
  for (const s of DB.stays) {
    const rid = s.roomId;
    roomUsage[rid] = (roomUsage[rid] || 0) + 1;
  }
  const arr = Object.entries(roomUsage);
  arr.sort((a, b) => b[1] - a[1]);
  return arr;
}

function computeGuestSpend() {
  const gSpend = {};
  for (const p of DB.payments) {
    if (p.payClass !== 'ingreso') continue;
    const gid = p.guestId;
    if (gid) gSpend[gid] = (gSpend[gid] || 0) + parseFloat(p.amount || 0);
  }
  const arr = Object.entries(gSpend);
  arr.sort((a, b) => b[1] - a[1]);
  return arr;
}

function topRoomRows(topRooms) {
  let html = '';
  for (const [rid, count] of topRooms.slice(0, 5)) {
    const rm = roomById(rid);
    html += `<div class="detail-row"><span class="detail-label">${rm ? rm.number + ' — ' + rm.type : rid}</span><span class="detail-value fw-600 text-gold">${count} estadías</span></div>`;
  }
  return html;
}

function topGuestRows(topGuests) {
  let html = '';
  for (const [gid, spend] of topGuests.slice(0, 5)) {
    const g = guestById(gid);
    html += `<div class="detail-row"><span class="detail-label">${g ? g.name : gid}</span><span class="detail-value fw-600 text-gold">${fmtMoney(spend)}</span></div>`;
  }
  return html;
}

function stayRows() {
  const t = today();
  let html = '';
  for (let i = DB.stays.length - 1; i >= 0; i--) {
    const s = DB.stays[i];
    const rm = roomById(s.roomId);
    const nights = nightsBetween(s.checkIn, s.checkOut || t);
    const openAccT = stayOpenAccountTotal(s);
    html += `<tr><td class="fw-600">${getGuestName(s)}</td><td>${rm ? rm.number : '—'}</td><td>${fmtDate(s.checkIn)}</td><td>${s.checkOut ? fmtDate(s.checkOut) : '<span style="color:var(--green)">Activa</span>'}</td><td>${nights}</td><td>${fmtMoney(openAccT)}</td><td>${statusBadge(s.status)}</td></tr>`;
  }
  return html;
}

export function render_reports(){
  document.getElementById('topbar-actions').innerHTML = '';
  const t = today();
  const totals = computeTotals();
  const saldo = (totals.ingreso + totals.ingreso_deposito) - (totals.egreso + totals.egreso_deposito);
  const avail = getRoomsAvailable();
  const activa = DB.stays.filter(s => s.status === 'activa').length;
  const doneStays = DB.stays.filter(s => s.status === 'finalizada');
  const done = doneStays.length;
  const totalNights = doneStays.reduce((sum, s) => sum + nightsBetween(s.checkIn, s.checkOut || t), 0);
  const avgNights = done ? (totalNights / done).toFixed(1) : '0';
  const topRooms = computeRoomUsage();
  const topGuests = computeGuestSpend();
  const ingresoCount = DB.payments.filter(p => p.payClass === 'ingreso').length;

  document.getElementById('page-content').innerHTML =
    `<div class="stats-grid" style="margin-bottom:24px">`
    + `<div class="stat-card gold"><div class="stat-label">Ingresos totales</div><div class="stat-value">${fmtMoney(totals.ingreso)}</div><div class="stat-sub">${ingresoCount} transacciones</div></div>`
    + `<div class="stat-card red"><div class="stat-label">Egresos</div><div class="stat-value">${fmtMoney(totals.egreso + totals.egreso_deposito)}</div><div class="stat-sub">Incl. dev. depósitos</div></div>`
    + `<div class="stat-card green"><div class="stat-label">Depósitos llaves</div><div class="stat-value">${fmtMoney(totals.ingreso_deposito - totals.egreso_deposito)}</div><div class="stat-sub">Neto pendiente devolución</div></div>`
    + `<div class="stat-card ${saldo >= 0 ? 'blue' : 'red'}"><div class="stat-label">Saldo en caja</div><div class="stat-value">${fmtMoney(saldo)}</div></div>`
    + `<div class="stat-card blue"><div class="stat-label">Ocupación actual</div><div class="stat-value">${avail.length} disp.</div><div class="stat-sub">${activa} ocupadas ahora</div></div>`
    + `<div class="stat-card purple"><div class="stat-label">Estadías completas</div><div class="stat-value">${done}</div><div class="stat-sub">Prom. ${avgNights} noches</div></div>`
    + `</div>`
    + `<div class="grid-3" style="margin-bottom:20px">`
    + `<div class="card"><div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M10 2l2 4 4 .5-3 3 1 4.5-4-2-4 2 1-4.5-3-3L8 6l2-4z"/></svg> Top Habitaciones</h4></div><div class="card-body">${topRoomRows(topRooms) || '<p style="color:var(--text3);font-size:0.85rem">Sin datos</p>'}</div></div>`
    + `<div class="card"><div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M10 2l1 3h3l-2.5 2 1 3.5L10 9l-2.5 1.5 1-3.5L6 5h3l1-3zm-5 13v-2h10v2H5zm0 3v-1h10v1H5z"/></svg> Top Huéspedes</h4></div><div class="card-body">${topGuestRows(topGuests) || '<p style="color:var(--text3);font-size:0.85rem">Sin datos</p>'}</div></div>`
    + `<div class="card"><div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 4v1a3 3 0 010 6v1m0-8v1"/></svg> Resumen Caja</h4></div><div class="card-body">`
    + `<div class="detail-row"><span class="detail-label">Ingresos</span><span class="detail-value text-green">${fmtMoney(totals.ingreso)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Egresos</span><span class="detail-value text-red">- ${fmtMoney(totals.egreso)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Depósitos cobrados</span><span class="detail-value text-blue">${fmtMoney(totals.ingreso_deposito)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Depósitos devueltos</span><span class="detail-value text-orange">- ${fmtMoney(totals.egreso_deposito)}</span></div>`
    + `<div class="detail-row" style="border-top:1px solid var(--border);margin-top:4px;padding-top:8px"><span class="detail-label fw-600">Saldo total</span><span class="detail-value fw-600 ${saldo >= 0 ? 'text-gold' : 'text-red'}">${fmtMoney(saldo)}</span></div>`
    + `</div></div>`
    + `</div>`
    + `<div class="card"><div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M3 8h14v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2-5v3m10-3v3M3 7V5a1 1 0 011-1h12a1 1 0 011 1v2"/></svg> Todas las Estadías</h4></div>`
    + `<table><thead><tr><th>Huésped</th><th>Hab.</th><th>Check-in</th><th>Check-out</th><th>Noches</th><th>Cuenta abierta</th><th>Estado</th></tr></thead>`
    + `<tbody>${stayRows() || '<tr><td colspan="7"><div class="empty-state"><p>Sin estadías</p></div></td></tr>'}</tbody></table></div>`;
}
window.render_reports = render_reports;
