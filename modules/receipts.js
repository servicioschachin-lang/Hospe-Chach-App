import { fmtMoney, fmtDate, pad3 } from './utils.js';
import { icn } from './icons.js';

function esc(s){
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function buildTicketHtml(rec, opts = {}) {
  const gname = rec.guestName || rec.guest || '—';
  const guest = typeof gname === 'string' ? gname : (gname && gname.name);
  const roomNum = rec.roomNumber || rec.room;
  const fecha = rec.date || rec.fecha || rec.fecha_emision || todayISO();
  const items = rec.items || [];
  let totalItems = 0;
  let totalTax = 0;
  for (const it of items) {
    const price = it.price || it.precio || 0;
    const qty = it.qty || it.cantidad || 1;
    totalItems += (price * qty);
    totalTax += it.tax || 0;
  }
  const subtotal = totalItems - totalTax;
  const total = totalItems;
  const payments = rec.payments || [{type: rec.type || 'efectivo', amount: rec.amount || total}];
  let payHtml = '';
  let totalPay = 0;
  for (const p of payments) {
    const pa = parseFloat(p.amount || 0);
    totalPay += pa;
    payHtml += `<div class="ticket-line"><span>${(p.type || p.forma || 'Efectivo').toUpperCase()}</span><span>${fmtMoney(pa)}</span></div>`;
  }
  const cambio = totalPay - total;
  const isPagoParcial = totalPay < total;
  const notaStr = rec.nota || rec.notas || (opts && opts.nota) || '';
  const notesArr = notaStr ? notaStr.split('\n').filter(Boolean) : [];
  let notesHtml = notesArr.length ? `<div class="ticket-section"><div class="ticket-notes">${notesArr.map(n => `<div>${esc(n)}</div>`).join('')}</div>` : '<div class="ticket-section"></div>';
  const logoHtml = `<svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" style="display:block;margin:0 auto 8px;color:var(--gold)"><path d="M12 2l3 9h9l-7 5 3 9-7-5-7 5 3-9-7-5h9z"/></svg>`;
  const footerNote = opts.footerNote || '¡Gracias por su estancia!';

  return `${logoHtml}`
    + `<div style="text-align:center;font-family:monospace;font-size:0.75rem;margin:8px 0">${esc('Hospe Chach App')}</div>`
    + `<div style="font-size:0.68rem;color:var(--text3);text-align:center;margin-bottom:12px">`
    + `${esc('Hotel PWA (sin conexión) · Ticket de salida')}<br>`
    + `${esc('Fecha: ' + fmtDate(fecha))}`
    + `</div>`
    + `<div class="ticket-divider"></div>`
    + `<div class="ticket-section"><div class="ticket-line"><span>Factura #</span><span>${esc(rec.invoiceNum || rec.numero || 'F-' + pad3(Math.floor(Math.random() * 1000)))}</span></div>`
    + `<div class="ticket-line"><span>Habitación</span><span>${esc(roomNum || '?')}</span></div>`
    + `<div class="ticket-line fw-600"><span>${esc(guest)}</span><span></span></div></div>`
    + `<div class="ticket-divider"></div>`
    + `<div class="ticket-section">`
    + `<div class="ticket-line"><span>Concepto</span><span style="text-align:right">Importe</span></div>`
    + items.map(it => `<div class="ticket-line"><span>${esc(it.name || it.concepto)}</span><span>${fmtMoney(it.price * (it.qty || 1))}</span></div>`).join('')
    + `<div class="ticket-divider"></div>`
    + `<div class="ticket-line fw-600"><span>SUBTOTAL</span><span>${fmtMoney(subtotal)}</span></div>`
    + `<div class="ticket-line"><span>IMPUESTO</span><span>${fmtMoney(totalTax)}</span></div>`
    + `<div class="ticket-line fw-600" style="font-size:1.15rem;border-top:2px dashed var(--border);padding-top:8px;margin-top:8px">`
    + `<span>TOTAL</span><span>${fmtMoney(total)}</span></div>`
    + `</div>`
    + notesHtml
    + `<div class="ticket-section">`
    + `<div class="ticket-line"><span>Pagos recibidos</span><span style="text-align:right">Monto</span></div>`
    + payHtml
    + `<div class="ticket-divider"></div>`
    + `<div class="ticket-line"><span>Total pagado</span><span>${fmtMoney(totalPay)}</span></div>`
    + `<div class="ticket-line ${cambio >= 0 ? 'text-green' : 'text-red'} fw-600"><span> Cambio</span><span>${fmtMoney(cambio)}</span></div>`
    + `<div class="ticket-line ${isPagoParcial ? 'text-gold' : 'text-green'} fw-600"><span>${isPagoParcial ? 'Saldo pendiente' : 'Pago completo'} </span><span>${isPagoParcial ? fmtMoney(total - totalPay) : '✓'}</span></div>`
    + `</div>`
    + `<div style="text-align:center;font-size:0.62rem;color:var(--text3);margin-top:14px">${esc(footerNote)}<br>${icn('copy')} ${esc(new Date().toLocaleTimeString('es-GT'))}</div>`;
}

function todayISO(){
  return new Date().toISOString().slice(0, 10);
}

window.buildTicketHtml = buildTicketHtml;
