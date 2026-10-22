import { APP_TIME_ZONE } from './db.js';
import { icn } from './icons.js';

export function today() {
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat && Intl.DateTimeFormat.prototype.formatToParts) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: APP_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      let y = '', m = '', day = '';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p.type === 'year') y = p.value;
        if (p.type === 'month') m = p.value;
        if (p.type === 'day') day = p.value;
      }
      if (y && m && day) return `${y}-${m}-${day}`;
    }
  } catch (e) {}
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(d, n) {
  if (!d || typeof d !== 'string') return d;
  const a = d.split('-');
  if (a.length !== 3) return d;
  const t = Date.UTC(parseInt(a[0], 10), parseInt(a[1], 10) - 1, parseInt(a[2], 10)) + n * 86400000;
  const u = new Date(t);
  return `${u.getUTCFullYear()}-${String(u.getUTCMonth() + 1).padStart(2, '0')}-${String(u.getUTCDate()).padStart(2, '0')}`;
}

export function addMonths(isoDate, months) {
  if (!isoDate || typeof isoDate !== 'string') return isoDate;
  const a = isoDate.split('-');
  if (a.length !== 3) return isoDate;
  const y = parseInt(a[0], 10), m = parseInt(a[1], 10) - 1, day = parseInt(a[2], 10);
  const base = new Date(Date.UTC(y, m + months, 1));
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  const d = Math.min(day, lastDay);
  const res = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), d));
  return `${res.getUTCFullYear()}-${String(res.getUTCMonth() + 1).padStart(2, '0')}-${String(res.getUTCDate()).padStart(2, '0')}`;
}

export const fmtMoney = (n) => `Q${parseFloat(n||0).toFixed(2)}`;
export const fmt$ = (n) => fmtMoney(n);

export function getCardFeePercent(){
  const v = parseFloat(window.StorageService.getSync('hotelos_card_fee_percent'));
  if (isNaN(v) || v < 0) return 5;
  return Math.min(30, v);
}

export const roundMoney = (n) => Math.round((parseFloat(n) || 0) * 100) / 100;

export function cardFeeParts(subtotal, payType){
  const sub = roundMoney(subtotal);
  const pct = getCardFeePercent();
  if (payType !== 'tarjeta' || pct <= 0 || sub <= 0)
    return { subtotal: sub, fee: 0, total: sub, percent: pct };
  const fee = roundMoney(sub * pct / 100);
  return { subtotal: sub, fee: fee, total: roundMoney(sub + fee), percent: pct };
}

export function shouldApplyCardFee(payClass, payType){
  if (payType !== 'tarjeta') return false;
  if (payClass === 'egreso' || payClass === 'egreso_deposito') return false;
  return true;
}

export function applyCardFeeToPaymentRecord(base, subtotal, payType){
  const pc = base.payClass || 'ingreso';
  const sub = roundMoney(subtotal);
  if (!shouldApplyCardFee(pc, payType))
    return { ...base, amount: sub, type: payType };
  const parts = cardFeeParts(sub, payType);
  const o = { ...base, amount: parts.total, type: payType };
  if (parts.fee > 0) {
    o.subtotalBeforeFee = parts.subtotal;
    o.cardFee = parts.fee;
    o.cardFeePercent = parts.percent;
  } else {
    o.amount = sub;
  }
  return o;
}

export function cardFeeHintHtml(subtotal, payType){
  const parts = cardFeeParts(roundMoney(subtotal), payType);
  if (parts.fee <= 0)
    return '<div style="font-size:0.72rem;color:var(--text3);margin-top:8px">Sin recargo (efectivo / transferencia).</div>';
  return `<div style="font-size:0.78rem;margin-top:8px;padding:8px 10px;background:rgba(21,101,192,0.08);border:1px solid var(--blue-dim);border-radius:6px;color:var(--text2)">`
    + `Cuenta / base: <strong>${fmtMoney(parts.subtotal)}</strong> · Comisión tarjeta (${parts.percent}%): <strong>${fmtMoney(parts.fee)}</strong>`
    + ` · <span style="color:var(--blue)">Total a cobrar al cliente: ${fmtMoney(parts.total)}</span></div>`;
}

