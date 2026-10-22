'use strict';
(function (global) {
  const COMPANY = 'KK';
  const LS_LAST = 'kk_last_backup_ts';
  let autoTimer = null;
  let pending = null;
  let lastPayloadHash = '';

  function pad(n) { return String(n).padStart(2, '0'); }
  function stamp() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  }

  function buildPayload() {
    if (typeof BACKUP_FORMAT_ID === 'undefined' || typeof BACKUP_SCHEMA_VERSION === 'undefined' || typeof DB === 'undefined') return null;
    return {
      _backupFormat: BACKUP_FORMAT_ID,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      app: "Hospe Chach App — Sistema de Gestión",
      minReaderVersion: 1,
      note: 'Respaldo automático KK',
      data: JSON.parse(JSON.stringify(DB))
    };
  }

  function downloadBackup(payloadObject) {
    const name = `${COMPANY}_${stamp()}_backup.json`;
    const blob = new Blob([JSON.stringify(payloadObject, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    try { window.StorageService.set(LS_LAST, String(Date.now())); } catch (e) {}
  }

  function notifyDataSaved() {
    if (!pending) pending = setTimeout(flush, 5000);
  }

  function flush() {
    pending = null;
    try { window.StorageService.set(LS_LAST, String(Date.now())); } catch (e) {}
  }

  function startAutoBackup(getPayloadFn, intervalMs) {
    const ms = intervalMs == null ? 30 * 60 * 1000 : intervalMs;
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      let p;
      try { p = getPayloadFn(); } catch (e) { return; }
      if (!p) return;
      let h = '';
      try { h = JSON.stringify(p); } catch (e2) { return; }
      if (h === lastPayloadHash) return;
      lastPayloadHash = h;
      // Usar setTimeout para no bloquear el hilo principal
      setTimeout(() => downloadBackup(p), 0);
    }, ms);
  }

  global.BackupService = {
    downloadBackup,
    startAutoBackup,
    notifyDataSaved,
    buildPayload,
    getLastBackupTime: () => { try { return parseInt(window.StorageService.getSync(LS_LAST) || '0', 10); } catch (e) { return 0; } }
  };
})(typeof window !== 'undefined' ? window : globalThis);
