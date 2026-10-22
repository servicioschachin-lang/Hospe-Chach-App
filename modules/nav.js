import { icn } from './icons.js';
import { buildReminders } from './reminders.js';

export const pages = {
  dashboard:    {icon: '<svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M3 9l7-7 7 7v8H3V9zm3 1v6h8v-6H6zm3-4a1 1 0 012 0v3H9V6z"/></svg>', label: 'Dashboard', sub: 'Panel principal'},
  rooms:        {icon: icn('bed'), label: 'Habitaciones', sub: 'Estado de habitaciones'},
  reservations: {icon: icn('clipboard'), label: 'Reservaciones', sub: 'Reservas y booking'},
  reception:    {icon: icn('key'), label: 'Recepción', sub: 'Check-in / Check-out'},
  guests:       {icon: icn('user'), label: 'Huéspedes', sub: 'Registro de huéspedes'},
  services:     {icon: icn('tag'), label: 'Servicios', sub: 'Servicios adicionales'},
  payments:     {icon: '<svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M2 6v10a1 1 0 001 1h14a1 1 0 001-1V6a1 1 0 01-1-1H3a1 1 0 00-1 1zm2 7h4m-4-3h4"/></svg>', label: 'Caja', sub: 'Ingresos y egresos'},
  reports:      {icon: icn('chart'), label: 'Reportes', sub: 'Estadísticas'},
  housekeeping: {icon: icn('clipboard'), label: 'Housekeeping', sub: 'Limpieza de habitaciones'},
  tasks:        {icon: icn('task'), label: 'Pendientes', sub: 'Mantenimiento y tareas'},
  parking:      {icon: icn('parking'), label: 'Parqueo', sub: 'Cupos de estacionamiento'},
  users:        {icon: icn('gear'), label: 'Usuarios', sub: 'Gestión de accesos'},
  audit:        {icon: icn('clipboard'), label: 'Auditoría', sub: 'Registro de acciones del sistema'},
  workers:      {icon: icn('worker'), label: 'Trabajadores', sub: 'Registro y nómina (salario diario/semanal/mensual)'},
  config:       {icon: icn('gear'), label: 'Configuración', sub: 'Negocio y respaldo'},
};

const SECTIONS = [
  {label: 'OPERACIONES', items: ['dashboard','rooms','reservations','reception','parking']},
  {label: 'GESTIÓN', items: ['guests','services','payments']},
  {label: 'OPERATIVO', items: ['housekeeping','tasks','reports']},
  {label: 'ADMINISTRACIÓN', items: ['config','audit','workers']},
];

export function buildNav() {
  if (!window.currentUser) return;
  const allowed = window.roleMenus[window.currentUser.role] || [];
  const nav = document.getElementById('nav-menu');
  if (!nav) return;
  nav.innerHTML = '';
  for (const sec of SECTIONS) {
    const filtered = sec.items.filter(item => allowed.indexOf(item) !== -1);
    if (!filtered.length) continue;
    nav.innerHTML += `<div class="nav-section">${sec.label}</div>`;
    for (const page of filtered) {
      const pg = pages[page];
      nav.innerHTML += `<div class="nav-item" id="nav-${page}" onclick="navigate('${page}');closeMobileSidebar()">`
        + `<span class="icon">${pg.icon}</span><span>${pg.label}</span>`
        + (page === 'dashboard' ? '<span id="reminder-badge" class="reminder-badge" style="display:none">0</span>' : '')
        + `</div>`;
    }
  }
  const bn = document.getElementById('bottom-nav-inner');
  if (bn) {
    let html = '';
    for (const page of allowed) {
      const pg = pages[page];
      if (!pg) continue;
      const lbl = pg.label.length > 7 ? pg.label.slice(0, 7) : pg.label;
      html += `<div class="bnav-item" id="bnav-${page}" onclick="navigate('${page}')">`
        + `<span class="bicon">${pg.icon}</span><span>${lbl}</span></div>`;
    }
    html += `<div class="bnav-item" id="theme-toggle" onclick="toggleTheme()" aria-label="Cambiar tema">
      <span class="bicon" id="theme-icon-bottom">${icn('gear')}</span><span>Tema</span></div>`;
    bn.innerHTML = html;
  }
}

export function toggleMobileSidebar(){
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (sb.className.indexOf('mobile-open') !== -1) {
    sb.className = sb.className.replace(' mobile-open', '');
    ov.className = ov.className.replace(' visible', '');
  } else {
    sb.className += ' mobile-open';
    ov.className += ' visible';
  }
}

export function closeMobileSidebar(){
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb.className = sb.className.replace(' mobile-open', '').trim();
  ov.className = ov.className.replace(' visible', '').trim();
}

export async function navigate(page){
  if (!window.currentUser) return;
  if (!window.canAccess(page)) { window.toast('Sin permiso','error'); return; }
  window.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => { el.className = el.className.replace(' active', '').trim(); });
  document.querySelectorAll('.bnav-item').forEach(el => { el.className = el.className.replace(' active', '').trim(); });
  const ne = document.getElementById('nav-' + page); if (ne) ne.className += ' active';
  const be = document.getElementById('bnav-' + page); if (be) be.className += ' active';
  const pg = pages[page];
  if (!pg) return;
  const pt = document.getElementById('page-title'); if (pt) pt.textContent = pg.label;
  const ps = document.getElementById('page-sub'); if (ps) ps.textContent = pg.sub;
  const ta = document.getElementById('topbar-actions'); if (ta) ta.innerHTML = '';
  
  const content = document.getElementById('page-content');
  if (content) {
    content.classList.remove('fade-in');
    void content.offsetWidth;
    content.classList.add('fade-in');
  }

  if (!window['render_' + page]) {
    try {
      await import('./' + page + '.js');
    } catch (e) {
      console.error('Error cargando módulo:', page, e);
    }
  }

  const fn = window['render_' + page];
  if (fn) fn();
  if (window.showOnboarding) window.showOnboarding(page);
  const rems = buildReminders();
  const badge = document.getElementById('reminder-badge');
  if (badge) { badge.textContent = rems.length; badge.style.display = rems.length ? 'inline-flex' : 'none'; }
}

window.pages = pages;
window.buildNav = buildNav;
window.toggleMobileSidebar = toggleMobileSidebar;
window.closeMobileSidebar = closeMobileSidebar;
window.navigate = navigate;
