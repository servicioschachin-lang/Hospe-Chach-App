import { DB, saveDB, BACKUP_SCHEMA_VERSION } from './db.js';
import { icn } from './icons.js';
import { exportJSON, importJSON } from './export.js';
import { clearOperationalData } from './db.js';

export function render_config() {
  const content = document.getElementById('page-content');
  const hotelName = (window.StorageService && window.StorageService.getSync('hotelos_name')) || "Hospe Chach App";
  const hotelPhone = (window.StorageService && window.StorageService.getSync('hotelos_phone')) || '—';
  const totalRegs = (window.DB && window.DB.rooms ? window.DB.rooms.length + window.DB.guests.length + window.DB.reservations.length : '—');
  content.innerHTML = `
    <div class="config-page">
      <div class="config-hero card">
        <div class="config-hero-icon">${icn('gear')}</div>
        <div class="config-hero-text">
          <h3>Configuración del sistema</h3>
          <p>${hotelName} · ${hotelPhone} · ${totalRegs} registros · Gestiona identidad, canales, respaldos e integridad</p>
        </div>
        <div class="config-hero-actions">
          <button class="btn btn-secondary btn-sm" onclick="showChecksumInfo()" aria-label="Verificar integridad de datos">${icn('lock')} Verificar</button>
          <button class="btn btn-primary btn-sm" onclick="openLogoConfig()" aria-label="Editar negocio">${icn('edit')} Editar negocio</button>
        </div>
      </div>

      <div class="config-sections">
        <section class="config-section">
          <div class="config-section-header">
            <span class="config-section-icon">${icn('gear')}</span>
            <div>
              <h4>Negocio</h4>
              <span>Identidad visual y operación</span>
            </div>
          </div>
          <div class="config-actions">
            <div class="config-action">
              <span class="config-action-icon">${icn('bed')}</span>
              <div class="config-action-text">
                <strong>Configuración del negocio</strong>
                <span>Logo del sistema, logo de recibos 80mm, nombre, dirección, teléfono y comisión por tarjeta</span>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="openLogoConfig()" aria-label="Editar configuración del negocio">Editar negocio</button>
            </div>
            <div class="config-action">
              <span class="config-action-icon">${icn('calendar')}</span>
              <div class="config-action-text">
                <strong>Canales y OTAs</strong>
                <span>Gestiona canales (Booking, Airbnb, directo) y activa precios diferenciados OTA</span>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="openChannelConfig()" aria-label="Gestionar canales y OTAs">Gestionar</button>
            </div>
          </div>
        </section>

        <section class="config-section">
          <div class="config-section-header">
            <span class="config-section-icon" style="background:rgba(21,101,192,0.12);color:var(--blue)">${icn('download')}</span>
            <div>
              <h4>Datos y respaldo</h4>
              <span>Exporta, importa y verifica la base local</span>
            </div>
          </div>
          <div class="config-actions">
            <div class="config-action">
              <span class="config-action-icon" style="background:rgba(21,101,192,0.12);color:var(--blue)">${icn('download')}</span>
              <div class="config-action-text">
                <strong>Exportar respaldo JSON</strong>
                <span>Descarga archivo versionado (schema v${BACKUP_SCHEMA_VERSION}) con todos los datos</span>
              </div>
              <button class="btn btn-primary btn-sm" onclick="exportJSON()" aria-label="Exportar respaldo JSON">${icn('download')} Exportar</button>
            </div>
            <div class="config-action">
              <span class="config-action-icon" style="background:rgba(46,125,50,0.12);color:var(--green)">${icn('upload')}</span>
              <div class="config-action-text">
                <strong>Importar respaldo JSON</strong>
                <span>Restaura datos desde un archivo. Reemplaza la información actual de este navegador</span>
              </div>
              <label class="btn btn-secondary btn-sm cursor-pointer" aria-label="Importar respaldo JSON">
                ${icn('upload')} Importar
                <input type="file" accept=".json,application/json" class="display-none" onchange="importJSON(event)" aria-label="Seleccionar archivo de respaldo">
              </label>
            </div>
            <div class="config-action">
              <span class="config-action-icon">${icn('info')}</span>
              <div class="config-action-text">
                <strong>Ayuda de respaldos</strong>
                <span>Cómo exportar/importar entre dispositivos y compatibilidad de versiones</span>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="openBackupHelp()" aria-label="Ver ayuda de respaldos">Ver ayuda</button>
            </div>
            <div class="config-action">
              <span class="config-action-icon" style="background:rgba(106,27,154,0.12);color:var(--purple)">${icn('lock')}</span>
              <div class="config-action-text">
                <strong>Verificar integridad</strong>
                <span>Checksum CRC32 y conteo de registros para validar sincronización</span>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="showChecksumInfo()" aria-label="Verificar integridad">Verificar</button>
            </div>
          </div>
        </section>

        <section class="config-section config-section--danger">
          <div class="config-section-header">
            <span class="config-section-icon">${icn('trash')}</span>
            <div>
              <h4>Zona de peligro</h4>
              <span>Acciones irreversibles · Solo Super Admin</span>
            </div>
          </div>
          <div class="config-actions">
            <div class="config-action config-action--danger">
              <span class="config-action-icon" style="background:rgba(180,40,55,0.15);color:var(--red)">${icn('trash')}</span>
              <div class="config-action-text">
                <strong>Borrar datos de prueba</strong>
                <span>Elimina huéspedes, reservas y estancias de demostración. Habitaciones 1–8 quedan listas</span>
              </div>
              <button class="btn btn-danger btn-sm" onclick="clearOperationalData()" aria-label="Borrar datos de prueba">${icn('trash')} Borrar</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
}

export function openChannelConfig() {
  const channels = DB.channels || [];
  window.openModal(`
    <div class="modal-header"><h3>${icn('calendar')} Gestionar Canales (OTAs)</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>
    <div class="modal-body">
      ${channels.length ? `
        <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:16px">
          <table style="width:100%">
            <thead><tr><th style="text-align:left;padding:10px 14px;font-size:0.72rem;color:var(--text3);background:var(--dark3)">Nombre</th><th style="padding:10px 14px;font-size:0.72rem;color:var(--text3);background:var(--dark3)">Precio OTA</th><th style="background:var(--dark3)"></th></tr></thead>
            <tbody id="channel-list">
              ${channels.map(c => `
                <tr style="border-top:1px solid var(--border)">
                  <td style="padding:10px 14px;font-weight:500">${c.name}</td>
                  <td style="padding:10px 14px"><span class="badge ${c.usesOtaPricing ? 'badge-blue' : 'badge-gray'}">${c.usesOtaPricing ? 'Sí' : 'No'}</span></td>
                  <td style="padding:10px 14px;text-align:right"><button class="btn btn-sm btn-secondary" onclick="deleteChannel('${c.id}')">${icn('trash')}</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state" style="padding:20px"><p style="color:var(--text3);font-size:0.85rem">Sin canales. Agrega Booking, Airbnb o canal directo.</p></div>`}
      <div style="background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:14px;display:grid;gap:10px">
        <div style="font-size:0.78rem;font-weight:600;color:var(--text2);letter-spacing:0.5px;text-transform:uppercase">Nuevo canal</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input id="new-ch-name" placeholder="Nombre canal (ej. Booking)" style="flex:1;min-width:160px">
          <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:var(--text2);cursor:pointer"><input type="checkbox" id="new-ch-ota"> Precio OTA</label>
          <button class="btn btn-sm btn-primary" onclick="addChannel()">${icn('plus')} Agregar</button>
        </div>
      </div>
    </div>
  `, 'modal-md');
}

export function addChannel() {
  const name = document.getElementById('new-ch-name').value.trim();
  const usesOtaPricing = document.getElementById('new-ch-ota').checked;
  if (!name) return;
  DB.channels.push({ id: 'CH' + Date.now(), name, usesOtaPricing });
  saveDB();
  closeModal();
  openChannelConfig();
}

export function deleteChannel(id) {
  DB.channels = DB.channels.filter(c => c.id !== id);
  saveDB();
  closeModal();
  openChannelConfig();
}

window.render_config = render_config;
window.openChannelConfig = openChannelConfig;
window.addChannel = addChannel;
window.deleteChannel = deleteChannel;
