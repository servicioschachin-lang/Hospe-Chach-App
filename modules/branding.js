import { icn } from './icons.js';
import { compressImage } from './photos.js';
import { getCardFeePercent, fmtMoney } from './utils.js';

export const LOGO_DEFAULT_URL = './logo-blanco.png';
export const LOGO_RECEIPT_DEFAULT_URL = './recibos.jpeg';
export const APP_BRAND_CACHE_VER = '20260329b';

export function bumpBrandingCacheStamp(){
  try { window.StorageService.set('hotelos_branding_stamp', String(Date.now())); } catch(e) {}
}

export function withLogoCacheBust(url){
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const sep = url.includes('?') ? '&' : '?';
  let stamp = '';
  try { stamp = window.StorageService.getSync('hotelos_branding_stamp') || ''; } catch(e) {}
  if (!stamp) stamp = APP_BRAND_CACHE_VER;
  return url + sep + `v=${encodeURIComponent(APP_BRAND_CACHE_VER)}&t=${encodeURIComponent(stamp)}`;
}

export function getBrandingLogoSrc(){
  const u = (window.StorageService.getSync('hotelos_logo') || '').trim();
  return u || LOGO_DEFAULT_URL;
}

export function getReceiptLogoSrc(){
  const u = (window.StorageService.getSync('hotelos_logo_recibos') || '').trim();
  return u || LOGO_RECEIPT_DEFAULT_URL;
}

export function getLogoUrlForTicket(){ return getReceiptLogoSrc(); }

export function syncBrandLogoImgs(){
  const src = getBrandingLogoSrc();
  ['login-brand-img', 'sidebar-brand-img'].forEach((id) => {
    const img = document.getElementById(id);
    if (!img) return;
    img.alt = "Hospe Chach App";
    img.onerror = function(){
      const w = this.closest('.brand-logo-wrap');
      if (w) w.style.display = 'none';
    };
    img.onload = function(){
      const w = this.closest('.brand-logo-wrap');
      if (w) w.style.display = '';
    };
    if (img.getAttribute('src') !== src) img.src = src;
  });
}

