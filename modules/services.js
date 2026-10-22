import { DB, genId, saveDB } from './db.js';
import { svcById } from './lookup.js';
import { fmtMoney } from './utils.js';
import { icn } from './icons.js';

const CAT_ICONS = {
  restaurante: '<svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M5 4l2 8h6l2-8H5zm1 10h8v2H6v-2z"/></svg>',
  lavanderia: '<svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M6 5v10h8V5H6zm1 2h6v6H7V7zM4 8v4H2V8h2zm12 0h2v4h-2V8z"/></svg>',
  transporte: '<svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M3 5v10h14V5H3zm2 2h10v6H5V7zm2 1v4h6V8H7z"/></svg>',
  tours: '<svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M3 3h14v14H3V3zm2 2v10h10V5H5zm2 2h6v2H7V7zm0 4h6v2H7v-2z"/></svg>',
  minibar: '<svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M7 16c-1.1 0-2-.9-2-2 0-1.5 2-4 2-4s2 2.5 2 4c0 1.1-.9 2-2 2zm6 0c-1.1 0-2-.9-2-2 0-1.5 2-4 2-4s2 2.5 2 4c0 1.1-.9 2-2 2zM3 8h14v1H3V8z"/></svg>',
  spa: '<svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M14 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-4 10v-2l4-4-1-1-4 4H7l-1 3h4zm-3-7c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1z"/></svg>'
};

export function render_services(){
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="openServiceModal(null)">+ Nuevo</button>`;
  let rows = '';
  for (const s of DB.services){
    let uses = 0;
    for (const stay of DB.stays){
      const svcs = stay.services || [];
      uses += svcs.filter(svc => svc.serviceId === s.id).length;
    }
    rows += `<tr><td class="fw-600">${CAT_ICONS[s.category] || icn('tag')} ${s.name}</td><td><span style="color:var(--text3)">${s.category}</span></td><td class="fw-600 text-gold">${fmtMoney(s.price)}</td><td>${uses}</td>`
      + `<td><div class="flex gap-2">`
      + `<button class="btn btn-sm btn-secondary" onclick="openServiceModal('${s.id}')">${icn('edit')}</button>`
      + `<button class="btn btn-sm btn-danger" onclick="deleteService('${s.id}')">${icn('close')}</button>`
      + `</div></td></tr>`;
  }
  document.getElementById('page-content').innerHTML = `<div class="card"><table><thead><tr><th>Servicio</th><th>Categoría</th><th>Precio</th><th>Usos</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function openServiceModal(id){
  const s = id ? svcById(id) : null;
  const cats = ['restaurante','lavanderia','transporte','tours','minibar','spa','otros'];
  const catOpts = cats.map(c => `<option value="${c}" ${s && s.category === c ? 'selected' : ''}>${c}</option>`).join('');
  window.openModal(
    `<div class="modal-header"><h3>${s ? 'Editar' : 'Nuevo'} Servicio</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="form-group"><label>Nombre</label><input id="sv-name" value="${s ? s.name : ''}" placeholder="Desayuno continental"></div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Categoría</label><select id="sv-cat">${catOpts}</select></div>`
    + `<div class="form-group"><label>Precio (Q)</label><input type="number" id="sv-price" value="${s ? s.price : 0}" min="0"></div>`
    + `</div></div>`
    + `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveService('${s ? s.id : ''}')">Guardar</button></div>`
  );
}

export function saveService(id){
  const name = document.getElementById('sv-name').value.trim();
  if(!name){window.toast('Ingresa nombre','error');return;}
  const price = parseFloat(document.getElementById('sv-price').value) || 0;
  const cat = document.getElementById('sv-cat').value;
  if(!id){
    DB.services.push({id: genId('SV'), name, category: cat, price});
    window.toast('Servicio creado','success');
  } else {
    const s = svcById(id);
    s.name = name; s.category = cat; s.price = price;
    window.toast('Actualizado','success');
  }
  saveDB(); window.closeModal(); render_services();
}

export const deleteService = (id) => {
  if(!confirm('¿Eliminar?')) return;
  DB.services = DB.services.filter(s => s.id !== id);
  saveDB(); window.toast('Eliminado','info'); render_services();
};

window.render_services = render_services;
window.openServiceModal = openServiceModal;
window.saveService = saveService;
window.deleteService = deleteService;
