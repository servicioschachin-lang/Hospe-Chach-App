import { filterModulesSearch, showModuleSearchResults, hideModuleSearchResults, setupModuleSearchEvents } from './events.js';

window.filterModulesSearch = filterModulesSearch;
window.showModuleSearchResults = showModuleSearchResults;
window.hideModuleSearchResults = hideModuleSearchResults;
window.setupModuleSearchEvents = setupModuleSearchEvents;

// Setup Ctrl+K shortcut - mejorar para que funcione siempre
if (!window.__moduleSearchGlobalShortcutSetup) {
  window.__moduleSearchGlobalShortcutSetup = true;
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('moduleSearchInput');
      if (input) {
        input.focus();
        input.select();
        showModuleSearchResults();
      }
    }
  }, true); // Use capture phase para mejor prioridad
}

// Initialize module search events
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupModuleSearchEvents);
} else {
  setupModuleSearchEvents();
}