import { DB } from './db.js';
import { activeStayForRoom, reservationCoversDate, stayCoversDate } from './lookup.js';
import { today } from './utils.js';

export function getRoomRealStatus(room, refDate) {
  if (!refDate) refDate = today();
  const st = activeStayForRoom(room.id);
  if (st && stayCoversDate(st, refDate)) return 'ocupada';
  if (room.status === 'mantenimiento') return 'mantenimiento';
  let blocking = null;
  for (let i = 0; i < DB.reservations.length; i++) {
    const r = DB.reservations[i];
    if (r.roomId !== room.id || !reservationCoversDate(r, refDate)) continue;
    if (!blocking || r.checkIn < blocking.checkIn) blocking = r;
  }
  if (blocking) {
    if (blocking.checkIn === refDate && refDate === today()) return 'reservada_hoy';
    return 'reservada';
  }
  return 'disponible';
}

export function countRoomStatusOnDate(dateStr) {
  const o = {disponible:0,ocupada:0,reservada:0,reservada_hoy:0,limpieza:0,mantenimiento:0};
  for (const room of DB.rooms) {
    if (room.status === 'limpieza') o.limpieza++;
    const s = getRoomRealStatus(room, dateStr);
    if (s in o) o[s]++;
  }
  return o;
}

export function getRoomsAvailable() {
  const d = today();
  return DB.rooms.filter(rm => {
    const s = getRoomRealStatus(rm, d);
    return s === 'disponible' && rm.status !== 'limpieza';
  });
}

window.getRoomRealStatus = getRoomRealStatus;
window.countRoomStatusOnDate = countRoomStatusOnDate;
window.getRoomsAvailable = getRoomsAvailable;
