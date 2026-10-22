export const STORAGE_KEY = 'hotelos_data';
export const BACKUP_FORMAT_ID = 'hotelos_kukanche';
export const BACKUP_SCHEMA_VERSION = 5;

const defaultRoom = (n) => ({
  id: `H${n}`, number: String(n), type: 'doble', price: 120, keyDeposit: 50,
  status: n === 1 ? 'ocupada' : (n === 2 ? 'limpieza' : 'disponible'), floor: 1, capacity: 2, description: '', photos: [`./room${n}.jpg`,`./room${(n % 4) + 1}.jpg`,`./room${((n + 1) % 4) + 1}.jpg`], active: true
});

export const defaultData = {
  rooms: Array.from({ length: 4 }, (_, i) => defaultRoom(i + 1)),
  guests: [
    {id:'G001',name:'Carlos Méndez',document:'DPI 1234 56789 0101',phone:'5512-3456',email:'carlos@mail.com',notes:''},
    {id:'G002',name:'Ana López',document:'DPI 9876 54321 0202',phone:'5598-7654',email:'ana@mail.com',notes:''},
    {id:'G003',name:'Pedro Ramírez',document:'PASAPORTE A123456',phone:'5544-1122',email:'',notes:''}
  ],
  reservations: [
    {id:'R001',guestId:'G001',guestSnap:{name:'Carlos Méndez',document:'DPI 1234 56789 0101',phone:'5512-3456'},roomId:'H1',checkIn:'2026-10-20',checkOut:'2026-10-22',persons:2,status:'confirmada',notes:'',totalEstimated:240,keyDeposit:50,createdAt:'2026-10-19',channel:'directo'},
    {id:'R002',guestId:'G002',guestSnap:{name:'Ana López',document:'DPI 9876 54321 0202',phone:'5598-7654'},roomId:'H2',checkIn:'2026-10-22',checkOut:'2026-10-24',persons:1,status:'pendiente',notes:'',totalEstimated:240,keyDeposit:50,createdAt:'2026-10-20',channel:'booking',channelNightPrice:130}
  ],
  stays: [
    {id:'S001',guestId:'G001',guestSnap:{name:'Carlos Méndez',document:'DPI 1234 56789 0101',phone:'5512-3456'},roomId:'H1',checkIn:'2026-10-20',checkOut:'2026-10-22',rate:240,totalPaid:120,keyDeposit:50,keyDepositReturned:false,status:'activa',checkInTime:'2026-10-20T14:00:00',channel:'directo',reservationId:'R001',persons:2,cleanStatus:''}
  ],
  payments: [
    {id:'P001',stayId:'S001',guestId:'G001',type:'efectivo',payClass:'ingreso',amount:120,concept:'Estadía hab. 1',date:'2026-10-20',invoiceNum:'F-001'},
    {id:'P002',stayId:'S001',guestId:'G001',type:'efectivo',payClass:'ingreso_deposito',amount:50,concept:'Depósito llave hab. 1',date:'2026-10-20',invoiceNum:'F-002'}
  ],
  services: [
    {id:'SV001',name:'Desayuno continental',price:15,category:'restaurante'},
    {id:'SV002',name:'Desayuno buffet',      price:25,category:'restaurante'},
    {id:'SV003',name:'Almuerzo',             price:30,category:'restaurante'},
    {id:'SV004',name:'Cena',                 price:35,category:'restaurante'},
    {id:'SV005',name:'Lavandería (pieza)',    price:8, category:'lavanderia'},
    {id:'SV006',name:'Transfer aeropuerto',  price:40,category:'transporte'},
    {id:'SV007',name:'Tour ciudad',          price:55,category:'tours'},
    {id:'SV008',name:'Minibar',              price:20,category:'minibar'},
    {id:'SV009',name:'Spa (1 hora)',         price:60,category:'spa'},
  ],
  payments: [],
  users: [
    {id:'U001',username:'admin',password:'pbkdf2$100000$61862ec8dd0e8d5404c673c55af2a34a$f9c5d509efeb25346e8a70743b6efbc7f39b2986428145af1041c650e5da98a7',name:'Administrador',role:'admin'},
    {id:'U002',username:'recep',password:'pbkdf2$100000$7a3886424f782b4b125bbdd63134b31c$36f61cbfa149822dcc6f38e2f22b72f8498781522f3f090417fb612b4ce50374',name:'Recepcionista',role:'recepcionista'},
    {id:'U003',username:'house',password:'pbkdf2$100000$dd6d438439b6d8824de9570cea70dc6d$dd0e8d545efc8dd2fb3024b05cbb4de9f6d851e5b151e0e2de280cc774886868',name:'Ama de Llaves',role:'housekeeping'},
    {id:'U004',username:'caja',password:'pbkdf2$100000$d5ebdf1f819a9b718e1f5d9002e04a73$b8e112ae749bf5ee435671f01f2f2fa107d3c203de4ac3c1a3cfe7b72cf6c4b3',name:'Cajero',role:'contabilidad'},
    {id:'U000',username:'servicioschachin@gmail.com',password:'plain:2002gch.GCH',name:'Super Admin',role:'superadmin'},
  ],
  auditLog: [],
  workers: [],
  reminders: [],
  todos: [],
  channels: [
    {id:'directo',name:'Directo / Walk-in',usesOtaPricing:false},
    {id:'booking',name:'Booking.com',usesOtaPricing:true},
    {id:'airbnb',name:'Airbnb',usesOtaPricing:true},
    {id:'whatsapp',name:'WhatsApp',usesOtaPricing:false},
    {id:'otro',name:'Otro',usesOtaPricing:true}
  ],
};

