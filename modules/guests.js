import { DB, genId, saveDB } from './db.js';
import { guestById } from './lookup.js';
import { fmtMoney } from './utils.js';
import { icn } from './icons.js';

export function quickCreateGuest(name, document_, phone, email){
  if(document_){
    const existing = DB.guests.find(g => g.document === document_);
    if (existing) return existing.id;
  }
  const id = genId('G');
  DB.guests.push({id, name, document: document_, phone: phone||'', email: email||'', notes: ''});
  return id;
}

export function render_guests(){
  document.getElementById('topbar-actions').innerHTML =
    `<button class="btn btn-primary btn-sm" onclick="openGuestModal(null)">+ Nuevo Huésped</button>`;
  let rows = '';
  for (const g of DB.guests){
    const stays = DB.stays.filter(s => s.guestId === g.id).length;
    let spent = 0;
    for (const j of DB.payments) if (j.guestId === g.id && j.payClass === 'ingreso') spent += parseFloat(j.amount||0);
    rows += `<tr>`
      + `<td class="fw-600">${g.name}</td>`
      + `<td><span style="font-family:'DM Mono','Courier New',monospace">${g.document}</span></td>`
      + `<td>${g.phone}</td>`
      + `<td style="color:var(--text3)">${g.email}</td>`
      + `<td>${stays}</td>`
      + `<td class="text-gold fw-600">${fmtMoney(spent)}</td>`
      + `<td><div class="flex gap-2"><button class="btn btn-sm btn-secondary" onclick="openGuestModal('${g.id}')">${icn('edit')}</button></div></td>`
      + `</tr>`;
  }
  document.getElementById('page-content').innerHTML =
    `<div class="card"><table>`
    + `<thead><tr><th>Nombre</th><th>Documento</th><th>Teléfono</th><th>Email</th><th>Estadías</th><th>Gasto</th><th></th></tr></thead>`
    + `<tbody>` + (rows || `<tr><td colspan="7"><div class="empty-state"><div class="icon"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M10 9a4 4 0 100-8 4 4 0 000 8zm-7 9v-1a3 3 0 013-3h8a3 3 0 013 3v1"/></svg></div><p>No hay huéspedes</p></div></td></tr>`) + `</tbody>`
    + `</table></div>`;
}

export function openGuestModal(id){
  const g = id ? guestById(id) : null;
  window.openModal(
    `<div class="modal-header"><h3>${g?'Editar Huésped':'Nuevo Huésped'}</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="form-group"><label>Nombre completo</label><input id="gl-name" value="${g?g.name:''}" placeholder="Juan Pérez"></div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Documento</label><input id="gl-doc" value="${g?g.document:''}" placeholder="DPI/Pasaporte"></div>`
    + `<div class="form-group"><label>Teléfono</label><input id="gl-phone" value="${g?g.phone:''}" placeholder="502-XXXX-XXXX"></div>`
    + `</div>`
    + `<div class="form-group"><label>Email</label><input id="gl-email" type="email" value="${g?g.email:''}" placeholder="correo@ejemplo.com"></div>`
    + `<div class="form-group"><label>Notas</label><textarea id="gl-notes" rows="2">${g?g.notes:''}</textarea></div>`
    + `</div>`
    + `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveGuest('${g?g.id:''}')">Guardar</button></div>`
  );
}

export function saveGuest(id){
  const name = document.getElementById('gl-name').value.trim();
  const doc = document.getElementById('gl-doc').value.trim();
  if(!name){window.toast('Nombre requerido','error');return;}
  if(!id){
    DB.guests.push({
      id: genId('G'),
      name, document: doc,
      phone: document.getElementById('gl-phone').value,
      email: document.getElementById('gl-email').value,
      notes: document.getElementById('gl-notes').value
    });
    window.toast('Huésped registrado','success');
  } else {
    const g = guestById(id);
    g.name = name; g.document = doc;
    g.phone = document.getElementById('gl-phone').value;
    g.email = document.getElementById('gl-email').value;
    g.notes = document.getElementById('gl-notes').value;
    window.toast('Actualizado','success');
  }
  saveDB(); window.closeModal();
  if(window.currentPage === 'guests') render_guests();
}

