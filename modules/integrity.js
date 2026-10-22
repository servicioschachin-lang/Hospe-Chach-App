import { DB } from './db.js';
import { icn } from './icons.js';
import { today, fmtMoney } from './utils.js';

const _crc32Table = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? 0xEDB88320 ^ (c >>> 1) : (c >>> 1));
    t[n] = c;
  }
  return t;
})();

export function crc32(str){
  let crc = 0 ^ (-1);
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ _crc32Table[(crc ^ str.charCodeAt(i)) & 0xFF];
  }
  return ((crc ^ (-1)) >>> 0).toString(16).toUpperCase();
}

export function getDBChecksum(){
  const payload = JSON.stringify({
    rooms: DB.rooms.map(r => ({id: r.id, status: r.status})),
    stays: DB.stays.map(s => ({id: s.id, status: s.status, checkIn: s.checkIn, checkOut: s.checkOut})),
    payments: DB.payments.map(p => ({id: p.id, amount: p.amount, payClass: p.payClass}))
  });
  return crc32(payload);
}

export function showChecksumInfo(){
  const chk = getDBChecksum();
  const total = DB.rooms.length + DB.stays.length + DB.payments.length + DB.guests.length + DB.reservations.length;
  window.openModal(
    `<div class="modal-header"><h3><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M6 10V6a4 4 0 118 0v4m2 0v8H4v-8h12zM10 12v4"/></svg> Verificación de Integridad</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div style="background:var(--dark3);border-radius:8px;padding:16px;margin-bottom:14px">`
    + `<div style="font-size:0.72rem;color:var(--text3);letter-spacing:1px;margin-bottom:12px">CRC32 CHECKSUM — BASE DE DATOS</div>`
    + `<div style="font-family:'DM Mono','Courier New',monospace;font-size:clamp(1rem,4vw,1.5rem);font-weight:700;color:var(--gold);letter-spacing:2px;word-break:break-all;overflow-wrap:break-word;text-align:center;padding:12px;background:var(--dark2);border-radius:6px">${chk}</div>`
    + `<div style="font-size:0.75rem;color:var(--text3);text-align:center;margin-top:8px">Generado: ${new Date().toLocaleString('es-GT')}</div>`
    + `</div>`
    + `<div style="font-size:0.82rem;color:var(--text2);margin-bottom:12px">Este código cambia si cualquier dato es modificado. Úsalo para verificar que dos dispositivos tienen la misma información.</div>`
    + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">`
    + `<div style="background:var(--dark3);padding:10px;border-radius:6px"><div style="font-size:0.72rem;color:var(--text3)">Habitaciones</div><div class="fw-600">${DB.rooms.length}</div></div>`
    + `<div style="background:var(--dark3);padding:10px;border-radius:6px"><div style="font-size:0.72rem;color:var(--text3)">Huéspedes</div><div class="fw-600">${DB.guests.length}</div></div>`
    + `<div style="background:var(--dark3);padding:10px;border-radius:6px"><div style="font-size:0.72rem;color:var(--text3)">Reservas</div><div class="fw-600">${DB.reservations.length}</div></div>`
    + `<div style="background:var(--dark3);padding:10px;border-radius:6px"><div style="font-size:0.72rem;color:var(--text3)">Estadías</div><div class="fw-600">${DB.stays.length}</div></div>`
    + `<div style="background:var(--dark3);padding:10px;border-radius:6px"><div style="font-size:0.72rem;color:var(--text3)">Pagos</div><div class="fw-600">${DB.payments.length}</div></div>`
    + `<div style="background:var(--dark3);padding:10px;border-radius:6px"><div style="font-size:0.72rem;color:var(--text3)">Total registros</div><div class="fw-600">${total}</div></div>`
    + `</div>`
    + `</div>`
    + `<div class="modal-footer">`
    + `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`
    + `<button class="btn btn-primary" onclick="exportChecksumReport()">Exportar reporte</button>`
    + `</div>`
  );
}

export function exportChecksumReport(){
  const chk = getDBChecksum();
  const report = [
    'REPORTE DE INTEGRIDAD',
    "Hospe Chach App",
    `Fecha: ${new Date().toLocaleString('es-GT')}`,
    '========================================',
    `CRC32 Checksum: ${chk}`,
    '========================================',
    `Habitaciones:  ${DB.rooms.length}`,
    `Huéspedes:     ${DB.guests.length}`,
    `Reservas:      ${DB.reservations.length}`,
    `Estadías:      ${DB.stays.length}`,
    `Pagos:         ${DB.payments.length}`
  ].join('\n');
  const blob = new Blob([report], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `checksum_${today()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.toast('Reporte exportado', 'success');
}

window.crc32 = crc32;
window.getDBChecksum = getDBChecksum;
window.showChecksumInfo = showChecksumInfo;
window.exportChecksumReport = exportChecksumReport;
