import { DB, logAudit } from './db.js';
import { buildNav, navigate } from './nav.js';
import { startReminderPolling } from './reminders.js';

export const roleMenus = {
  admin:         ['dashboard','rooms','reservations','reception','parking','guests','services','payments','tasks','reports','audit','workers','config'],
  superadmin:    ['dashboard','rooms','reservations','reception','parking','guests','services','payments','tasks','reports','audit','workers','config'],
  recepcionista: ['dashboard','rooms','reservations','reception','parking','guests','payments','tasks'],
  housekeeping:  ['rooms','housekeeping','tasks'],
  contabilidad:  ['payments','reports','tasks'],
};

function safeToast(msg, type) {
  if (typeof window.toast === 'function') return window.toast(msg, type);
  try {
    const c = document.getElementById('toast-container');
    if (c) {
      const t = document.createElement('div');
      t.className = 'toast ' + (type || 'info');
      t.textContent = msg;
      c.appendChild(t);
      setTimeout(() => {
        if (t.parentNode) {
          t.classList.add('removing');
          setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 200);
        }
      }, type === 'error' ? 5000 : 3800);
      return;
    }
  } catch(e) {}
  console.log(`[toast ${type||'info'}] ${msg}`);
}

export async function doLogin() {
  if (window.__cryptoUnavailable) {
    safeToast('Web Crypto no disponible. Abre la app desde http://localhost (no file://)', 'error');
    console.error('Web Crypto API no disponible. Usa http://localhost en lugar de file://');
    return;
  }
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  let user = null;
  
  for (const usr of DB.users) {
    if (usr.username === u) {
      if (await window.verifyPassword(p, usr.password)) {
        user = usr;
        break;
      }
    }
  }
  
  if (!user){
    if (window.__debugMode) {
      console.log('Login debug:', { username: u, password: p, users: DB.users.map(x => ({username: x.username, role: x.role, passwordPrefix: x.password.substring(0, 20)})) });
    }
    safeToast('Usuario o contraseña incorrectos','error');
    return;
  }
  
  window.currentUser = user;
  window._lastActivity = Date.now();
  logAudit('Inicio de sesión','Usuario: '+user.username);
  try { window.StorageService.set('hotelos_session', JSON.stringify({ id: user.id, ts: Date.now() })); } catch(e) {}
  document.getElementById('login-screen').className='hidden';
  document.getElementById('app').className='';
  const avatar=document.getElementById('user-avatar');if(avatar)avatar.textContent=user.name[0].toUpperCase();
  const uname=document.getElementById('user-name');if(uname)uname.textContent=user.name;
  const urole=document.getElementById('user-role');if(urole)urole.textContent=roleLabel(user.role);
  setTimeout(() => { buildNav(); navigate('dashboard'); startReminderPolling(); updateSidebarBottom(); },0);
}

export function logout() {
  try { window.StorageService.remove('hotelos_session'); } catch(e) {}
  if(window._reminderInterval) clearInterval(window._reminderInterval);
  if(window._sessionTimeout) clearTimeout(window._sessionTimeout);
  window.currentUser=null;
  document.getElementById('app').className='hidden';
  document.getElementById('login-screen').className='';
  const lu=document.getElementById('login-user'); if(lu) lu.value='';
  const lp=document.getElementById('login-pass'); if(lp) lp.value='';
}

export function updateSidebarBottom(){
  const isSuperAdmin = window.currentUser && window.currentUser.role === 'superadmin';
  const logoutBtn = document.getElementById('logout-btn');
  if(logoutBtn) logoutBtn.style.display = '';
}

const ROLE_LABELS = {admin:'Administrador',superadmin:'Super Admin',recepcionista:'Recepcionista',housekeeping:'Housekeeping',contabilidad:'Contabilidad'};

export function roleLabel(r) {
  return ROLE_LABELS[r]||r;
}

export function canAccess(page) {
  if(!window.currentUser) return false;
  return (roleMenus[window.currentUser.role]||[]).includes(page);
}

export function restoreSession() {
  try {
    const raw = window.StorageService.getSync('hotelos_session');
    if(!raw) return;
    const data = JSON.parse(raw);
    if(data.ts && Date.now() - data.ts > 15 * 60 * 1000){
      window.StorageService.remove('hotelos_session');
      return;
    }
    const user = DB.users.find(u => u.id === data.id) || null;
    if(!user) return;
    window.currentUser = user;
    window._lastActivity = Date.now();
    startSessionTimeout();
    document.getElementById('login-screen').className='hidden';
    document.getElementById('app').className='';
    const avatar=document.getElementById('user-avatar'); if(avatar) avatar.textContent=user.name[0].toUpperCase();
    const uname=document.getElementById('user-name'); if(uname) uname.textContent=user.name;
    const urole=document.getElementById('user-role'); if(urole) urole.textContent=roleLabel(user.role);
    setTimeout(() => { buildNav(); navigate('dashboard'); startReminderPolling(); updateSidebarBottom(); },0);
  } catch(e) {}
}

function startSessionTimeout(){
  if(window._sessionTimeout) clearTimeout(window._sessionTimeout);
   window._sessionTimeout = setTimeout(() => {
    if(!window.currentUser) return;
    safeToast('Sesión expirada por inactividad','error');
    window.logout();
  }, 15 * 60 * 1000);
}

function resetSessionTimeout(){
  if(!window.currentUser) return;
  window._lastActivity = Date.now();
  if(window.StorageService){
    try {
      const raw = window.StorageService.getSync('hotelos_session');
      if(raw){
        const data = JSON.parse(raw);
        data.ts = Date.now();
        window.StorageService.set('hotelos_session', JSON.stringify(data));
      }
    } catch(e){}
  }
  startSessionTimeout();
}

['click','keydown','mousemove','scroll','touchstart'].forEach(evt => {
  document.addEventListener(evt, resetSessionTimeout, {passive:true});
});

window.roleMenus = roleMenus;
window.doLogin = doLogin;
window.logout = logout;
window.roleLabel = roleLabel;
window.canAccess = canAccess;
window.restoreSession = restoreSession;
window.updateSidebarBottom = updateSidebarBottom;