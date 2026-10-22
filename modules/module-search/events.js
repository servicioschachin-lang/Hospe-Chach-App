import { state } from './state.js';
import { renderModuleSearchDropdown } from './render.js';

export function filterModulesSearch(val) {
  state.clearDebounce();
  state.setDebounce(() => {
    state.setHighlightedModuleIdx(0);
    renderModuleSearchDropdown(val);
  }, 150);
}

export function showModuleSearchResults() {
  const resultsEl = document.getElementById('moduleSearchResults');
  const input = document.getElementById('moduleSearchInput');
  if (resultsEl) {
    resultsEl.style.display = 'block';
    if (input) input.setAttribute('aria-expanded', 'true');
    state.setHighlightedModuleIdx(0);
    renderModuleSearchDropdown(input ? input.value : '');
  }
}

export function hideModuleSearchResults() {
  const resultsEl = document.getElementById('moduleSearchResults');
  const input = document.getElementById('moduleSearchInput');
  if (resultsEl) {
    setTimeout(() => {
      resultsEl.style.display = 'none';
      if (input) input.setAttribute('aria-expanded', 'false');
    }, 250);
  }
}

export function selectModuleDirectly(id) {
  if (window.navigate) {
    window.navigate(id);
  }
  closeSearch();
}

function executeChain(idx) {
  const p = window.notifPendingAction;
  if (!p || p.action !== 'chain' || !p.steps || idx >= p.steps.length) {
    window.notifPendingAction = null;
    return;
  }
  const step = p.steps[idx];
  if (step.type === 'navigate' && window.navigate) {
    window.navigate(step.page);
  } else if (step.type === 'call' && typeof window[step.fn] === 'function') {
    window[step.fn](...step.args);
  }
  setTimeout(() => executeChain(idx + 1), 350);
}

export function selectDeepLink(steps) {
  window.notifPendingAction = { action: 'chain', steps };
  executeChain(0);
  closeSearch();
}

function closeSearch() {
  const input = document.getElementById('moduleSearchInput');
  if (input) {
    input.value = '';
    input.blur();
  }
  hideModuleSearchResults();
}

export function highlightModule(idx) {
  state.setHighlightedModuleIdx(idx);
  state.currentSearchItems.forEach((item, i) => {
    if (i === idx) {
      item.classList.add('highlighted');
      item.style.background = 'var(--primary-bg)';
    } else {
      item.classList.remove('highlighted');
      item.style.background = 'var(--dark1)';
    }
  });
}

export function setupModuleSearchEvents() {
  const input = document.getElementById('moduleSearchInput');
  if (!input) return;

  input.addEventListener('keydown', function(e) {
    const resultsEl = document.getElementById('moduleSearchResults');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (resultsEl.style.display === 'none') {
        showModuleSearchResults();
        return;
      }
      if (state.currentSearchItems.length) {
        let nextIdx = (state.highlightedModuleIdx + 1) % state.currentSearchItems.length;
        highlightModule(nextIdx);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (resultsEl.style.display === 'none') return;
      if (state.currentSearchItems.length) {
        let nextIdx = (state.highlightedModuleIdx - 1 + state.currentSearchItems.length) % state.currentSearchItems.length;
        highlightModule(nextIdx);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const activeItem = state.currentSearchItems[state.highlightedModuleIdx];
      if (activeItem) {
        const chain = activeItem.getAttribute('data-chain');
        if (chain) {
          selectDeepLink(JSON.parse(chain));
          return;
        }
        const id = activeItem.getAttribute('data-id');
        selectModuleDirectly(id);
      }
    } else if (e.key === 'Escape') {
      input.blur();
      hideModuleSearchResults();
    }
  });
}

window.selectModuleSearchItem = function(element) {
  const chain = element.getAttribute('data-chain');
  if (chain) {
    selectDeepLink(JSON.parse(chain));
    return;
  }
  const id = element.getAttribute('data-id');
  selectModuleDirectly(id);
};