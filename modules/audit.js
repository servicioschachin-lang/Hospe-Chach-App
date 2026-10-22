import { DB } from './db.js';

export function render_audit(){
  if(window.currentUser.role !== 'admin' && window.currentUser.role !== 'superadmin'){window.toast('Acceso restringido','error');return;}
  document.getElementById('topbar-actions').innerHTML='';
  const list = DB.auditLog || [];
  const filterEl = document.getElementById('audit-filter');
  let filter = filterEl ? filterEl.value : '';
  let filtered = list;
  if(filter) {
    const q = filter.toLowerCase();
    filtered = list.filter(e => {
      const action = (e.action||'').toLowerCase();
      const detail = (e.detail||'').toLowerCase();
      return action.indexOf(q) !== -1 || detail.indexOf(q) !== -1;
    });
  }
  let rows = '';
  const startIdx = Math.max(0, filtered.length - 300);
  for (let i = filtered.length - 1; i >= startIdx; i--){
    const e = filtered[i];
    const d = e.date ? new Date(e.date).toLocaleString('es-GT',{dateStyle:'short',timeStyle:'short'}) : '—';
    rows += `<tr><td style="white-space:nowrap;color:var(--text3);font-size:0.8rem">${d}</td><td class="fw-600">${e.userName||'—'}</td><td><span class="badge badge-gray">${e.role||''}</span></td><td>${(e.action||'—')}</td><td style="max-width:280px;overflow:hidden;text-overflow:ellipsis" title="${(e.detail||'').replace(/"/g,'&quot;')}">${(e.detail||'—')}</td></tr>`;
  }
  document.getElementById('page-content').innerHTML =
    `<div class="card">`
    + `<div class="card-header flex flex-between flex-middle"><h4>Registro de auditoría</h4>`
    + `<input type="text" id="audit-filter" value="${(filter||'').replace(/"/g,'&quot;')}" placeholder="Filtrar por acción o detalle..." style="max-width:220px;padding:6px 10px;border-radius:6px;border:1px solid var(--border)" onchange="render_audit()" onkeyup="if(event.key==='Enter')render_audit()"></div>`
    + `<div class="card-body" style="overflow-x:auto">`
    + `<table><thead><tr><th>Fecha / Hora</th><th>Usuario</th><th>Rol</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>`
    + (rows || `<tr><td colspan="5"><div class="empty-state"><p>Sin registros de auditoría</p></div></td></tr>`)
    + `</tbody></table></div></div>`;
}

window.render_audit = render_audit;
