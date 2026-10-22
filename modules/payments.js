import { DB, genId, saveDB, logAudit } from './db.js';
import { roomById, guestById, stayById, getGuestName } from './lookup.js';
import { today, fmtMoney, fmtDate, statusBadge, pad3, shouldApplyCardFee, cardFeeHintHtml, applyCardFeeToPaymentRecord } from './utils.js';
import { icn } from './icons.js';

function renderTopbar() {
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-secondary btn-sm" onclick="exportPaymentsCSV()" style="margin-right:8px">Exportar CSV</button>`
    + `<button class="btn btn-primary btn-sm" onclick="openPaymentModal()">+ Registrar Movimiento</button>`;
}

function exportPaymentsCSV() {
  const headers = ['N°', 'Fecha', 'Huésped', 'Concepto', 'Tipo', 'Forma', 'Monto'];
  const rows = [];
  const sorted = [...DB.payments].reverse();
  for (const p of sorted) {
    let gname = '—';
    if (p.guestId) { const g = guestById(p.guestId); gname = g ? g.name : '—'; }
    if (gname === '—' && p.stayId) { const st = stayById(p.stayId); if (st) gname = getGuestName(st); }
    const cls = p.payClass || 'ingreso';
    const isEgreso = cls === 'egreso' || cls === 'egreso_deposito';
    const monto = (isEgreso ? '-' : '') + (p.amount || 0);
    rows.push([p.invoiceNum || p.id, p.date || '', gname, p.concept || '', cls, p.type || '', monto]);
  }
  if (window.exportTableToCSV) window.exportTableToCSV('Pagos', headers, rows);
  else window.toast('Error: exportTableToCSV no disponible', 'error');
}
window.exportPaymentsCSV = exportPaymentsCSV;

function paymentsTabHtml() {
  const active = window._paymentsTab === 'movimientos' ? '' : (window._paymentsTab === 'depositos' ? '' : '');
  return `<div class="tabs" style="margin-bottom:16px">`
    + `<div class="tab ${window._paymentsTab === 'movimientos' ? 'active' : ''}" onclick="window._paymentsTab='movimientos';render_payments()">${icn('check')} Movimientos</div>`
    + `<div class="tab ${window._paymentsTab === 'depositos' ? 'active' : ''}" onclick="window._paymentsTab='depositos';render_payments()">${icn('key')} Control Depósitos</div>`
    + `</div>`;
}

function computeTotals() {
  const totals = {ingreso: 0, egreso: 0, ingreso_deposito: 0, egreso_deposito: 0};
  const monthTotals = {...totals};
  const todayTotals = {...totals};
  const yearMonth = today().slice(0, 7);
  for (const p of DB.payments) {
    const cls = p.payClass || 'ingreso';
    const amt = parseFloat(p.amount || 0);
    totals[cls] = (totals[cls] || 0) + amt;
    if (p.date && p.date.slice(0, 7) === yearMonth) monthTotals[cls] = (monthTotals[cls] || 0) + amt;
    if (p.date === today()) todayTotals[cls] = (todayTotals[cls] || 0) + amt;
  }
  return { totals, monthTotals, todayTotals };
}

function pendingKeyDeps() {
  return DB.stays.filter(s => s.keyDeposit && s.keyDeposit > 0 && !s.keyDepositReturned && s.status === 'finalizada');
}

function paymentRows() {
  let rows = '';
  const sorted = [...DB.payments].reverse();
  for (const p of sorted) {
    let gname = '—';
    if (p.guestId) { const g = guestById(p.guestId); gname = g ? g.name : '—'; }
    if (gname === '—' && p.stayId) { const st = stayById(p.stayId); if (st) gname = getGuestName(st); }
    const cls = p.payClass || 'ingreso';
    const isEgreso = cls === 'egreso' || cls === 'egreso_deposito';
    rows += `<tr>`
      + `<td><span style="font-family:'DM Mono','Courier New',monospace;color:var(--gold)">${p.invoiceNum || p.id}</span></td>`
      + `<td>${fmtDate(p.date)}</td>`
      + `<td class="fw-600">${gname}</td>`
      + `<td style="color:var(--text2)">${p.concept || '—'}</td>`
      + `<td>${statusBadge(cls)}</td>`
      + `<td>${statusBadge(p.type)}</td>`
      + `<td class="fw-600 ${isEgreso ? 'text-red' : 'text-gold'}">${isEgreso ? '- ' : ''}${fmtMoney(p.amount)}</td>`
      + `<td><button class="btn btn-sm btn-secondary" onclick="viewInvoice('${p.id}')">Ticket</button></td>`
      + `</tr>`;
  }
  return rows;
}

