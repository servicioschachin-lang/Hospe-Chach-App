import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { pages } from '../nav.js';
import { icn } from '../icons.js';

function chainNavigate(page) {
  return { type: 'navigate', page };
}

function chainCall(fn, args = []) {
  return { type: 'call', fn, args };
}

function getDeepItems() {
  const items = [];
  const role = window.currentUser?.role;
  if (!role) return items;
  const allowed = window.roleMenus[role] || [];

  // ── Configuración ──
  if (allowed.includes('config')) {
    items.push(
      { id: 'deep_config_rooms', label: 'Config. Habitaciones', icon: icn('bed'), keywords: 'habitaciones cuartos tipos precios', breadcrumb: ['Configuración', 'Habitaciones'], chain: [chainNavigate('config')] },
      { id: 'deep_config_users', label: 'Usuarios del Sistema', icon: icn('user'), keywords: 'usuarios cuentas accesos', breadcrumb: ['Configuración', 'Usuarios'], chain: [chainNavigate('config')] },
      { id: 'deep_config_workers', label: 'Trabajadores', icon: icn('worker'), keywords: 'trabajadores nomina empleados', breadcrumb: ['Configuración', 'Trabajadores'], chain: [chainNavigate('config')] },
      { id: 'deep_config_settings', label: 'Config. General', icon: icn('gear'), keywords: 'sistema general configuracion ajustes', breadcrumb: ['Configuración', 'Sistema'], chain: [chainNavigate('config')] }
    );
  }

  // ── Recepción ──
  if (allowed.includes('reception')) {
    items.push(
      { id: 'deep_reception_checkin', label: 'Check-in sin reserva', icon: icn('key'), keywords: 'checkin entrada rapido huesped', breadcrumb: ['Recepción', 'Check-in'], chain: [chainNavigate('reception'), chainCall('processCheckin', [])] },
      { id: 'deep_reception_checkout', label: 'Check-out rápido', icon: icn('door-open'), keywords: 'checkout salida rapido', breadcrumb: ['Recepción', 'Check-out'], chain: [chainNavigate('reception')] }
    );
  }

  // ── Habitaciones ──
  if (allowed.includes('rooms')) {
    items.push(
      { id: 'deep_rooms_available', label: 'Habitaciones disponibles', icon: icn('check'), keywords: 'disponibles libres habitaciones', breadcrumb: ['Habitaciones', 'Disponibles'], chain: [chainNavigate('rooms')] },
      { id: 'deep_rooms_occupied', label: 'Habitaciones ocupadas', icon: icn('close'), keywords: 'ocupadas habitaciones', breadcrumb: ['Habitaciones', 'Ocupadas'], chain: [chainNavigate('rooms')] },
      { id: 'deep_rooms_cleaning', label: 'Habitaciones en limpieza', icon: icn('warning'), keywords: 'limpieza habitaciones', breadcrumb: ['Habitaciones', 'Limpieza'], chain: [chainNavigate('rooms')] }
    );
  }

  // ── Housekeeping ──
  if (allowed.includes('housekeeping')) {
    items.push(
      { id: 'deep_hk_pending', label: 'Limpieza pendiente', icon: icn('clipboard'), keywords: 'limpieza pendiente housekeeping', breadcrumb: ['Housekeeping', 'Pendiente'], chain: [chainNavigate('housekeeping')] },
      { id: 'deep_hk_cleaning', label: 'En limpieza', icon: icn('bolt'), keywords: 'limpiando en proceso', breadcrumb: ['Housekeeping', 'En limpieza'], chain: [chainNavigate('housekeeping')] }
    );
  }

  // ── Huéspedes ──
  if (allowed.includes('guests')) {
    items.push(
      { id: 'deep_guests_new', label: 'Nuevo huésped', icon: icn('user'), keywords: 'crear nuevo huesped cliente', breadcrumb: ['Huéspedes', 'Nuevo'], chain: [chainNavigate('guests')] }
    );
  }

  // ── Pagos ──
  if (allowed.includes('payments')) {
    items.push(
      { id: 'deep_payments_new', label: 'Registrar pago', icon: icn('money'), keywords: 'nuevo pago cobro registrar', breadcrumb: ['Pagos', 'Nuevo pago'], chain: [chainNavigate('payments')] }
    );
  }

  // ── Reportes ──
  if (allowed.includes('reports')) {
    items.push(
      { id: 'deep_reports', label: 'Ver reportes', icon: icn('chart'), keywords: 'reportes estadisticas', breadcrumb: ['Reportes', 'Ver'], chain: [chainNavigate('reports')] }
    );
  }

  // ── Reservas ──
  if (allowed.includes('reservations')) {
    items.push(
      { id: 'deep_reservations_new', label: 'Nueva reserva', icon: icn('calendar'), keywords: 'crear nueva reserva booking', breadcrumb: ['Reservas', 'Nueva reserva'], chain: [chainNavigate('reservations')] }
    );
  }

  // ── Servicios ──
  if (allowed.includes('services')) {
    items.push(
      { id: 'deep_services_new', label: 'Nuevo servicio', icon: icn('tag'), keywords: 'crear nuevo servicio extra hotel', breadcrumb: ['Servicios', 'Nuevo'], chain: [chainNavigate('services')] }
    );
  }

  // ── Tareas ──
  if (allowed.includes('tasks')) {
    items.push(
      { id: 'deep_tasks_new', label: 'Nueva tarea', icon: icn('plus'), keywords: 'crear nueva tarea pendiente', breadcrumb: ['Tareas', 'Nueva tarea'], chain: [chainNavigate('tasks')] }
    );
  }

  // ── Parqueo ──
  if (allowed.includes('parking')) {
    items.push(
      { id: 'deep_parking', label: 'Gestión de parqueo', icon: icn('parking'), keywords: 'parqueo estacionamiento cupos', breadcrumb: ['Parqueo', 'Gestión'], chain: [chainNavigate('parking')] }
    );
  }

  return items;
}

