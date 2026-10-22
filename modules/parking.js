import { DB, saveDB, genId } from './db.js';
import { icn } from './icons.js';

export function render_parking() {
  const content = document.getElementById('page-content');
  if (!DB.parking) DB.parking = { capacity: 10, vehicles: [] };

  const ocupados = DB.parking.vehicles.filter(v => v.status === 'ocupado').length;
  const libres = DB.parking.capacity - ocupados;

  content.innerHTML = `
    <div class="parking-header-bar">
      <div class="topbar-title"><h3>Estacionamiento</h3><p>${ocupados} / ${DB.parking.capacity} cupos ocupados · ${libres} libres</p></div>
      <div class="parking-capacity-control">
        <label>Capacidad total: <input type="number" id="parking-capacity" value="${DB.parking.capacity}" min="1" style="width:70px"></label>
        <button class="btn btn-sm btn-secondary" onclick="saveParkingCapacity()">Actualizar</button>
      </div>
    </div>
    <div class="parking-grid">
      ${DB.parking.vehicles.length === 0
        ? `<p style="color:var(--text3);text-align:center;padding:30px">No hay vehículos registrados</p>`
        : DB.parking.vehicles.map(v => `
          <div class="parking-slot ${v.status} slot-${v.slot || ''}">
            <div class="slot-content">
              <span class="slot-badge">${v.slot || ''}</span>
              <span class="plate">${v.plate}</span>
              <span class="guest-name">${v.guestName || ''}</span>
              <span class="slot-time">${v.entryTime || ''}</span>
            </div>
            ${v.status === 'ocupado' ? `<button class="btn btn-sm btn-secondary" onclick="releaseParking('${v.id}')">Liberar</button>` : ''}
          </div>
        `).join('')
      }
    </div>
    <div class="modal-footer" style="justify-content:space-between">
      <button class="btn btn-primary" onclick="openParkingModal()">+ Registrar vehículo</button>
    </div>
  `;
}

export function openParkingModal() {
  if (!DB.parking) DB.parking = { capacity: 10, vehicles: [] };
  const availableSlots = [];
  for (let i = 1; i <= DB.parking.capacity; i++) {
    const inUse = DB.parking.vehicles.some(v => v.slot == i && v.status === 'ocupado');
    if (!inUse) availableSlots.push(i);
  }
  
  // Obtener reservas activas para el select
  const activeRes = DB.reservations.filter(r => r.status === 'confirmada' || r.status === 'ocupada');
  
  window.openModal(
    `<div class="modal-header"><h3>Registrar Vehículo</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Placa</label><input id="p-plate" type="text" placeholder="ABC-123" style="text-transform:uppercase"></div>`
    + `<div class="form-group"><label>Cupo #</label><select id="p-slot">${availableSlots.length ? availableSlots.map(s => `<option value="${s}">${s}</option>`).join('') : '<option value="">Sin cupos libres</option>'}</select></div>`
    + `</div>`
    + `<div class="form-group"><label>Vincular a Reserva (Huésped)</label>
       <select id="p-res" onchange="autoFillParkingFromRes()">
         <option value="">-- Seleccionar reserva --</option>
         ${activeRes.map(r => `<option value="${r.id}">${r.guestSnap.name} (Hab. ${r.roomId})</option>`).join('')}
       </select>
       </div>`
    + `<div class="form-row">`
    + `<div class="form-group"><label>Huésped</label><input id="p-guest" type="text" placeholder="Nombre del huésped"></div>`
    + `<div class="form-group"><label>Habitación</label><input id="p-room" type="text" placeholder="Ej: 101"></div>`
    + `</div>`
    + `</div>`
    + `<div class="modal-footer">`
    + `<button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>`
    + `<button class="btn btn-primary" onclick="saveParkingVehicle()">Guardar</button>`
    + `</div>`
  );
}

export function autoFillParkingFromRes() {
  const resId = document.getElementById('p-res').value;
  if (!resId) return;
  const res = DB.reservations.find(r => r.id === resId);
  if (!res) return;
  
  document.getElementById('p-guest').value = res.guestSnap.name;
  document.getElementById('p-room').value = res.roomId;
}

export function saveParkingVehicle() {
  const plate = (document.getElementById('p-plate').value || '').trim().toUpperCase();
  const slot = document.getElementById('p-slot').value;
  if (!plate) {
    window.toast('La placa es obligatoria', 'error');
    return;
  }
  if (!slot) {
    window.toast('No hay cupos disponibles', 'error');
    return;
  }
  if (!DB.parking) DB.parking = { capacity: 10, vehicles: [] };
  const date = new Date();
  DB.parking.vehicles.push({
    id: genId('V'),
    plate,
    slot: parseInt(slot),
    guestName: (document.getElementById('p-guest').value || '').trim(),
    room: (document.getElementById('p-room').value || '').trim(),
    status: 'ocupado',
    entryTime: date.toLocaleString('es-GT')
  });
  saveDB();
  window.closeModal();
  window.toast(`Vehículo ${plate} registrado en cupo ${slot}`, 'success');
  render_parking();
}

export function releaseParking(id) {
  const v = DB.parking.vehicles.find(v => v.id === id);
  if (!v) return;
  v.status = 'libre';
  v.exitTime = new Date().toLocaleString('es-GT');
  saveDB();
  window.toast(`Cupo ${v.slot} liberado`, 'success');
  render_parking();
}

export function saveParkingCapacity() {
  const cap = parseInt(document.getElementById('parking-capacity').value, 10);
  if (!DB.parking) DB.parking = { capacity: 10, vehicles: [] };
  if (isNaN(cap) || cap < 1) {
    window.toast('Capacidad inválida', 'error');
    return;
  }
  DB.parking.capacity = cap;
  saveDB();
  window.toast(`Capacidad actualizada a ${cap} cupos`, 'success');
  render_parking();
}

window.render_parking = render_parking;
window.openParkingModal = openParkingModal;
window.autoFillParkingFromRes = autoFillParkingFromRes;
window.saveParkingVehicle = saveParkingVehicle;
window.releaseParking = releaseParking;
window.saveParkingCapacity = saveParkingCapacity;
