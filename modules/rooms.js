import { DB, saveDB } from './db.js';
import { roomById, getGuestName, getGuestSnap, activeStayForRoom, nextResForRoom, getRoomPhotos } from './lookup.js';
import { getRoomRealStatus } from './room-states.js';
import { today, fmtMoney, fmtDate, escapeAttr, statusBadge, statusLabel } from './utils.js';
import { icn } from './icons.js';
import { _pendingPhotos, getPendingPhotos } from './photos.js';

export let roomFilter = 'all';

const FILTERS = ['all','disponible','ocupada','limpieza','mantenimiento','reservada'];
const STATUS_OPTS = ['disponible','limpieza','mantenimiento'];
const ROOM_TYPES = ['simple','doble','suite','familiar'];

export function setRoomFilter(f){ roomFilter = f; render_rooms(); }

function renderFilterButtons() {
  return FILTERS.map(f =>
    `<button class="filter-btn ${roomFilter === f ? 'active' : ''}" onclick="setRoomFilter('${f}')">`
    + `${f === 'all' ? 'Todas' : statusLabel(f)}</button>`
  ).join('');
}

function roomImgHtml(r) {
  const photos = getRoomPhotos(r);
  const pid = escapeAttr(r.id);
  if (photos.length) {
    const idx = (window._roomCardPhotoIdx && window._roomCardPhotoIdx[r.id]) ? window._roomCardPhotoIdx[r.id] : 0;
    const normalizedIdx = idx >= photos.length ? 0 : idx;
    return `<div class="room-card-photo-wrap" onclick="if(event&&event.stopPropagation)event.stopPropagation();">`
      + `<img class="room-card-img" id="room-card-img-${pid}" src="${escapeAttr(photos[normalizedIdx])}" alt="Hab ${escapeAttr(r.number)}">`
      + (photos.length > 1
        ? `<button type="button" class="room-card-nav room-card-nav--prev" aria-label="Foto anterior" onclick="return roomCardPhotoNav(event,'${pid}',-1)">&#8249;</button>`
        + `<button type="button" class="room-card-nav room-card-nav--next" aria-label="Foto siguiente" onclick="return roomCardPhotoNav(event,'${pid}',1)">&#8250;</button>`
        + `<span class="room-card-photo-idx" id="room-card-ph-${pid}">${normalizedIdx + 1}/${photos.length}</span>`
        : '')
      + `</div>`;
  }
  return `<div class="room-card-no-img"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M2 15V8a1 1 0 011-1h5a1 1 0 011 1v7m-7 0v2a1 1 0 01-1 1H2a1 1 0 01-1-1v-2m0 0h14m0 0v2a1 1 0 01-1 1h-1a1 1 0 01-1-1v-2m-2-6a2 2 0 100-4 2 2 0 100 4zm7 5l1.5-5.5a1 1 0 01-.97-1.5H13l.5 7H18z"/></svg></div>`;
}

function guestInfoHtml(r) {
  const activeStay = activeStayForRoom(r.id);
  if (!activeStay) return '';
  return `<div style="font-size:0.7rem;color:var(--gold);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${getGuestName(activeStay)}</div>`;
}

function futureHintHtml(r, realStatus) {
  if (realStatus !== 'disponible') return '';
  const tCard = today();
  const nextResCard = nextResForRoom(r.id);
  if (!nextResCard || !nextResCard.checkIn || nextResCard.checkIn <= tCard) return '';
  return `<div style="font-size:0.65rem;color:var(--text3);margin-top:3px"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M3 8h14v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2-5v3m10-3v3M3 7V5a1 1 0 011-1h12a1 1 0 011 1v2"/></svg> Reserva desde ${fmtDate(nextResCard.checkIn)}</div>`;
}

function cleanBadgeHtml(r) {
  const lastStay = [...DB.stays].reverse().find(s => s.roomId === r.id);
  if (!(r.status === 'limpieza' || activeStayForRoom(r.id)) || !lastStay || !lastStay.cleanStatus) return '';
  return statusBadge(lastStay.cleanStatus);
}

