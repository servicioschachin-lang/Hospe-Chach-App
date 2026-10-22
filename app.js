import { initTheme } from './modules/utils.js';
import { DB, defaultData, saveDB, initializePasswords } from './modules/db.js';
import { icn } from './modules/icons.js';
import './modules/security.js';
import './modules/utils.js';
import './modules/lookup.js';
import './modules/room-states.js';
import './modules/helpers.js';
import './modules/reminders.js';
import './modules/auth.js';
import './modules/nav.js';
import './modules/ui.js';
import './modules/photos.js';
import './modules/export.js';
import './modules/branding.js';
import './modules/integrity.js';
import './modules/receipts.js';
import './modules/module-search/index.js';

async function initUsers() {
  if (!DB.users) {
    DB.users = structuredClone(defaultData.users);
    saveDB();
    return;
  }
  const defaultByUser = {};
  for (const du of defaultData.users) defaultByUser[du.id] = du;
  let needsFix = false;
  for (const u of DB.users) {
    if (defaultByUser[u.id] && !u.password.startsWith('pbkdf2$')) {
      u.password = defaultByUser[u.id].password;
      needsFix = true;
    }
  }
  if (needsFix) saveDB();
}

try {
  await window.StorageService?.init?.();
  await initializePasswords();
  await initUsers();
} catch (e) {
  console.error('Error initializing:', e);
}

if (!window.StorageService?.getSync('hotelos_name')) window.StorageService?.set('hotelos_name', "Hospe Chach App");
if (!window.StorageService?.getSync('hotelos_address')) window.StorageService?.set('hotelos_address', 'Guatemala');
if (!window.StorageService?.getSync('hotelos_phone')) window.StorageService?.set('hotelos_phone', '77558515 / 34872220');
if (window.StorageService?.getSync('hotelos_card_fee_percent') == null) window.StorageService?.set('hotelos_card_fee_percent', '5');

window._hotelLogo = (window.StorageService.getSync('hotelos_logo') || '').trim();

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.closeModal();
  if (e.key === 'Enter') {
    const ls = document.getElementById('login-screen');
    if (ls && !ls.classList.contains('hidden')) window.doLogin();
  }
});

(function autoLogin(){ const u = (window.DB.users||[]).find(x=>x.role==='admin') || (window.DB.users||[])[0]; if(u){ window.currentUser=u; window._lastActivity=Date.now(); const ls=document.getElementById('login-screen'); if(ls) ls.className='hidden'; const ap=document.getElementById('app'); if(ap) ap.className=''; const av=document.getElementById('user-avatar'); if(av) av.textContent=(u.name||'A')[0].toUpperCase(); const un=document.getElementById('user-name'); if(un) un.textContent=u.name; const ur=document.getElementById('user-role'); if(ur) ur.textContent=u.role; setTimeout(()=>{ window.buildNav(); window.navigate('dashboard'); if(window.startReminderPolling) window.startReminderPolling(); if(!localStorage.getItem('welcome_shown')){ localStorage.setItem('welcome_shown','1'); setTimeout(()=>{ window.openModal('<div class=\"modal-header\"><h3>Bienvenido a Hospe Chach App</h3><button class=\"modal-close\" onclick=\"closeModal()\">'+(window.icn?window.icn('close'):'')+'</button></div><div class=\"modal-body\"><p>Guía rápida de módulos:</p><ul><li>Dashboard: resumen general</li><li>Habitaciones, Reservaciones, Recepción</li><li>Huéspedes, Servicios, Caja</li><li>Reportes, Housekeeping, Pendientes, Parqueo</li><li>Configuración: personaliza el nombre y logo que se verán en los recibos (experiencia premium)</li></ul></div><div class=\"modal-footer\"><button class=\"btn btn-primary\" onclick=\"closeModal()\">Comenzar</button></div>'); },300); } },0);} })();
window.syncBrandLogoImgs();

(() => { const _s = window.saveDB; window.saveDB = function(...args) { _s.apply(this, args); if (window.BackupService?.notifyDataSaved) window.BackupService?.notifyDataSaved(); }; })();

function openGlobalSearch(){
  window.openModal(
    `<div class="modal-header"><h3>Busqueda Global</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="form-group"><label>Buscar huesped, reserva, habitacion o pago</label>`
    + `<input type="text" id="global-search-input" placeholder="Escribe para buscar..." autofocus oninput="performGlobalSearch(this.value)"></div>`
    + `<div id="global-search-results" style="max-height:400px;overflow-y:auto"></div>`
    + `</div>`
  );
  setTimeout(() => document.getElementById('global-search-input').focus(), 100);
}

let searchTimeout = null;