export function fmtDate(d){
  if(!d||d==='—')return '—';
  const cal = String(d).split('T')[0].split('-');
  if(cal.length!==3)return d;
  const dt = new Date(Date.UTC(parseInt(cal[0],10), parseInt(cal[1],10)-1, parseInt(cal[2],10)));
  return dt.toLocaleDateString('es-GT',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
}

export function nightsBetween(a,b){
  if(!a||!b)return 0;
  const aa = String(a).split('T')[0].split('-');
  const bb = String(b).split('T')[0].split('-');
  if(aa.length!==3||bb.length!==3)return 0;
  const t0 = Date.UTC(parseInt(aa[0],10), parseInt(aa[1],10)-1, parseInt(aa[2],10));
  const t1 = Date.UTC(parseInt(bb[0],10), parseInt(bb[1],10)-1, parseInt(bb[2],10));
  return Math.max(0, Math.round((t1 - t0) / 86400000));
}

export const pad3 = (n) => n<10?'00'+n:n<100?'0'+n:''+n;

const STATUS_MAP = {
  disponible:'badge-green',reservada:'badge-blue',reservada_hoy:'badge-gold',
  ocupada:'badge-red',limpieza:'badge-orange',mantenimiento:'badge-purple',
  confirmada:'badge-green',pendiente:'badge-orange',cancelada:'badge-red',finalizada:'badge-gray',
  activa:'badge-blue',
  efectivo:'badge-gold',tarjeta:'badge-blue',transferencia:'badge-purple',
  ingreso:'badge-green',egreso:'badge-red',ingreso_deposito:'badge-blue',egreso_deposito:'badge-orange',
  limpieza_iniciada:'badge-orange',limpieza_lista:'badge-green',
};
const STATUS_LABELS = {reservada_hoy:'Reservada Hoy',limpieza_iniciada:'Limpiando',limpieza_lista:'Lista'};

export const statusBadge = (s) => `<span class="badge ${(STATUS_MAP[s]||'badge-gray')}">${STATUS_LABELS[s]||s}</span>`;

const STATUS_LABEL_MAP = {disponible:'Disponible',ocupada:'Ocupada',limpieza:'Limpieza',mantenimiento:'Mantenimiento',reservada:'Reservada',reservada_hoy:'Reservada Hoy'};
export const statusLabel = (s) => STATUS_LABEL_MAP[s]||s;

const CLEAN_STATUS_LABELS = {limpieza_iniciada:'Limpiando',limpieza_lista:'Lista para ocupar'};
export const cleanStatusLabel = (s) => !s ? '' : (CLEAN_STATUS_LABELS[s]||s);

export function escapeAttr(s){
  if(window.secureEscapeAttr) return window.secureEscapeAttr(s);
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

export function sanitize(str){
  if(window.sanitizeHTML) return window.sanitizeHTML(str);
  return escapeAttr(str);
}

export function clientOptions(){
  let h='';
  for(let i=0;i<window.DB.guests.length;i++){
    const g=window.DB.guests[i];
    h+=`<option value="${escapeAttr(g.id)}">${sanitize(g.name)} — ${sanitize(g.document)}</option>`;
  }
  return h;
}

export function roomOptions(filterStatus){
  let h='';
  for(let i=0;i<window.DB.rooms.length;i++){
    const r=window.DB.rooms[i];
    if(filterStatus && r.status!==filterStatus) continue;
    h+=`<option value="${escapeAttr(r.id)}">${sanitize(r.number)} - ${sanitize(r.type)} (${statusLabel(r.status)})</option>`;
  }
  return h;
}

export function paginate(array, page, perPage){
  page = page || 1;
  perPage = perPage || 10;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return {
    items: array.slice(start, end),
    total: array.length,
    page: page,
    perPage: perPage,
    totalPages: Math.ceil(array.length / perPage),
    hasNext: end < array.length,
    hasPrev: page > 1
  };
}

export function renderPagination(info, callbackName){
  if(info.totalPages <= 1) return '';
  let html='<div class="pagination">';
  html+=`<button ${info.hasPrev?'onclick="'+callbackName+'('+(info.page-1)+')"':'disabled'}>&laquo; Anterior</button>`;
  html+=`<span class="pagination-info">Página ${info.page} de ${info.totalPages} (${info.total} registros)</span>`;
  html+=`<button ${info.hasNext?'onclick="'+callbackName+'('+(info.page+1)+')"':'disabled'}>Siguiente &raquo;</button>`;
  html+='</div>';
  return html;
}

export function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  const checkbox = document.getElementById('theme-switch-checkbox');
  if (checkbox) checkbox.checked = isDark;
  ['theme-icon','theme-icon-bottom'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icn('gear');
  });
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
export function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const isDark = savedTheme === 'dark' || (!savedTheme && !window.matchMedia('(prefers-color-scheme: dark)').matches === false);
  document.body.classList.toggle('dark-mode', isDark);
  const checkbox = document.getElementById('theme-switch-checkbox');
  if (checkbox) checkbox.checked = isDark;
  ['theme-icon','theme-icon-bottom'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icn('gear');
  });
}

window.today = today;
window.toggleTheme = toggleTheme;
window.initTheme = initTheme;
window.addDays = addDays;
window.addMonths = addMonths;
window.fmtMoney = fmtMoney;
window.fmt$ = fmt$;
window.getCardFeePercent = getCardFeePercent;
window.roundMoney = roundMoney;
window.cardFeeParts = cardFeeParts;
window.shouldApplyCardFee = shouldApplyCardFee;
window.applyCardFeeToPaymentRecord = applyCardFeeToPaymentRecord;
window.cardFeeHintHtml = cardFeeHintHtml;
window.fmtDate = fmtDate;
window.nightsBetween = nightsBetween;
window.pad3 = pad3;
window.statusBadge = statusBadge;
window.statusLabel = statusLabel;
window.cleanStatusLabel = cleanStatusLabel;
window.escapeAttr = escapeAttr;
window.sanitize = sanitize;
window.clientOptions = clientOptions;
window.roomOptions = roomOptions;
window.paginate = paginate;
window.renderPagination = renderPagination;

export function exportTableToCSV(filename, headers, rows) {
  const escapeCsv = (str) => {
    let s = String(str || '').replace(/"/g, '""');
    return `"${s}"`;
  };
  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(','))
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename + '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.exportTableToCSV = exportTableToCSV;