export function guestInlineForm(prefix, prefillSnap) {
  const snap = prefillSnap || {name:'',document:'',phone:'',email:''};
  return `<div style="background:var(--dark3);border-radius:8px;padding:14px;margin-bottom:12px">`
    + `<div style="font-size:0.75rem;color:var(--text3);letter-spacing:1px;margin-bottom:10px">DATOS DEL HUÉSPED</div>`
    + `<div class="form-group" style="margin-bottom:8px"><label>Nombre completo *</label><input id="${prefix}-name" value="${snap.name}" placeholder="Juan Pérez" oninput="guestAutocomplete('${prefix}')"></div>`
    + `<div id="${prefix}-autocomplete" style="display:none;background:var(--dark2);border:1px solid var(--border);border-radius:6px;margin-top:-4px;margin-bottom:8px;max-height:120px;overflow-y:auto"></div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>DPI / Pasaporte *</label><input id="${prefix}-doc" value="${snap.document}" placeholder="12345678"></div>`
    + `<div class="form-group"><label>Teléfono</label><input id="${prefix}-phone" value="${snap.phone}" placeholder="502-XXXX-XXXX"></div>`
    + `</div>`
    + `<div class="form-group" style="margin-bottom:0"><label>Email</label><input id="${prefix}-email" value="${snap.email||''}" placeholder="Opcional"></div>`
    + `</div>`;
}

export function guestAutocomplete(prefix) {
  const val = document.getElementById(prefix+'-name').value.toLowerCase();
  const box = document.getElementById(prefix+'-autocomplete');
  if(!box) return;
  if(val.length < 2){box.style.display='none';return;}
  const matches = DB.guests.filter(g => g.name.toLowerCase().indexOf(val) !== -1);
  if(!matches.length){box.style.display='none';return;}
  let html = '';
  for (let i = 0; i < Math.min(matches.length, 5); i++){
    const g = matches[i];
    html += `<div style="padding:8px 12px;cursor:pointer;font-size:0.85rem;border-bottom:1px solid var(--border)" onmousedown="fillGuestForm('${prefix}','${g.id}')">${g.name} <span style="color:var(--text3)">${g.document}</span></div>`;
  }
  box.innerHTML = html; box.style.display = 'block';
}

export function fillGuestForm(prefix, guestId) {
  const g = guestById(guestId); if(!g) return;
  const n = document.getElementById(prefix+'-name');  if(n) n.value = g.name;
  const d = document.getElementById(prefix+'-doc');   if(d) d.value = g.document;
  const p = document.getElementById(prefix+'-phone'); if(p) p.value = g.phone;
  const e = document.getElementById(prefix+'-email'); if(e) e.value = g.email;
  const box = document.getElementById(prefix+'-autocomplete');
  if(box) box.style.display = 'none';
}

export function readGuestForm(prefix) {
  const name = (document.getElementById(prefix+'-name')||{}).value||''.trim();
  const doc = (document.getElementById(prefix+'-doc') ||{}).value||''.trim();
  const phone = (document.getElementById(prefix+'-phone')||{}).value||'';
  const email = (document.getElementById(prefix+'-email')||{}).value||'';
  if(!name){return null;}
  const id = quickCreateGuest(name, doc, phone, email);
  return {id, snap:{name, document: doc, phone, email}};
}

window.quickCreateGuest = quickCreateGuest;
window.render_guests = render_guests;
window.openGuestModal = openGuestModal;
window.saveGuest = saveGuest;
window.guestInlineForm = guestInlineForm;
window.guestAutocomplete = guestAutocomplete;
window.fillGuestForm = fillGuestForm;
window.readGuestForm = readGuestForm;