export function roomCard(r, realStatus) {
  realStatus = realStatus || getRoomRealStatus(r);
  const cardStatus = (r.status === 'limpieza') ? 'limpieza' : realStatus;
  const pid = escapeAttr(r.id);
  return `<div class="room-card ${cardStatus}" onclick="openRoomDetail('${r.id}')">`
    + roomImgHtml(r)
    + `<div class="room-number">${r.number}</div>`
    + `<div class="room-type">${r.type.toUpperCase()} · P${r.floor} · ${r.capacity}p</div>`
    + guestInfoHtml(r)
    + futureHintHtml(r, realStatus)
    + `<div class="room-price">${fmtMoney(r.price)}/n · <svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M12 8a4 4 0 11-7.5-2.5L1 9V6l3-3V1h3l2 2h2l2 2v2zM8 8v1"/></svg> ${fmtMoney(r.keyDeposit || 0)}</div>`
    + `<div class="room-status">${statusBadge(cardStatus)}${cleanBadgeHtml(r)}</div>`
    + `</div>`;
}

export function render_rooms(){
  window.showInactiveRooms = document.getElementById('show-inactive')?.checked || false;
  const topbar = document.getElementById('topbar-actions');
  topbar.innerHTML = `<button class="btn btn-primary btn-sm" onclick="openRoomModal(null)">+ Nueva Habitación</button>`;

  let disponiblesHtml = '', ocupadasHtml = '', reservadasHtml = '', limpiezaHtml = '', otrasHtml = '';
  for (const rm of DB.rooms){
    if (!window.showInactiveRooms && rm.active === false) continue;
    const realStatus = getRoomRealStatus(rm);
    if (roomFilter !== 'all' && realStatus !== roomFilter && rm.status !== roomFilter) continue;
    if (roomFilter === 'disponible' && rm.status === 'limpieza') continue;
    const card = roomCard(rm, realStatus);
    if (realStatus === 'ocupada') ocupadasHtml += card;
    else if (realStatus === 'reservada' || realStatus === 'reservada_hoy') reservadasHtml += card;
    else if (realStatus === 'mantenimiento') otrasHtml += card;
    else if (rm.status === 'limpieza') limpiezaHtml += card;
    else if (realStatus === 'disponible') disponiblesHtml += card;
    else otrasHtml += card;
  }
  const allCards = `${disponiblesHtml}${reservadasHtml}${ocupadasHtml}${limpiezaHtml}${otrasHtml}`;

  document.getElementById('page-content').innerHTML =
    `<div class="filter-bar">${renderFilterButtons()}</div>`
    + (roomFilter === 'all' ? `<div style="margin-bottom:15px">
        <label><input type="checkbox" id="show-inactive" onchange="render_rooms()" ${window.showInactiveRooms ? 'checked' : ''}> Mostrar habitaciones inactivas</label>
      </div>` : '')
    + (roomFilter === 'all' && disponiblesHtml ? `<div style="margin-bottom:8px;font-size:0.75rem;color:var(--green);letter-spacing:1px;font-weight:600">● DISPONIBLES</div>` : '')
    + `<div class="rooms-grid">${allCards}</div>`;
}

function roomDetailHtml(r, realStatus) {
  const estDet = r.status !== realStatus
    ? `${statusBadge(r.status)} <span style="font-size:0.72rem;color:var(--text3)">operativo</span> · ${statusBadge(realStatus)} <span style="font-size:0.72rem;color:var(--text3)">reservas</span>`
    : statusBadge(realStatus);
  const activeStay = activeStayForRoom(r.id);
  const guestSnap = activeStay ? getGuestSnap(activeStay) : null;
  const isAdmin = window.currentUser.role === 'admin';
  const isHouse = window.currentUser.role === 'housekeeping';
  const canChangeStatus = isAdmin || isHouse;
  const statusBtns = canChangeStatus
    ? STATUS_OPTS.map(s => `<button class="btn btn-sm btn-secondary" onclick="changeRoomStatus('${r.id}','${s}')">${statusLabel(s)}</button>`).join('')
    : '';
  const photos = getRoomPhotos(r);
  let galleryHtml = '';
  if (photos.length) {
    galleryHtml = `<div style="margin-top:14px"><div style="font-size:0.72rem;color:var(--text3);letter-spacing:1px;margin-bottom:8px">FOTOS</div><div class="gallery-grid">`;
    for (const photo of photos) galleryHtml += `<div class="gallery-img" onclick="openLightbox(this)" data-src="${photo}"><img src="${photo}" alt="Foto"></div>`;
    galleryHtml += `</div></div>`;
  }
  const nextCI = nextResForRoom(r.id);
  return { estDet, statusBtns, galleryHtml, nextCI, guestSnap, isAdmin };
}

