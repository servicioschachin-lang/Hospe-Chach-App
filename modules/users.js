import { DB, genId, saveDB, logAudit } from './db.js';
import { icn } from './icons.js';

const ROLE_BADGE = {admin:'badge-gold', superadmin:'badge-purple', recepcionista:'badge-blue', housekeeping:'badge-green', contabilidad:'badge-purple'};

export function render_users(){
  if(window.currentUser.role !== 'admin' && window.currentUser.role !== 'superadmin'){window.toast('Acceso restringido','error');return;}
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="openUserModal(null)">+ Nuevo Usuario</button>`;
  let rows = '';
  for (const u of DB.users){
    if (u.role === 'superadmin' && window.currentUser.role !== 'superadmin') continue;
    rows += `<tr><td class="fw-600">${window.sanitize(u.name)}</td><td><span style="font-family:'DM Mono','Courier New',monospace">${window.sanitize(u.username)}</span></td>`
      + `<td><span class="badge ${(ROLE_BADGE[u.role] || 'badge-gray')}">${window.roleLabel(u.role)}</span></td>`
      + `<td><div class="flex gap-2"><button class="btn btn-sm btn-secondary" onclick="openUserModal('${u.id}')">${icn('edit')}</button>`
      + (u.id !== window.currentUser.id && u.role !== 'superadmin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">${icn('close')}</button>` : '')
      + `</div></td></tr>`;
  }
  document.getElementById('page-content').innerHTML = `<div class="card"><table><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function openUserModal(id){
  const u = id ? DB.users.find(x => x.id === id) : null;
  if (u && u.role === 'superadmin' && window.currentUser.role !== 'superadmin') {window.toast('No puedes editar al Super Admin','error');return;}
  const roles = ['admin','recepcionista','housekeeping','contabilidad'];
  if (window.currentUser.role === 'superadmin') roles.push('superadmin');
  const roleOpts = roles.map(r => `<option value="${r}" ${u && u.role === r ? 'selected' : ''}>${window.roleLabel(r)}</option>`).join('');
  window.openModal(
    `<div class="modal-header"><h3>${u ? 'Editar' : 'Nuevo'} Usuario</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="form-group"><label>Nombre</label><input id="usr-name" value="${u ? window.escapeAttr(u.name) : ''}" placeholder="Nombre completo"></div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Usuario</label><input id="usr-username" value="${u ? window.escapeAttr(u.username) : ''}" placeholder="login"></div>`
    + `<div class="form-group"><label>Contraseña</label><input type="password" id="usr-pass" placeholder="${u ? '(sin cambios)' : 'Nueva contraseña'}"></div>`
    + `</div>`
    + `<div class="form-group"><label>Rol</label><select id="usr-role">${roleOpts}</select></div>`
    + `</div>`
    + `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveUser('${u ? u.id : ''}')">Guardar</button></div>`
  );
}

export async function saveUser(id){
  const name = document.getElementById('usr-name').value.trim();
  const username = document.getElementById('usr-username').value.trim();
  const pass = document.getElementById('usr-pass').value;
  if (!name || !username) {window.toast('Nombre y usuario requeridos','error');return;}
  if (!id) {
    if (!pass) {window.toast('Ingresa contraseña','error');return;}
    if (DB.users.some(u => u.username === username)) {window.toast('Usuario ya existe','error');return;}
    const hashedPass = await window.hashPassword(pass);
    DB.users.push({id: genId('U'), name, username, password: hashedPass, role: document.getElementById('usr-role').value});
    logAudit('Usuario creado', `Nuevo usuario: ${username} - ${document.getElementById('usr-role').value}`);
    window.toast('Usuario creado','success');
  } else {
    const u = DB.users.find(x => x.id === id);
    if (u) {
      u.name = name;
      u.username = username;
      u.role = document.getElementById('usr-role').value;
      if (pass) u.password = await window.hashPassword(pass);
    }
    logAudit('Usuario actualizado', `Edición: ${username}`);
    window.toast('Actualizado','success');
  }
  saveDB(); window.closeModal(); render_users();
}

export function deleteUser(id){
  if (!confirm('¿Eliminar este usuario?')) return;
  const u = DB.users.find(x => x.id === id);
  if (u && u.role === 'superadmin') {window.toast('No se puede eliminar al Super Admin','error');return;}
  DB.users = DB.users.filter(x => x.id !== id);
  if (u) logAudit('Usuario eliminado', `Baja: ${u.username}`);
  saveDB(); window.toast('Eliminado','info'); render_users();
}

window.render_users = render_users;
window.openUserModal = openUserModal;
window.saveUser = saveUser;
window.deleteUser = deleteUser;