// Asegurar que los canales existan si la BD cargada es antigua
function normalizeChannels(parsed) {
  if (!parsed.channels || !Array.isArray(parsed.channels) || parsed.channels.length === 0) {
    parsed.channels = structuredClone(defaultData.channels);
  }
}

export const APP_TIME_ZONE = 'America/Guatemala';

export function migrateDBShape(root){
  let data = root;
  if (root?._backupFormat === BACKUP_FORMAT_ID && root?.data && typeof root.data === 'object') {
    data = root.data;
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.rooms)) {
    throw new Error('Formato no reconocido: se esperaba al menos la lista de habitaciones (rooms).');
  }
  const parsed = structuredClone(data);
  if (!parsed.reservations) parsed.reservations = [];
  if (!Array.isArray(parsed.reservations) || parsed.reservations.length === 0) parsed.reservations = structuredClone(defaultData.reservations);
  if (!parsed.stays) parsed.stays = [];
  if (!Array.isArray(parsed.stays) || parsed.stays.length === 0) parsed.stays = structuredClone(defaultData.stays);
  if (!parsed.payments) parsed.payments = [];
  if (!Array.isArray(parsed.payments) || parsed.payments.length === 0) parsed.payments = structuredClone(defaultData.payments);
  if (!parsed.payments) parsed.payments = [];
  if (!parsed.guests) parsed.guests = parsed.clients || [];
  if (!Array.isArray(parsed.guests) || parsed.guests.length === 0) parsed.guests = structuredClone(defaultData.guests);
  if (!Array.isArray(parsed.users) || parsed.users.length===0) {
    parsed.users = structuredClone(defaultData.users);
  }
  
  const hasSuperAdmin = parsed.users.some(u => u.role === 'superadmin');
  if (!hasSuperAdmin) {
    parsed.users.push({id:'U000',username:'servicioschachin@gmail.com',password:'plain:2002gch.GCH',name:'Super Admin',role:'superadmin'});
  } else {
    const superAdmin = parsed.users.find(u => u.role === 'superadmin');
    if (superAdmin) {
      superAdmin.username = 'servicioschachin@gmail.com';
      superAdmin.password = 'plain:2002gch.GCH';
      superAdmin.name = 'Super Admin';
    }
  }
  
  normalizeTodos(parsed);
  normalizeServices(parsed);
  normalizeRooms(parsed);
  normalizePayments(parsed);
  normalizeReservations(parsed);
  normalizeStays(parsed);
  normalizeChannels(parsed);
  
  return parsed;
}

const validTodoStates = new Set(['pendiente', 'en_proceso', 'confirmado', 'hecha']);

function todayStr() {
  return window.today ? window.today() : new Date().toISOString().split('T')[0];
}

function normalizeTodoState(tdm) {
  if (!tdm.estadoTarea || !validTodoStates.has(tdm.estadoTarea)) {
    tdm.estadoTarea = tdm.done ? 'hecha' : 'pendiente';
  }
  tdm.done = tdm.estadoTarea === 'hecha';
  if (tdm.estadoTarea === 'hecha' && !tdm.doneAt) tdm.doneAt = todayStr();
  if (tdm.estadoTarea !== 'hecha') tdm.doneAt = '';
}

function normalizeTodos(parsed) {
  if (!parsed.todos || !Array.isArray(parsed.todos)) {
    parsed.todos = [];
    return;
  }
  for (const tdm of parsed.todos) {
    if (!tdm) continue;
    if (!Array.isArray(tdm.seguimiento)) tdm.seguimiento = [];
    normalizeTodoState(tdm);
  }
}