function pendingKeyDepsHtml(pending) {
  if (!pending.length) return '';
  let html = `<div class="card" style="margin-bottom:20px;border:1px solid var(--blue)">`
    + `<div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M12 8a4 4 0 11-7.5-2.5L1 9V6l3-3V1h3l2 2h2l2 2v2zM8 8v1"/></svg> Depósitos de Llave Pendientes de Devolución</h4></div>`
    + `<div style="padding:12px">`;
  for (const s of pending) {
    const rm = roomById(s.roomId);
    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--dark3);border-radius:8px;margin-bottom:8px">`
      + `<div><span class="fw-600">${getGuestName(s)}</span> <span style="color:var(--text3)">· Hab. ${rm ? rm.number : '?'}</span></div>`
      + `<div style="display:flex;align-items:center;gap:12px">`
      + `<span class="text-blue fw-600">${fmtMoney(s.keyDeposit)}</span>`
      + `<button class="btn btn-sm btn-primary" onclick="returnKeyDeposit('${s.id}')">Devolver</button>`
      + `</div></div>`;
  }
  html += `</div></div>`;
  return html;
}

export function render_payments(){
  if (window._paymentsTab === 'depositos') { render_deposits_control(); return; }
  if (!window._paymentsTab) window._paymentsTab = 'movimientos';
  renderTopbar();
  const { totals, monthTotals, todayTotals } = computeTotals();
  const ventasDia = todayTotals.ingreso;
  const ventasMes = monthTotals.ingreso;
  const saldoTotal = (totals.ingreso + totals.ingreso_deposito) - (totals.egreso + totals.egreso_deposito);
  const saldoHoy = (todayTotals.ingreso + todayTotals.ingreso_deposito) - (todayTotals.egreso + todayTotals.egreso_deposito);
  const pending = pendingKeyDeps();
  document.getElementById('page-content').innerHTML =
    paymentsTabHtml()
    + `<div class="card" style="margin-bottom:20px;border:2px solid var(--gold);background:linear-gradient(135deg, rgba(212,175,55,0.08), transparent)">`
    + `<div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M7 3h6a1 1 0 011 1v1H6V4a1 1 0 011-1zM4 5h12v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"/></svg> Corte de caja</h4></div>`
    + `<div style="padding:16px">`
    + `<div class="stats-grid" style="margin-bottom:0">`
    + `<div class="stat-card green"><div class="stat-label">Ventas del día</div><div class="stat-value">${fmtMoney(ventasDia)}</div><div class="stat-sub">Ingresos por venta hoy</div></div>`
    + `<div class="stat-card blue"><div class="stat-label">Ventas del mes</div><div class="stat-value">${fmtMoney(ventasMes)}</div><div class="stat-sub">Ingresos por venta en ${today().slice(0, 7)}</div></div>`
    + `<div class="stat-card ${saldoTotal >= 0 ? 'gold' : 'red'}"><div class="stat-label">Saldo en caja</div><div class="stat-value">${fmtMoney(saldoTotal)}</div><div class="stat-sub">Hoy: ${fmtMoney(saldoHoy)} (ingresos − egresos)</div></div>`
    + `</div></div></div>`
    + `<div class="stats-grid" style="margin-bottom:20px">`
    + `<div class="stat-card green"><div class="stat-label">Ingresos totales</div><div class="stat-value">${fmtMoney(totals.ingreso)}</div><div class="stat-sub">+${fmtMoney(todayTotals.ingreso)} hoy</div></div>`
    + `<div class="stat-card red"><div class="stat-label">Egresos totales</div><div class="stat-value">${fmtMoney(totals.egreso)}</div><div class="stat-sub">-${fmtMoney(todayTotals.egreso)} hoy</div></div>`
    + `<div class="stat-card blue"><div class="stat-label">Depósitos llaves</div><div class="stat-value">${fmtMoney(totals.ingreso_deposito)}</div><div class="stat-sub">${pending.length} pendientes dev.</div></div>`
    + `<div class="stat-card ${saldoTotal >= 0 ? 'gold' : 'red'}"><div class="stat-label">Saldo en caja</div><div class="stat-value">${fmtMoney(saldoTotal)}</div><div class="stat-sub">Hoy: ${fmtMoney(saldoHoy)}</div></div>`
    + `</div>`
    + pendingKeyDepsHtml(pending)
    + `<div class="card"><div class="card-header"><h4>Movimientos de Caja</h4></div><table>`
    + `<thead><tr><th>N°</th><th>Fecha</th><th>Huésped</th><th>Concepto</th><th>Tipo</th><th>Forma</th><th>Monto</th><th></th></tr></thead>`
    + `<tbody>` + (paymentRows() || `<tr><td colspan="8"><div class="empty-state"><p>Sin movimientos</p></div></td></tr>`) + `</tbody>`
    + `</table></div>`;
}

