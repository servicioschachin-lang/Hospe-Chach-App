import { DB, saveDB, logAudit, genId } from './db.js';
import { roomById } from './lookup.js';
import { today, fmtDate, escapeAttr } from './utils.js';
import { icn } from './icons.js';

export let taskFilter = 'all';

export function setTaskFilter(f){ taskFilter = f; render_tasks(); }

export const taskCategoryLabel = (cat) => cat === 'mantenimiento' ? 'Mantenimiento' : 'Actividad pendiente';

const ESTADO_LABELS = {pendiente:'Pendiente', en_proceso:'En proceso', confirmado:'Confirmado', hecha:'Hecha'};
export const taskEstadoLabel = (est) => ESTADO_LABELS[est] || 'Pendiente';

export function taskEstadoBadgeClass(est){
  if (est === 'en_proceso') return 'task-estado-badge--proc';
  if (est === 'confirmado') return 'task-estado-badge--conf';
  if (est === 'hecha') return 'task-estado-badge--hecha';
  return 'task-estado-badge--pend';
}

export const taskIsClosed = (tk) => tk && (tk.estadoTarea === 'hecha' || tk.done);

const VALID_ESTADOS = ['pendiente','en_proceso','confirmado','hecha'];

function appendTaskSeguimientoEntry(t, texto){
  if (!t.seguimiento || !Array.isArray(t.seguimiento)) t.seguimiento = [];
  let hora = '';
  try { hora = new Date().toLocaleTimeString('es-GT', {timeZone: 'America/Guatemala', hour: '2-digit', minute: '2-digit'}); }
  catch(e){ hora = ''; }
  t.seguimiento.push({
    fecha: today(),
    hora,
    texto,
    autor: (window.currentUser && window.currentUser.name) ? window.currentUser.name : ''
  });
}

export function setTaskEstado(id, estado){
  if (VALID_ESTADOS.indexOf(estado) === -1) return;
  if (!DB.todos) return;
  const tIdx = DB.todos.findIndex(t => t.id === id);
  if (tIdx === -1) return;
  const t = DB.todos[tIdx];
  if (!t.seguimiento || !Array.isArray(t.seguimiento)) t.seguimiento = [];
  const prev = t.estadoTarea || 'pendiente';
  if (prev === estado) return;
  t.estadoTarea = estado;
  t.done = (estado === 'hecha');
  t.doneAt = estado === 'hecha' ? today() : '';
  appendTaskSeguimientoEntry(t, `Estado: ${taskEstadoLabel(prev)} → ${taskEstadoLabel(estado)}`);
  saveDB();
  logAudit('Tarea estado', `${t.title} · ${taskEstadoLabel(estado)}`);
  render_tasks();
}

export function taskStatusButtonsHtml(tkId, currentEst){
  const stBtns = VALID_ESTADOS;
  let h = '<div class="task-status-btns">';
  for (const st of stBtns){
    h += `<button type="button" class="btn btn-sm ${currentEst === st ? 'btn-primary' : 'btn-secondary'}" onclick="setTaskEstado('${tkId}','${st}')">${taskEstadoLabel(st)}</button>`;
  }
  h += '</div>';
  return h;
}

export function deleteTask(id){
  if (!confirm('¿Eliminar esta tarea?')) return;
  window.closeModal();
  if (!DB.todos) return;
  const idx = DB.todos.findIndex(t => t.id === id);
  if (idx === -1) return;
  const tit = DB.todos[idx].title;
  DB.todos.splice(idx, 1);
  saveDB();
  logAudit('Tarea eliminada', tit);
  render_tasks();
}

function readTaskForm() {
  return {
    title: (document.getElementById('task-title') || {}).value?.trim() || '',
    notes: (document.getElementById('task-notes') || {}).value?.trim() || '',
    cat: (document.getElementById('task-category') || {}).value || 'pendiente',
    roomId: (document.getElementById('task-room') || {}).value || '',
    due: (document.getElementById('task-due') || {}).value || '',
    pri: (document.getElementById('task-priority') || {}).value || 'media',
    followup: (document.getElementById('task-followup') || {}).value?.trim() || '',
  };
}

