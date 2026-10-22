import { DB, genId, saveDB, logAudit } from './db.js';
import { icn } from './icons.js';
import { fmtMoney } from './utils.js';

const salaryTypeLabel = (t) => {
  const m = {diario:'Diario', semanal:'Semanal', mensual:'Mensual'};
  return m[t] || t || '—';
};

export function render_workers(){
  if(window.currentUser.role !== 'admin' && window.currentUser.role !== 'superadmin'){window.toast('Acceso restringido','error');return;}
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="openWorkerModal(null)">+ Nuevo Trabajador</button>`;
  const list = DB.workers || [];
  let rows = '';
  for (const w of list){
    rows += `<tr><td class="fw-600">${w.name}</td><td>${w.position||'—'}</td><td><span class="badge badge-blue">${salaryTypeLabel(w.salaryType)}</span></td><td class="fw-600 text-gold">${fmtMoney(w.salaryAmount||0)}</td><td>${w.phone||'—'}</td><td><div class="flex gap-2"><button class="btn btn-sm btn-secondary" onclick="openWorkerModal('${w.id}')">${icn('edit')}</button><button class="btn btn-sm btn-danger" onclick="deleteWorker('${w.id}')">${icn('close')}</button></div></td></tr>`;
  }
  document.getElementById('page-content').innerHTML =
    `<div class="card">`
    + `<p style="color:var(--text3);font-size:0.9rem;margin-bottom:16px">Registra trabajadores para futuros pagos de nómina (salario diario, semanal o mensual).</p>`
    + `<table><thead><tr><th>Nombre</th><th>Cargo / Puesto</th><th>Tipo salario</th><th>Monto</th><th>Teléfono</th><th>Acciones</th></tr></thead><tbody>`
    + (rows || `<tr><td colspan="6"><div class="empty-state"><p>Sin trabajadores registrados</p><button class="btn btn-primary btn-sm" onclick="openWorkerModal(null)">+ Agregar primer trabajador</button></div></td></tr>`)
    + `</tbody></table></div>`;
}

export function openWorkerModal(id){
  const w = id ? (DB.workers || []).find(x => x.id === id) : null;
  const typeOpts = ['diario','semanal','mensual'].map(t =>
    `<option value="${t}" ${w && w.salaryType === t ? 'selected' : ''}>${salaryTypeLabel(t)}</option>`
  ).join('');
  window.openModal(
    `<div class="modal-header"><h3>${w?'Editar':'Nuevo'} Trabajador</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="form-group"><label>Nombre completo</label><input id="wrk-name" value="${w ? w.name : ''}" placeholder="Nombre del trabajador"></div>`
    + `<div class="form-group"><label>Cargo / Puesto</label><input id="wrk-position" value="${w ? w.position || '' : ''}" placeholder="Ej: Recepcionista, Limpieza"></div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Tipo de salario</label><select id="wrk-salaryType">${typeOpts}</select></div>`
    + `<div class="form-group"><label>Monto (Q)</label><input type="number" id="wrk-salaryAmount" value="${w ? w.salaryAmount || '' : ''}" placeholder="0.00" step="0.01" min="0"></div>`
    + `</div>`
    + `<div class="form-group"><label>Teléfono (opcional)</label><input id="wrk-phone" value="${w ? w.phone || '' : ''}" placeholder="Teléfono de contacto"></div>`
    + `</div>`
    + `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveWorker('${w ? w.id : ''}')">Guardar</button></div>`
  );
}

export function saveWorker(id){
  const name = document.getElementById('wrk-name').value.trim();
  const position = document.getElementById('wrk-position').value.trim();
  const salaryType = document.getElementById('wrk-salaryType').value;
  let salaryAmount = parseFloat(document.getElementById('wrk-salaryAmount').value) || 0;
  if (salaryAmount < 0) salaryAmount = 0;
  const phone = document.getElementById('wrk-phone').value.trim();
  if(!name){window.toast('Nombre requerido','error');return;}
  if(!DB.workers) DB.workers = [];
  if(!id){
    DB.workers.push({id: genId('W'), name, position, salaryType, salaryAmount, phone});
    logAudit('Trabajador creado', `Alta: ${name} - ${salaryType} ${fmtMoney(salaryAmount)}`);
    window.toast('Trabajador agregado','success');
  } else {
    const w = DB.workers.find(x => x.id === id);
    if(w){ w.name = name; w.position = position; w.salaryType = salaryType; w.salaryAmount = salaryAmount; w.phone = phone; }
    logAudit('Trabajador editado', `Edición: ${name}`);
    window.toast('Actualizado','success');
  }
  saveDB(); window.closeModal(); render_workers();
}

export function deleteWorker(id){
  if(!confirm('¿Eliminar este trabajador?')) return;
  const w = (DB.workers || []).find(x => x.id === id);
  DB.workers = (DB.workers || []).filter(x => x.id !== id);
  if(w) logAudit('Trabajador eliminado', `Baja: ${w.name}`);
  saveDB(); window.toast('Eliminado','info'); render_workers();
}

window.salaryTypeLabel = salaryTypeLabel;
window.render_workers = render_workers;
window.openWorkerModal = openWorkerModal;
window.saveWorker = saveWorker;
window.deleteWorker = deleteWorker;
