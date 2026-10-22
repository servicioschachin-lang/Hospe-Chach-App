import { DB } from './db.js';
import { getGuestName, roomById } from './lookup.js';
import { today } from './utils.js';
import { icn } from './icons.js';

export function buildReminders() {
  const t = today();
  const reminders = [];
  for (const s of DB.stays) {
    if (s.status !== 'activa') continue;
    const co = s.plannedCheckout || '';
    if (co && co <= t) {
      reminders.push({type: 'checkout', stayId: s.id, guestName: getGuestName(s), roomId: s.roomId, date: co, urgent: co < t});
    }
  }
  for (const r of DB.reservations) {
    if ((r.status === 'confirmada' || r.status === 'pendiente') && r.checkIn === t) {
      reminders.push({type: 'checkin', resId: r.id, guestName: getGuestName(r), roomId: r.roomId, date: r.checkIn});
    }
  }
  return reminders;
}

export function checkAndShowReminders() {
  const reminders = buildReminders();
  if (!reminders.length) return;
  const badge = document.getElementById('reminder-badge');
  if (badge) badge.textContent = reminders.length;
  for (const rem of reminders) {
    if (rem.type === 'checkout' && rem.urgent) {
      const rm = roomById(rem.roomId);
      window.toast(`${icn('warning')} Check-out vencido: ${rem.guestName} · Hab ${rm ? rm.number : '?'}`, 'error');
    }
  }
}

export function startReminderPolling() {
  if (window._reminderInterval) clearInterval(window._reminderInterval);
  checkAndShowReminders();
  // Reducido de 5 minutos a 10 minutos para mejorar rendimiento
  window._reminderInterval = setInterval(checkAndShowReminders, 600000);
}

window.buildReminders = buildReminders;
window.checkAndShowReminders = checkAndShowReminders;
window.startReminderPolling = startReminderPolling;