function performGlobalSearch(query){
  // Cancelar búsqueda anterior si existe
  if (searchTimeout) clearTimeout(searchTimeout);
  
  // Debounce: esperar 300ms después de que el usuario deje de escribir
  searchTimeout = setTimeout(() => {
    const results = document.getElementById('global-search-results');
    if (!results) return;
    if (!query || query.length < 2) {
      results.innerHTML = `<p style="color:var(--text3);text-align:center;padding:20px">Escribe al menos 2 caracteres para buscar</p>`;
      return;
    }
    const q = query.toLowerCase();
    const guestResults = [];
    const reservationResults = [];
    const paymentResults = [];

    for (const g of window.DB.guests) {
      if ((g.name?.toLowerCase().includes(q)) ||
          (g.document?.toLowerCase().includes(q)) ||
          (g.phone?.toLowerCase().includes(q))) {
        guestResults.push(g);
      }
    }

    for (const r of window.DB.reservations) {
      if ((r.guestSnap?.name?.toLowerCase().includes(q)) ||
          (r.roomId?.toLowerCase().includes(q)) ||
          (r.id?.toLowerCase().includes(q))) {
        reservationResults.push(r);
      }
    }

    for (const p of window.DB.payments) {
      if ((p.concept?.toLowerCase().includes(q)) ||
          (p.guestId?.toLowerCase().includes(q))) {
        paymentResults.push(p);
      }
    }

    let html = '';
    if (guestResults.length > 0) {
      html += `<h4>Huéspedes (${guestResults.length})</h4>`;
      for (const g of guestResults) {
        html += `<div class="search-result-item" onclick="openGuest('${g.id}')">${window.sanitizeHTML(g.name || g.document || '')}</div>`;
      }
    }
    if (reservationResults.length > 0) {
      html += `<h4>Reservas (${reservationResults.length})</h4>`;
      for (const r of reservationResults) {
        html += `<div class="search-result-item">${window.sanitizeHTML(r.guestSnap?.name || '')} - ${window.sanitizeHTML(r.roomId || '')} (${window.sanitizeHTML(r.id || '')})</div>`;
      }
    }
    if (paymentResults.length > 0) {
      html += `<h4>Pagos (${paymentResults.length})</h4>`;
      for (const p of paymentResults) {
        html += `<div class="search-result-item">${window.sanitizeHTML(p.concept || '')} - ${window.sanitizeHTML(p.guestId || '')}</div>`;
      }
    }
    if (!html) html = `<p style="color:var(--text3);text-align:center;padding:20px">No se encontraron resultados para "${window.sanitizeHTML(query)}"</p>`;
    results.innerHTML = html;
  }, 300);
}
window.openGlobalSearch = openGlobalSearch;
window.performGlobalSearch = performGlobalSearch;

const searchBtn = document.getElementById('topbar-actions');
if (searchBtn) {
  searchBtn.innerHTML = `<button class="btn btn-secondary btn-sm" onclick="openGlobalSearch()" title="Buscar"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor"><path d="M8 3a5 5 0 100 10A5 5 0 008 3zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"/></svg> Buscar</button>`;
}

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

const ONBOARD = {
  dashboard: 'Panel principal: aquí verás resumen de ocupación, ingresos y recordatorios. Personaliza el nombre y logo en Configuración para una experiencia premium en tus recibos.',
  rooms: 'Habitaciones: gestiona estado, precios y fotos. Cambia disponibilidad con un clic.',
  reservations: 'Reservaciones: crea y administra reservas, canales OTA y precios.',
  reception: 'Recepción: check-in/check-out, consumos y pagos.',
  guests: 'Huéspedes: registro y historial de clientes.',
  services: 'Servicios: catálogo de servicios adicionales.',
  payments: 'Caja: ingresos, egresos y comisiones.',
  reports: 'Reportes: estadísticas y exportación.',
  housekeeping: 'Housekeeping: estado de limpieza por habitación.',
  tasks: 'Pendientes: tareas y mantenimiento.',
  parking: 'Parqueo: control de cupos.',
  config: 'Configuración: personaliza nombre y logo que se verán en los recibos. Experiencia premium.',
  audit: 'Auditoría: registro de acciones.',
  workers: 'Trabajadores: nómina y registros.'
};
window.showOnboarding = function(page){
  try {
    const key = 'onboarded_' + page;
    if (localStorage.getItem(key)) return;
    const tip = ONBOARD[page] || 'Guía de uso de este módulo.';
    window.openModal(`<div class="modal-header"><h3>Guía: ${page}</h3><button class="modal-close" onclick="closeModal()">${window.icn?window.icn('close'):''}</button></div><div class="modal-body"><p>${tip}</p></div><div class="modal-footer"><button class="btn btn-primary" onclick="localStorage.setItem('${key}','1');closeModal()">Entendido</button></div>`);
    if (page === 'dashboard' && !localStorage.getItem('welcomed')) {
      localStorage.setItem('welcomed','1');
    }
  } catch(e){}
};
setTimeout(()=>{ const ap=document.getElementById('app'); if(ap && ap.classList.contains('hidden')) ap.classList.remove('hidden'); const ls=document.getElementById('login-screen'); if(ls) ls.classList.add('hidden'); },500);
window.closeTicketPreview = function(){ const o=document.getElementById('ticket-preview-overlay'); if(o) o.classList.remove('open'); };
window.openTicketPreview = function(paymentId){ try { const p = (window.DB.payments||[]).find(x=>x.id===paymentId) || {}; const tp=document.getElementById('ticket-print'); if(tp && window.buildTicketHtml) tp.innerHTML = window.buildTicketHtml(p); const o=document.getElementById('ticket-preview-overlay'); if(o) o.classList.add('open'); } catch(e){ console.error(e); } };
if (typeof window.setCleanStatus !== 'function') {
  window.setCleanStatus = async function(roomId, status){
    try { await import('./modules/housekeeping.js'); } catch(e){}
    if (typeof window.setCleanStatus === 'function' && window.setCleanStatus !== arguments.callee) return window.setCleanStatus(roomId, status);
  };
}
initTheme();
