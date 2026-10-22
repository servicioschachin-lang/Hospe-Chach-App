import { DB, saveDB } from './db.js';
import { roomById } from './lookup.js';
import { getRoomRealStatus } from './room-states.js';
import { statusBadge, fmtDate } from './utils.js';
import { icn } from './icons.js';

export function render_housekeeping(){
  document.getElementById('topbar-actions').innerHTML = '';
  let rows = '';
  for (const rm of DB.rooms){
    const realStatus = getRoomRealStatus(rm);
    const stHK = rm.status !== realStatus
      ? `${statusBadge(rm.status)} · ${statusBadge(realStatus)}`
      : statusBadge(realStatus);
    const lastStay = [...DB.stays].reverse().find(s => s.roomId === rm.id) || null;
    const cs = lastStay ? lastStay.cleanStatus : '';
    const nextCI = window.nextResForRoom(rm.id);
    const activeStay = window.activeStayForRoom(rm.id);
    rows += `<tr>`
      + `<td class="fw-600 text-gold">${rm.number}</td>`
      + `<td>${rm.type}</td>`
      + `<td>${stHK}</td>`
      + `<td>${cs ? statusBadge(cs) : '<span style="color:var(--text3)">—</span>'}</td>`
      + `<td>${nextCI ? `<span style="color:var(--gold)">${fmtDate(nextCI.checkIn)}</span>` : '<span style="color:var(--text3)">—</span>'}</td>`
      + `<td>${activeStay ? window.getGuestName(activeStay) : '<span style="color:var(--text3)">—</span>'}</td>`
      + `<td><div class="flex gap-2">`
      + (rm.status === 'limpieza' || rm.status === 'disponible'
        ? `<button class="btn btn-sm btn-secondary" onclick="setCleanStatus('${rm.id}','limpieza_iniciada')"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M6 4l12 8-12 8V4z"/></svg> Iniciada</button>`
        + `<button class="btn btn-sm btn-success" onclick="setCleanStatus('${rm.id}','limpieza_lista')">${icn('check')} Lista</button>`
        : '')
      + `</div></td></tr>`;
  }
  document.getElementById('page-content').innerHTML =
    `<div class="card"><table>`
    + `<thead><tr><th>Hab.</th><th>Tipo</th><th>Estado</th><th>Limpieza</th><th>Próx. CI</th><th>Huésped</th><th>Acciones</th></tr></thead>`
    + `<tbody>${rows}</tbody></table></div>`;
}

export function setCleanStatus(roomId, status){
  const rm = roomById(roomId); if(!rm) return;
  for (let j = DB.stays.length - 1; j >= 0; j--){
    if (DB.stays[j].roomId === roomId) { DB.stays[j].cleanStatus = status; break; }
  }
  if (status === 'limpieza_lista'){
    rm.status = 'disponible';
    window.toast(`Hab. ${rm.number} lista — marcada disponible`, 'success');
  } else {
    window.toast(`Limpieza iniciada en hab. ${rm.number}`, 'info');
  }
  saveDB();
  const renderers = { housekeeping: render_housekeeping, dashboard: window.render_dashboard, rooms: window.render_rooms };
  const renderer = renderers[window.currentPage];
  if (renderer) renderer();
}

window.render_housekeeping = render_housekeeping;
window.setCleanStatus = setCleanStatus;
