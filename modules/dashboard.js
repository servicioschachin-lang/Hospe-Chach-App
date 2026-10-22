import { DB, APP_TIME_ZONE } from './db.js';
import { roomById, getGuestName, nextResForRoom } from './lookup.js';
import { getRoomRealStatus, getRoomsAvailable, countRoomStatusOnDate } from './room-states.js';
import { today, fmtMoney, fmtDate, addDays, statusBadge } from './utils.js';
import { icn } from './icons.js';

export function render_dashboard(){
  const total = DB.rooms.length;
  const stats = {disponible:0, ocupada:0, reservada:0, reservada_hoy:0, limpieza:0, mantenimiento:0};
  for (const rm of DB.rooms) {
    const rs = getRoomRealStatus(rm);
    if (rs === 'reservada_hoy') { stats.reservada_hoy++; stats.reservada++; }
    else if (rs in stats) stats[rs]++;
    else stats.disponible++;
  }
  const ocupacion = total ? Math.round((stats.ocupada / total) * 100) : 0;
  const t = today();

  const checkinsHoy = DB.reservations.filter(r => r.checkIn === t && (r.status === 'confirmada' || r.status === 'pendiente'));
  const checkoutsHoy = DB.stays.filter(s => s.status === 'activa' && s.plannedCheckout && s.plannedCheckout <= t);
  const enLimpieza = DB.rooms.filter(r => r.status === 'limpieza');
  let ingresoHoy = 0, egresoHoy = 0;
  for (const p of DB.payments) {
    if (p.date === t) {
      if (p.payClass === 'egreso' || p.payClass === 'egreso_deposito') egresoHoy += parseFloat(p.amount || 0);
      else ingresoHoy += parseFloat(p.amount || 0);
    }
  }

  document.getElementById('topbar-actions').innerHTML =
    `<span style="font-size:0.82rem;color:var(--text3)"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M3 8h14v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2-5v3m10-3v3M3 7V5a1 1 0 011-1h12a1 1 0 011 1v2"/></svg> `
    + new Date().toLocaleDateString('es-GT', {weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone: APP_TIME_ZONE}) + `</span>`;

  let ciRows = '';
  for (const r of checkinsHoy) {
    const rm = roomById(r.roomId);
    ciRows += `<div class="action-card" style="margin-bottom:8px">`
      + `<div style="display:flex;justify-content:space-between;align-items:center">`
      + `<div><div class="fw-600">${getGuestName(r)}</div>`
      + `<div style="font-size:0.78rem;color:var(--text3)">Hab. ${rm ? rm.number : '?'} · ${fmtDate(r.checkIn)} → ${fmtDate(r.checkOut)}</div></div>`
      + statusBadge(r.status) + `</div>`
      + `<div style="margin-top:8px"><button class="btn btn-success btn-sm" onclick="processCheckin('${r.id}')">${icn('check')} Check-in</button></div></div>`;
  }

  let coRows = '';
  for (const s of checkoutsHoy) {
    const rm = roomById(s.roomId);
    const overdue = s.plannedCheckout < t;
    coRows += `<div class="action-card" style="margin-bottom:8px;${overdue ? 'border-left:3px solid var(--red)' : ''}">`
      + `<div style="display:flex;justify-content:space-between;align-items:center">`
      + `<div><div class="fw-600">${getGuestName(s)}</div>`
      + `<div style="font-size:0.78rem;color:${overdue ? 'var(--red)' : 'var(--text3)'}">Hab. ${rm ? rm.number : '?'} · Salida: ${fmtDate(s.plannedCheckout)}${overdue ? '<svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M10 2l9 17H1L10 2zm0 11v-4m0 6v-1"/></svg> VENCIDO' : ' HOY'}</div></div>`
      + (s.keyDeposit && !s.keyDepositReturned ? `<span style="font-size:0.75rem;color:var(--blue)"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M12 8a4 4 0 11-7.5-2.5L1 9V6l3-3V1h3l2 2h2l2 2v2zM8 8v1"/></svg> Dev. Q${s.keyDeposit}</span>` : '')
      + `</div>`
      + `<div style="margin-top:8px"><button class="btn btn-primary btn-sm" onclick="processCheckout('${s.id}')">Check-out</button></div></div>`;
  }

  let limRows = '';
  for (const rm of enLimpieza) {
    const nextCI = nextResForRoom(rm.id);
    const lastStay = [...DB.stays].reverse().find(s => s.roomId === rm.id) || null;
    const cs = lastStay ? lastStay.cleanStatus : '';
    limRows += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">`
      + `<div><span class="fw-600">Hab. ${rm.number}</span>`
      + (nextCI ? ` <span style="font-size:0.75rem;color:var(--gold)">Próx. CI: ${fmtDate(nextCI.checkIn)}</span>` : '')
      + `<div style="font-size:0.75rem">${statusBadge(cs || 'limpieza')}</div></div>`
      + `<div class="flex gap-2">`
      + (cs !== 'limpieza_iniciada' ? `<button class="btn btn-sm btn-secondary" onclick="setCleanStatus('${rm.id}','limpieza_iniciada')"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M6 4l12 8-12 8V4z"/></svg> Iniciar</button>` : '')
      + (cs !== 'limpieza_lista' ? `<button class="btn btn-sm btn-success" onclick="setCleanStatus('${rm.id}','limpieza_lista')">${icn('check')} Lista</button>` : '')
      + `</div></div>`;
  }

  const availRooms = getRoomsAvailable();
  const availHtml = availRooms.map(r => `<span style="display:inline-block;background:var(--green-dim);color:var(--green);padding:4px 10px;border-radius:6px;font-size:0.82rem;font-weight:600;margin:3px">${r.number}</span>`).join('');

  let weekAvailHtml = `<div style="font-size:0.72rem;color:var(--text3);margin-bottom:8px;line-height:1.35">Ocupación proyectada para los próximos 7 días:</div>`
    + `<div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">`;
  for (let wk = 0; wk < 7; wk++){
    const ds = addDays(t, wk);
    const cw = countRoomStatusOnDate(ds);
    const resvW = cw.reservada + cw.reservada_hoy;
    const ocupW = cw.ocupada;
    const freeW = cw.disponible;
    const pctFree = total ? Math.round((freeW/total)*100) : 0;
    const pctOcup = total ? Math.round((ocupW/total)*100) : 0;
    const pctResv = total ? Math.round((resvW/total)*100) : 0;

    weekAvailHtml += `
    <div>
      <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px;">
        <span class="fw-600">${wk === 0 ? 'Hoy · ' : ''}${fmtDate(ds)}</span>
        <span>${freeW} libres / ${ocupW} ocup / ${resvW} resv</span>
      </div>
      <div style="display:flex;height:12px;border-radius:6px;overflow:hidden;background:var(--dark2);border:1px solid var(--border)">
        <div style="width:${pctOcup}%;background:var(--red);" title="Ocupadas: ${ocupW}"></div>
        <div style="width:${pctResv}%;background:var(--blue);" title="Reservadas: ${resvW}"></div>
        <div style="width:${pctFree}%;background:var(--green);" title="Libres: ${freeW}"></div>
      </div>
    </div>`;
  }
  weekAvailHtml += `</div>
  <div style="display:flex;gap:12px;font-size:0.75rem;margin-top:12px;color:var(--text3);justify-content:center;">
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:3px;background:var(--red);"></span> Ocupada</span>
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:3px;background:var(--blue);"></span> Reservada</span>
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:3px;background:var(--green);"></span> Libre</span>
  </div>`;

  document.getElementById('page-content').innerHTML =
    `<div class="stats-grid">`
    + `<div class="stat-card green"><div class="stat-label">Libres hoy</div><div class="stat-value">${availRooms.length}</div><div class="stat-sub">de ${total} (sin reserva esta noche)</div></div>`
    + `<div class="stat-card red"><div class="stat-label">Ocupadas</div><div class="stat-value">${stats.ocupada}</div><div class="stat-sub">${ocupacion}% ocupación</div></div>`
    + `<div class="stat-card gold"><div class="stat-label">Check-in hoy</div><div class="stat-value">${checkinsHoy.length}</div><div class="stat-sub">Llegadas programadas</div></div>`
    + `<div class="stat-card orange"><div class="stat-label">Check-out hoy</div><div class="stat-value">${checkoutsHoy.length}</div><div class="stat-sub">${checkoutsHoy.filter(s => s.plannedCheckout < t).length} vencidos</div></div>`
    + `<div class="stat-card blue"><div class="stat-label">Ingreso hoy</div><div class="stat-value">${fmtMoney(ingresoHoy)}</div><div class="stat-sub">Caja del día</div></div>`
    + `<div class="stat-card purple"><div class="stat-label">En limpieza</div><div class="stat-value">${enLimpieza.length}</div><div class="stat-sub">Habitaciones pendientes</div></div>`
    + `</div>`
    + `<div class="grid-2" style="margin-top:20px">`
    + `<div>`
    + `<div class="card" style="margin-bottom:16px"><div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M3 9l7-7 7 7v8H3V9zm3 1v6h8v-6H6zm3-4a1 1 0 012 0v3H9V6z"/></svg> Check-in HOY (${checkinsHoy.length})</h4>`
    + `<button class="btn btn-primary btn-sm" onclick="navigate('reception')">Ver recepción</button></div>`
    + `<div style="padding:12px">${ciRows || '<div class="empty-state" style="padding:16px"><p>Sin llegadas hoy</p></div>'}</div></div>`
    + `<div class="card"><div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M12 8a4 4 0 11-7.5-2.5L1 9V6l3-3V1h3l2 2h2l2 2v2zM8 8v1"/></svg> Check-out HOY (${checkoutsHoy.length})</h4></div>`
    + `<div style="padding:12px">${coRows || '<div class="empty-state" style="padding:16px"><p>Sin salidas hoy</p></div>'}</div></div>`
    + `</div>`
    + `<div>`
    + `<div class="card" style="margin-bottom:16px"><div class="card-header"><h4>✅ Habitaciones Disponibles Hoy</h4></div>`
    + `<div style="padding:14px">${availHtml || '<p style="color:var(--text3);font-size:0.85rem">No hay habitaciones disponibles</p>'}</div></div>`
    + `<div class="card" style="margin-bottom:16px"><div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M3 8h14v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2-5v3m10-3v3M3 7V5a1 1 0 011-1h12a1 1 0 011 1v2"/></svg> Disponibilidad 7 días</h4></div>`
    + `<div style="padding:12px 14px">${weekAvailHtml}</div></div>`
    + `<div class="card"><div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M4 3v14h12V3H4zm2 2h8v10H6V5zm2 2v6h4V7H8z"/></svg> Estado de Limpieza</h4>`
    + `<button class="btn btn-sm btn-secondary" onclick="navigate('housekeeping')">Ver todo</button></div>`
    + `<div style="padding:0 16px">${limRows || '<div class="empty-state" style="padding:16px"><p>No hay habitaciones en limpieza</p></div>'}</div></div>`
    + `</div></div>`;
}

window.render_dashboard = render_dashboard;