function normalizeServices(parsed) {
  if (!parsed.services) parsed.services = structuredClone(defaultData.services);
}

function normalizeRooms(parsed) {
  for (const rm of parsed.rooms) {
    if (rm.keyDeposit === undefined) rm.keyDeposit = 50;
    if (rm.active === undefined) rm.active = true;
    const n = parseInt(rm.number) || 1;
    rm.photos = [`./room${n}.jpg`,`./room${(n % 4) + 1}.jpg`,`./room${((n + 1) % 4) + 1}.jpg`];
  }
}

function normalizePayments(parsed) {
  for (const p of parsed.payments) {
    if (!p.payClass) {
      p.payClass = p.concept?.includes('llave') ? 'ingreso_deposito' : 'ingreso';
    }
    if (!p.guestId) p.guestId = p.clientId || '';
  }
}

function guestById(parsed, gid){
  if(!gid) return null;
  return parsed.guests.find(g => g.id === gid) || null;
}

function normalizeReservations(parsed) {
  for (const r of parsed.reservations) {
    if (!r.channel) r.channel = 'directo';
    if ((r.nightPrice === undefined || r.nightPrice === null) && r.channelNightPrice) {
      r.nightPrice = r.channelNightPrice;
    }
    if (!r.guestSnap) {
      const gr = guestById(parsed, r.guestId || r.clientId);
      r.guestId = r.guestId || r.clientId || '';
      r.guestSnap = gr ? {name:gr.name,document:gr.document,phone:gr.phone} : {name:'—',document:'',phone:''};
      if (!r.keyDeposit) r.keyDeposit = 50;
    }
  }
}

function normalizeStayFields(s, parsed) {
  if (!s.channel) s.channel = 'directo';
  if (s.nightPrice === undefined || s.nightPrice === null) s.nightPrice = null;
  if (s.guestSnap) return;
  const gs = guestById(parsed, s.guestId || s.clientId);
  s.guestId = s.guestId || s.clientId || '';
  s.guestSnap = gs ? {name:gs.name,document:gs.document,phone:gs.phone} : {name:'—',document:'',phone:''};
  if (s.keyDeposit === undefined) s.keyDeposit = 50;
  if (s.keyDepositReturned === undefined) s.keyDepositReturned = false;
  if (s.cleanStatus === undefined) s.cleanStatus = '';
  if (!Array.isArray(s.accountExtras)) s.accountExtras = [];
}

function normalizeStays(parsed) {
  for (const s of parsed.stays) {
    normalizeStayFields(s, parsed);
  }
}


function buildRoomByIdMap(rooms) {
  const byId = {};
  for (const r of rooms) {
    if (r?.id) byId[r.id] = r;
  }
  return byId;
}

function cloneOrNewRoom(byId, def, n) {
  const id = 'H' + n;
  if (!byId[id]) return structuredClone(def);
  const r = structuredClone(byId[id]);
  r.id = id;
  r.number = String(n);
  if (r.keyDeposit === undefined) r.keyDeposit = 50;
  if (r.floor === undefined || r.floor === null) r.floor = n <= 4 ? 1 : 2;
  if (!Array.isArray(r.photos)) r.photos = [];
  return r;
}

function buildValidRoomIdSet(rooms) {
  const valid = {};
  for (const r of rooms) valid[r.id] = true;
  return valid;
}

function cancelInvalidReservations(parsed, valid) {
  if (!Array.isArray(parsed.reservations)) return;
  for (const res of parsed.reservations) {
    if (res.roomId && !valid[res.roomId] && res.status !== 'cancelada') {
      res.status = 'cancelada';
      res.notes = ((res.notes || '') + ' [Migración: habitación fuera del catálogo 1–8]').trim();
    }
  }
}

function finalizeInvalidStays(parsed, valid) {
  if (!Array.isArray(parsed.stays)) return;
  const tco = todayStr();
  for (const st of parsed.stays) {
    if (st.roomId && !valid[st.roomId] && st.status === 'activa') {
      st.status = 'finalizada';
      if (!st.checkOut) st.checkOut = tco;
      st.notes = ((st.notes || '') + ' [Migración: habitación fuera del catálogo 1–8; estancia cerrada.]').trim();
    }
  }
}

