import { DB } from './db.js';

export const roomById = (id) => DB.rooms.find(r => r.id === id) || null;
export const guestById = (id) => DB.guests.find(g => g.id === id) || null;
export const resById = (id) => DB.reservations.find(r => r.id === id) || null;
export const stayById = (id) => DB.stays.find(s => s.id === id) || null;
export const svcById = (id) => DB.services.find(s => s.id === id) || null;

export function getGuestName(stayOrRes) {
  if (!stayOrRes) return '—';
  if (stayOrRes.guestSnap && stayOrRes.guestSnap.name) return stayOrRes.guestSnap.name;
  const g = guestById(stayOrRes.guestId);
  return g ? g.name : '—';
}

export function getGuestSnap(stayOrRes) {
  if (stayOrRes && stayOrRes.guestSnap) return stayOrRes.guestSnap;
  const g = guestById(stayOrRes && stayOrRes.guestId);
  return g ? {name:g.name,document:g.document,phone:g.phone} : {name:'—',document:'',phone:''};
}

export function activeStayForRoom(roomId) {
  return DB.stays.find(s => s.roomId === roomId && s.status === 'activa') || null;
}

export function nextResForRoom(roomId) {
  const t = window.today();
  return DB.reservations
    .filter(r => r.roomId === roomId && (r.status === 'confirmada' || r.status === 'pendiente') && r.checkIn >= t)
    .sort((a, b) => a.checkIn < b.checkIn ? -1 : 1)[0] || null;
}

export const reservationIsBlocking = (res) => res && (res.status === 'pendiente' || res.status === 'confirmada');

export function reservationCoversDate(res, dateStr) {
  if (!reservationIsBlocking(res) || !dateStr || !res.checkIn || !res.checkOut) return false;
  return dateStr >= res.checkIn && dateStr < res.checkOut;
}

export function stayCoversDate(stay, dateStr) {
  if (!stay || stay.status !== 'activa' || !stay.checkIn || !dateStr) return false;
  const out = stay.plannedCheckout || stay.checkOut;
  if (!out) return false;
  return dateStr >= stay.checkIn && dateStr < out;
}

export const reservationIntervalsOverlap = (ci1, co1, ci2, co2) => ci1 < co2 && ci2 < co1;

export function isRoomFreeForReservationDates(roomId, checkIn, checkOut, ignoreResId) {
  if (!roomId || !checkIn || !checkOut || checkOut <= checkIn) return false;
  const st = activeStayForRoom(roomId);
  if (st) {
    const stayOut = st.plannedCheckout || st.checkOut;
    if (stayOut && reservationIntervalsOverlap(checkIn, checkOut, st.checkIn, stayOut)) return false;
  }
  return !DB.reservations.some(r => {
    if (ignoreResId && r.id === ignoreResId) return false;
    if (r.roomId !== roomId || !reservationIsBlocking(r)) return false;
    return reservationIntervalsOverlap(checkIn, checkOut, r.checkIn, r.checkOut);
  });
}

export function reservationsBlockingOnDate(d) {
  const out = DB.reservations.filter(r => reservationCoversDate(r, d));
  out.sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.id.localeCompare(b.id));
  return out;
}

export function reservationMatchesListHorizon(r, t, horizonMonths) {
  if (!horizonMonths || horizonMonths <= 0) return true;
  const end = window.addMonths(t, horizonMonths);
  return r.checkOut > t && r.checkIn <= end;
}

export const getRoomPhotos = (r) => (r && r.photos && r.photos.length) ? r.photos : [];

window.roomById = roomById;
window.guestById = guestById;
window.resById = resById;
window.stayById = stayById;
window.svcById = svcById;
window.getGuestName = getGuestName;
window.getGuestSnap = getGuestSnap;
window.activeStayForRoom = activeStayForRoom;
window.nextResForRoom = nextResForRoom;
window.reservationIsBlocking = reservationIsBlocking;
window.reservationCoversDate = reservationCoversDate;
window.stayCoversDate = stayCoversDate;
window.reservationIntervalsOverlap = reservationIntervalsOverlap;
window.isRoomFreeForReservationDates = isRoomFreeForReservationDates;
window.reservationsBlockingOnDate = reservationsBlockingOnDate;
window.reservationMatchesListHorizon = reservationMatchesListHorizon;
window.getRoomPhotos = getRoomPhotos;
