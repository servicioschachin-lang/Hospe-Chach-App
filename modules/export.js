import { DB, saveDB, STORAGE_KEY, BACKUP_FORMAT_ID, BACKUP_SCHEMA_VERSION, migrateDBShape } from './db.js';
import { icn } from './icons.js';
import { today } from './utils.js';

export function openBackupHelp(){
  window.openModal(
    `<div class="modal-header"><h3>Respaldo JSON</h3><button class="modal-close" onclick="closeModal()">${icn('close')}</button></div>`
    + `<div class="modal-body" style="font-size:0.9rem;line-height:1.5;color:var(--text2)">`
    + `<p><strong>Exportar</strong> descarga un archivo con metadatos de versión (<code>schemaVersion</code>) y los datos dentro de <code>data</code>. Así el sistema puede importar respaldos antiguos y nuevos.</p>`
    + `<p><strong>Importar</strong> reemplaza <em>todos</em> los datos en este navegador. Se aceptan:</p>`
    + `<ul style="margin:8px 0 8px 18px">`
    + `<li>Archivos nuevos (formato <code>${BACKUP_FORMAT_ID}</code>, esquema actual ${BACKUP_SCHEMA_VERSION}).</li>`
    + `<li>Archivos planos antiguos (solo el objeto con <code>rooms</code>, <code>guests</code>, etc., sin sobre).</li>`
    + `</ul>`
    + `<p style="font-size:0.82rem;color:var(--text3)">Los navegadores no comparten datos entre sí: exporte en uno e importe en otro si cambia de equipo o perfil.</p>`
    + `</div>`
    + `<div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">Entendido</button></div>`
  );
}

export function exportJSON(){
  const payload = {
    _backupFormat: BACKUP_FORMAT_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: "Hospe Chach App — Sistema de Gestión",
    minReaderVersion: 1,
    note: 'No edite _backupFormat ni schemaVersion a mano salvo que sepa lo que hace.',
    data: JSON.parse(JSON.stringify(DB))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kukanche_respaldo_v${BACKUP_SCHEMA_VERSION}_${today()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.toast(`Respaldo exportado (esquema v${BACKUP_SCHEMA_VERSION})`, 'success');
}

export function importJSON(event){
  const inp = event && event.target;
  const file = inp && inp.files && inp.files[0];
  if (inp) inp.value = '';
  if (!file) return;
  if (!confirm('¿Importar respaldo JSON?\n\nSe borrarán los datos actuales en ESTE navegador y se sustituirán por el archivo. Esta acción no se puede deshacer.')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const rawParsed = JSON.parse(text);
      if (rawParsed._backupFormat && rawParsed._backupFormat !== BACKUP_FORMAT_ID) {
        throw new Error(`Archivo de otro programa (formato: ${rawParsed._backupFormat}).`);
      }
      if (rawParsed._backupFormat === BACKUP_FORMAT_ID && rawParsed.schemaVersion > BACKUP_SCHEMA_VERSION) {
        if (!confirm(`Este archivo indica un esquema más nuevo (${rawParsed.schemaVersion}) que el de esta página (${BACKUP_SCHEMA_VERSION}). Puede fallar o ignorar campos. ¿Continuar?`)) return;
      }
      const data = migrateDBShape(rawParsed);
      Object.assign(DB, data);
      saveDB();
      let verHint = '';
      if (rawParsed._backupFormat === BACKUP_FORMAT_ID && rawParsed.schemaVersion != null) verHint = ` (archivo esquema v${rawParsed.schemaVersion})`;
      else if (!rawParsed._backupFormat) verHint = ' (formato plano anterior)';
      if (window.currentUser) {
        const okUser = DB.users.some(u => u.id === window.currentUser.id);
        if (!okUser) {
          try { window.StorageService.remove('hotelos_session'); } catch (x) {}
          window.currentUser = null;
          document.getElementById('app').className = 'hidden';
          document.getElementById('login-screen').className = '';
          window.toast('Respaldo importado' + verHint + '. Inicie sesión de nuevo (su usuario anterior no estaba en el archivo).', 'success');
          if (typeof window.syncBrandLogoImgs === 'function') window.syncBrandLogoImgs();
          return;
        }
      }
      window.toast('Respaldo importado' + verHint, 'success');
      window.navigate(window.currentPage);
      if (typeof window.buildNav === 'function' && window.currentUser) setTimeout(() => window.buildNav(), 0);
      if (typeof window.syncBrandLogoImgs === 'function') window.syncBrandLogoImgs();
    } catch (err) { window.toast('Error al importar: ' + err.message, 'error'); }
  };
  reader.onerror = () => window.toast('No se pudo leer el archivo', 'error');
  reader.readAsText(file, 'UTF-8');
}

window.openBackupHelp = openBackupHelp;
window.exportJSON = exportJSON;
window.importJSON = importJSON;