function render_deposits_control(){
  renderTopbar();
  document.getElementById('page-content').innerHTML = paymentsTabHtml();
  let rows = '';
  let totalCobrado = 0, totalDevuelto = 0, totalPendiente = 0;
  for (let i = DB.stays.length - 1; i >= 0; i--){
    const s = DB.stays[i];
    if (!s.keyDeposit || s.keyDeposit <= 0) continue;
    const rm = roomById(s.roomId);
    const gname = getGuestName(s);
    const cobrado = s.keyDeposit;
    let devuelto = 0;
    for (const p of DB.payments) {
      if (p.stayId === s.id && p.payClass === 'egreso_deposito') devuelto += parseFloat(p.amount || 0);
    }
    const pendiente = cobrado - devuelto;
    totalCobrado += cobrado;
    totalDevuelto += devuelto;
    totalPendiente += Math.max(0, pendiente);
    let statusIcon;
    if (s.keyDepositReturned) statusIcon = `<span class="badge badge-green">${icn('check')} Devuelto</span>`;
    else if (s.status === 'activa') statusIcon = `<span class="badge badge-blue">Huésped activo</span>`;
    else statusIcon = `<span class="badge badge-orange">Pendiente</span>`;
    rows += `<tr>`
      + `<td class="fw-600">${gname}</td>`
      + `<td>${rm ? rm.number : '?'}</td>`
      + `<td>${fmtDate(s.checkIn)}</td>`
      + `<td>${s.checkOut ? fmtDate(s.checkOut) : '<span style="color:var(--green)">Activo</span>'}</td>`
      + `<td class="text-blue fw-600">${fmtMoney(cobrado)}</td>`
      + `<td class="text-green fw-600">${fmtMoney(devuelto)}</td>`
      + `<td class="${pendiente > 0 ? 'text-gold' : 'text-green'} fw-600">${fmtMoney(Math.max(0, pendiente))}</td>`
      + `<td>${statusIcon}</td>`
      + `<td>${s.status === 'finalizada' && !s.keyDepositReturned && pendiente > 0
        ? `<button class="btn btn-sm btn-primary" onclick="returnKeyDeposit('${s.id}')">Devolver</button>`
        : s.status === 'activa'
          ? `<button class="btn btn-sm btn-secondary" onclick="navigate('reception')">Ver estadía</button>`
          : '<span style="color:var(--text3);font-size:0.8rem">—</span>'}</td>`
      + `</tr>`;
  }
  document.getElementById('page-content').innerHTML +=
    `<div class="stats-grid" style="margin-bottom:20px">`
    + `<div class="stat-card blue"><div class="stat-label">Total cobrado</div><div class="stat-value">${fmtMoney(totalCobrado)}</div><div class="stat-sub">Depósitos recibidos</div></div>`
    + `<div class="stat-card green"><div class="stat-label">Total devuelto</div><div class="stat-value">${fmtMoney(totalDevuelto)}</div><div class="stat-sub">Devoluciones procesadas</div></div>`
    + `<div class="stat-card gold"><div class="stat-label">Pendiente devolución</div><div class="stat-value">${fmtMoney(totalPendiente)}</div><div class="stat-sub">En resguardo</div></div>`
    + `</div>`
    + `<div class="card"><div class="card-header"><h4><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M12 8a4 4 0 11-7.5-2.5L1 9V6l3-3V1h3l2 2h2l2 2v2zM8 8v1"/></svg> Historial de Depósitos de Llave</h4></div>`
    + `<table><thead><tr><th>Huésped</th><th>Hab.</th><th>Check-in</th><th>Check-out</th><th>Cobrado</th><th>Devuelto</th><th>Pendiente</th><th>Estado</th><th></th></tr></thead>`
    + `<tbody>` + (rows || `<tr><td colspan="9"><div class="empty-state"><p>Sin depósitos registrados</p></div></td></tr>`) + `</tbody>`
    + `</table></div>`;
}

export function returnKeyDeposit(stayId){
  const stay = stayById(stayId); if(!stay) return;
  const rm = roomById(stay.roomId);
  window.openModal(
    `<div class="modal-header"><h3>Devolver Depósito de Llave</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="detail-row"><span class="detail-label">Huésped</span><span class="detail-value fw-600">${getGuestName(stay)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Habitación</span><span class="detail-value">${rm ? rm.number : '?'}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Monto a devolver</span><span class="detail-value fw-600 text-gold">${fmtMoney(stay.keyDeposit)}</span></div>`
    + `<div class="form-group" style="margin-top:14px"><label>Método de devolución</label>`
    + `<select id="kd-paytype"><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select></div>`
    + `</div>`
    + `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="doReturnKeyDeposit('${stayId}')">${icn('check')} Devolver</button></div>`
  );
}