export function saveTask(){
  if (!DB.todos) DB.todos = [];
  const idEl = document.getElementById('task-id');
  const { title, notes, cat, roomId, due, pri, followup } = readTaskForm();
  if (!title){ window.toast('Escriba un título para la tarea', 'error'); return; }
  const category = cat !== 'mantenimiento' ? 'pendiente' : cat;
  const id = idEl && idEl.value ? idEl.value : '';
  if (id) {
    const idx = DB.todos.findIndex(t => t.id === id);
    if (idx === -1) { window.toast('No se encontró la tarea', 'error'); return; }
    const t = DB.todos[idx];
    t.title = title; t.notes = notes; t.category = category;
    t.roomId = roomId; t.dueDate = due; t.priority = pri;
    if (followup) {
      appendTaskSeguimientoEntry(t, followup);
      logAudit('Nota seguimiento tarea', `${title}: ${followup.slice(0, 80)}${followup.length > 80 ? '…' : ''}`);
    }
    t.done = (t.estadoTarea === 'hecha');
    if (t.estadoTarea === 'hecha' && !t.doneAt) t.doneAt = today();
    saveDB();
    logAudit('Tarea actualizada', title);
    window.closeModal(); render_tasks();
    return;
  }
  DB.todos.push({
    id: genId('TD'), title, notes, category, roomId, dueDate: due, priority: pri,
    estadoTarea: 'pendiente', seguimiento: [], done: false, createdAt: today(), doneAt: ''
  });
  saveDB();
  logAudit('Tarea nueva', title);
  window.closeModal(); render_tasks();
}

function roomSelectOptions(t) {
  let opts = `<option value="">— Sin habitación —</option>`;
  for (const r of DB.rooms) {
    opts += `<option value="${r.id}" ${t && t.roomId === r.id ? 'selected' : ''}>${r.number} · ${r.type}</option>`;
  }
  return opts;
}

function seguimientoHtml(seguimiento) {
  if (!seguimiento || !seguimiento.length) return '';
  let h = `<div class="form-group"><label>Historial de seguimiento</label><div style="max-height:180px;overflow-y:auto;font-size:0.82rem;border:1px solid var(--border);border-radius:8px;padding:10px;background:var(--dark3)">`;
  for (let hi = seguimiento.length - 1; hi >= 0; hi--){
    const se = seguimiento[hi];
    h += `<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border)">`
      + `<div style="color:var(--text3);font-size:0.72rem;margin-bottom:4px">${escapeAttr(se.fecha || '')}`
      + (se.hora ? ` · ${escapeAttr(se.hora)}` : '')
      + (se.autor ? ` · ${escapeAttr(se.autor)}` : '')
      + `</div>`
      + `<div>${escapeAttr(se.texto || '')}</div></div>`;
  }
  h += `</div></div>`;
  return h;
}

function catOptionsHtml(cat) {
  return `<option value="pendiente" ${cat === 'pendiente' ? 'selected' : ''}>Actividad / pendiente</option>`
    + `<option value="mantenimiento" ${cat === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>`;
}

function priOptionsHtml(pri) {
  return `<option value="baja" ${pri === 'baja' ? 'selected' : ''}>Baja</option>`
    + `<option value="media" ${pri === 'media' ? 'selected' : ''}>Media</option>`
    + `<option value="alta" ${pri === 'alta' ? 'selected' : ''}>Alta</option>`;
}

export function openTaskModal(id){
  if (!DB.todos) DB.todos = [];
  let t = null;
  if (id) t = DB.todos.find(x => x.id === id) || null;
  const roomOpts = roomSelectOptions(t);
  let title = t ? t.title : '';
  let notes = t ? t.notes || '' : '';
  let cat = t ? (t.category || 'pendiente') : 'pendiente';
  if (cat !== 'mantenimiento') cat = 'pendiente';
  let due = t ? (t.dueDate || '') : '';
  let pri = t ? (t.priority || 'media') : 'media';
  const histModal = seguimientoHtml(t && t.seguimiento);
  const followBlock = t
    ? `<div class="form-group"><label>Agregar nota de seguimiento</label><textarea id="task-followup" rows="2" placeholder="Ej. Técnico confirmó visita martes; repuesto pedido…"></textarea>`
    + `<p style="font-size:0.72rem;color:var(--text3);margin-top:6px">Se añade al historial al guardar. Los cambios de estado con los botones en la lista también se registran automáticamente.</p></div>`
    : '';
  window.openModal(
    `<div class="modal-header"><h3>${t ? 'Editar tarea' : 'Nueva tarea'}</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<input type="hidden" id="task-id" value="${t ? escapeAttr(t.id) : ''}">`
    + `<div class="form-group"><label>Título</label><input id="task-title" value="${escapeAttr(title)}" placeholder="Ej. Revisión de bomba de agua — azotea"></div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Tipo</label><select id="task-category">${catOptionsHtml(cat)}</select></div>`
    + `<div class="form-group"><label>Prioridad</label><select id="task-priority">${priOptionsHtml(pri)}</select></div></div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Habitación (opcional)</label><select id="task-room">${roomOpts}</select></div>`
    + `<div class="form-group"><label>Vencimiento (opcional)</label><input type="date" id="task-due" value="${escapeAttr(due)}"></div>`
    + `</div>`
    + `<div class="form-group"><label>Descripción / notas generales</label><textarea id="task-notes" rows="3" placeholder="Detalle fijo del caso: qué falla, datos de contacto, presupuesto…">${escapeAttr(notes)}</textarea></div>`
    + histModal + followBlock
    + `</div>`
    + `<div class="modal-footer">`
    + (t ? `<button type="button" class="btn btn-sm btn-secondary" style="color:var(--red)" onclick="deleteTask('${escapeAttr(t.id)}')">Eliminar</button>` : '')
    + `<button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>`
    + `<button type="button" class="btn btn-primary" onclick="saveTask()">${t ? 'Guardar' : 'Crear'}</button>`
    + `</div>`
  );
}

