export const state = {
  highlightedModuleIdx: 0,
  currentSearchItems: [],
  debounceTimer: null,
  
  setHighlightedModuleIdx(idx) {
    this.highlightedModuleIdx = idx;
  },
  
  clearDebounce() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  },
  
  setDebounce(fn, delay) {
    this.clearDebounce();
    this.debounceTimer = setTimeout(fn, delay);
  }
};