function doReturnKeyDeposit(stayId){
  const stay = stayById(stayId); if(!stay) return;
  const rm = roomById(stay.roomId);
  const payType = document.getElementById('kd-paytype').value;
  stay.keyDepositReturned = true;
  DB.payments.push({
    id: genId('P'), stayId: stayId, guestId: stay.guestId, amount: stay.keyDeposit, type: payType,
    concept: `Devolución depósito llave hab. ${rm ? rm.number : '?'}`, payClass: 'egreso_deposito', date: today(),
    invoiceNum: 'F-' + pad3(DB.payments.length + 1)
  });
  saveDB();
  window.toast('Depósito devuelto: ' + fmtMoney(stay.keyDeposit), 'success');
  window.closeModal(); render_payments();
  window.openTicketPreview(DB.payments[DB.payments.length - 1].id);
}

export function openPaymentModal(){
  window.openModal(
    `<div class="modal-header"><h3>Registrar Movimiento</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="form-group"><label>Concepto</label><input id="pay-concept" placeholder="Descripción"></div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Monto (Q)</label><input type="number" id="pay-amount" value="0" min="0" step="0.01" oninput="syncPayCardFee()"></div>`
    + `<div class="form-group"><label>Tipo de movimiento</label>`
    + `<select id="pay-class" onchange="syncPayCardFee()"><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option><option value="ingreso_deposito">Depósito (ingreso)</option><option value="egreso_deposito">Devolución depósito</option></select>`
    + `</div></div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Forma de pago</label><select id="pay-type" onchange="syncPayCardFee()"><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select></div>`
    + `<div class="form-group"><label>Fecha</label><input type="date" id="pay-date" value="${today()}"></div>`
    + `</div>`
    + `<div id="pay-cardfee-hint"></div>`
    + `</div>`
    + `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="savePayment()">Registrar</button></div>`
  );
  setTimeout(syncPayCardFee, 0);
}

function syncPayCardFee(){
  const amtEl = document.getElementById('pay-amount');
  const ptEl = document.getElementById('pay-type');
  const pcEl = document.getElementById('pay-class');
  const box = document.getElementById('pay-cardfee-hint');
  if (!box || !amtEl || !ptEl || !pcEl) return;
  const sub = parseFloat(amtEl.value) || 0;
  if (shouldApplyCardFee(pcEl.value, ptEl.value))
    box.innerHTML = cardFeeHintHtml(sub, ptEl.value);
  else {
    let note = `<div style="font-size:0.72rem;color:var(--text3);margin-top:8px">`;
    if (ptEl.value === 'tarjeta' && (pcEl.value === 'egreso' || pcEl.value === 'egreso_deposito'))
      note += 'Egresos / devoluciones: se registra el monto indicado sin recargo de comisión.';
    else note += 'Sin recargo de comisión en este tipo de movimiento o forma de pago.';
    note += '</div>';
    box.innerHTML = note;
  }
}

export function savePayment(){
  let amount = parseFloat(document.getElementById('pay-amount').value) || 0;
  if (amount < 0) amount = 0;
  if (amount <= 0) { window.toast('Ingresa monto', 'error'); return; }
  const payType = document.getElementById('pay-type').value;
  const payClass = document.getElementById('pay-class').value;
  const concept = document.getElementById('pay-concept').value;
  const pdate = document.getElementById('pay-date').value;
  const row = {
    id: genId('P'), stayId: null, guestId: '',
    type: payType, payClass, concept, date: pdate,
    invoiceNum: 'F-' + pad3(DB.payments.length + 1)
  };
  const rec = DB.payments[DB.payments.push(applyCardFeeToPaymentRecord(row, amount, payType)) - 1];
  saveDB();
  window.toast('Movimiento registrado', 'success'); window.closeModal(); render_payments();
  window.openTicketPreview(rec.id);
  logAudit('Movimiento de caja', (payClass === 'ingreso' || payClass === 'ingreso_deposito' ? 'Ingreso' : 'Egreso') + ' ' + fmtMoney(rec.amount) + ' - ' + (concept || ''));
}

window.render_payments = render_payments;
window.render_deposits_control = render_deposits_control;
window.returnKeyDeposit = returnKeyDeposit;
window.doReturnKeyDeposit = doReturnKeyDeposit;
window.openPaymentModal = openPaymentModal;
window.syncPayCardFee = syncPayCardFee;
window.savePayment = savePayment;
