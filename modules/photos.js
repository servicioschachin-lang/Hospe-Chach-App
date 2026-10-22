import { icn } from './icons.js';
import { roomById, getRoomPhotos } from './lookup.js';
export { getRoomPhotos } from './lookup.js';

export const _pendingPhotos = [];

export function handlePhotoUpload(event){
  const files = event.target.files; if(!files||!files.length) return;
  const remaining = 3 - _pendingPhotos.length;
  if(remaining <= 0){window.toast('Máximo 3 fotos','error');return;}
  const toProcess = Math.min(files.length, remaining);
  for(let i = 0; i < toProcess; i++){
    const file = files[i];
    if(!file.type.match(/^image\//)){window.toast('Solo imágenes','error');return;}
    if(file.size > 3*1024*1024){window.toast(`"${file.name}" supera 3MB`,'error');return;}
    const reader = new FileReader();
    reader.onload = (e) => {
      compressImage(e.target.result, file.type, (c) => {
        _pendingPhotos.push(c); renderPhotoPreview();
      });
    };
    reader.readAsDataURL(file);
  }
}

export function compressImage(dataUrl, mimeType, callback){
  const img = new Image();
  img.onload = () => {
    let w = img.width, h = img.height;
    const MAX_W = 1200, MAX_H = 900;
    if(w > MAX_W){ h = Math.round(h * MAX_W / w); w = MAX_W; }
    if(h > MAX_H){ w = Math.round(w * MAX_H / h); h = MAX_H; }
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    try { callback(canvas.toDataURL(mimeType === 'image/png' ? 'image/png' : 'image/jpeg', 0.82)); }
    catch(e){ callback(dataUrl); }
  };
  img.onerror = () => callback(dataUrl);
  img.src = dataUrl;
}

export function loadExistingPhotos(photos){ _pendingPhotos.length = 0; if(photos) _pendingPhotos.push(...photos); renderPhotoPreview(); }

export function renderPhotoPreview(){
  const preview = document.getElementById('photos-preview'); if(!preview) return;
  preview.innerHTML = '';
  _pendingPhotos.forEach((src, idx) => {
    const thumb = document.createElement('div'); thumb.className = 'photo-thumb';
    const img = document.createElement('img'); img.src = src; img.alt = `Foto ${idx+1}`;
    const del = document.createElement('button'); del.className = 'photo-del'; del.innerHTML = icn('close');
    del.onclick = (e) => { e.stopPropagation(); _pendingPhotos.splice(idx, 1); renderPhotoPreview(); };
    thumb.appendChild(img); thumb.appendChild(del); preview.appendChild(thumb);
  });
  const area = document.getElementById('photo-drop-area');
  if(area){ const p = area.querySelector('p'); if(p) p.textContent = _pendingPhotos.length >= 3 ? 'Límite (3/3)' : `Toca para agregar (${_pendingPhotos.length}/3)`; }
}

export const getPendingPhotos = () => _pendingPhotos.slice();

export function openLightbox(el, allPhotos, startIdx) {
  let photos = [];
  if (Array.isArray(allPhotos) && allPhotos.length) {
    photos = allPhotos;
  } else {
    const src = el ? (el.getAttribute('data-src') || (el.querySelector('img') && el.querySelector('img').src)) : null;
    if (src) photos = [src];
  }
  if (!photos.length) return;

  let idx = (typeof startIdx === 'number' && startIdx >= 0 && startIdx < photos.length) ? startIdx : 0;

  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');

  const render = () => {
    lb.innerHTML =
      `<button class="lightbox-close" aria-label="Cerrar">${icn('close')}</button>` +
      `<button class="lightbox-arrow lightbox-arrow--prev" aria-label="Anterior" style="${photos.length < 2 ? 'display:none' : ''}">&#8249;</button>` +
      `<div class="lightbox-img-wrap"><img src="${photos[idx]}" alt="Foto ${idx + 1}" class="lightbox-img" draggable="false"></div>` +
      `<button class="lightbox-arrow lightbox-arrow--next" aria-label="Siguiente" style="${photos.length < 2 ? 'display:none' : ''}">&#8250;</button>` +
      (photos.length > 1 ? `<div class="lightbox-counter">${idx + 1} / ${photos.length}</div>` : '') +
      (photos.length > 1 ? `<div class="lightbox-dots">${photos.map((_, i) => `<span class="lightbox-dot${i === idx ? ' active' : ''}"></span>`).join('')}</div>` : '');

    const closeLb = lb.querySelector('.lightbox-close');
    if (closeLb) closeLb.onclick = closeLbHandler;
    const prev = lb.querySelector('.lightbox-arrow--prev');
    const next = lb.querySelector('.lightbox-arrow--next');
    if (prev) prev.onclick = (e) => { e.stopPropagation(); navigate(-1); };
    if (next) next.onclick = (e) => { e.stopPropagation(); navigate(1); };

    lb.querySelectorAll('.lightbox-dot').forEach((dot, i) => {
      dot.onclick = (e) => { e.stopPropagation(); idx = i; render(); };
    });
  };

  const navigate = (dir) => {
    idx = (idx + dir + photos.length) % photos.length;
    render();
  };

  const closeLbHandler = () => {
    if (lb.parentNode) lb.parentNode.removeChild(lb);
    document.removeEventListener('keydown', onKey);
  };

  lb.onclick = (e) => { if (e.target === lb) closeLbHandler(); };

  const onKey = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate(-1);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(1);
    if (e.key === 'Escape') closeLbHandler();
  };
  document.addEventListener('keydown', onKey);

  let touchStartX = 0, touchStartY = 0;
  lb.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) navigate(dx < 0 ? 1 : -1);
  }, { passive: true });

  render();
  document.body.appendChild(lb);
  if (lb.focus) lb.focus();
}

export function openRoomLightbox(roomId, startIdx) {
  const r = roomById(roomId);
  if (!r) return;
  const photos = getRoomPhotos(r);
  if (!photos.length) return;
  openLightbox(null, photos, startIdx || 0);
}

export function roomCardPhotoNav(ev, roomId, delta){
  if(ev){ if(ev.stopPropagation) ev.stopPropagation(); if(typeof ev.cancelBubble!=='undefined') ev.cancelBubble=true; }
  window._roomCardPhotoIdx = window._roomCardPhotoIdx || {};
  const r = roomById(roomId); if(!r) return false;
  const photos = getRoomPhotos(r);
  if(photos.length < 2) return false;
  let i = (window._roomCardPhotoIdx[roomId] || 0);
  i = (i + delta + photos.length) % photos.length;
  window._roomCardPhotoIdx[roomId] = i;
  const img = document.getElementById('room-card-img-' + roomId);
  const ct = document.getElementById('room-card-ph-' + roomId);
  if(img) img.src = photos[i];
  if(ct) ct.textContent = `${i+1}/${photos.length}`;
  return false;
}

window._pendingPhotos = _pendingPhotos;
window.handlePhotoUpload = handlePhotoUpload;
window.compressImage = compressImage;
window.loadExistingPhotos = loadExistingPhotos;
window.renderPhotoPreview = renderPhotoPreview;
window.getPendingPhotos = getPendingPhotos;
window.openLightbox = openLightbox;
window.openRoomLightbox = openRoomLightbox;
window.roomCardPhotoNav = roomCardPhotoNav;