export function render_tasks(){
  if (!DB.todos) DB.todos = [];
  const validEstados = ['pendiente','en_proceso','confirmado','hecha'];
  for (const tn of DB.todos) {
    if (!tn.seguimiento || !Array.isArray(tn.seguimiento)) tn.seguimiento = [];
    if (!tn.estadoTarea || validEstados.indexOf(tn.estadoTarea) === -1) tn.estadoTarea = tn.done ? 'hecha' : 'pendiente';
    tn.done = (tn.estadoTarea === 'hecha');
    if (tn.estadoTarea === 'hecha' && !tn.doneAt) tn.doneAt = today();
    if (tn.estadoTarea !== 'hecha') tn.doneAt = '';
  }
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="openTaskModal(null)">+ Nueva tarea</button>`;
  const counts = { abiertas: 0, hechas: 0, mantOpen: 0, pendOpen: 0 };
  for (const c of DB.todos) {
    if (taskIsClosed(c)) counts.hechas++;
    else {
      counts.abiertas++;
      if (c.category === 'mantenimiento') counts.mantOpen++;
      else counts.pendOpen++;
    }
  }
  const filterConfig = [['all','Todas'],['abiertas','Abiertas'],['mantenimiento','Mantenimiento'],['pendiente','Pendientes'],['hechas','Hechas']];
  const fbHtml = filterConfig.map(([f, lbl]) =>
    `<button type="button" class="filter-btn ${taskFilter === f ? 'active' : ''}" onclick="setTaskFilter('${f}')">${lbl}</button>`
  ).join('');
  const list = DB.todos.slice();
  list.sort((a, b) => {
    const ca = taskIsClosed(a), cb = taskIsClosed(b);
    if (ca !== cb) return ca ? 1 : -1;
    const pa = a.priority === 'alta' ? 0 : a.priority === 'baja' ? 2 : 1;
    const pb = b.priority === 'alta' ? 0 : b.priority === 'baja' ? 2 : 1;
    if (pa !== pb) return pa - pb;
    const da = a.dueDate || '9999-12-31', db = b.dueDate || '9999-12-31';
    if (da !== db) return da.localeCompare(db);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
  let rowsHtml = '';
  for (const tk of list){
    const closed = taskIsClosed(tk);
    const est = tk.estadoTarea || 'pendiente';
    if (taskFilter === 'abiertas' && closed) continue;
    if (taskFilter === 'hechas' && !closed) continue;
    if (taskFilter === 'mantenimiento' && tk.category !== 'mantenimiento') continue;
    if (taskFilter === 'pendiente' && tk.category === 'mantenimiento') continue;
    const rm = tk.roomId ? roomById(tk.roomId) : null;
    const catClass = tk.category === 'mantenimiento' ? 'task-badge--mant' : 'task-badge--pend';
    let priHtml = '';
    if (tk.priority === 'alta' && !closed) priHtml = '<span style="color:var(--red);font-weight:600">Alta prioridad</span>';
    else if (tk.priority === 'baja') priHtml = '<span style="color:var(--text3)">Prioridad baja</span>';
    let histPrev = '';
    if (tk.seguimiento && tk.seguimiento.length) {
      const sl = tk.seguimiento.length;
      const from = Math.max(0, sl - 3);
      histPrev = `<div class="task-hist-preview"><div style="font-size:0.68rem;color:var(--text3);margin-bottom:6px;letter-spacing:0.06em;text-transform:uppercase">Último seguimiento</div>`;
      for (let hx = sl - 1; hx >= from; hx--){
        const sh = tk.seguimiento[hx];
        histPrev += `<div class="th-line"><div class="th-when">${escapeAttr(sh.fecha || '')}`
          + (sh.hora ? ` · ${escapeAttr(sh.hora)}` : '')
          + (sh.autor ? ` · ${escapeAttr(sh.autor)}` : '')
          + `</div><div>${escapeAttr(sh.texto || '')}</div></div>`;
      }
      histPrev += `</div>`;
    }
    rowsHtml += `<li class="task-row${closed ? ' done' : ''}">`
      + `<div class="task-body">`
      + `<div class="task-title">${escapeAttr(tk.title)}</div>`
      + `<div class="task-meta">`
      + `<span class="task-badge ${catClass}">${escapeAttr(taskCategoryLabel(tk.category || 'pendiente'))}</span>`
      + `<span class="task-estado-badge ${taskEstadoBadgeClass(est)}">${escapeAttr(taskEstadoLabel(est))}</span>`
      + (rm ? `<span>Hab. ${escapeAttr(rm.number)}</span>` : '')
      + (tk.dueDate ? `<span>Vence: ${escapeAttr(fmtDate(tk.dueDate))}</span>` : '')
      + `<span>Creada: ${escapeAttr(tk.createdAt ? fmtDate(tk.createdAt) : '—')}</span>`
      + (priHtml ? priHtml : '')
      + (closed && tk.doneAt ? `<span>Cerrada: ${escapeAttr(fmtDate(tk.doneAt))}</span>` : '')
      + `</div>`
      + taskStatusButtonsHtml(tk.id, est)
      + (tk.notes ? `<div class="task-notes"><strong style="font-size:0.72rem;color:var(--text3)">Descripción</strong><br>${escapeAttr(tk.notes)}</div>` : '')
      + histPrev
      + `</div>`
      + `<div class="task-actions"><button type="button" class="btn btn-sm btn-secondary" onclick="openTaskModal('${tk.id}')">Editar</button></div>`
      + `</li>`;
  }
  document.getElementById('page-content').innerHTML =
    `<div class="stats-grid" style="margin-bottom:20px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px">`
    + `<div class="stat-card green"><div class="stat-label">Abiertas</div><div class="stat-value">${counts.abiertas}</div></div>`
    + `<div class="stat-card orange"><div class="stat-label">Mantenimiento (abiertas)</div><div class="stat-value">${counts.mantOpen}</div></div>`
    + `<div class="stat-card blue"><div class="stat-label">Pendientes (abiertas)</div><div class="stat-value">${counts.pendOpen}</div></div>`
    + `<div class="stat-card gold"><div class="stat-label">Cerradas</div><div class="stat-value">${counts.hechas}</div></div>`
    + `</div>`
    + `<div class="card"><div class="card-header"><h4>Lista de pendientes</h4><p style="font-size:0.72rem;color:var(--text3);font-weight:400;margin-top:4px">Use los botones de estado en cada fila (Pendiente → En proceso → Confirmado → Hecha). El historial registra cada cambio y las notas que añada al editar.</p></div>`
    + `<div style="padding:14px 16px 18px">`
    + `<div class="filter-bar" style="margin-bottom:16px">${fbHtml}</div>`
    + (rowsHtml ? `<ul class="task-list">${rowsHtml}</ul>`
      : `<div class="empty-state" style="padding:32px 16px"><p>No hay tareas en este filtro.</p><p style="font-size:0.85rem;margin-top:8px">Use <strong>+ Nueva tarea</strong> para registrar mantenimiento o actividades.</p></div>`)
    + `</div></div>`;
}

window.taskFilter = taskFilter;
window.setTaskFilter = setTaskFilter;
window.taskCategoryLabel = taskCategoryLabel;
window.taskEstadoLabel = taskEstadoLabel;
window.taskEstadoBadgeClass = taskEstadoBadgeClass;
window.taskIsClosed = taskIsClosed;
window.appendTaskSeguimientoEntry = appendTaskSeguimientoEntry;
window.setTaskEstado = setTaskEstado;
window.taskStatusButtonsHtml = taskStatusButtonsHtml;
window.deleteTask = deleteTask;
window.saveTask = saveTask;
window.openTaskModal = openTaskModal;
window.render_tasks = render_tasks;