export function openRoomDetail(id){
  const r = roomById(id); if(!r) return;
  const realStatus = getRoomRealStatus(r);
  const { estDet, statusBtns, galleryHtml, nextCI, guestSnap, isAdmin } = roomDetailHtml(r, realStatus);
  window.openModal(
    `<div class="modal-header"><h3>Habitación ${r.number}</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="detail-row"><span class="detail-label">Estado</span><span class="detail-value">${estDet}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Tipo</span><span class="detail-value">${r.type}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Piso / Cap.</span><span class="detail-value">${r.floor} / ${r.capacity} personas</span></div>`
    + `<div class="detail-row"><span class="detail-label">Precio/noche</span><span class="detail-value fw-600">${fmtMoney(r.price)}</span></div>`
    + `<div class="detail-row"><span class="detail-label">Depósito de llave</span><span class="detail-value fw-600 text-gold"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M12 8a4 4 0 11-7.5-2.5L1 9V6l3-3V1h3l2 2h2l2 2v2zM8 8v1"/></svg> ${fmtMoney(r.keyDeposit || 0)}</span></div>`
    + (guestSnap ? `<div class="detail-row"><span class="detail-label">Huésped actual</span><span class="detail-value text-gold">${getGuestName(activeStayForRoom(r.id))}</span></div>` : '')
    + (nextCI ? `<div class="detail-row"><span class="detail-label">Próx. Check-in</span><span class="detail-value">${getGuestName(nextCI)} · ${fmtDate(nextCI.checkIn)}</span></div>` : '')
    + `<div class="detail-row"><span class="detail-label">Descripción</span><span class="detail-value" style="max-width:200px;text-align:right">${r.description || '—'}</span></div>`
    + galleryHtml
    + `</div>`
    + `<div class="modal-footer" style="flex-wrap:wrap;gap:8px">`
    + statusBtns
    + (isAdmin ? `<button class="btn btn-sm btn-primary" onclick="openRoomModal('${r.id}')">${icn('edit')} Editar</button>` : '')
    + (isAdmin ? `<button class="btn btn-sm btn-secondary" style="color:var(--red)" onclick="deleteRoom('${r.id}')">Eliminar</button>` : '')
    + `<button class="btn btn-sm btn-secondary" onclick="closeModal()">Cerrar</button>`
    + `</div>`
  );
}

export function changeRoomStatus(id, status){
  const r = roomById(id); if(!r) return;
  r.status = status; saveDB();
  window.toast(`Hab. ${r.number} → ${statusLabel(status)}`, 'success');
  window.closeModal(); render_rooms();
}

function typeOptionsHtml(r) {
  return ROOM_TYPES.map(t => `<option value="${t}" ${r && r.type === t ? 'selected' : ''}>${t}</option>`).join('');
}

function statusOptionsHtml(r) {
  return STATUS_OPTS.map(s => `<option value="${s}" ${r && r.status === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('');
}

export function openRoomModal(id){
  _pendingPhotos.length = 0;
  const r = id ? roomById(id) : null;
  const isFixed = false; // r && /^H[1-8]$/.test(r.id); // Eliminamos la restricción
  window.openModal(
    `<div class="modal-header"><h3>${r ? 'Editar Habitación' : 'Nueva Habitación'}</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Número</label><input id="rm-number" value="${r ? r.number : ''}" placeholder="101"></div>`
    + `<div class="form-group"><label>Piso</label><input id="rm-floor" type="number" value="${r ? r.floor : 1}" min="1"></div>`
    + `</div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Tipo</label><select id="rm-type">${typeOptionsHtml(r)}</select></div>`
    + `<div class="form-group"><label>Capacidad</label><input id="rm-capacity" type="number" value="${r ? r.capacity : 2}" min="1"></div>`
    + `</div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Precio/noche (Q)</label><input id="rm-price" type="number" value="${r ? r.price : 100}" min="0"></div>`
    + `<div class="form-group"><label>Depósito llave (Q) <svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M12 8a4 4 0 11-7.5-2.5L1 9V6l3-3V1h3l2 2h2l2 2v2zM8 8v1"/></svg></label><input id="rm-keydeposit" type="number" value="${r ? r.keyDeposit || 50 : 50}" min="0"></div>`
    + `</div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Estado</label><select id="rm-status">${statusOptionsHtml(r)}</select></div>`
    + `<div class="form-group"><label>Descripción</label><input id="rm-desc" value="${r ? r.description : ''}" placeholder="Vista al mar..."></div>`
    + `</div>`
    + `<div class="form-group"><label><input type="checkbox" id="rm-active" ${r === null || r.active ? 'checked' : ''}> Habitación activa (disponible en catálogo)</label></div>`
    + `<div class="form-group"><label>Fotos (máx 3)</label>`
    + `<div class="photo-upload-area" id="photo-drop-area"><input type="file" id="rm-photos" accept="image/*" multiple onchange="handlePhotoUpload(event)">`
    + `<div class="upload-icon"><svg viewBox="0 0 20 20" width="1em" height="1em" fill="currentColor" style="vertical-align:-0.15em"><path d="M7 3h6a1 1 0 011 1v1H6V4a1 1 0 011-1zM4 5h12v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"/></svg></div><p>Toca para agregar (0/3)</p><small>JPG/PNG · máx 3MB</small>`
    + `</div><div class="photos-preview" id="photos-preview"></div></div>`
    + `</div>`
    + `<div class="modal-footer">`
    + (r && !isFixed ? `<button class="btn btn-secondary" style="color:var(--red)" onclick="deleteRoom('${r.id}')">Eliminar habitación</button>` : '')
    + `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>`
    + `<button class="btn btn-primary" onclick="saveRoom('${r ? r.id : ''}')">Guardar</button>`
    + `</div>`
  );
  if (r && r.photos && r.photos.length) setTimeout(() => loadExistingPhotos(r.photos), 60);
}

