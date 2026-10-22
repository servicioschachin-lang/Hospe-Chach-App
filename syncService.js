'use strict';
(function (global) {
  const SYNC_ENABLED = false;
  const pull = () => Promise.resolve(null);
  const push = () => Promise.resolve(false);
  const start = () => Promise.resolve();
  global.SyncService = {
    SYNC_ENABLED,
    pull,
    push,
    start
  };
})(typeof window !== 'undefined' ? window : globalThis);
