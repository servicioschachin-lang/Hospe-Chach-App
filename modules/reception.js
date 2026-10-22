import { DB, genId, saveDB, logAudit } from './db.js';
import { roomById, guestById, stayById, getGuestName, nextResForRoom } from './lookup.js';
import { today, fmtMoney, fmtDate, statusBadge, pad3, shouldApplyCardFee, cardFeeHintHtml, applyCardFeeToPaymentRecord } from './utils.js';
import { getRoomRealStatus } from './room-states.js';
import { icn } from './icons.js';

export function processCheckin(resId = null) {
  if (window.openResModal) return window.openResModal(resId);
  import('./reservations.js').then(m => m.openResModal(resId));
}

function checkoutModal(stay) {
  const rm = roomById(stay.roomId);
  let balance = 0;
  let paymentsMade = 0;
  for (const p of DB.payments) {
    if (p.stayId === stay.id && p.payClass === 'ingreso') paymentsMade += parseFloat(p.amount || 0);
  }
  balance = paymentsMade - stay.rate;
  const nextRes = nextResForRoom(stay.roomId, stay.checkOut);
  window.openModal(
    `<div class="modal-header"><h3>Check-out - Hab. ${rm ? rm.number : '?'}</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="detail-row"><span class="detail-label">Huésped</span><span class="detail-value fw-600">${getGuestName(stay)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Estadía</span><span class="detail-value">${fmtDate(stay.checkIn)} → ${fmtDate(stay.checkOut)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Tarifa</span><span class="detail-value">${fmtMoney(stay.rate)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Pagado</span><span class="detail-value text-blue">${fmtMoney(paymentsMade)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Saldo</span><span class="detail-value fw-600 ${balance >= 0 ? 'text-green' : 'text-red'}">${balance >= 0 ? '' : '- '}${fmtMoney(balance)}</div>`
    + `<div class="detail-row"><span class="detail-label">Depósito llave</span><span class="detail-value">${fmtMoney(stay.keyDeposit)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Próxima reserva</span><span class="detail-value">${nextRes ? fmtDate(nextRes.checkIn) : '<span style="color:var(--text3)">Ninguna</span>'}</div>`
    + `<div class="form-group" style="margin-top:14px"><label>Nota de check-out</label><textarea id="co-note" placeholder="Observaciones"></textarea></div>`
    + `<div class="form-group"><label>Acción de habitación</label>`
    + `<select id="co-roomaction"><option value="limpieza">→ Limpieza</option><option value="disponible">→ Disponible</option></select></div>`
    + `<div class="form-group"><label>Forma de devolución depósito</label><select id="co-deposittype"><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select></div>`
    + `</div>`
    + `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-danger" onclick="doCheckout('${stay.id}')">${icn('check')} Finalizar check-out</button></div>`
  );
}

export function processCheckout(stayId) {
  const stay = stayById(stayId); if (!stay) return;
  checkoutModal(stay);
}

export function doCheckout(stayId) {
  const stay = stayById(stayId); if (!stay) return;
  const rm = roomById(stay.roomId);
  const roomAction = document.getElementById('co-roomaction').value;
  const note = document.getElementById('co-note').value;
  const depositType = document.getElementById('co-deposittype').value;
  stay.status = 'finalizada';
  stay.checkOutTime = new Date().toISOString();
  stay.checkOutNote = note;
  rm.status = roomAction;
  if (rm.status === 'limpieza') rm.cleanStatus = 'limpieza_espera';
  if (stay.keyDeposit && stay.keyDeposit > 0 && !stay.keyDepositReturned) {
    DB.payments.push({id: genId('P'), stayId: stay.id, guestId: stay.guestId, type: depositType, payClass: 'egreso_deposito',
      amount: stay.keyDeposit, concept: `Devolución depósito llave hab. ${rm ? rm.number : '?'}`, date: today(), invoiceNum: 'F-' + pad3(DB.payments.length + 1)});
    stay.keyDepositReturned = true;
  }
  saveDB();
  logAudit('Check-out', getGuestName(stay) + ' Hab. ' + (rm ? rm.number : '?') + (note ? ' - ' + note : ''));
  window.toast('Check-out completado', 'success'); window.closeModal(); render_reception();
}