export function saveRoom(id){
  const numRaw = document.getElementById('rm-number').value.trim();
  const newPhotos = getPendingPhotos();
  const data = {
    type: document.getElementById('rm-type').value,
    price: parseFloat(document.getElementById('rm-price').value) || 100,
    keyDeposit: parseFloat(document.getElementById('rm-keydeposit').value) || 0,
    floor: parseInt(document.getElementById('rm-floor').value) || 1,
    capacity: parseInt(document.getElementById('rm-capacity').value) || 2,
    status: document.getElementById('rm-status').value,
    description: document.getElementById('rm-desc').value,
    active: document.getElementById('rm-active').checked,
    photos: newPhotos,
  };
  let ni;
  if (id) {
    data.number = id.slice(1);
  } else {
    ni = parseInt(numRaw, 10);
    if (!numRaw || isNaN(ni) || ni < 1) {
      window.toast('El número de habitación es obligatorio', 'error');
      return;
    }
    data.number = String(ni);
  }
  for (const r of DB.rooms) {
    if (r.number === data.number && r.id !== id) {
      window.toast('Ese número ya está asignado a otra habitación', 'error');
      return;
    }
  }
  if (!id) {
    const nextIdNum = DB.rooms.length > 0 ? Math.max(...DB.rooms.map(r => parseInt(r.id.slice(1)) || 0)) + 1 : 1;
    data.id = 'H' + nextIdNum;
    DB.rooms.push(data);
    window.toast('Habitación creada', 'success');
  } else {
    const r = roomById(id);
    Object.assign(r, data);
    window.toast('Habitación actualizada', 'success');
  }
  saveDB(); window.closeModal(); render_rooms();
}

export function deleteRoom(roomId){
  const r = roomById(roomId); if(!r) return;
  // Eliminada restricción de H1-H8
  const active = activeStayForRoom(roomId);
  if (active) { window.toast('No se puede eliminar: hay una estancia activa en esta habitación', 'error'); return; }
  for (const res of DB.reservations) {
    if (res.roomId === roomId && res.status !== 'cancelada') {
      window.toast('No se puede eliminar: hay reservas vigentes para esta habitación. Cancélalas primero.', 'error');
      return;
    }
  }
  if (!confirm(`¿Eliminar la habitación ${r.number}? Esta acción no se puede deshacer.`)) return;
  const idx = DB.rooms.findIndex(r => r.id === roomId);
  if (idx !== -1) DB.rooms.splice(idx, 1);
  saveDB(); window.toast('Habitación eliminada', 'info');
  window.closeModal(); render_rooms();
}

window.roomFilter = roomFilter;
window.setRoomFilter = setRoomFilter;
window.render_rooms = render_rooms;
window.roomCard = roomCard;
window.openRoomDetail = openRoomDetail;
window.changeRoomStatus = changeRoomStatus;
window.openRoomModal = openRoomModal;
window.saveRoom = saveRoom;
window.deleteRoom = deleteRoom;