export function ticketLogoHtml(){
  const u = getReceiptLogoSrc();
  if (!u) return '';
  const src = u.replace(/"/g, '&quot;').replace(/</g, '');
  return `<div class="ticket-logo-wrap"><img class="ticket-logo-img" src="${src}" alt="Logo Recibo" onerror="if(this.src.indexOf('logo.png')===-1)this.src='./logo-blanco.png';else{var w=this.closest('.ticket-logo-wrap');if(w)w.style.display='none';}"></div>`;
}

export function openLogoConfig(){
  const hotelName = window.StorageService.getSync('hotelos_name') || 'HotelOS';
  const hotelAddr = window.StorageService.getSync('hotelos_address') || '';
  const hotelPhone = window.StorageService.getSync('hotelos_phone') || '';
  const customLogo = (window.StorageService.getSync('hotelos_logo') || '').trim();
  const logoPreview = customLogo
    ? `<div class="logo-preview-box"><img src="${customLogo.replace(/"/g, '&quot;')}" alt="Logo actual"><br><button class="btn btn-danger btn-sm" style="margin-top:8px" onclick="removeLogo()">${icn('close')} Quitar logo personalizado</button></div>`
    : `<div style="font-size:0.8rem;color:var(--text3);margin-top:8px">Usando <strong>logo.png</strong> del sistema. Suba otra imagen para cambiarlo.</div>`;
  const customReceiptLogo = (window.StorageService.getSync('hotelos_logo_recibos') || '').trim();
  const receiptLogoPreview = customReceiptLogo
    ? `<div class="logo-preview-box"><img src="${customReceiptLogo.replace(/"/g, '&quot;')}" alt="Logo recibos actual"><br><button class="btn btn-danger btn-sm" style="margin-top:8px" onclick="removeReceiptLogo()">${icn('close')} Quitar logo de recibos</button></div>`
    : `<div style="font-size:0.8rem;color:var(--text3);margin-top:8px">Usando <strong>logo.png</strong> del sistema. Suba una imagen distinta para los tickets de 80mm.</div>`;
  window.openModal(
    `<div class="modal-header"><h3>${icn('gear')} Configuración del Negocio</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body">`
    + `<div class="form-group"><label>Logo del sistema (panel/login)</label>`
    + `<div class="logo-upload-area" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="event.preventDefault();this.classList.remove('drag-over'); if(event.dataTransfer.files[0]) handleLogoUpload({target:{files:[event.dataTransfer.files[0]]}})">`
    + `<input type="file" accept="image/*" onchange="handleLogoUpload(event)" aria-label="Subir logo del sistema">`
    + `<span style="font-size:1.4rem;display:block;margin-bottom:6px">${icn('upload')}</span><span style="font-size:0.82rem;color:var(--text2)">Toca o arrastra tu logo aquí</span></div>`
    + `<small style="color:var(--text3)">PNG/JPG · fondo blanco · máx 2MB · se comprime automáticamente</small>`
    + `</div>${logoPreview}</div>`
    + `<div class="form-group"><label>Logo para recibos (ticket 80mm)</label>`
    + `<div class="logo-upload-area" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="event.preventDefault();this.classList.remove('drag-over'); if(event.dataTransfer.files[0]) handleReceiptLogoUpload({target:{files:[event.dataTransfer.files[0]]}})">`
    + `<input type="file" accept="image/*" onchange="handleReceiptLogoUpload(event)" aria-label="Subir logo de recibos">`
    + `<span style="font-size:1.4rem;display:block;margin-bottom:6px">${icn('printer')}</span><span style="font-size:0.82rem;color:var(--text2)">Toca o arrastra logo de recibos</span></div>`
    + `<small style="color:var(--text3)">PNG/JPG · fondo blanco · máx 2MB · ideal 400×200px</small>`
    + `</div>${receiptLogoPreview}</div>`
    + `<div class="form-group"><label>Nombre del negocio</label><input id="cfg-name" value="${hotelName}" placeholder="Mi Hotel"></div>`
    + `<div class="form-group"><label>Dirección</label><input id="cfg-addr" value="${hotelAddr}" placeholder="Ciudad, Guatemala"></div>`
    + `<div class="form-group"><label>Teléfono</label><input id="cfg-phone" value="${hotelPhone}" placeholder="502-XXXX-XXXX"></div>`
    + `<div class="form-group"><label>Comisión cobro con tarjeta (%)</label><input type="number" id="cfg-cardfee" min="0" max="30" step="0.5" value="${getCardFeePercent()}">`
    + `<div style="font-size:0.72rem;color:var(--text3);margin-top:6px">Ejemplo: base Q100 y 5% → comisión Q5; el cliente paga Q105. Solo aplica al elegir «Tarjeta» en cobros.</div></div>`
    + `</div>`
    + `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveLogoConfig()">Guardar</button></div>`
  );
}

export function handleLogoUpload(event){
  const file = event.target.files[0]; if (!file) return;
  if (!file.type.match(/^image\//)){ window.toast('Solo imágenes', 'error'); return; }
  if (file.size > 2 * 1024 * 1024){ window.toast('Máximo 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    compressImage(e.target.result, file.type, (c) => {
      window._hotelLogo = c;
      window.StorageService.set('hotelos_logo', c);
      bumpBrandingCacheStamp();
      syncBrandLogoImgs();
      window.toast('Logo cargado', 'success');
      openLogoConfig();
    });
  };
  reader.readAsDataURL(file);
}

export function removeLogo(){
  window._hotelLogo = '';
  window.StorageService.remove('hotelos_logo');
  bumpBrandingCacheStamp();
  syncBrandLogoImgs();
  window.toast('Logo personalizado quitado; se usa logo.png del sistema', 'info');
  openLogoConfig();
}

export function handleReceiptLogoUpload(event){
  const file = event.target.files[0]; if (!file) return;
  if (!file.type.match(/^image\//)){ window.toast('Solo imágenes', 'error'); return; }
  if (file.size > 2 * 1024 * 1024){ window.toast('Máximo 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    compressImage(e.target.result, file.type, (c) => {
      window.StorageService.set('hotelos_logo_recibos', c);
      bumpBrandingCacheStamp();
      window.toast('Logo de recibos cargado', 'success');
      openLogoConfig();
    });
  };
  reader.readAsDataURL(file);
}

export function removeReceiptLogo(){
  window.StorageService.remove('hotelos_logo_recibos');
  bumpBrandingCacheStamp();
  window.toast('Logo de recibos quitado; se usa logo.png del sistema','info');
  openLogoConfig();
}

export function saveLogoConfig(){
  window.StorageService.set('hotelos_name',   document.getElementById('cfg-name').value.trim() || 'HotelOS');
  window.StorageService.set('hotelos_address', document.getElementById('cfg-addr').value.trim());
  window.StorageService.set('hotelos_phone',   document.getElementById('cfg-phone').value.trim());
  const cfp = document.getElementById('cfg-cardfee');
  if (cfp) {
    const pv = parseFloat(cfp.value);
    if (!isNaN(pv) && pv >= 0) window.StorageService.set('hotelos_card_fee_percent', String(Math.min(30, pv)));
  }
  window.toast('Configuración guardada', 'success');
  window.closeModal();
}

window.LOGO_DEFAULT_URL = LOGO_DEFAULT_URL;
window.APP_BRAND_CACHE_VER = APP_BRAND_CACHE_VER;
window.bumpBrandingCacheStamp = bumpBrandingCacheStamp;
window.withLogoCacheBust = withLogoCacheBust;
window.getBrandingLogoSrc = getBrandingLogoSrc;
window.getReceiptLogoSrc = getReceiptLogoSrc;
window.getLogoUrlForTicket = getLogoUrlForTicket;
window.syncBrandLogoImgs = syncBrandLogoImgs;
window.ticketLogoHtml = ticketLogoHtml;
window.openLogoConfig = openLogoConfig;
window.handleLogoUpload = handleLogoUpload;
window.handleReceiptLogoUpload = handleReceiptLogoUpload;
window.removeLogo = removeLogo;
window.removeReceiptLogo = removeReceiptLogo;
window.saveLogoConfig = saveLogoConfig;
