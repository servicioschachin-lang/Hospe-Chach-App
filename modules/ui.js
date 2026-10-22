import { icn } from './icons.js';

export function toast(msg, type) {
  type = type || 'info';
  const icons = {success: icn('check'), error: icn('close'), info: icn('info')};
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `<span>${(icons[type] || icn('info'))}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    if (t.parentNode) {
      t.classList.add('removing');
      setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 200);
    }
  }, type === 'error' ? 5000 : 3800);
}

export function openModal(html, size) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `<div class="modal-overlay" onclick="closeModalOutside(event)" role="dialog" aria-modal="true"><div class="modal ${size || ''}">${html}</div></div>`;
  document.body.style.overflow = 'hidden';
  // focus first focusable for a11y
  setTimeout(() => {
    const m = container.querySelector('.modal');
    const f = m && m.querySelector('input, select, textarea, button');
    if (f) try { f.focus(); } catch(e) {}
  }, 30);
}

export function closeModal() {
  try { window._editingReservationId = ''; } catch(e) {}
  const overlay = document.querySelector('.modal-overlay');
  const done = () => {
    const c = document.getElementById('modal-container');
    if (c) c.innerHTML = '';
    // restore scroll unless another modal is still open
    if (!document.querySelector('.modal-overlay')) document.body.style.overflow = '';
  };
  if (overlay) {
    overlay.classList.add('closing');
    setTimeout(done, 150);
  } else {
    done();
  }
}

export const closeModalOutside = (e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); };

window.toast = toast;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeModalOutside = closeModalOutside;
