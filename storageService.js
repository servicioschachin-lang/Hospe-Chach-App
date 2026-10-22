'use strict';
(function (global) {
  const DB_NAME = 'hotelos_kv';
  const STORE = 'kv';
  const MIRROR_KEY = 'hotelos_data';
  let dbp = null;
  let _cache = {};

  function openDb() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      const req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbp;
  }

  function migrateFromLocalStorage() {
    return openDb().then(function(db) {
      return new Promise(function(resolve, reject) {
        let keysToMigrate = [];
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.indexOf('hotelos_') === 0) {
              keysToMigrate.push({ key: k, val: localStorage.getItem(k) });
            }
          }
        } catch(e) {}
        
        if (keysToMigrate.length === 0) return resolve();
        
        const tx = db.transaction(STORE, 'readwrite');
        const st = tx.objectStore(STORE);
        keysToMigrate.forEach(function(item) {
          st.put(item);
        });
        tx.oncomplete = function() {
          try {
             keysToMigrate.forEach(function(item) {
                localStorage.removeItem(item.key);
             });
          } catch(e) {}
          resolve();
        };
        tx.onerror = function() { reject(tx.error); };
      });
    });
  }

  function loadAll() {
    return migrateFromLocalStorage().then(function() {
      return openDb();
    }).then(function(db) {
      return new Promise(function(resolve, reject) {
        const tx = db.transaction(STORE, 'readonly');
        const st = tx.objectStore(STORE);
        const req = st.getAll();
        req.onsuccess = function() {
          _cache = {};
          if (req.result) {
            req.result.forEach(function(item) {
              _cache[item.key] = item.val;
            });
          }
          resolve();
        };
        req.onerror = function() { reject(req.error); };
      });
    }).catch(function(err) {
      console.error('StorageService loadAll error:', err);
      _cache = {};
    });
  }

  function getSync(key) {
    return _cache[key] !== undefined ? _cache[key] : null;
  }

  function get(key) {
    return Promise.resolve(getSync(key));
  }

  function set(key, val) {
    _cache[key] = val;
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(STORE, 'readwrite');
        const st = tx.objectStore(STORE);
        st.put({ key: key, val: val });
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function(){});
  }

  function remove(key) {
    delete _cache[key];
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(STORE, 'readwrite');
        const st = tx.objectStore(STORE);
        st.delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function(){});
  }

  global.StorageService = { 
    init: function(){ return loadAll(); }, 
    loadAll: loadAll, 
    getSync: getSync, 
    get: get, 
    set: set, 
    remove: remove,
    MIRROR_KEY: MIRROR_KEY 
  };
})(typeof window !== 'undefined' ? window : globalThis);