function getModuleItems() {
  const items = [];
  const role = window.currentUser?.role;
  if (!role) return items;
  const allowed = window.roleMenus[role] || [];

  allowed.forEach(page => {
    const pg = pages[page];
    if (!pg) return;
    
    let keywords = pg.label.toLowerCase();
    if (pg.sub) keywords += ' ' + pg.sub.toLowerCase();
    
    items.push({
      id: page,
      label: pg.label,
      icon: pg.icon,
      keywords: keywords,
      breadcrumb: [pg.label]
    });
  });

  return items;
}

export function renderModuleSearchDropdown(searchVal) {
  const resultsEl = document.getElementById('moduleSearchResults');
  if (!resultsEl) return;

  const val = searchVal.toLowerCase().trim();
  const allItems = [...getModuleItems(), ...getDeepItems()];
  
  const filtered = val 
    ? allItems.filter(item => {
        const searchStr = (item.label + ' ' + item.keywords + ' ' + item.breadcrumb.join(' ')).toLowerCase();
        return searchStr.includes(val);
      })
    : allItems;

  if (!filtered.length) {
    resultsEl.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text3)">No se encontraron resultados</div>`;
    state.currentSearchItems = [];
    return;
  }

  let html = '';
  filtered.forEach((item, idx) => {
    const isHighlighted = idx === state.highlightedModuleIdx;
    const breadcrumbHtml = item.breadcrumb.map(b => `<span style="color:var(--text3)">${escapeHtml(b)}</span>`).join(' <span style="color:var(--text3)">›</span> ');
    
    const dataAttrs = item.chain 
      ? `data-chain='${JSON.stringify(item.chain)}'`
      : `data-id="${item.id}"`;

    html += `<div class="module-search-item ${isHighlighted ? 'highlighted' : ''}" 
                  style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;min-width:0;box-sizing:border-box;${isHighlighted ? 'background:var(--primary-bg)' : 'background:var(--dark1)'}"
                  ${dataAttrs}
                  onclick="window.selectModuleSearchItem(this)">
              <span style="font-size:1.2em;flex-shrink:0">${item.icon}</span>
              <div style="flex:1;min-width:0;overflow:hidden">
                <div style="font-weight:500;white-space:normal;word-break:break-word">${escapeHtml(item.label)}</div>
                <div style="font-size:0.75rem;color:var(--text3);white-space:normal;word-break:break-word;overflow:hidden;text-overflow:ellipsis">${breadcrumbHtml}</div>
              </div>
            </div>`;
  });

  resultsEl.innerHTML = html;
  
  // Update current search items
  state.currentSearchItems = Array.from(resultsEl.querySelectorAll('.module-search-item'));
}