export function normalizeRoomsEight(parsed){
  // Ya no forzamos 8, permitimos flexibilidad.
  // Solo aseguramos que los campos obligatorios existan si es necesario.
  for (const rm of parsed.rooms) {
    if (rm.keyDeposit === undefined) rm.keyDeposit = 50;
    if (rm.active === undefined) rm.active = true;
    if (rm.floor === undefined) rm.floor = 1;
    if (rm.capacity === undefined) rm.capacity = 2;
  }
}

export const DB = (function(){
  try {
    const raw = window.StorageService ? window.StorageService.getSync(STORAGE_KEY) : null;
    if (raw) {
      const migrated = migrateDBShape(JSON.parse(raw));
      window.StorageService.set(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch(e){ console.error(e); }
  return structuredClone(defaultData);
})();

let _currentUser = null;
let _currentPage = 'dashboard';

export const getCurrentUser = () => _currentUser;
export const setCurrentUser = (u) => { _currentUser = u; };
export const getCurrentPage = () => _currentPage;
export const setCurrentPage = (p) => { _currentPage = p; };

export const _reminderInterval = null;

export function saveDB() {
  if (window.StorageService) {
    window.StorageService.set(STORAGE_KEY, JSON.stringify(DB));
  }
}

export function genId(p) {
  const arr = new Uint32Array(1);
  window.crypto.getRandomValues(arr);
  return p + Date.now().toString(36).toUpperCase() + arr[0].toString(36).toUpperCase().slice(0, 3);
}

export function resetUserPasswords() {
  const map = {};
  for (const du of defaultData.users) map[du.id] = du;
  let changed = false;
  for (const u of DB.users) {
    if (map[u.id]) {
      if (u.password !== map[u.id].password) {
        u.password = map[u.id].password;
        changed = true;
        console.log('Restored password for:', u.username, '(' + u.role + ')');
      }
    }
  }
  if (changed) saveDB();
  return changed;
}

export function logAudit(action, detail) {
  const user = window.currentUser || { id: 'SYSTEM', name: 'Sistema', role: 'sistema' };
  
  if(!DB.auditLog) DB.auditLog = [];
  DB.auditLog.push({
    date: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: action,
    detail: detail || ''
  });
  if(DB.auditLog.length > 1000) DB.auditLog = DB.auditLog.slice(-800);
  saveDB();
}

export function clearOperationalData(){
  if(!window.currentUser||window.currentUser.role!=='superadmin'){window.toast('Solo Super Admin puede borrar datos','error');return;}
  if(!confirm('¿Borrar TODOS los datos operativos (huéspedes, reservas, estadías, pagos, auditoría, trabajadores)? Las habitaciones volverán al estado inicial (1–8 disponibles). Los usuarios y servicios se conservan.'))return;
  if(!confirm('Confirmación final: esta acción no se puede deshacer.'))return;
  DB.guests=[];
  DB.reservations=[];
  DB.stays=[];
  DB.payments=[];
  DB.auditLog=[];
  DB.workers=[];
  DB.reminders=[];
  DB.rooms=structuredClone(defaultData.rooms);
  saveDB();
  logAudit('Datos borrados','Reset operativo por Super Admin');
  window.toast('Datos de prueba eliminados. Habitaciones 1–8 listas.','success');
  const renderers = {
    'dashboard': window.render_dashboard,
    'rooms': window.render_rooms,
    'reservations': window.render_reservations,
    'reception': window.render_reception,
    'guests': window.render_guests,
    'payments': window.render_payments,
    'tasks': window.render_tasks,
  };
  const renderer = renderers[window.currentPage];
  if (renderer && typeof renderer === 'function') renderer();
  else window.navigate('dashboard');
}

export async function initializePasswords(){
  let needsUpdate = false;
  for (const user of DB.users) {
    if (user.password.startsWith('plain:')) {
      const plainPass = user.password.substring(6);
      user.password = await window.hashPassword(plainPass);
      needsUpdate = true;
    }
  }
  if (needsUpdate) saveDB();
}



window.DB = DB;
window.currentUser = _currentUser;
window.currentPage = _currentPage;
window.saveDB = saveDB;
window.genId = genId;
window.logAudit = logAudit;
window.clearOperationalData = clearOperationalData;
window.migrateDBShape = migrateDBShape;
window.STORAGE_KEY = STORAGE_KEY;
window.BACKUP_FORMAT_ID = BACKUP_FORMAT_ID;
window.BACKUP_SCHEMA_VERSION = BACKUP_SCHEMA_VERSION;
window.defaultData = defaultData;
window.APP_TIME_ZONE = APP_TIME_ZONE;
window.initializePasswords = initializePasswords;
window.resetUserPasswords = resetUserPasswords;