export function render_reception(){
  requestAnimationFrame(() => {
    const activeStays = DB.stays.filter(s => s.status === 'activa');
    const overdueStays = activeStays.filter(s => s.plannedCheckout && s.plannedCheckout < today());
    const upcomingRes = DB.reservations.filter(r => (r.status === 'confirmada' || r.status === 'pendiente') && r.checkIn === today() && !activeStays.some(s => s.roomId === r.roomId && s.status === 'activa'));
    const pendingClean = DB.rooms.filter(r => r.status === 'limpieza');
    const topbar = `<div class="tabs" style="margin-bottom:16px">`
      + `<div class="tab active">🏨 Recepción</div>`
      + `</div>`;
    document.getElementById('topbar-actions').innerHTML = topbar;

  let ocRows = '';
  for (const s of activeStays) {
    const rm = roomById(s.roomId);
    const g = guestById(s.guestId);
    const isOverdue = s.plannedCheckout && s.plannedCheckout < today();
    let balance = 0;
    for (const p of DB.payments) {
      if (p.stayId === s.id && (p.payClass === 'ingreso')) balance += parseFloat(p.amount || 0);
    }
    balance = balance - s.rate;
    ocRows += `<div class="action-card" style="${isOverdue ? 'border-left:3px solid var(--red)' : ''}">`
      + `<div style="display:flex;justify-content:space-between;align-items:flex-start">`
      + `<div><div class="fw-600">${g ? getGuestName(g) : '—'}</div>`
      + `<div style="font-size:0.75rem;color:var(--text3)">Hab. ${rm ? rm.number : '?'} · CI: ${fmtDate(s.checkIn)}</div>`
      + (s.plannedCheckout ? `<div style="font-size:0.75rem;color:${isOverdue ? 'var(--red)' : 'var(--gold)'}">CO previsto: ${fmtDate(s.plannedCheckout)}</div>` : '')
      + `</div>`
      + `<div style="text-align:right"><div class="fw-600">${fmtMoney(s.rate)}</div>`
      + `<div style="font-size:0.75rem;color:var(--text3)">Saldo: <span class="${balance >= 0 ? 'text-green' : 'text-red'} fw-600">${balance >= 0 ? '' : '- '}${fmtMoney(balance)}</span></div>`
      + `</div></div>`
      + (s.keyDeposit && s.keyDeposit > 0 && !s.keyDepositReturned
        ? `<div style="margin-top:8px;font-size:0.75rem;color:var(--blue)"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M12 8a4 4 0 11-7.5-2.5L1 9V6l3-3V1h3l2 2h2l2 2v2zM8 8v1"/></svg> Llave: ${fmtMoney(s.keyDeposit)} (registro)</div>`
        : '')
      + `<div style="margin-top:10px"><button class="btn btn-sm btn-primary" onclick="processCheckout('${s.id}')">Check-out</button>`
      + `<button class="btn btn-sm btn-secondary" onclick="window.openTicketPreview(null, '${s.id}')">Ticket</button></div></div>`;
  }

  let icRows = '';
  for (const r of upcomingRes) {
    const rm = roomById(r.roomId);
    const g = guestById(r.guestId);
    icRows += `<div class="action-card" style="border-left:3px solid var(--blue)">`
      + `<div style="display:flex;justify-content:space-between;align-items:center">`
      + `<div><div class="fw-600">${g ? getGuestName(g) : r.guestName || '—'}</div>`
      + `<div style="font-size:0.75rem;color:var(--text3)">Hab. ${rm ? rm.number : '?'} · Entrada: ${fmtDate(r.checkIn)}</div></div>`
      + `<button class="btn btn-sm btn-success" onclick="processCheckin('${r.id}')">${icn('check')} Check-in</button></div></div>`;
  }

  let clRows = '';
  for (const cr of [...pendingClean].reverse()) {
    const lastStay = [...DB.stays].reverse().find(s => s.roomId === cr.id) || null;
    const nextR = nextResForRoom(cr.id);
    clRows += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--dark3);border-radius:8px;margin-bottom:8px">`
      + `<div><span class="fw-600">Hab. ${cr.number}</span>`
      + (lastStay ? `<div style="font-size:0.72rem;color:var(--text3)">Última: ${getGuestName(lastStay)} · ${fmtDate(lastStay.checkIn)}</div>` : '')
      + (nextR ? `<div style="font-size:0.72rem;color:var(--gold)">Próx. reserva: ${fmtDate(nextR.checkIn)}</div>` : '')
      + `</div>`
      + statusBadge(cr.cleanStatus || 'limpieza')
      + `</div>`;
  }

  document.getElementById('page-content').innerHTML = `<button class="btn btn-primary" style="margin-bottom:16px" onclick="processCheckin()">+ Nuevo check-in (sin reserva)</button>`
    + `<div class="stats-grid" style="margin-bottom:20px">`
    + `<div class="stat-card green"><div class="stat-label">Ocupadas</div><div class="stat-value">${activeStays.length}</div><div class="stat-sub">${overdueStays.length} vencidas</div></div>`
    + `<div class="stat-card blue"><div class="stat-label">Check-in hoy</div><div class="stat-value">${upcomingRes.length}</div><div class="stat-sub">Llegadas programadas</div></div>`
    + `<div class="stat-card orange"><div class="stat-label">Limpieza</div><div class="stat-value">${pendingClean.length}</div><div class="stat-sub">Pendientes</div></div>`
    + `<div class="stat-card red"><div class="stat-label">Vencidas</div><div class="stat-value">${overdueStays.length}</div><div class="stat-sub">Overdue checkouts</div></div>`
    + `</div>`
    + `<div class="grid-2" style="margin-top:20px">`
    + `<div>`
    + `<div class="card" style="margin-bottom:16px"><div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M3 8h14v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2-5v3m10-3v3M3 7V5a1 1 0 011-1h12a1 1 0 011 1v2"/></svg> Ocupadas ahora (${activeStays.length})</h4>`
    + `<button class="btn btn-sm btn-secondary" onclick="navigate('rooms')">Ver todas</button></div>`
    + `<div style="padding:12px">${ocRows || '<div class="empty-state"><p>No hay huéspedes activos</p></div>'}</div></div>`
    + `<div class="card"><div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M12 8a4 4 0 11-7.5-2.5L1 9V6l3-3V1h3l2 2h2l2 2v2zM8 8v1"/></svg> Check-in hoy (${upcomingRes.length})</h4></div>`
    + `<div style="padding:12px">${icRows || '<div class="empty-state"><p>No hay llegadas hoy</p></div>'}</div></div>`
    + `</div>`
    + `<div>`
    + `<div class="card" style="margin-bottom:16px"><div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M3 8h14v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2-5v3m10-3v3M3 7V5a1 1 0 011-1h12a1 1 0 011 1v2"/></svg> En limpieza (${pendingClean.length})</h4></div>`
    + `<div style="padding:12px">${clRows || '<div class="empty-state"><p>No hay habitaciones en limpieza</p></div>'}</div></div>`
    + `</div></div>`;
  });
}

window.processCheckin = processCheckin;
window.processCheckout = processCheckout;
window.doCheckout = doCheckout;
window.render_reception = render_reception;
